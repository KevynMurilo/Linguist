package com.linguist.core.challenge.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request to generate a new writing or listening challenge")
public class GenerateChallengeRequest {

    @NotNull
    @Schema(description = "User ID", required = true)
    private UUID userId;

    @Schema(example = "es-ES", description = "Target language. Uses user default if omitted.")
    private String targetLanguage;
}
