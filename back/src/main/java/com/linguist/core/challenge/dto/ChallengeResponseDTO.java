package com.linguist.core.challenge.dto;

import com.linguist.core.challenge.ChallengeType;
import com.linguist.core.user.LanguageLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChallengeResponseDTO {

    private UUID id;
    private ChallengeType type;
    private LanguageLevel level;
    private String targetLanguage;
    private String prompt;

    @Schema(description = "Original text for listening. Returned for TTS playback but should not be shown before submission.")
    private String originalText;

    private String studentResponse;
    private Integer score;
    private String feedback;
    private String analysisJson;
    private Boolean completed;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
