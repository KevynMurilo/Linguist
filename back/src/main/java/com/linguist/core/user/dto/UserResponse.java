package com.linguist.core.user.dto;

import com.linguist.core.user.LanguageLevel;
import com.linguist.core.user.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "User profile response with progress tracking")
public class UserResponse {

    private UUID id;
    private String name;
    private String email;
    private String nativeLanguage;
    private String targetLanguage;
    private LanguageLevel level;

    @Schema(description = "Current consecutive practice day streak")
    private Integer currentStreak;

    @Schema(description = "Longest consecutive practice day streak ever achieved")
    private Integer longestStreak;

    @Schema(description = "Date of last practice session")
    private LocalDate lastPracticeDate;

    @Schema(description = "Total number of practice sessions completed")
    private Long totalPracticeSessions;

    private LocalDateTime createdAt;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .nativeLanguage(user.getNativeLanguage())
                .targetLanguage(user.getTargetLanguage())
                .level(user.getLevel())
                .currentStreak(user.getCurrentStreak())
                .longestStreak(user.getLongestStreak())
                .lastPracticeDate(user.getLastPracticeDate())
                .totalPracticeSessions(user.getTotalPracticeSessions())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
