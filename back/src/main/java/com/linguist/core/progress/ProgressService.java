package com.linguist.core.progress;

import com.linguist.core.challenge.Challenge;
import com.linguist.core.challenge.ChallengeRepository;
import com.linguist.core.challenge.ChallengeType;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

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
    private final ChallengeRepository challengeRepository;

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

        LocalDate today = LocalDate.now();
        long todaySessions = practiceSessionRepository.countByUserIdAndPracticeDate(userId, today);
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime todayEnd = today.atTime(LocalTime.MAX);
        long todayChallenges = challengeRepository.countByUserIdAndCompletedTrueAndCompletedAtBetween(userId, todayStart, todayEnd);
        long dailyGoalProgress = todaySessions + todayChallenges;

        long dueReviewCount = competenceRepository.countByUserIdAndNextReviewAtBefore(userId, LocalDateTime.now());

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
                .dailyGoalTarget(user.getDailyGoal())
                .dailyGoalProgress(dailyGoalProgress)
                .dueReviewCount(dueReviewCount)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TimelineEntry> getTimeline(UUID userId, int days) {
        LocalDateTime from = LocalDate.now().minusDays(days).atStartOfDay();
        LocalDateTime to = LocalDate.now().atTime(LocalTime.MAX);

        List<TimelineEntry> entries = new ArrayList<>();

        practiceSessionRepository
                .findByUserIdAndPracticeDateBetweenOrderByCreatedAtDesc(userId, from.toLocalDate(), to.toLocalDate())
                .forEach(s -> entries.add(mapSessionToEntry(s)));

        challengeRepository
                .findByUserIdAndCompletedTrueAndCompletedAtBetweenOrderByCompletedAtDesc(userId, from, to)
                .forEach(c -> entries.add(mapChallengeToEntry(c)));

        entries.sort(Comparator.comparing(TimelineEntry::getPracticedAt).reversed());
        return entries;
    }

    @Transactional(readOnly = true)
    public Page<TimelineEntry> getTimeline(UUID userId, int days, int page, int size) {
        List<TimelineEntry> all = getTimeline(userId, days);
        int start = page * size;
        int end = Math.min(start + size, all.size());

        if (start >= all.size()) {
            return new PageImpl<>(List.of(), PageRequest.of(page, size), all.size());
        }

        return new PageImpl<>(all.subList(start, end), PageRequest.of(page, size), all.size());
    }

    private TimelineEntry mapSessionToEntry(PracticeSession s) {
        return TimelineEntry.builder()
                .sessionId(s.getId())
                .lessonId(s.getLesson() != null ? s.getLesson().getId() : null)
                .type(TimelineEntry.ActivityType.LESSON)
                .title(s.getLesson() != null ? s.getLesson().getTopic() : "Deleted Lesson")
                .score(s.getAccuracy())
                .errorCount(s.getErrorCount())
                .feedback(s.getFeedback())
                .practicedAt(s.getCreatedAt())
                .build();
    }

    private TimelineEntry mapChallengeToEntry(Challenge c) {
        TimelineEntry.ActivityType type = c.getType() == ChallengeType.WRITING
                ? TimelineEntry.ActivityType.WRITING
                : TimelineEntry.ActivityType.LISTENING;

        String title = c.getType() == ChallengeType.WRITING
                ? (c.getPrompt() != null ? c.getPrompt().split("\n")[0] : "Writing Challenge")
                : (c.getOriginalText() != null ? truncate(c.getOriginalText(), 50) : "Listening Challenge");

        return TimelineEntry.builder()
                .sessionId(c.getId())
                .lessonId(null)
                .type(type)
                .title(title)
                .score(c.getScore())
                .errorCount(null)
                .feedback(c.getFeedback())
                .practicedAt(c.getCompletedAt())
                .build();
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
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