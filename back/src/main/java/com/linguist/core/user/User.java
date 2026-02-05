package com.linguist.core.user;

import com.linguist.core.lesson.Lesson;
import com.linguist.core.mastery.Competence;
import com.linguist.core.mastery.PracticeSession;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 10)
    private String nativeLanguage;

    @Column(nullable = false, length = 10)
    private String targetLanguage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LanguageLevel level;

    @Column(nullable = false)
    @Builder.Default
    private Integer currentStreak = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer longestStreak = 0;

    private LocalDate lastPracticeDate;

    @Column(nullable = false)
    @Builder.Default
    private Long totalPracticeSessions = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Integer dailyGoal = 3;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Lesson> lessons = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Competence> competences = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PracticeSession> practiceSessions = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateStreak(LocalDate today) {
        if (this.lastPracticeDate == null) {
            this.currentStreak = 1;
        } else if (this.lastPracticeDate.equals(today)) {
            return;
        } else if (this.lastPracticeDate.equals(today.minusDays(1))) {
            this.currentStreak++;
        } else {
            this.currentStreak = 1;
        }

        if (this.currentStreak > this.longestStreak) {
            this.longestStreak = this.currentStreak;
        }

        this.lastPracticeDate = today;
        this.totalPracticeSessions++;
    }
}
