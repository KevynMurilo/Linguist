package com.linguist.core.mastery;

import com.linguist.core.exception.ErrorResponse;
import com.linguist.core.mastery.dto.CompetenceResponse;
import com.linguist.core.mastery.dto.RecordPracticeRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/mastery")
@RequiredArgsConstructor
@Tag(name = "Mastery Graph", description = "Tracks grammar competence and error history per user")
public class CompetenceController {

    private final CompetenceService competenceService;

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get all competences for a user",
            description = "Returns the full mastery graph with all tracked grammar rules and their levels.")
    @ApiResponse(responseCode = "200", description = "Competences retrieved")
    public ResponseEntity<List<CompetenceResponse>> getByUser(@PathVariable UUID userId) {
        List<CompetenceResponse> competences = competenceService.findByUserId(userId).stream()
                .map(CompetenceResponse::from)
                .toList();
        return ResponseEntity.ok(competences);
    }

    @GetMapping("/user/{userId}/weaknesses")
    @Operation(summary = "Get weak grammar rules",
            description = "Returns rules where mastery is below the given threshold (default 60). "
                    + "These are injected into the AI prompt to reinforce practice.")
    @ApiResponse(responseCode = "200", description = "Weaknesses retrieved")
    public ResponseEntity<List<CompetenceResponse>> getWeaknesses(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "60") int threshold) {
        List<CompetenceResponse> weaknesses = competenceService.findWeaknesses(userId, threshold).stream()
                .map(CompetenceResponse::from)
                .toList();
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
}
