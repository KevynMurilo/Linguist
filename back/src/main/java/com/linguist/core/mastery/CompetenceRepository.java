package com.linguist.core.mastery;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompetenceRepository extends JpaRepository<Competence, UUID> {

    List<Competence> findByUserId(UUID userId);
    Page<Competence> findByUserId(UUID userId, Pageable pageable);

    List<Competence> findByUserIdAndMasteryLevelLessThan(UUID userId, int threshold);
    Page<Competence> findByUserIdAndMasteryLevelLessThan(UUID userId, int threshold, Pageable pageable);

    Optional<Competence> findByUserIdAndRuleName(UUID userId, String ruleName);
}
