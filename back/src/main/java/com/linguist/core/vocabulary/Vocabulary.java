package com.linguist.core.vocabulary;

import com.linguist.core.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vocabularies", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "word"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vocabulary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String word;

    @Column(nullable = false)
    private String translation;

    private String context;

    @Column(nullable = false)
    @Builder.Default
    private Integer masteryLevel = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer reviewCount = 0;

    private LocalDateTime nextReviewAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.nextReviewAt == null) {
            this.nextReviewAt = LocalDateTime.now();
        }
    }

    public void recordCorrect() {
        this.reviewCount++;
        this.masteryLevel = Math.min(100, this.masteryLevel + 15);
        this.nextReviewAt = calculateNextReview();
    }

    public void recordIncorrect() {
        this.reviewCount++;
        this.masteryLevel = Math.max(0, this.masteryLevel - 10);
        this.nextReviewAt = LocalDateTime.now().plusDays(1);
    }

    private LocalDateTime calculateNextReview() {
        LocalDateTime now = LocalDateTime.now();
        if (this.masteryLevel < 30) return now.plusDays(1);
        if (this.masteryLevel < 60) return now.plusDays(3);
        if (this.masteryLevel < 80) return now.plusDays(7);
        return now.plusDays(14);
    }
}
