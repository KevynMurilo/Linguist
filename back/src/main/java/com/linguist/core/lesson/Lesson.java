package com.linguist.core.lesson;

import com.linguist.core.user.LanguageLevel;
import com.linguist.core.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "lessons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String topic;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String simplifiedText;

    @Column(columnDefinition = "TEXT")
    private String phoneticMarkers;

    @Column(columnDefinition = "TEXT")
    private String teachingNotes;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "lesson_grammar_focus", joinColumns = @JoinColumn(name = "lesson_id"))
    @Column(name = "grammar_rule")
    private List<String> grammarFocus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LanguageLevel level;

    @Column(nullable = false)
    @Builder.Default
    private Double audioSpeedMin = 0.5;

    @Column(nullable = false)
    @Builder.Default
    private Double audioSpeedMax = 1.5;

    @Column(nullable = false)
    @Builder.Default
    private Boolean completed = false;

    private LocalDateTime completedAt;

    @Column(nullable = false)
    @Builder.Default
    private Integer bestScore = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer timesAttempted = 0;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void recordAttempt(int accuracy) {
        this.timesAttempted++;
        if (accuracy > this.bestScore) {
            this.bestScore = accuracy;
        }
        if (accuracy >= 80 && !this.completed) {
            this.completed = true;
            this.completedAt = LocalDateTime.now();
        }
    }
}