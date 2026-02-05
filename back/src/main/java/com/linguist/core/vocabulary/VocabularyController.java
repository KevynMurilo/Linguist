package com.linguist.core.vocabulary;

import com.linguist.core.vocabulary.dto.ReviewRequest;
import com.linguist.core.vocabulary.dto.VocabularyResponse;
import com.linguist.core.vocabulary.dto.VocabularyStatsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/vocabulary")
@RequiredArgsConstructor
@Tag(name = "Vocabulary", description = "Vocabulary flashcard management with SRS review")
public class VocabularyController {

    private final VocabularyService vocabularyService;

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get all vocabulary for a user (Paginated)")
    @ApiResponse(responseCode = "200", description = "Vocabulary retrieved")
    public ResponseEntity<Page<VocabularyResponse>> getAll(
            @PathVariable UUID userId,
            @Parameter(description = "Zero-based page index") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "The size of the page") @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(vocabularyService.getAll(userId, page, size).map(VocabularyResponse::from));
    }

    @GetMapping("/user/{userId}/due")
    @Operation(summary = "Get vocabulary due for review (Paginated)")
    @ApiResponse(responseCode = "200", description = "Due vocabulary retrieved")
    public ResponseEntity<Page<VocabularyResponse>> getDue(
            @PathVariable UUID userId,
            @Parameter(description = "Zero-based page index") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "The size of the page") @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(vocabularyService.getDueCards(userId, page, size).map(VocabularyResponse::from));
    }

    @PostMapping("/{id}/review")
    @Operation(summary = "Record a vocabulary review result")
    @ApiResponse(responseCode = "200", description = "Review recorded")
    public ResponseEntity<VocabularyResponse> review(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(VocabularyResponse.from(vocabularyService.recordReview(id, request.getCorrect())));
    }

    @GetMapping("/user/{userId}/stats")
    @Operation(summary = "Get vocabulary statistics")
    @ApiResponse(responseCode = "200", description = "Stats retrieved")
    public ResponseEntity<VocabularyStatsResponse> getStats(@PathVariable UUID userId) {
        return ResponseEntity.ok(vocabularyService.getStats(userId));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a vocabulary word")
    @ApiResponse(responseCode = "204", description = "Vocabulary deleted")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        vocabularyService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
