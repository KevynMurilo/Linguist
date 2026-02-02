package com.linguist.core.challenge;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChallengeRepository extends JpaRepository<Challenge, UUID> {

    Page<Challenge> findByUserIdAndTypeOrderByCreatedAtDesc(UUID userId, ChallengeType type, Pageable pageable);

    long countByUserIdAndType(UUID userId, ChallengeType type);

    long countByUserIdAndTypeAndCompletedTrue(UUID userId, ChallengeType type);

    Optional<Challenge> findFirstByUserIdAndTypeAndCompletedFalseOrderByCreatedAtDesc(UUID userId, ChallengeType type);

    @Query("SELECT c.originalText FROM Challenge c WHERE c.user.id = :userId AND c.type = :type AND c.originalText IS NOT NULL ORDER BY c.createdAt DESC")
    List<String> findLastOriginalTexts(UUID userId, ChallengeType type, Pageable pageable);

    @Query("SELECT c.prompt FROM Challenge c WHERE c.user.id = :userId AND c.type = :type ORDER BY c.createdAt DESC")
    List<String> findLastPrompts(UUID userId, ChallengeType type, Pageable pageable);
}
