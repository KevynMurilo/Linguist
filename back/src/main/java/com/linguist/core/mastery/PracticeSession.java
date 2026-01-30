package com.linguist.core.mastery;

import com.linguist.core.lesson.Lesson;
import com.linguist.core.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "practice_sessions", indexes = {
        @Index(name = "idx_session_user_date", columnList = "user_id, practice_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PracticeSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(nullable = false)
    private Integer accuracy;

    @Column(columnDefinition = "TEXT")
    private String transcribedText;

    @Lob
    @Column(name = "audio_data")
    private byte[] audioData;

    @Column(nullable = false)
    private Integer errorCount;

    @Column(columnDefinition = "TEXT")
    private String errorsJson;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "practice_date", nullable = false)
    private LocalDate practiceDate;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.practiceDate == null) {
            this.practiceDate = LocalDate.now();
        }
    }
}