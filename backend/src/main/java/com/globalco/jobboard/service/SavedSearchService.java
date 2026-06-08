package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.SavedSearchRequest;
import com.globalco.jobboard.dto.response.SavedSearchResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.model.SavedSearch;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.JobRepository;
import com.globalco.jobboard.repository.SavedSearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SavedSearchService {

    private static final int MAX_SEARCHES_PER_USER = 15;

    private final SavedSearchRepository savedSearchRepository;
    private final JobRepository jobRepository;

    public List<SavedSearchResponse> getSavedSearches(User user) {
        return savedSearchRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SavedSearchResponse create(User user, SavedSearchRequest request) {
        if (savedSearchRepository.countByUserId(user.getId()) >= MAX_SEARCHES_PER_USER) {
            throw new BadRequestException("Maximum " + MAX_SEARCHES_PER_USER + " saved searches allowed");
        }
        if (isEmptySearch(request)) {
            throw new BadRequestException("Add at least one filter to save a job alert");
        }

        SavedSearch saved = savedSearchRepository.save(SavedSearch.builder()
                .user(user)
                .name(resolveName(request))
                .search(blankToNull(request.getSearch()))
                .location(blankToNull(request.getLocation()))
                .jobType(blankToNull(request.getJobType()))
                .experienceLevel(blankToNull(request.getExperienceLevel()))
                .category(blankToNull(request.getCategory()))
                .minSalary(request.getMinSalary())
                .sort(blankToNull(request.getSort()))
                .alertsEnabled(request.getAlertsEnabled() == null || request.getAlertsEnabled())
                .build());

        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id, User user) {
        SavedSearch saved = savedSearchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Saved search not found"));
        if (!saved.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("Not authorized");
        }
        savedSearchRepository.delete(saved);
    }

    private SavedSearchResponse toResponse(SavedSearch ss) {
        long matchCount = jobRepository.count(JobSpecification.withFilters(
                ss.getSearch(), ss.getLocation(), ss.getJobType(), ss.getExperienceLevel(),
                ss.getCategory(), ss.getMinSalary(), null, "OPEN"));

        return SavedSearchResponse.builder()
                .id(ss.getId())
                .name(ss.getName())
                .search(ss.getSearch())
                .location(ss.getLocation())
                .jobType(ss.getJobType())
                .experienceLevel(ss.getExperienceLevel())
                .category(ss.getCategory())
                .minSalary(ss.getMinSalary())
                .sort(ss.getSort())
                .alertsEnabled(ss.getAlertsEnabled())
                .matchCount(matchCount)
                .createdAt(ss.getCreatedAt())
                .build();
    }

    private static boolean isEmptySearch(SavedSearchRequest request) {
        return blankToNull(request.getSearch()) == null
                && blankToNull(request.getLocation()) == null
                && blankToNull(request.getJobType()) == null
                && blankToNull(request.getExperienceLevel()) == null
                && blankToNull(request.getCategory()) == null
                && request.getMinSalary() == null;
    }

    private static String resolveName(SavedSearchRequest request) {
        if (request.getName() != null && !request.getName().isBlank()) {
            return request.getName().trim();
        }
        StringBuilder sb = new StringBuilder();
        if (request.getSearch() != null && !request.getSearch().isBlank()) sb.append(request.getSearch().trim());
        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            if (!sb.isEmpty()) sb.append(" · ");
            sb.append(request.getCategory());
        }
        if (request.getLocation() != null && !request.getLocation().isBlank()) {
            if (!sb.isEmpty()) sb.append(" · ");
            sb.append(request.getLocation());
        }
        return sb.isEmpty() ? "Job alert" : sb.toString();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
