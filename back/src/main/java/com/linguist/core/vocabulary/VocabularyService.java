package com.linguist.core.vocabulary;

import com.linguist.core.exception.ResourceNotFoundException;
import com.linguist.core.user.User;
import com.linguist.core.user.UserService;
import com.linguist.core.vocabulary.dto.VocabularyStatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VocabularyService {

    private final VocabularyRepository vocabularyRepository;
    private final UserService userService;

    @Transactional
    public void extractAndSave(UUID userId, String vocabularyList, String topic) {
        if (vocabularyList == null || vocabularyList.isBlank()) return;

        User user = userService.findById(userId);
        String[] lines = vocabularyList.split("\n");

        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) continue;

            String[] parts = line.split("\\s*=\\s*", 2);
            if (parts.length < 2) continue;

            String word = parts[0].trim();
            String translation = parts[1].trim();

            if (word.isEmpty() || translation.isEmpty()) continue;

            vocabularyRepository.findByUserIdAndWord(userId, word)
                    .ifPresentOrElse(
                            existing -> {},
                            () -> vocabularyRepository.save(Vocabulary.builder()
                                    .user(user)
                                    .word(word)
                                    .translation(translation)
                                    .context(topic)
                                    .build())
                    );
        }
    }

    @Transactional(readOnly = true)
    public Page<Vocabulary> getAll(UUID userId, int page, int size) {
        return vocabularyRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public Page<Vocabulary> getDueCards(UUID userId, int page, int size) {
        return vocabularyRepository.findByUserIdAndNextReviewAtBeforeOrderByNextReviewAtAsc(
                userId, LocalDateTime.now(), PageRequest.of(page, size));
    }

    @Transactional
    public Vocabulary recordReview(UUID vocabId, boolean correct) {
        Vocabulary vocab = vocabularyRepository.findById(vocabId)
                .orElseThrow(() -> new ResourceNotFoundException("Vocabulary", vocabId));

        if (correct) {
            vocab.recordCorrect();
        } else {
            vocab.recordIncorrect();
        }

        return vocabularyRepository.save(vocab);
    }

    @Transactional(readOnly = true)
    public VocabularyStatsResponse getStats(UUID userId) {
        long total = vocabularyRepository.countByUserId(userId);
        long mastered = vocabularyRepository.countByUserIdAndMasteryLevelGreaterThanEqual(userId, 80);
        long due = vocabularyRepository.countByUserIdAndNextReviewAtBefore(userId, LocalDateTime.now());

        return VocabularyStatsResponse.builder()
                .totalWords(total)
                .masteredWords(mastered)
                .dueForReview(due)
                .build();
    }

    @Transactional
    public void delete(UUID vocabId) {
        Vocabulary vocab = vocabularyRepository.findById(vocabId)
                .orElseThrow(() -> new ResourceNotFoundException("Vocabulary", vocabId));
        vocabularyRepository.delete(vocab);
    }
}
