package com.linguist.core.vocabulary.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Vocabulary review result")
public class ReviewRequest {

    @NotNull
    @Schema(description = "Whether the student knew the word")
    private Boolean correct;
}
