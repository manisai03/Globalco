package com.globalco.jobboard.controller;

import com.globalco.jobboard.dto.request.SavedSearchRequest;
import com.globalco.jobboard.dto.response.ApiResponse;
import com.globalco.jobboard.dto.response.SavedSearchResponse;
import com.globalco.jobboard.security.SecurityUtils;
import com.globalco.jobboard.service.SavedSearchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/saved-searches")
@RequiredArgsConstructor
public class SavedSearchController {

    private final SavedSearchService savedSearchService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ApiResponse<List<SavedSearchResponse>> list() {
        return ApiResponse.ok(savedSearchService.getSavedSearches(securityUtils.getCurrentUser()));
    }

    @PostMapping
    public ApiResponse<SavedSearchResponse> create(@Valid @RequestBody SavedSearchRequest request) {
        return ApiResponse.ok("Job alert saved",
                savedSearchService.create(securityUtils.getCurrentUser(), request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        savedSearchService.delete(id, securityUtils.getCurrentUser());
        return ApiResponse.ok("Job alert removed", null);
    }
}
