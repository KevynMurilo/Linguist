package com.linguist.core.mastery;

import com.linguist.core.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "competences", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "rule_name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Competence {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "rule_name", nullable = false)
    private String ruleName;

    @Column(nullable = false)
    @Builder.Default
    private Integer masteryLevel = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer failCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer practiceCount = 0;

    private LocalDateTime lastPracticed;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void recordSuccess() {
        this.practiceCount++;
        this.masteryLevel = Math.min(100, this.masteryLevel + 5);
        this.lastPracticed = LocalDateTime.now();
    }

    public void recordFailure() {
        this.practiceCount++;
        this.failCount++;
        this.masteryLevel = Math.max(0, this.masteryLevel - 10);
        this.lastPracticed = LocalDateTime.now();
    }
}
