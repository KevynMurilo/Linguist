package com.linguist.core.lesson;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linguist.core.ai.AIClient;
import com.linguist.core.ai.AIClientFactory;
import com.linguist.core.exception.AIProviderException;
import com.linguist.core.exception.ResourceNotFoundException;
import com.linguist.core.lesson.dto.*;
import com.linguist.core.mastery.CompetenceService;
import com.linguist.core.mastery.PracticeSession;
import com.linguist.core.mastery.PracticeSessionRepository;
import com.linguist.core.user.LanguageLevel;
import com.linguist.core.user.User;
import com.linguist.core.user.UserService;
import com.linguist.core.transcription.TranscriptionService;
import com.linguist.core.vocabulary.VocabularyService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessonRepository;
    private final UserService userService;
    private final CompetenceService competenceService;
    private final PracticeSessionRepository practiceSessionRepository;
    private final AIClientFactory aiClientFactory;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private TranscriptionService transcriptionService;

    @Autowired
    private VocabularyService vocabularyService;

    @Transactional
    public LessonResponseDTO generate(UUID userId, String topic, String targetLanguage, String provider, String apiKey) {
        User user = userService.findById(userId);
        AIClient client = aiClientFactory.getClient(provider);
        List<String> weakRules = competenceService.getWeakRuleNames(userId);
        List<String> allRules = competenceService.getAllRuleNames(userId);

        String effectiveTargetLanguage = (targetLanguage != null && !targetLanguage.isBlank())
                ? targetLanguage
                : user.getTargetLanguage();

        String systemPrompt = buildGenerateSystemPrompt(user, effectiveTargetLanguage, weakRules, allRules);
        String userPrompt = String.format("Generate lesson about: %s", topic);

        try {
            String aiResponse = client.generateContent(systemPrompt, userPrompt, apiKey);
            Lesson lesson = parseAndSaveLesson(aiResponse, user, topic, effectiveTargetLanguage);
            vocabularyService.extractAndSave(userId, lesson.getVocabularyList(), topic);
            return mapToDTO(lesson);
        } catch (Exception e) {
            throw new AIProviderException("GENERATE_ERROR", "Failed to generate lesson", e);
        }
    }

    @Transactional
    public SpeechAnalysisResponse analyzeSpeech(UUID userId, UUID lessonId, String spokenText, byte[] audioData, String transcriptionMode, String provider, String apiKey) {
        User user = userService.findById(userId);
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));

        String lessonTargetLang = lesson.getTargetLanguage() != null ? lesson.getTargetLanguage() : user.getTargetLanguage();

        String effectiveText = spokenText;
        boolean hasWhisper = false;
        boolean useWhisper = "whisper".equalsIgnoreCase(transcriptionMode);
        boolean whisperFailed = false;

        if (useWhisper && audioData != null && audioData.length > 0) {
            if (transcriptionService != null) {
                String whisperText = transcriptionService.transcribe(audioData, lessonTargetLang);
                if (whisperText != null && !whisperText.isBlank()) {
                    effectiveText = whisperText;
                    hasWhisper = true;
                } else {
                    whisperFailed = true;
                    if (spokenText == null || spokenText.isBlank()) {
                        effectiveText = "";
                    }
                }
            } else {
                whisperFailed = true;
                if (spokenText == null || spokenText.isBlank()) {
                    effectiveText = "";
                }
            }
        }

        if (useWhisper && whisperFailed && (effectiveText == null || effectiveText.isBlank())) {
            throw new AIProviderException("WHISPER_UNAVAILABLE",
                "O serviço de transcrição Whisper não está disponível. Por favor, tente o modo 'Navegador' ou verifique a configuração do servidor.");
        }

        int totalWords = countWords(lesson.getSimplifiedText());
        int spokenWords = countWords(effectiveText);
        int coverage = (int) (((double) spokenWords / totalWords) * 100);

        AIClient client = aiClientFactory.getClient(provider);
        String systemPrompt = buildAnalysisSystemPrompt(user, lessonTargetLang, coverage, totalWords, spokenWords, hasWhisper);
        String userPrompt = String.format("ORIGINAL: \"%s\"\nSTUDENT: \"%s\"", lesson.getSimplifiedText(), effectiveText);

        try {
            String result = client.analyzeSpeech(systemPrompt, userPrompt, apiKey);
            SpeechAnalysisResponse analysis = parseSpeechAnalysis(result);

            if (coverage < 30 && analysis.getAccuracy() > 35) {
                analysis.setAccuracy(Math.max(coverage, 5));
            }

            saveFullPracticeResults(user, lesson, analysis, audioData, spokenText);
            return analysis;
        } catch (AIProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new AIProviderException("ANALYSIS_ERROR", "Falha ao analisar sua fala: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public Page<PracticeSessionResponseDTO> getLessonHistory(UUID lessonId, int page, int size) {
        return practiceSessionRepository.findByLessonIdOrderByCreatedAtDesc(lessonId, PageRequest.of(page, size))
                .map(this::mapToSessionDTO);
    }

    @Transactional
    public void deletePracticeSession(UUID sessionId, UUID userId) {
        PracticeSession session = practiceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", sessionId));

        if (!session.getUser().getId().equals(userId)) {
            throw new AIProviderException("FORBIDDEN", "You can only delete your own sessions");
        }

        Lesson lesson = session.getLesson();
        practiceSessionRepository.delete(session);

        List<PracticeSession> remainingSessions = practiceSessionRepository.findByLessonId(lesson.getId());

        int bestScore = remainingSessions.stream()
                .mapToInt(PracticeSession::getAccuracy)
                .max()
                .orElse(0);

        lesson.setBestScore(bestScore);
        lesson.setTimesAttempted(remainingSessions.size());
        lesson.setCompleted(bestScore >= 80);

        lessonRepository.save(lesson);
    }

    @Transactional(readOnly = true)
    public byte[] getSessionAudio(UUID sessionId) {
        return practiceSessionRepository.findById(sessionId)
                .map(PracticeSession::getAudioData)
                .orElseThrow(() -> new ResourceNotFoundException("PracticeSession", sessionId));
    }

    @Transactional
    public ExplainWordResponse explainWord(UUID userId, UUID lessonId, String word, String context, String provider, String apiKey) {
        User user = userService.findById(userId);
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));

        String lessonTargetLang = lesson.getTargetLanguage() != null ? lesson.getTargetLanguage() : user.getTargetLanguage();

        AIClient client = aiClientFactory.getClient(provider);
        String systemPrompt = buildExplainWordSystemPrompt(user, lessonTargetLang, lesson);
        String userPrompt = String.format("Term: \"%s\"\nContext: \"%s\"", word, context);

        String result = client.explainWord(systemPrompt, userPrompt, apiKey);
        return parseExplainWord(result);
    }

    private int countWords(String text) {
        if (text == null || text.isBlank()) return 0;
        // Remove punctuation but keep Unicode letters, digits and spaces
        String cleaned = text.trim().replaceAll("[^\\p{L}\\p{N} ]", "").replaceAll("\\s+", " ").trim();
        if (cleaned.isEmpty()) return 0;
        return cleaned.split(" ").length;
    }

    private String buildLanguageInstruction(User user, String targetLanguage) {
        LanguageLevel level = user.getLevel();
        String nativeName = LanguageNameMapper.getFullName(user.getNativeLanguage());
        String targetName = LanguageNameMapper.getFullName(targetLanguage);

        if (level == LanguageLevel.A1 || level == LanguageLevel.A2) {
            return String.format("Level: BEGINNER. MANDATORY: All explanations, teachingNotes, vocabularyList and culturalNote MUST be written in %s. "
                    + "The lesson text (simplifiedText) MUST be written entirely in %s. "
                    + "PHONETICS RULE: phoneticMarkers and any pronunciation field MUST ONLY use letters and sounds that exist in %s. "
                    + "NEVER use IPA symbols (like ʁ, ø, œ, ɛ, ʃ, ʒ, ŋ, θ, ð). "
                    + "Write how the %s words SOUND using %s spelling so the student can simply read it out loud.",
                    nativeName, targetName, nativeName, targetName, nativeName);
        }
        if (level == LanguageLevel.B1 || level == LanguageLevel.B2) {
            return String.format("Level: INTERMEDIATE. Mix %s and %s for explanations. "
                    + "The lesson text (simplifiedText) MUST be written entirely in %s. "
                    + "PHONETICS RULE: phoneticMarkers and any pronunciation field MUST ONLY use letters and sounds that exist in %s. "
                    + "NEVER use IPA symbols. Write how %s words SOUND using %s spelling.",
                    targetName, nativeName, targetName, nativeName, targetName, nativeName);
        }
        return String.format("Level: ADVANCED. %s ONLY for everything. "
                + "PHONETICS RULE: phoneticMarkers and any pronunciation field MUST ONLY use letters and sounds that exist in %s. "
                + "NEVER use IPA symbols. Write approximate pronunciation using %s spelling.",
                targetName, nativeName, nativeName);
    }

    private String buildGenerateSystemPrompt(User user, String targetLanguage, List<String> weakRules, List<String> allRules) {
        String nativeName = LanguageNameMapper.getFullName(user.getNativeLanguage());
        String targetName = LanguageNameMapper.getFullName(targetLanguage);
        var level = user.getLevel();

        StringBuilder sb = new StringBuilder()
                .append("You are a linguistic coach using the Shadowing method for a ").append(level).append(" student.\n")
                .append(buildLanguageInstruction(user, targetLanguage)).append("\n");

        if (!weakRules.isEmpty()) {
            sb.append("WEAKNESSES (reinforce these): ").append(String.join(", ", weakRules)).append("\n");
        }

        sb.append("\nCONTENT COMPLEXITY FOR LEVEL ").append(level).append(":\n");
        switch (level) {
            case A1 -> sb.append("- 3-5 very simple sentences. Present tense ONLY.\n")
                    .append("- Top 100 most common words. Short, clear sentences.\n")
                    .append("- Topics: greetings, family, food, numbers, colors, basic descriptions.\n")
                    .append("- Grammar focus: articles, basic conjugation, simple nouns/adjectives.\n");
            case A2 -> sb.append("- 5-8 simple sentences. Present and simple past tense.\n")
                    .append("- Basic expanded vocabulary (~500 words). Simple connectors (and, but, because).\n")
                    .append("- Topics: daily routines, travel basics, shopping, weather.\n")
                    .append("- Grammar focus: past tense, basic prepositions, question formation.\n");
            case B1 -> sb.append("- 8-12 sentences with some compound structures.\n")
                    .append("- Intermediate vocabulary. Multiple tenses including future.\n")
                    .append("- Topics: work, education, opinions, experiences, plans.\n")
                    .append("- Grammar focus: varied tenses, comparatives, connectors, modal verbs.\n");
            case B2 -> sb.append("- 12-18 sentences with complex structures.\n")
                    .append("- Upper-intermediate vocabulary including collocations.\n")
                    .append("- Topics: abstract concepts, current events, cultural topics.\n")
                    .append("- Grammar focus: conditionals, subjunctive, passive voice, relative clauses.\n");
            case C1 -> sb.append("- 15-25 sentences with sophisticated language.\n")
                    .append("- Advanced vocabulary including idioms and formal expressions.\n")
                    .append("- Topics: professional, academic, literary, philosophical.\n")
                    .append("- Grammar focus: all structures, nuanced tense usage, discourse markers.\n");
            case C2 -> sb.append("- 20-30 sentences with near-native complexity.\n")
                    .append("- Literary/academic register. Rare vocabulary, specialized terms.\n")
                    .append("- Topics: specialized fields, literary criticism, philosophical discourse.\n")
                    .append("- Grammar focus: stylistic choices, register variation, rhetorical devices.\n");
        }
        sb.append("\n");

        if (!allRules.isEmpty()) {
            sb.append("EXISTING GRAMMAR RULES in student's graph: ").append(String.join(", ", allRules)).append("\n")
              .append("CRITICAL: When the lesson covers grammar that matches an EXISTING RULE above, you MUST reuse the EXACT same name in grammarFocus. Do NOT create variations or synonyms.\n");
        }

        return sb.append("IMPORTANT RULES:\n")
                .append("- NEVER include citation references like [1], [2], [3] or any numbered references.\n")
                .append("- Do NOT reference external sources or videos.\n")
                .append("- phoneticMarkers: Write how EACH word from simplifiedText SOUNDS using ONLY ").append(nativeName).append(" letters.\n")
                .append("  CRITICAL RULES for phoneticMarkers:\n")
                .append("  1. Each phonetic word MUST map 1-to-1 with a word in simplifiedText (same position, same word count per sentence).\n")
                .append("  2. Separate sentences with line breaks (\\n) matching simplifiedText sentences exactly.\n")
                .append("  3. FORBIDDEN: ʁ ø œ ɛ ʃ ʒ ŋ θ ð ɑ æ ɔ ʊ ɪ ə and ANY IPA symbol. Use ONLY normal alphabet letters from ").append(nativeName).append(".\n")
                .append("  4. STRESSED syllable in UPPERCASE, unstressed in lowercase.\n")
                .append("  5. Write it so someone who ONLY reads ").append(nativeName).append(" would pronounce it close to ").append(targetName).append(".\n")
                .append("  Example (native=Portuguese, target=Spanish): simplifiedText=\"Yo tengo un hermano.\" → phoneticMarkers=\"iô TENgo un erMAno.\"\n")
                .append("  Example (native=Portuguese, target=French): simplifiedText=\"Je suis ta sœur.\" → phoneticMarkers=\"jê SÜI ta SÉRR.\"\n")
                .append("- vocabularyList: List the key words from the lesson with their translation to ").append(nativeName).append(". ")
                .append("Format: 'word = translation'. One per line.\n")
                .append("- culturalNote: A brief interesting cultural fact about the topic related to ").append(targetName).append(" speaking countries, written in ").append(nativeName).append(".\n")
                .append("FORMAT: Respond ONLY with a valid JSON object with these exact keys:\n")
                .append("{\n")
                .append("  \"simplifiedText\": \"(lesson text in ").append(targetName).append(")\",\n")
                .append("  \"phoneticMarkers\": \"(pronunciation guide using ").append(nativeName).append(" sounds)\",\n")
                .append("  \"grammarFocus\": [\"rule1\", \"rule2\"],\n")
                .append("  \"teachingNotes\": \"(grammar explanations)\",\n")
                .append("  \"vocabularyList\": \"(key words with translations)\",\n")
                .append("  \"culturalNote\": \"(cultural context)\"\n")
                .append("}")
                .toString();
    }

    private String buildAnalysisSystemPrompt(User user, String targetLanguage, int coverage, int total, int spoken, boolean hasWhisper) {
        String nativeName = LanguageNameMapper.getFullName(user.getNativeLanguage());
        StringBuilder sb = new StringBuilder()
                .append("You are a strict but encouraging speech and pronunciation auditor for language learners.\n")
                .append(buildLanguageInstruction(user, targetLanguage)).append("\n")
                .append("Coverage: ").append(coverage).append("% (").append(spoken).append("/").append(total).append(" words).\n")
                .append("SCORING RULES:\n")
                .append("- 40% weight on correctness (grammar, vocabulary, word choice).\n")
                .append("- 25% weight on completeness (coverage of original text).\n")
                .append("- 20% weight on fluency (natural flow, word order).\n")
                .append("- 15% weight on pronunciation (based on transcription differences).\n")
                .append("ERROR RULES:\n")
                .append("- For each error, 'rule' MUST be a short grammar/pronunciation rule name (e.g. 'Present Perfect', 'Article Usage', 'Th Sound', 'Vowel Length', 'Word Stress', 'R Pronunciation', 'Intonation Pattern').\n")
                .append("- 'tip' MUST be a practical, actionable explanation in ").append(nativeName).append(" on how to fix the mistake.\n");

        if (hasWhisper) {
            sb.append("PRONUNCIATION ANALYSIS (CRITICAL):\n")
                    .append("- The STUDENT text was transcribed from real audio by Whisper (speech recognition).\n")
                    .append("- Compare what Whisper heard (STUDENT) against the ORIGINAL to detect pronunciation issues.\n")
                    .append("- When Whisper hears a different word than expected (e.g. 'sink' instead of 'think'), this reveals a pronunciation error.\n")
                    .append("- Common pronunciation patterns to detect:\n")
                    .append("  * 'th' sounds: 'think'→'sink'/'tink', 'the'→'de'/'ze' (Th Sound)\n")
                    .append("  * vowel confusion: 'ship'→'sheep', 'bit'→'beat' (Vowel Length)\n")
                    .append("  * final consonants dropped: 'walked'→'walk', 'cats'→'cat' (Final Consonant)\n")
                    .append("  * r/l confusion: 'right'→'light' (R/L Distinction)\n")
                    .append("  * word stress: wrong syllable emphasis (Word Stress)\n")
                    .append("  * silent letters missed: 'knight'→'k-night' (Silent Letters)\n")
                    .append("  * connected speech: words merged or separated wrong (Connected Speech)\n")
                    .append("- For each pronunciation error, set 'expected' to the correct word and 'got' to what was actually heard.\n");
        } else {
            sb.append("- Include pronunciation errors when the spoken word sounds wrong (e.g. 'got':'tink' instead of 'expected':'think').\n");
        }

        sb.append("FEEDBACK RULES:\n")
                .append("- 'feedback' MUST be written in ").append(nativeName).append(".\n")
                .append("- Start with what the student did well, then what to improve.\n")
                .append("- Always include a PRONUNCIATION section in the feedback with:\n")
                .append("  * Which sounds the student struggles with.\n")
                .append("  * Practical mouth/tongue position tips (e.g. 'for th, place tongue between teeth').\n")
                .append("  * Accent patterns detected (e.g. 'you tend to replace th with s, common for Portuguese speakers').\n")
                .append("- If pronunciation was good, praise it specifically.\n")
                .append("Respond ONLY with valid JSON: {accuracy, errors: [{expected, got, rule, tip}], feedback}");
        return sb.toString();
    }

    private String buildExplainWordSystemPrompt(User user, String targetLanguage, Lesson lesson) {
        return new StringBuilder()
                .append("Contextual dictionary.\n")
                .append(buildLanguageInstruction(user, targetLanguage)).append("\n")
                .append("Topic: ").append(lesson.getTopic()).append("\n")
                .append("Respond ONLY with valid JSON: {word, definition, pronunciation, usage, examples[], relatedWords[]}")
                .toString();
    }

    private void saveFullPracticeResults(User user, Lesson lesson, SpeechAnalysisResponse analysis, byte[] audio, String text) {
        // Collect normalized error rule names
        java.util.Set<String> failedRules = new java.util.HashSet<>();
        if (analysis.getErrors() != null) {
            analysis.getErrors().stream()
                    .filter(e -> e.getRule() != null && !e.getRule().isBlank())
                    .forEach(e -> {
                        String normalized = normalizeRuleName(e.getRule());
                        failedRules.add(normalized);
                        competenceService.recordPractice(user.getId(), normalized, false);
                    });
        }

        // Record SUCCESS for grammar rules in the lesson that were NOT in the errors
        if (lesson.getGrammarFocus() != null) {
            lesson.getGrammarFocus().stream()
                    .filter(rule -> rule != null && !rule.isBlank())
                    .map(this::normalizeRuleName)
                    .filter(rule -> !failedRules.contains(rule))
                    .forEach(rule -> competenceService.recordPractice(user.getId(), rule, true));
        }

        practiceSessionRepository.save(PracticeSession.builder()
                .user(user).lesson(lesson).accuracy(analysis.getAccuracy())
                .transcribedText(text).audioData(audio)
                .errorCount(analysis.getErrors() != null ? analysis.getErrors().size() : 0)
                .errorsJson(toJsonString(analysis.getErrors())).feedback(analysis.getFeedback())
                .practiceDate(LocalDate.now()).build());

        lesson.recordAttempt(analysis.getAccuracy());
        lessonRepository.save(lesson);
        user.updateStreak(LocalDate.now());
    }

    private Lesson parseAndSaveLesson(String json, User user, String topic, String targetLanguage) throws Exception {
        JsonNode root = objectMapper.readTree(cleanJson(json));
        List<String> grammar = new ArrayList<>();
        root.path("grammarFocus").forEach(n -> grammar.add(normalizeRuleName(n.asText())));

        String teachingNotes = root.path("teachingNotes").asText();
        teachingNotes = cleanCitationReferences(teachingNotes);
        teachingNotes += generateYouTubeLinks(topic, user.getNativeLanguage(), targetLanguage);

        String vocabularyList = root.path("vocabularyList").asText("");
        String culturalNote = root.path("culturalNote").asText("");

        return lessonRepository.save(Lesson.builder()
                .user(user).topic(topic).targetLanguage(targetLanguage).level(user.getLevel())
                .simplifiedText(root.path("simplifiedText").asText())
                .phoneticMarkers(root.path("phoneticMarkers").asText())
                .teachingNotes(teachingNotes)
                .vocabularyList(vocabularyList)
                .culturalNote(culturalNote)
                .grammarFocus(grammar).audioSpeedMin(0.5).audioSpeedMax(1.5)
                .completed(false).bestScore(0).timesAttempted(0).build());
    }

    private String cleanCitationReferences(String text) {
        if (text == null) return "";
        return text.replaceAll("\\[\\d+\\]", "");
    }

    private String generateYouTubeLinks(String topic, String nativeLanguage, String targetLanguage) {
        String targetName = LanguageNameMapper.getFullName(targetLanguage).replaceAll("[()]", "").trim();
        String nativeName = LanguageNameMapper.getFullName(nativeLanguage).replaceAll("[()]", "").trim();

        String[] queries = {
                String.format("learn %s %s", targetName, topic),
                String.format("%s lesson %s beginners", targetName, topic),
                String.format("%s %s practice", targetName, topic)
        };

        String[] labels = {
                String.format("Learn %s - %s", targetName, topic),
                String.format("%s lesson: %s for beginners", targetName, topic),
                String.format("%s %s practice", targetName, topic)
        };

        StringBuilder sb = new StringBuilder("\n\n**Recommended Videos:**\n");
        for (int i = 0; i < queries.length; i++) {
            String encoded = URLEncoder.encode(queries[i], StandardCharsets.UTF_8);
            sb.append(String.format("- [%s](https://www.youtube.com/results?search_query=%s)\n", labels[i], encoded));
        }
        return sb.toString();
    }

    private SpeechAnalysisResponse parseSpeechAnalysis(String json) {
        try {
            JsonNode root = objectMapper.readTree(cleanJson(json));
            List<SpeechAnalysisResponse.SpeechError> errors = new ArrayList<>();
            root.path("errors").forEach(e -> errors.add(SpeechAnalysisResponse.SpeechError.builder()
                    .expected(e.path("expected").asText()).got(e.path("got").asText())
                    .rule(e.path("rule").asText()).tip(e.path("tip").asText()).build()));

            return SpeechAnalysisResponse.builder()
                    .accuracy(root.path("accuracy").asInt(0))
                    .feedback(root.path("feedback").asText()).errors(errors).build();
        } catch (Exception e) {
            throw new AIProviderException("PARSE_ERROR", "Invalid analysis", e);
        }
    }

    private ExplainWordResponse parseExplainWord(String json) {
        try {
            JsonNode root = objectMapper.readTree(cleanJson(json));
            List<String> examples = new ArrayList<>();
            root.path("examples").forEach(n -> examples.add(n.asText()));
            List<String> related = new ArrayList<>();
            root.path("relatedWords").forEach(n -> related.add(n.asText()));

            return ExplainWordResponse.builder()
                    .word(root.path("word").asText()).definition(root.path("definition").asText())
                    .pronunciation(root.path("pronunciation").asText()).usage(root.path("usage").asText())
                    .examples(examples).relatedWords(related).build();
        } catch (Exception e) {
            throw new AIProviderException("PARSE_ERROR", "Invalid explanation", e);
        }
    }

    private LessonResponseDTO mapToDTO(Lesson lesson) {
        return LessonResponseDTO.builder()
                .id(lesson.getId()).topic(lesson.getTopic())
                .targetLanguage(lesson.getTargetLanguage())
                .level(lesson.getLevel())
                .simplifiedText(lesson.getSimplifiedText()).phoneticMarkers(lesson.getPhoneticMarkers())
                .teachingNotes(lesson.getTeachingNotes())
                .vocabularyList(lesson.getVocabularyList())
                .culturalNote(lesson.getCulturalNote())
                .grammarFocus(new ArrayList<>(lesson.getGrammarFocus()))
                .audioSpeedMin(lesson.getAudioSpeedMin()).audioSpeedMax(lesson.getAudioSpeedMax())
                .completed(lesson.getCompleted()).bestScore(lesson.getBestScore())
                .timesAttempted(lesson.getTimesAttempted()).completedAt(lesson.getCompletedAt()).build();
    }

    private PracticeSessionResponseDTO mapToSessionDTO(PracticeSession session) {
        return PracticeSessionResponseDTO.builder()
                .id(session.getId())
                .accuracy(session.getAccuracy())
                .transcribedText(session.getTranscribedText())
                .feedback(session.getFeedback())
                .createdAt(session.getCreatedAt())
                .audioUrl("/api/lessons/sessions/" + session.getId() + "/audio")
                .build();
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

    private String cleanJson(String json) {
        return json.replaceAll("(?s).*?(\\{.*\\}).*", "$1");
    }

    private String toJsonString(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "[]"; }
    }

    @Transactional(readOnly = true)
    public List<LessonResponseDTO> findByUser(UUID userId) {
        return lessonRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<LessonResponseDTO> findByUser(UUID userId, int page, int size) {
        return lessonRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public LessonResponseDTO findById(UUID id) {
        return lessonRepository.findById(id).map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", id));
    }
}
