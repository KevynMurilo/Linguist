package com.linguist.core.vocabulary;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface VocabularyRepository extends JpaRepository<Vocabulary, UUID> {

    Page<Vocabulary> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<Vocabulary> findByUserIdAndNextReviewAtBeforeOrderByNextReviewAtAsc(UUID userId, LocalDateTime now, Pageable pageable);

    Optional<Vocabulary> findByUserIdAndWord(UUID userId, String word);

    long countByUserId(UUID userId);

    long countByUserIdAndMasteryLevelGreaterThanEqual(UUID userId, int threshold);

    long countByUserIdAndNextReviewAtBefore(UUID userId, LocalDateTime now);
}
