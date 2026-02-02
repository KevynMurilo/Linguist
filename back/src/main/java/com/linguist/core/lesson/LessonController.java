package com.linguist.core.lesson;

import com.linguist.core.exception.ErrorResponse;
import com.linguist.core.lesson.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/lessons")
@RequiredArgsConstructor
@Tag(name = "Lesson Engine", description = "AI-powered lesson generation, Shadowing speech analysis with audio persistence, and practice history management")
public class LessonController {

    private final LessonService lessonService;

    @PostMapping("/generate")
    @Operation(
            summary = "Generate a personalized lesson",
            description = "Creates a Shadowing lesson adapted to the user's level. Explanations and teaching notes are language-level dependent. Weak grammar rules from the Mastery Graph are injected into the AI prompt."
    )
    @ApiResponse(responseCode = "201", description = "Lesson generated successfully")
    @ApiResponse(responseCode = "400", description = "Validation error or missing headers",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "502", description = "AI provider error",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<LessonResponseDTO> generate(
            @Valid @RequestBody LessonRequestDTO request,
            @Parameter(description = "AI provider API key (BYOK)", required = true)
            @RequestHeader("X-AI-Key") String apiKey,
            @Parameter(description = "AI provider name", required = true, example = "gemini")
            @RequestHeader("X-AI-Provider") String provider) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(lessonService.generate(request.getUserId(), request.getTopic(), request.getTargetLanguage(), provider, apiKey));
    }

    @PostMapping(value = "/analyze-speech", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Analyze Shadowing speech and save audio history",
            description = "Compares spoken text against original lesson text and stores the raw audio file. Calculates coverage percentage to penalize partial readings. Returns accuracy, errors with tips in the student's language level."
    )
    @ApiResponse(responseCode = "200", description = "Speech analyzed and practice session recorded")
    @ApiResponse(responseCode = "404", description = "Lesson or user not found",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "502", description = "AI provider error",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<SpeechAnalysisResponse> analyzeSpeech(
            @RequestPart("audio") MultipartFile audio,
            @RequestPart("spokenText") String spokenText,
            @RequestPart("userId") String userId,
            @RequestPart("lessonId") String lessonId,
            @RequestPart(value = "transcriptionMode", required = false) String transcriptionMode,
            @Parameter(description = "AI provider API key (BYOK)", required = true)
            @RequestHeader("X-AI-Key") String apiKey,
            @Parameter(description = "AI provider name", required = true, example = "gemini")
            @RequestHeader("X-AI-Provider") String provider) throws IOException {

        return ResponseEntity.ok(lessonService.analyzeSpeech(
                UUID.fromString(userId),
                UUID.fromString(lessonId),
                spokenText,
                audio.getBytes(),
                transcriptionMode != null ? transcriptionMode : "whisper",
                provider,
                apiKey));
    }

    @GetMapping("/{id}/sessions")
    @Operation(
            summary = "Get practice history for a lesson (Paginated)",
            description = "Returns a paginated list of all previous attempts for this lesson, including transcribed text, accuracy, and audio URLs."
    )
    @ApiResponse(responseCode = "200", description = "History page retrieved")
    public ResponseEntity<Page<PracticeSessionResponseDTO>> getLessonHistory(
            @PathVariable UUID id,
            @Parameter(description = "Zero-based page index") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "The size of the page to be returned") @RequestParam(defaultValue = "5") int size) {

        return ResponseEntity.ok(lessonService.getLessonHistory(id, page, size));
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(
            summary = "Delete a practice session",
            description = "Permanently removes a practice attempt. Best score and total attempts for the lesson will be automatically recalculated."
    )
    @ApiResponse(responseCode = "204", description = "Session deleted successfully")
    @ApiResponse(responseCode = "403", description = "Forbidden: User does not own this session")
    @ApiResponse(responseCode = "404", description = "Session not found")
    public ResponseEntity<Void> deleteSession(
            @PathVariable UUID sessionId,
            @Parameter(description = "Owner User ID for security verification", required = true)
            @RequestParam UUID userId) {

        lessonService.deletePracticeSession(sessionId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/sessions/{sessionId}/audio", produces = "audio/webm")
    @Operation(
            summary = "Get raw audio from a session",
            description = "Retrieves the binary audio data stored for a specific practice attempt."
    )
    @ApiResponse(responseCode = "200", description = "Audio data retrieved")
    @ApiResponse(responseCode = "404", description = "Session not found")
    public ResponseEntity<byte[]> getSessionAudio(@PathVariable UUID sessionId) {

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("audio/webm"))
                .body(lessonService.getSessionAudio(sessionId));
    }

    @GetMapping("/user/{userId}")
    @Operation(
            summary = "List lessons by user (Paginated)",
            description = "Returns lessons for a user, ordered by most recent first."
    )
    @ApiResponse(responseCode = "200", description = "Lessons retrieved")
    public ResponseEntity<Page<LessonResponseDTO>> findByUser(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        return ResponseEntity.ok(lessonService.findByUser(userId, page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get lesson by ID", description = "Returns a single lesson with all generated content.")
    @ApiResponse(responseCode = "200", description = "Lesson found")
    @ApiResponse(responseCode = "404", description = "Lesson not found",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<LessonResponseDTO> findById(@PathVariable UUID id) {

        return ResponseEntity.ok(lessonService.findById(id));
    }

    @PostMapping("/explain-word")
    @Operation(
            summary = "Explain a word or phrase from a lesson",
            description = "Provides detailed explanation: definition, pronunciation, usage, and examples adapted to the student's level."
    )
    @ApiResponse(responseCode = "200", description = "Word explained")
    @ApiResponse(responseCode = "404", description = "User or lesson not found",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<ExplainWordResponse> explainWord(
            @Valid @RequestBody ExplainWordRequest request,
            @Parameter(description = "AI provider API key (BYOK)", required = true)
            @RequestHeader("X-AI-Key") String apiKey,
            @Parameter(description = "AI provider name", required = true, example = "gemini")
            @RequestHeader("X-AI-Provider") String provider) {

        return ResponseEntity.ok(lessonService.explainWord(
                request.getUserId(),
                request.getLessonId(),
                request.getWord(),
                request.getContext(),
                provider,
                apiKey));
    }
}