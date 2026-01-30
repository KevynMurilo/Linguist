package com.linguist.core.mastery;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompetenceRepository extends JpaRepository<Competence, UUID> {

    List<Competence> findByUserId(UUID userId);

    List<Competence> findByUserIdAndMasteryLevelLessThan(UUID userId, int threshold);

    Optional<Competence> findByUserIdAndRuleName(UUID userId, String ruleName);
}
