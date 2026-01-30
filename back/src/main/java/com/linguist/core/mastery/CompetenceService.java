package com.linguist.core.mastery;

import com.linguist.core.user.User;
import com.linguist.core.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompetenceService {

    private final CompetenceRepository competenceRepository;
    private final UserService userService;

    public List<Competence> findByUserId(UUID userId) {
        return competenceRepository.findByUserId(userId);
    }

    public List<Competence> findWeaknesses(UUID userId, int threshold) {
        return competenceRepository.findByUserIdAndMasteryLevelLessThan(userId, threshold);
    }

    public List<String> getWeakRuleNames(UUID userId) {
        return findWeaknesses(userId, 60).stream()
                .map(Competence::getRuleName)
                .toList();
    }

    @Transactional
    public Competence recordPractice(UUID userId, String ruleName, boolean success) {
        User user = userService.findById(userId);

        Competence competence = competenceRepository
                .findByUserIdAndRuleName(userId, ruleName)
                .orElseGet(() -> Competence.builder()
                        .user(user)
                        .ruleName(ruleName)
                        .masteryLevel(0)
                        .failCount(0)
                        .practiceCount(0)
                        .build());

        if (success) {
            competence.recordSuccess();
        } else {
            competence.recordFailure();
        }

        return competenceRepository.save(competence);
    }
}
