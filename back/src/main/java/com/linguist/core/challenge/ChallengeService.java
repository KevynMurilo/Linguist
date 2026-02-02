package com.linguist.core.challenge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linguist.core.ai.AIClient;
import com.linguist.core.ai.AIClientFactory;
import com.linguist.core.challenge.dto.*;
import com.linguist.core.exception.AIProviderException;
import com.linguist.core.exception.ResourceNotFoundException;
import com.linguist.core.lesson.LanguageNameMapper;
import com.linguist.core.mastery.CompetenceService;
import com.linguist.core.user.LanguageLevel;
import com.linguist.core.user.User;
import com.linguist.core.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChallengeService {

    private final ChallengeRepository challengeRepository;
    private final UserService userService;
    private final CompetenceService competenceService;
    private final AIClientFactory aiClientFactory;
    private final ObjectMapper objectMapper;

    @Transactional
    public ChallengeResponseDTO generateWritingChallenge(UUID userId, String targetLanguage, String provider, String apiKey) {
        User user = userService.findById(userId);
        String effectiveLang = targetLanguage != null ? targetLanguage : user.getTargetLanguage();
        List<String> weakRules = competenceService.getWeakRuleNames(userId);
        List<String> history = challengeRepository.findLastPrompts(userId, ChallengeType.WRITING, PageRequest.of(0, 5));

        AIClient client = aiClientFactory.getClient(provider);
        String systemPrompt = buildWritingGeneratePrompt(user, effectiveLang, weakRules, history);
        String userPrompt = "Generate a unique writing challenge now.";

        try {
            String aiResponse = client.generateContent(systemPrompt, userPrompt, apiKey);
            JsonNode root = objectMapper.readTree(cleanJson(aiResponse));

            String topic = root.path("topic").asText();
            String instructions = root.path("instructions").asText("");

            String prompt = topic;
            if (!instructions.isBlank()) {
                prompt += "\n\n" + instructions;
            }

            Challenge challenge = challengeRepository.save(Challenge.builder()
                    .user(user)
                    .type(ChallengeType.WRITING)
                    .level(user.getLevel())
                    .targetLanguage(effectiveLang)
                    .prompt(prompt)
                    .completed(false)
                    .build());

            return mapToDTO(challenge);
        } catch (Exception e) {
            throw new AIProviderException("CHALLENGE_GENERATE_ERROR", "Failed to generate writing challenge", e);
        }
    }

    @Transactional
    public ChallengeResponseDTO submitWritingChallenge(UUID userId, UUID challengeId, String text, String provider, String apiKey) {
        Challenge challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new ResourceNotFoundException("Challenge", challengeId));
        User user = userService.findById(userId);

        AIClient client = aiClientFactory.getClient(provider);
        String systemPrompt = buildWritingAnalysisPrompt(user, challenge);
        String userPrompt = text;

        try {
            String aiResponse = client.generateContent(systemPrompt, userPrompt, apiKey);
            String json = cleanJson(aiResponse);
            JsonNode root = objectMapper.readTree(json);

            int score = root.path("score").asInt(0);
            String feedback = root.path("feedback").asText("");

            JsonNode errors = root.path("errors");
            if (errors.isArray()) {
                for (JsonNode error : errors) {
                    String rule = error.path("rule").asText("");
                    if (!rule.isBlank()) {
                        competenceService.recordPractice(userId, normalizeRuleName(rule), false);
                    }
                }
            }

            challenge.setStudentResponse(text);
            challenge.setScore(score);
            challenge.setFeedback(feedback);
            challenge.setAnalysisJson(json);
            challenge.setCompleted(true);
            challenge.setCompletedAt(LocalDateTime.now());
            challengeRepository.save(challenge);

            user.updateStreak(LocalDate.now());

            return mapToDTO(challenge);
        } catch (Exception e) {
            throw new AIProviderException("CHALLENGE_ANALYSIS_ERROR", "Failed to analyze writing", e);
        }
    }

    @Transactional
    public ChallengeResponseDTO generateListeningChallenge(UUID userId, String targetLanguage, String provider, String apiKey) {
        User user = userService.findById(userId);
        String effectiveLang = targetLanguage != null ? targetLanguage : user.getTargetLanguage();
        List<String> history = challengeRepository.findLastOriginalTexts(userId, ChallengeType.LISTENING, PageRequest.of(0, 10));

        AIClient client = aiClientFactory.getClient(provider);
        String systemPrompt = buildListeningGeneratePrompt(user, effectiveLang, history);
        String userPrompt = "Generate a unique listening dictation sentence now.";

        try {
            String aiResponse = client.generateContent(systemPrompt, userPrompt, apiKey);
            JsonNode root = objectMapper.readTree(cleanJson(aiResponse));

            String sentence = root.path("sentence").asText();
            String context = root.path("context").asText("");

            Challenge challenge = challengeRepository.save(Challenge.builder()
                    .user(user)
                    .type(ChallengeType.LISTENING)
                    .level(user.getLevel())
                    .targetLanguage(effectiveLang)
                    .prompt(context)
                    .originalText(sentence)
                    .completed(false)
                    .build());

            return mapToDTO(challenge);
        } catch (Exception e) {
            throw new AIProviderException("CHALLENGE_GENERATE_ERROR", "Failed to generate listening challenge", e);
        }
    }

    @Transactional
    public ChallengeResponseDTO submitListeningChallenge(UUID userId, UUID challengeId, String typedText, String provider, String apiKey) {
        Challenge challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new ResourceNotFoundException("Challenge", challengeId));
        User user = userService.findById(userId);

        AIClient client = aiClientFactory.getClient(provider);
        String systemPrompt = buildListeningAnalysisPrompt(user, challenge);
        String userPrompt = String.format("ORIGINAL: \"%s\"\nSTUDENT TYPED: \"%s\"", challenge.getOriginalText(), typedText);

        try {
            String aiResponse = client.generateContent(systemPrompt, userPrompt, apiKey);
            String json = cleanJson(aiResponse);
            JsonNode root = objectMapper.readTree(json);

            int score = root.path("score").asInt(0);
            String feedback = root.path("feedback").asText("");

            competenceService.recordPractice(userId, "Listening Comprehension", score >= 70);

            challenge.setStudentResponse(typedText);
            challenge.setScore(score);
            challenge.setFeedback(feedback);
            challenge.setAnalysisJson(json);
            challenge.setCompleted(true);
            challenge.setCompletedAt(LocalDateTime.now());
            challengeRepository.save(challenge);

            user.updateStreak(LocalDate.now());

            return mapToDTO(challenge);
        } catch (Exception e) {
            throw new AIProviderException("CHALLENGE_ANALYSIS_ERROR", "Failed to analyze listening", e);
        }
    }

    @Transactional(readOnly = true)
    public ChallengeResponseDTO findById(UUID challengeId) {
        Challenge challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new ResourceNotFoundException("Challenge", challengeId));
        return mapToDTO(challenge);
    }

    @Transactional(readOnly = true)
    public Page<ChallengeResponseDTO> getHistory(UUID userId, ChallengeType type, int page, int size) {
        return challengeRepository
                .findByUserIdAndTypeOrderByCreatedAtDesc(userId, type, PageRequest.of(page, size))
                .map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public ChallengeResponseDTO getLatestPending(UUID userId, ChallengeType type) {
        return challengeRepository
                .findFirstByUserIdAndTypeAndCompletedFalseOrderByCreatedAtDesc(userId, type)
                .map(this::mapToDTO)
                .orElse(null);
    }

    private String buildWritingGeneratePrompt(User user, String targetLanguage, List<String> weakRules, List<String> history) {
        String nativeName = LanguageNameMapper.getFullName(user.getNativeLanguage());
        String targetName = LanguageNameMapper.getFullName(targetLanguage);
        LanguageLevel level = user.getLevel();

        StringBuilder sb = new StringBuilder()
                .append("You are an expert language teacher creating writing challenges for a ").append(level).append(" student.\n")
                .append(buildLanguageInstruction(user, targetLanguage)).append("\n");

        if (!history.isEmpty()) {
            sb.append("PREVIOUS TOPICS (DO NOT REPEAT): ").append(String.join(", ", history)).append("\n");
        }

        if (!weakRules.isEmpty()) {
            sb.append("Student weaknesses (incorporate these into the challenge): ").append(String.join(", ", weakRules)).append("\n");
        }

        sb.append("\nLEVEL-SPECIFIC REQUIREMENTS for ").append(level).append(":\n");
        switch (level) {
            case A1 -> sb.append("- Ask for 2-3 VERY simple sentences. Present tense ONLY.\n")
                    .append("- Topics: daily routine, family, food, greetings, basic descriptions.\n")
                    .append("- Expected vocabulary: ~50 most common words. Maximum 50 words total.\n")
                    .append("- Example prompt style: 'Describe your family' or 'What do you eat for breakfast?'\n");
            case A2 -> sb.append("- Ask for 4-6 simple sentences. Present and simple past tense.\n")
                    .append("- Topics: travel, shopping, hobbies, weather, simple plans.\n")
                    .append("- Use basic connectors (and, but, because). 50-80 words total.\n")
                    .append("- Example prompt style: 'Tell about your last vacation' or 'Describe your favorite hobby'\n");
            case B1 -> sb.append("- Ask for a paragraph (8-12 sentences). Multiple tenses including future.\n")
                    .append("- Topics: work, education, social issues, personal experiences, giving opinions.\n")
                    .append("- Expect opinion expressions, comparisons, cause/effect. 80-150 words.\n")
                    .append("- Example prompt style: 'Do you think technology helps education? Give your opinion with examples.'\n");
            case B2 -> sb.append("- Ask for 2 paragraphs. Complex grammar: conditional, subjunctive, passive voice.\n")
                    .append("- Topics: cultural debates, abstract concepts, hypothetical situations, current events.\n")
                    .append("- Expect nuanced arguments, concession clauses, varied sentence structures. 150-250 words.\n")
                    .append("- Example prompt style: 'If you could change one thing about your country's education system, what would it be and why?'\n");
            case C1 -> sb.append("- Ask for a structured text (3+ paragraphs). All grammar structures expected.\n")
                    .append("- Topics: ethics, philosophy, economics, politics, literary criticism, scientific topics.\n")
                    .append("- Expect idiomatic expressions, sophisticated connectors, rhetorical devices. 250-400 words.\n")
                    .append("- Example prompt style: 'Analyze the impact of artificial intelligence on the job market, considering both opportunities and risks.'\n");
            case C2 -> sb.append("- Ask for an essay with thesis, supporting arguments, and conclusion.\n")
                    .append("- Topics: complex societal issues, philosophical dilemmas, literary/artistic analysis, specialized fields.\n")
                    .append("- Expect academic/literary register, rare vocabulary, complex subordination, irony, nuance. 350-500 words.\n")
                    .append("- Example prompt style: 'Critically examine the tension between individual freedom and collective responsibility in modern democracies.'\n");
        }

        sb.append("\nRULES:\n")
                .append("- 'topic' must be the writing prompt in ").append(nativeName).append(".\n")
                .append("- 'instructions' must be writing tips appropriate for level ").append(level).append(" in ").append(nativeName).append(".\n")
                .append("- The prompt MUST match the complexity level above. Do NOT give A1 prompts to C2 students or vice versa.\n")
                .append("- Randomly choose a FRESH context. Be creative and engaging.\n")
                .append("- Respond ONLY with valid JSON: { \"topic\": \"...\", \"instructions\": \"...\" }");

        return sb.toString();
    }

    private String buildWritingAnalysisPrompt(User user, Challenge challenge) {
        String nativeName = LanguageNameMapper.getFullName(user.getNativeLanguage());
        LanguageLevel level = challenge.getLevel();

        StringBuilder sb = new StringBuilder()
                .append("You are an expert writing evaluator for language learners.\n")
                .append(buildLanguageInstruction(user, challenge.getTargetLanguage())).append("\n")
                .append("Student level: ").append(level).append("\n")
                .append("Prompt: \"").append(challenge.getPrompt()).append("\"\n\n");

        sb.append("GRADING CRITERIA FOR LEVEL ").append(level).append(":\n");
        switch (level) {
            case A1, A2 -> sb.append("- grammar: Focus on basic structures (present tense, articles, subject-verb agreement). Be LENIENT with advanced grammar.\n")
                    .append("- vocabulary: Accept simple, common words. Do NOT penalize lack of variety at this level.\n")
                    .append("- coherence: Accept simple sequencing (first, then, after). Short sentences are fine.\n")
                    .append("- spelling: Be lenient with minor spelling errors, especially accents.\n")
                    .append("- levelAppropriateness: Score HIGH if student uses basic structures correctly. Do NOT expect complexity.\n")
                    .append("- Errors should focus on BASIC mistakes only. Don't flag advanced issues.\n");
            case B1, B2 -> sb.append("- grammar: Expect varied tenses, conditionals, relative clauses. Flag tense consistency errors.\n")
                    .append("- vocabulary: Expect some variety and topic-specific words. Penalize excessive repetition.\n")
                    .append("- coherence: Expect clear paragraph structure, logical flow, use of connectors.\n")
                    .append("- spelling: Standard accuracy expected. Flag systematic errors.\n")
                    .append("- levelAppropriateness: Score HIGH if student demonstrates B-level complexity. Penalize if too simple.\n")
                    .append("- Errors should cover grammar, vocabulary choice, and coherence issues.\n");
            case C1, C2 -> sb.append("- grammar: Expect MASTERY of all structures including subjunctive, complex subordination, passive. Be strict.\n")
                    .append("- vocabulary: Expect sophisticated, precise vocabulary. Penalize colloquial or overly simple word choices.\n")
                    .append("- coherence: Expect essay-level structure with thesis, arguments, transitions. Grade rhetorical effectiveness.\n")
                    .append("- spelling: Near-perfect accuracy required including all accents and punctuation.\n")
                    .append("- levelAppropriateness: Score HIGH only if text reads like a competent native writer. Penalize heavily if simplistic.\n")
                    .append("- Errors should include style issues, register problems, and nuance failures.\n");
        }

        sb.append("\nERRORS FORMAT: Each error = { \"original\": \"wrong text\", \"correction\": \"correct text\", \"rule\": \"grammar rule name\", \"explanation\": \"why in ").append(nativeName).append("\" }\n")
                .append("GRADING: { \"grammar\": 0-100, \"vocabulary\": 0-100, \"coherence\": 0-100, \"spelling\": 0-100, \"levelAppropriateness\": 0-100 }\n")
                .append("Feedback MUST be in ").append(nativeName).append(". Start with positives, then improvements.\n")
                .append("Respond ONLY with valid JSON: { \"score\": 0-100, \"feedback\": \"...\", \"errors\": [...], \"grading\": {...} }");

        return sb.toString();
    }

    private String buildListeningGeneratePrompt(User user, String targetLanguage, List<String> history) {
        String nativeName = LanguageNameMapper.getFullName(user.getNativeLanguage());
        String targetName = LanguageNameMapper.getFullName(targetLanguage);
        LanguageLevel level = user.getLevel();

        StringBuilder sb = new StringBuilder()
                .append("You are generating a unique listening dictation sentence in ").append(targetName).append(".\n")
                .append("Student level: ").append(level).append("\n\n");

        if (!history.isEmpty()) {
            sb.append("DO NOT REPEAT THESE SENTENCES: ").append(String.join(" | ", history)).append("\n\n");
        }

        sb.append("LEVEL-SPECIFIC SENTENCE REQUIREMENTS for ").append(level).append(":\n");
        switch (level) {
            case A1 -> sb.append("- 3 to 6 words ONLY. Very short and simple.\n")
                    .append("- Use ONLY the 100 most common words. Present tense only.\n")
                    .append("- NO contractions, NO idioms, NO slang.\n")
                    .append("- Clear pronunciation-friendly words. Avoid homophones.\n")
                    .append("- Example complexity: 'I like coffee.' or 'The cat is small.'\n");
            case A2 -> sb.append("- 6 to 10 words. Simple but complete sentences.\n")
                    .append("- Basic vocabulary expanded (500 most common words). Present and past tense.\n")
                    .append("- Simple connectors allowed (and, but). No complex subordination.\n")
                    .append("- Example complexity: 'Yesterday I went to the store and bought bread.'\n");
            case B1 -> sb.append("- 10 to 16 words. Compound sentences with connectors.\n")
                    .append("- Intermediate vocabulary. Multiple tenses including future.\n")
                    .append("- Use connectors like 'because', 'although', 'while', 'however'.\n")
                    .append("- Example complexity: 'Although it was raining, we decided to go for a walk in the park.'\n");
            case B2 -> sb.append("- 15 to 22 words. Complex grammatical structures.\n")
                    .append("- Upper-intermediate vocabulary including some less common words.\n")
                    .append("- Conditional, passive voice, relative clauses allowed.\n")
                    .append("- Include some phrasal verbs or collocations.\n")
                    .append("- Example complexity: 'The report that was published last week has raised serious concerns about the environmental impact of the project.'\n");
            case C1 -> sb.append("- 20 to 30 words. Sophisticated sentence structures.\n")
                    .append("- Advanced vocabulary including idiomatic expressions and formal language.\n")
                    .append("- Complex subordination, embedded clauses, sophisticated connectors.\n")
                    .append("- Include some academic or professional vocabulary.\n")
                    .append("- Example complexity: 'Had the government implemented the proposed reforms earlier, the economic downturn might not have been as severe as it ultimately proved to be.'\n");
            case C2 -> sb.append("- 25 to 40 words. Near-native complexity.\n")
                    .append("- Literary or academic register. Rare vocabulary, specialized terms.\n")
                    .append("- Complex nested subordination, inverted structures, rhetorical devices.\n")
                    .append("- Natural rhythm with embedded clauses and parenthetical asides.\n")
                    .append("- Example complexity: 'Notwithstanding the considerable skepticism voiced by critics, the paradigm shift in our understanding of consciousness — one that had been gradually unfolding over the past decade — has fundamentally reshaped the discourse.'\n");
        }

        sb.append("\nContexts: Everyday life, business, social, culture, environment, technology, science.\n")
                .append("The sentence MUST match the complexity level above EXACTLY. This is CRITICAL.\n")
                .append("Respond ONLY with valid JSON: { \"sentence\": \"...\", \"context\": \"(1-3 word topic in ").append(nativeName).append(")\" }");

        return sb.toString();
    }

    private String buildListeningAnalysisPrompt(User user, Challenge challenge) {
        String nativeName = LanguageNameMapper.getFullName(user.getNativeLanguage());
        LanguageLevel level = challenge.getLevel();

        StringBuilder sb = new StringBuilder()
                .append("You are evaluating a listening dictation exercise.\n")
                .append(buildLanguageInstruction(user, challenge.getTargetLanguage())).append("\n")
                .append("Student level: ").append(level).append("\n\n")
                .append("Compare ORIGINAL with STUDENT TYPED word by word.\n\n");

        sb.append("SCORING TOLERANCE for level ").append(level).append(":\n");
        switch (level) {
            case A1, A2 -> sb.append("- Be LENIENT: Accept capitalization differences, missing accents, minor spelling variations.\n")
                    .append("- Focus on whether the student understood the KEY WORDS (nouns, verbs, adjectives).\n")
                    .append("- Articles and prepositions errors are less penalized.\n")
                    .append("- A partially correct word (missing one letter) should count as half-correct.\n");
            case B1, B2 -> sb.append("- Standard accuracy required. Accents matter for scored languages.\n")
                    .append("- Articles and prepositions must be correct.\n")
                    .append("- Minor typos (1 letter off) can be flagged but partially scored.\n")
                    .append("- Word order matters at this level.\n");
            case C1, C2 -> sb.append("- STRICT accuracy required. Near-perfect transcription expected.\n")
                    .append("- All accents, punctuation markers, and special characters must be correct.\n")
                    .append("- No tolerance for word substitutions or omissions.\n")
                    .append("- Even minor spelling errors should be flagged.\n");
        }

        sb.append("\nWORDS FORMAT: Each word = { \"expected\": \"original word\", \"got\": \"student typed\" or null if missing, \"correct\": true/false }\n")
                .append("Feedback MUST be in ").append(nativeName).append(". Mention what they heard correctly and what needs improvement.\n")
                .append("Respond ONLY with valid JSON: { \"score\": 0-100, \"feedback\": \"...\", \"words\": [...] }");

        return sb.toString();
    }

    private String buildLanguageInstruction(User user, String targetLanguage) {
        LanguageLevel level = user.getLevel();
        String nativeName = LanguageNameMapper.getFullName(user.getNativeLanguage());
        String targetName = LanguageNameMapper.getFullName(targetLanguage);
        if (level == LanguageLevel.A1 || level == LanguageLevel.A2) {
            return String.format("Explanations and feedback in %s. Content in %s.", nativeName, targetName);
        }
        if (level == LanguageLevel.B1 || level == LanguageLevel.B2) {
            return String.format("Mix %s and %s for feedback. Content in %s.", targetName, nativeName, targetName);
        }
        return String.format("Use %s for everything.", targetName);
    }

    private String cleanJson(String json) {
        return json.replaceAll("(?s).*?(\\{.*\\}).*", "$1");
    }

    private String normalizeRuleName(String rule) {
        if (rule == null || rule.isBlank()) return rule;
        String trimmed = rule.trim().replaceAll("\\s+", " ");
        StringBuilder sb = new StringBuilder();
        boolean capitalizeNext = true;
        for (char c : trimmed.toCharArray()) {
            if (c == ' ') {
                sb.append(c);
                capitalizeNext = true;
            } else if (capitalizeNext) {
                sb.append(Character.toUpperCase(c));
                capitalizeNext = false;
            } else {
                sb.append(Character.toLowerCase(c));
            }
        }
        return sb.toString();
    }

    private ChallengeResponseDTO mapToDTO(Challenge c) {
        return ChallengeResponseDTO.builder()
                .id(c.getId())
                .type(c.getType())
                .level(c.getLevel())
                .targetLanguage(c.getTargetLanguage())
                .prompt(c.getPrompt())
                .originalText(c.getOriginalText())
                .studentResponse(c.getStudentResponse())
                .score(c.getScore())
                .feedback(c.getFeedback())
                .analysisJson(c.getAnalysisJson())
                .completed(c.getCompleted())
                .createdAt(c.getCreatedAt())
                .completedAt(c.getCompletedAt())
                .build();
    }
}