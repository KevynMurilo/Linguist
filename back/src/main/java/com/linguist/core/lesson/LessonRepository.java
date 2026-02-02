package com.linguist.core.lesson;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {

    List<Lesson> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Page<Lesson> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    long countByUserId(UUID userId);
    long countByUserIdAndCompletedTrue(UUID userId);

    @Query("SELECT l FROM Lesson l JOIN l.grammarFocus g WHERE l.user.id = :userId AND LOWER(TRIM(g)) = LOWER(TRIM(:ruleName)) ORDER BY l.createdAt DESC")
    List<Lesson> findByUserIdAndGrammarRule(@Param("userId") UUID userId, @Param("ruleName") String ruleName);

    @Query("SELECT l FROM Lesson l JOIN l.grammarFocus g WHERE l.user.id = :userId AND LOWER(TRIM(g)) = LOWER(TRIM(:ruleName)) ORDER BY l.createdAt DESC")
    Page<Lesson> findByUserIdAndGrammarRule(@Param("userId") UUID userId, @Param("ruleName") String ruleName, Pageable pageable);
}
