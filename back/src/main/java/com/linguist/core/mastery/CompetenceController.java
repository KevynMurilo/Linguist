package com.linguist.core.mastery;

import com.linguist.core.exception.ErrorResponse;
import com.linguist.core.mastery.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.data.domain.Page;

import java.util.UUID;

@RestController
@RequestMapping("/api/mastery")
@RequiredArgsConstructor
@Tag(name = "Mastery Graph", description = "Tracks grammar competence and error history per user")
public class CompetenceController {

    private final CompetenceService competenceService;

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get all competences for a user (Paginated)",
            description = "Returns the mastery graph with all tracked grammar rules and their levels.")
    @ApiResponse(responseCode = "200", description = "Competences retrieved")
    public ResponseEntity<Page<CompetenceResponse>> getByUser(
            @PathVariable UUID userId,
            @Parameter(description = "Zero-based page index") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "The size of the page") @RequestParam(defaultValue = "20") int size) {
        Page<CompetenceResponse> competences = competenceService.findByUserId(userId, page, size)
                .map(CompetenceResponse::from);
        return ResponseEntity.ok(competences);
    }

    @GetMapping("/user/{userId}/weaknesses")
    @Operation(summary = "Get weak grammar rules (Paginated)",
            description = "Returns rules where mastery is below the given threshold (default 60).")
    @ApiResponse(responseCode = "200", description = "Weaknesses retrieved")
    public ResponseEntity<Page<CompetenceResponse>> getWeaknesses(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "60") int threshold,
            @Parameter(description = "Zero-based page index") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "The size of the page") @RequestParam(defaultValue = "20") int size) {
        Page<CompetenceResponse> weaknesses = competenceService.findWeaknesses(userId, threshold, page, size)
                .map(CompetenceResponse::from);
        return ResponseEntity.ok(weaknesses);
    }

    @PostMapping("/record")
    @Operation(summary = "Record a practice result",
            description = "After a Shadowing session, records success or failure for a grammar rule. "
                    + "Success: +5 mastery. Failure: -10 mastery (Grammar Nazi mode).")
    @ApiResponse(responseCode = "200", description = "Practice recorded")
    @ApiResponse(responseCode = "404", description = "User not found",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<CompetenceResponse> recordPractice(@Valid @RequestBody RecordPracticeRequest request) {
        Competence competence = competenceService.recordPractice(
                request.getUserId(), request.getRuleName(), request.getSuccess());
        return ResponseEntity.ok(CompetenceResponse.from(competence));
    }

    @PostMapping("/{competenceId}/exercises")
    @Operation(summary = "Generate exercises for a specific grammar rule",
            description = "Uses AI to generate 5 targeted multiple-choice exercises for the given competence rule. "
                    + "Also returns related lessons that use this grammar rule.")
    @ApiResponse(responseCode = "200", description = "Exercises generated")
    public ResponseEntity<ExercisesResponse> generateExercises(
            @PathVariable UUID competenceId,
            @RequestHeader(value = "X-AI-Provider", defaultValue = "gemini") String provider,
            @RequestHeader(value = "X-AI-Key") String apiKey) {
        return ResponseEntity.ok(competenceService.generateExercises(competenceId, provider, apiKey));
    }

    @PostMapping("/{competenceId}/submit-exercises")
    @Operation(summary = "Submit exercise results and update mastery",
            description = "Records how many exercises were answered correctly and adjusts mastery level accordingly. "
                    + "80%+ correct: +10, 60%+: +5, 40%+: +2, below 40%: -5.")
    @ApiResponse(responseCode = "200", description = "Results recorded")
    public ResponseEntity<SubmitExercisesResponse> submitExercises(
            @PathVariable UUID competenceId,
            @Valid @RequestBody SubmitExercisesRequest request) {
        return ResponseEntity.ok(competenceService.submitExercises(
                competenceId, request.getCorrectCount(), request.getTotalCount()));
    }

    @GetMapping("/{competenceId}/lessons")
    @Operation(summary = "Get lessons related to a grammar rule (Paginated)",
            description = "Returns lessons that include this grammar rule in their focus areas.")
    @ApiResponse(responseCode = "200", description = "Related lessons retrieved")
    public ResponseEntity<Page<RelatedLessonDTO>> getRelatedLessons(
            @PathVariable UUID competenceId,
            @Parameter(description = "Zero-based page index") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "The size of the page") @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(competenceService.getRelatedLessons(competenceId, page, size));
    }
}
