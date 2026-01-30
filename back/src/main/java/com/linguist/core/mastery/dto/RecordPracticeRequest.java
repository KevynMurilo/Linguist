package com.linguist.core.mastery.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Records a practice result for a grammar rule")
public class RecordPracticeRequest {

    @NotNull
    @Schema(description = "User ID")
    private UUID userId;

    @NotBlank
    @Size(min = 2, max = 100)
    @Schema(example = "Present Perfect", description = "Grammar rule name")
    private String ruleName;

    @NotNull
    @Schema(example = "true", description = "Whether the user succeeded")
    private Boolean success;
}
