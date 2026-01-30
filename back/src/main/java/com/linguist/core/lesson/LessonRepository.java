package com.linguist.core.lesson;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {

    List<Lesson> findByUserIdOrderByCreatedAtDesc(UUID userId);
    long countByUserId(UUID userId);
    long countByUserIdAndCompletedTrue(UUID userId);
}
