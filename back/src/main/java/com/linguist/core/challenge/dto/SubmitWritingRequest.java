package com.linguist.core.challenge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitWritingRequest {

    @NotNull
    private UUID userId;

    @NotNull
    private UUID challengeId;

    @NotBlank
    private String text;
}
