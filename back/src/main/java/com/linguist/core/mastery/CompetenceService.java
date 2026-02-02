package com.linguist.core.mastery;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linguist.core.ai.AIClient;
import com.linguist.core.ai.AIClientFactory;
import com.linguist.core.exception.AIProviderException;
import com.linguist.core.exception.ResourceNotFoundException;
import com.linguist.core.lesson.Lesson;
import com.linguist.core.lesson.LessonRepository;
import com.linguist.core.lesson.LanguageNameMapper;
import com.linguist.core.mastery.dto.*;
import com.linguist.core.user.LanguageLevel;
import com.linguist.core.user.User;
import com.linguist.core.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompetenceService {

    private final CompetenceRepository competenceRepository;
    private final UserService userService;
    private final LessonRepository lessonRepository;
    private final AIClientFactory aiClientFactory;
    private final ObjectMapper objectMapper;

    public List<Competence> findByUserId(UUID userId) {
        return competenceRepository.findByUserId(userId);
    }

    public Page<Competence> findByUserId(UUID userId, int page, int size) {
        return competenceRepository.findByUserId(userId, PageRequest.of(page, size));
    }

    public List<Competence> findWeaknesses(UUID userId, int threshold) {
        return competenceRepository.findByUserIdAndMasteryLevelLessThan(userId, threshold);
    }

    public Page<Competence> findWeaknesses(UUID userId, int threshold, int page, int size) {
        return competenceRepository.findByUserIdAndMasteryLevelLessThan(userId, threshold, PageRequest.of(page, size));
    }

    public List<String> getWeakRuleNames(UUID userId) {
        return findWeaknesses(userId, 60).stream()
                .map(Competence::getRuleName)
                .toList();
    }

    public List<String> getAllRuleNames(UUID userId) {
        return findByUserId(userId).stream()
                .map(Competence::getRuleName)
                .toList();
    }

    @Transactional
    public Competence recordPractice(UUID userId, String ruleName, boolean success) {
        User user = userService.findById(userId);
        String normalized = ruleName.trim();

        Competence competence = competenceRepository
                .findByUserIdAndRuleName(userId, normalized)
                .orElseGet(() -> Competence.builder()
                        .user(user)
                        .ruleName(normalized)
                        .masteryLevel(0)
                        .failCount(0)
                        .practiceCount(0)
                        .build());

        if (success) {
            competence.recordSuccess();
        } else {
            competence.recordFailure();
        }

        return competenceRepository.save(competence);
    }

    @Transactional(readOnly = true)
    public ExercisesResponse generateExercises(UUID competenceId, String provider, String apiKey) {
        Competence competence = competenceRepository.findById(competenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Competence", competenceId));
        User user = competence.getUser();

        List<Lesson> relatedLessons = lessonRepository.findByUserIdAndGrammarRule(
                user.getId(), competence.getRuleName());

        AIClient client = aiClientFactory.getClient(provider);
        String systemPrompt = buildExercisePrompt(user, competence);
        String userPrompt = "Generate 5 exercises for the grammar rule: " + competence.getRuleName();

        try {
            String result = client.generateContent(systemPrompt, userPrompt, apiKey);
            List<ExerciseDTO> exercises = parseExercises(result);

            return ExercisesResponse.builder()
                    .competence(CompetenceResponse.from(competence))
                    .exercises(exercises)
                    .relatedLessons(relatedLessons.stream().map(RelatedLessonDTO::from).toList())
                    .build();
        } catch (Exception e) {
            throw new AIProviderException("EXERCISE_ERROR", "Failed to generate exercises", e);
        }
    }

    @Transactional
    public SubmitExercisesResponse submitExercises(UUID competenceId, int correctCount, int totalCount) {
        Competence competence = competenceRepository.findById(competenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Competence", competenceId));

        int previousMastery = competence.getMasteryLevel();
        double score = totalCount > 0 ? (double) correctCount / totalCount * 100 : 0;

        int change;
        if (score >= 80) change = 10;
        else if (score >= 60) change = 5;
        else if (score >= 40) change = 2;
        else change = -5;

        competence.setMasteryLevel(Math.max(0, Math.min(100, competence.getMasteryLevel() + change)));
        competence.setPracticeCount(competence.getPracticeCount() + totalCount);
        competence.setFailCount(competence.getFailCount() + (totalCount - correctCount));
        competence.setLastPracticed(LocalDateTime.now());
        competenceRepository.save(competence);

        return SubmitExercisesResponse.builder()
                .previousMastery(previousMastery)
                .newMastery(competence.getMasteryLevel())
                .change(change)
                .competence(CompetenceResponse.from(competence))
                .build();
    }

    @Transactional(readOnly = true)
    public List<RelatedLessonDTO> getRelatedLessons(UUID competenceId) {
        Competence competence = competenceRepository.findById(competenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Competence", competenceId));

        return lessonRepository.findByUserIdAndGrammarRule(
                        competence.getUser().getId(), competence.getRuleName())
                .stream()
                .map(RelatedLessonDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<RelatedLessonDTO> getRelatedLessons(UUID competenceId, int page, int size) {
        Competence competence = competenceRepository.findById(competenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Competence", competenceId));

        return lessonRepository.findByUserIdAndGrammarRule(
                        competence.getUser().getId(), competence.getRuleName(), PageRequest.of(page, size))
                .map(RelatedLessonDTO::from);
    }

    private String buildExercisePrompt(User user, Competence competence) {
        String nativeName = LanguageNameMapper.getFullName(user.getNativeLanguage());
        String targetName = LanguageNameMapper.getFullName(user.getTargetLanguage());
        var level = user.getLevel();

        String difficulty;
        if (competence.getMasteryLevel() < 30) difficulty = "EASY - use simple, common examples";
        else if (competence.getMasteryLevel() < 60) difficulty = "MEDIUM - use varied contexts";
        else difficulty = "HARD - use nuanced, tricky cases";

        StringBuilder sb = new StringBuilder()
                .append("You are an expert language exercise generator.\n")
                .append("Student native language: ").append(nativeName).append("\n")
                .append("Target language: ").append(targetName).append("\n")
                .append("Student CEFR level: ").append(level).append("\n")
                .append("Grammar rule: ").append(competence.getRuleName()).append("\n")
                .append("Current mastery: ").append(competence.getMasteryLevel()).append("%\n")
                .append("Difficulty: ").append(difficulty).append("\n\n");

        sb.append("LEVEL-SPECIFIC EXERCISE DESIGN for ").append(level).append(":\n");
        switch (level) {
            case A1 -> sb.append("- Use ONLY basic, high-frequency vocabulary (top 200 words).\n")
                    .append("- Short sentences (3-6 words). Present tense only.\n")
                    .append("- Make wrong options CLEARLY different from correct answer.\n")
                    .append("- Context: daily life, family, food, colors, numbers.\n");
            case A2 -> sb.append("- Use common vocabulary (top 500 words). Short sentences (5-10 words).\n")
                    .append("- Present and past tense. Simple connectors.\n")
                    .append("- One distractor should be plausible, others clearly wrong.\n")
                    .append("- Context: travel, shopping, hobbies, routines.\n");
            case B1 -> sb.append("- Intermediate vocabulary. Sentences of 8-15 words.\n")
                    .append("- Multiple tenses including future and conditional.\n")
                    .append("- Two distractors should be plausible. Test understanding, not just recognition.\n")
                    .append("- Context: work, education, opinions, social topics.\n");
            case B2 -> sb.append("- Upper-intermediate vocabulary including collocations and phrasal verbs.\n")
                    .append("- Complex sentences (12-20 words) with subordination.\n")
                    .append("- ALL options should seem plausible. Test grammatical nuance.\n")
                    .append("- Context: abstract topics, debates, formal/informal register.\n");
            case C1 -> sb.append("- Advanced vocabulary including formal and academic terms.\n")
                    .append("- Complex, authentic-sounding sentences (15-25 words).\n")
                    .append("- Test edge cases, exceptions, and formal vs informal usage.\n")
                    .append("- Include subtle distinctions between near-synonyms.\n")
                    .append("- Context: professional, academic, literary contexts.\n");
            case C2 -> sb.append("- Sophisticated vocabulary including rare words, collocations, and register-specific terms.\n")
                    .append("- Near-native complexity sentences (20-30 words) with nested clauses.\n")
                    .append("- Test subtle stylistic differences, regional variations, archaic vs modern usage.\n")
                    .append("- Include idiomatic expressions and literary devices.\n")
                    .append("- Context: literary analysis, philosophical discourse, specialized fields.\n");
        }

        sb.append("\nGenerate exactly 5 multiple-choice exercises to practice \"").append(competence.getRuleName()).append("\".\n")
                .append("Each exercise tests a DIFFERENT aspect of this rule.\n\n")
                .append("RULES:\n")
                .append("- 'question' must be in ").append(nativeName).append(", with the ").append(targetName).append(" sentence/fragment embedded.\n")
                .append("- 'options' must be in ").append(targetName).append(" (4 options each).\n")
                .append("- 'correctIndex' is 0-based (0 to 3).\n")
                .append("- 'explanation' MUST be in ").append(nativeName).append(", explaining WHY the answer is correct and why others are wrong.\n")
                .append("- Do NOT include numbering in questions.\n")
                .append("- The vocabulary and sentence complexity MUST match ").append(level).append(" level.\n\n")
                .append("Respond ONLY with valid JSON:\n")
                .append("{\n")
                .append("  \"exercises\": [\n")
                .append("    {\n")
                .append("      \"question\": \"...\",\n")
                .append("      \"options\": [\"A\", \"B\", \"C\", \"D\"],\n")
                .append("      \"correctIndex\": 0,\n")
                .append("      \"explanation\": \"...\"\n")
                .append("    }\n")
                .append("  ]\n")
                .append("}");

        return sb.toString();
    }

    private List<ExerciseDTO> parseExercises(String json) {
        try {
            String cleaned = json.replaceAll("(?s).*?(\\{.*\\}).*", "$1");
            JsonNode root = objectMapper.readTree(cleaned);
            List<ExerciseDTO> exercises = new ArrayList<>();

            root.path("exercises").forEach(node -> {
                List<String> options = new ArrayList<>();
                node.path("options").forEach(o -> options.add(o.asText()));

                exercises.add(ExerciseDTO.builder()
                        .question(node.path("question").asText())
                        .options(options)
                        .correctIndex(node.path("correctIndex").asInt(0))
                        .explanation(node.path("explanation").asText())
                        .build());
            });

            return exercises;
        } catch (Exception e) {
            throw new AIProviderException("PARSE_ERROR", "Failed to parse exercises", e);
        }
    }
}
