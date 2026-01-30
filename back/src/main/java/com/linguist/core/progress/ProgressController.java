package com.linguist.core.progress;

import com.linguist.core.exception.ErrorResponse;
import com.linguist.core.progress.dto.DashboardResponse;
import com.linguist.core.progress.dto.LevelCheckResponse;
import com.linguist.core.progress.dto.TimelineEntry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
@Tag(name = "Progress Tracking", description = "Dashboard, timeline, streak, and automatic level progression")
public class ProgressController {

    private final ProgressService progressService;

    @GetMapping("/user/{userId}/dashboard")
    @Operation(
            summary = "Get user's learning dashboard",
            description = "Returns a comprehensive overview of the user's progress: mastery stats, "
                    + "accuracy averages, streak data, lesson completion rates, weakest rules, "
                    + "and eligibility for level promotion."
    )
    @ApiResponse(responseCode = "200", description = "Dashboard data retrieved")
    @ApiResponse(responseCode = "404", description = "User not found",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<DashboardResponse> getDashboard(@PathVariable UUID userId) {
        return ResponseEntity.ok(progressService.getDashboard(userId));
    }

    @GetMapping("/user/{userId}/timeline")
    @Operation(
            summary = "Get practice session timeline",
            description = "Returns a chronological list of all practice sessions for the given period. "
                    + "Each entry includes the lesson topic, accuracy, error count, and AI feedback."
    )
    @ApiResponse(responseCode = "200", description = "Timeline retrieved")
    public ResponseEntity<List<TimelineEntry>> getTimeline(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(progressService.getTimeline(userId, days));
    }

    @PostMapping("/user/{userId}/check-level")
    @Operation(
            summary = "Check and auto-promote user level",
            description = "Evaluates if the user is eligible for level promotion based on: "
                    + "(1) average mastery >= 75%%, (2) at least 5 rules mastered at >= 80%%. "
                    + "If eligible, automatically promotes the user (e.g., A1 -> A2). "
                    + "Returns detailed feedback about why promotion did or didn't happen."
    )
    @ApiResponse(responseCode = "200", description = "Level check completed")
    @ApiResponse(responseCode = "404", description = "User not found",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<LevelCheckResponse> checkLevel(@PathVariable UUID userId) {
        return ResponseEntity.ok(progressService.checkAndPromote(userId));
    }
}
