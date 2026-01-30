package com.linguist.core.progress;

import com.linguist.core.lesson.LessonRepository;
import com.linguist.core.mastery.Competence;
import com.linguist.core.mastery.CompetenceRepository;
import com.linguist.core.mastery.PracticeSession;
import com.linguist.core.mastery.PracticeSessionRepository;
import com.linguist.core.progress.dto.DashboardResponse;
import com.linguist.core.progress.dto.LevelCheckResponse;
import com.linguist.core.progress.dto.TimelineEntry;
import com.linguist.core.user.LanguageLevel;
import com.linguist.core.user.User;
import com.linguist.core.user.UserRepository;
import com.linguist.core.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProgressService {

    private static final int PROMOTION_MASTERY_THRESHOLD = 75;
    private static final int PROMOTION_MIN_RULES = 5;

    private final UserService userService;
    private final UserRepository userRepository;
    private final CompetenceRepository competenceRepository;
    private final PracticeSessionRepository practiceSessionRepository;
    private final LessonRepository lessonRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(UUID userId) {
        User user = userService.findById(userId);
        List<Competence> competences = competenceRepository.findByUserId(userId);

        double averageMastery = competences.isEmpty() ? 0.0 :
                competences.stream().mapToInt(Competence::getMasteryLevel).average().orElse(0.0);

        long rulesMastered = competences.stream().filter(c -> c.getMasteryLevel() >= 80).count();
        long rulesWeak = competences.stream().filter(c -> c.getMasteryLevel() < 50).count();

        long totalSessions = practiceSessionRepository.countByUserId(userId);
        double averageAccuracy = totalSessions > 0 ?
                practiceSessionRepository.averageAccuracyByUserId(userId) : 0.0;

        long totalLessons = lessonRepository.countByUserId(userId);
        long lessonsCompleted = lessonRepository.countByUserIdAndCompletedTrue(userId);

        LocalDate weekAgo = LocalDate.now().minusDays(7);
        long sessionsLast7Days = practiceSessionRepository
                .countByUserIdAndPracticeDateAfter(userId, weekAgo);

        List<String> weakestRules = competences.stream()
                .sorted(Comparator.comparingInt(Competence::getMasteryLevel))
                .limit(5)
                .map(Competence::getRuleName)
                .toList();

        boolean eligible = averageMastery >= PROMOTION_MASTERY_THRESHOLD
                && rulesMastered >= PROMOTION_MIN_RULES
                && user.getLevel().ordinal() < LanguageLevel.C2.ordinal();

        LanguageLevel nextLevel = eligible ?
                LanguageLevel.values()[user.getLevel().ordinal() + 1] : null;

        return DashboardResponse.builder()
                .currentLevel(user.getLevel())
                .nextLevel(nextLevel)
                .eligibleForPromotion(eligible)
                .averageMastery(Math.round(averageMastery * 100.0) / 100.0)
                .totalRulesTracked((long) competences.size())
                .rulesMastered(rulesMastered)
                .rulesWeak(rulesWeak)
                .averageAccuracy(Math.round(averageAccuracy * 100.0) / 100.0)
                .totalSessions(totalSessions)
                .totalLessons(totalLessons)
                .lessonsCompleted(lessonsCompleted)
                .currentStreak(user.getCurrentStreak())
                .longestStreak(user.getLongestStreak())
                .lastPracticeDate(user.getLastPracticeDate())
                .sessionsLast7Days(sessionsLast7Days)
                .weakestRules(weakestRules)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TimelineEntry> getTimeline(UUID userId, int days) {
        LocalDate from = LocalDate.now().minusDays(days);

        List<PracticeSession> sessions = practiceSessionRepository
                .findByUserIdAndPracticeDateBetweenOrderByCreatedAtDesc(userId, from, LocalDate.now());

        return sessions.stream()
                .map(s -> TimelineEntry.builder()
                        .sessionId(s.getId())
                        .lessonId(s.getLesson() != null ? s.getLesson().getId() : null)
                        .lessonTopic(s.getLesson() != null ? s.getLesson().getTopic() : "Deleted Lesson")
                        .accuracy(s.getAccuracy())
                        .errorCount(s.getErrorCount())
                        .feedback(s.getFeedback())
                        .practicedAt(s.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public LevelCheckResponse checkAndPromote(UUID userId) {
        User user = userService.findById(userId);
        List<Competence> competences = competenceRepository.findByUserId(userId);

        double averageMastery = competences.isEmpty() ? 0.0 :
                competences.stream().mapToInt(Competence::getMasteryLevel).average().orElse(0.0);

        long rulesMastered = competences.stream().filter(c -> c.getMasteryLevel() >= 80).count();

        LanguageLevel previousLevel = user.getLevel();
        boolean promoted = false;
        String message;

        if (user.getLevel().ordinal() >= LanguageLevel.C2.ordinal()) {
            message = "Already at maximum level (C2). Keep practicing to maintain mastery!";
        } else if (competences.size() < PROMOTION_MIN_RULES) {
            message = String.format("Need at least %d tracked rules. Currently tracking: %d. Keep studying!",
                    PROMOTION_MIN_RULES, competences.size());
        } else if (averageMastery < PROMOTION_MASTERY_THRESHOLD) {
            message = String.format("Average mastery is %.1f%%. Need %.0f%% for promotion. Focus on weak rules!",
                    averageMastery, (double) PROMOTION_MASTERY_THRESHOLD);
        } else if (rulesMastered < PROMOTION_MIN_RULES) {
            message = String.format("Mastered %d rules. Need at least %d with 80%% mastery. Almost there!",
                    rulesMastered, PROMOTION_MIN_RULES);
        } else {
            LanguageLevel newLevel = LanguageLevel.values()[user.getLevel().ordinal() + 1];
            user.setLevel(newLevel);
            userRepository.save(user);
            promoted = true;
            message = String.format("Congratulations! Promoted from %s to %s!",
                    previousLevel.name(), newLevel.name());
        }

        return LevelCheckResponse.builder()
                .previousLevel(previousLevel)
                .currentLevel(user.getLevel())
                .promoted(promoted)
                .averageMastery(Math.round(averageMastery * 100.0) / 100.0)
                .rulesMastered(rulesMastered)
                .requiredMastery(PROMOTION_MASTERY_THRESHOLD)
                .requiredRulesMastered(PROMOTION_MIN_RULES)
                .message(message)
                .build();
    }
}