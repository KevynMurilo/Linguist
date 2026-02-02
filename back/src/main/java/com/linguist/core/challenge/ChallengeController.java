package com.linguist.core.challenge;

import com.linguist.core.challenge.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/challenges")
@RequiredArgsConstructor
@Tag(name = "Challenges", description = "Writing and Listening challenges with AI feedback")
public class ChallengeController {

    private final ChallengeService challengeService;

    @GetMapping("/{id}")
    @Operation(summary = "Get a challenge by ID")
    public ResponseEntity<ChallengeResponseDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(challengeService.findById(id));
    }

    // ─── WRITING ────────────────────────────────────────────────

    @PostMapping("/writing/generate")
    @Operation(summary = "Generate a writing challenge prompt based on student level")
    public ResponseEntity<ChallengeResponseDTO> generateWriting(
            @Valid @RequestBody GenerateChallengeRequest request,
            @Parameter(description = "AI provider API key", required = true)
            @RequestHeader("X-AI-Key") String apiKey,
            @Parameter(description = "AI provider name", required = true, example = "gemini")
            @RequestHeader("X-AI-Provider") String provider) {

        return ResponseEntity.status(HttpStatus.CREATED).body(
                challengeService.generateWritingChallenge(
                        request.getUserId(), request.getTargetLanguage(), provider, apiKey));
    }

    @PostMapping("/writing/submit")
    @Operation(summary = "Submit written text for AI analysis")
    public ResponseEntity<ChallengeResponseDTO> submitWriting(
            @Valid @RequestBody SubmitWritingRequest request,
            @Parameter(description = "AI provider API key", required = true)
            @RequestHeader("X-AI-Key") String apiKey,
            @Parameter(description = "AI provider name", required = true, example = "gemini")
            @RequestHeader("X-AI-Provider") String provider) {

        return ResponseEntity.ok(
                challengeService.submitWritingChallenge(
                        request.getUserId(), request.getChallengeId(), request.getText(), provider, apiKey));
    }

    @GetMapping("/writing/user/{userId}")
    @Operation(summary = "Get writing challenge history (paginated)")
    public ResponseEntity<Page<ChallengeResponseDTO>> getWritingHistory(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        return ResponseEntity.ok(
                challengeService.getHistory(userId, ChallengeType.WRITING, page, size));
    }

    @GetMapping("/writing/user/{userId}/pending")
    @Operation(summary = "Get the latest pending writing challenge for the user")
    public ResponseEntity<ChallengeResponseDTO> getWritingPending(@PathVariable UUID userId) {
        ChallengeResponseDTO pending = challengeService.getLatestPending(userId, ChallengeType.WRITING);
        if (pending == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(pending);
    }

    // ─── LISTENING ──────────────────────────────────────────────

    @PostMapping("/listening/generate")
    @Operation(summary = "Generate a listening challenge sentence based on student level")
    public ResponseEntity<ChallengeResponseDTO> generateListening(
            @Valid @RequestBody GenerateChallengeRequest request,
            @Parameter(description = "AI provider API key", required = true)
            @RequestHeader("X-AI-Key") String apiKey,
            @Parameter(description = "AI provider name", required = true, example = "gemini")
            @RequestHeader("X-AI-Provider") String provider) {

        return ResponseEntity.status(HttpStatus.CREATED).body(
                challengeService.generateListeningChallenge(
                        request.getUserId(), request.getTargetLanguage(), provider, apiKey));
    }

    @PostMapping("/listening/submit")
    @Operation(summary = "Submit what was heard in the listening challenge")
    public ResponseEntity<ChallengeResponseDTO> submitListening(
            @Valid @RequestBody SubmitListeningRequest request,
            @Parameter(description = "AI provider API key", required = true)
            @RequestHeader("X-AI-Key") String apiKey,
            @Parameter(description = "AI provider name", required = true, example = "gemini")
            @RequestHeader("X-AI-Provider") String provider) {

        return ResponseEntity.ok(
                challengeService.submitListeningChallenge(
                        request.getUserId(), request.getChallengeId(), request.getTypedText(), provider, apiKey));
    }

    @GetMapping("/listening/user/{userId}")
    @Operation(summary = "Get listening challenge history (paginated)")
    public ResponseEntity<Page<ChallengeResponseDTO>> getListeningHistory(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        return ResponseEntity.ok(
                challengeService.getHistory(userId, ChallengeType.LISTENING, page, size));
    }
}
