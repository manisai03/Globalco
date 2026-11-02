package com.globalco.jobboard.ai.controller;

import com.globalco.jobboard.ai.service.JobDescriptionService;
import com.globalco.jobboard.common.client.AuthServiceClient;
import com.globalco.jobboard.common.dto.internal.RecruiterSummary;
import com.globalco.jobboard.common.dto.request.AiJobDescriptionRequest;
import com.globalco.jobboard.common.dto.response.ApiResponse;
import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.security.CurrentAccount;
import com.globalco.jobboard.common.util.RecruiterCompanyUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AiController {

    private final JobDescriptionService jobDescriptionService;
    private final AuthServiceClient authServiceClient;
    private final CurrentAccount currentAccount;

    @PostMapping("/generate-job-description")
    public ApiResponse<Map<String, String>> generateJobDescription(@Valid @RequestBody AiJobDescriptionRequest request) {
        RecruiterSummary recruiter = authServiceClient.getRecruiter(currentAccount.requireAdmin().id());
        enrichFromRecruiterProfile(request, recruiter);
        return ApiResponse.ok(Map.of("description", jobDescriptionService.generate(request)));
    }

    private void enrichFromRecruiterProfile(AiJobDescriptionRequest request, RecruiterSummary recruiter) {
        String company = RecruiterCompanyUtils.resolveCompany(recruiter.companyName(), null);
        if (company == null) {
            throw new BadRequestException("Set your company name in Profile before generating job descriptions");
        }
        request.setCompany(company);
        if (request.getLocation() == null || request.getLocation().isBlank()) {
            request.setLocation(recruiter.location() != null && !recruiter.location().isBlank()
                    ? recruiter.location().trim() : "Hyderabad, India");
        } else {
            request.setLocation(request.getLocation().trim());
        }
        if (request.getExperienceLevel() == null || request.getExperienceLevel().isBlank()) {
            request.setExperienceLevel("Mid-Level");
        }
    }
}
