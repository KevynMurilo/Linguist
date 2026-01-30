package com.linguist.core.mastery;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PracticeSessionRepository extends JpaRepository<PracticeSession, UUID> {

    List<PracticeSession> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Page<PracticeSession> findByLessonIdOrderByCreatedAtDesc(UUID lessonId, Pageable pageable);

    List<PracticeSession> findByLessonId(UUID lessonId);

    List<PracticeSession> findByLessonIdOrderByCreatedAtDesc(UUID lessonId);

    List<PracticeSession> findByUserIdAndPracticeDateBetweenOrderByCreatedAtDesc(
            UUID userId, LocalDate from, LocalDate to);

    long countByUserIdAndPracticeDateAfter(UUID userId, LocalDate date);

    List<PracticeSession> findByUserIdAndLessonIdOrderByCreatedAtDesc(UUID userId, UUID lessonId);

    long countByUserId(UUID userId);

    @Query("SELECT COALESCE(AVG(ps.accuracy), 0) FROM PracticeSession ps WHERE ps.user.id = :userId")
    double averageAccuracyByUserId(UUID userId);

    @Query("SELECT DISTINCT ps.practiceDate FROM PracticeSession ps WHERE ps.user.id = :userId ORDER BY ps.practiceDate DESC")
    List<LocalDate> findDistinctPracticeDatesByUserId(UUID userId);

    @Query("SELECT COUNT(ps) FROM PracticeSession ps WHERE ps.user.id = :userId AND ps.practiceDate = :date")
    long countByUserIdAndPracticeDate(UUID userId, LocalDate date);
}