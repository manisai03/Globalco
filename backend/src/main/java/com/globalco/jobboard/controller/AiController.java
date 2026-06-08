package com.globalco.jobboard.controller;

import com.globalco.jobboard.dto.request.AiJobDescriptionRequest;
import com.globalco.jobboard.dto.response.ApiResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.model.Admin;
import com.globalco.jobboard.security.SecurityUtils;
import com.globalco.jobboard.service.AiService;
import com.globalco.jobboard.util.RecruiterCompanyUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final SecurityUtils securityUtils;

    @PostMapping("/generate-job-description")
    public ApiResponse<Map<String, String>> generateJobDescription(@Valid @RequestBody AiJobDescriptionRequest request) {
        enrichFromRecruiterProfile(request, securityUtils.getCurrentAdmin());
        String description = aiService.generateJobDescription(request);
        return ApiResponse.ok(Map.of("description", description));
    }

    private void enrichFromRecruiterProfile(AiJobDescriptionRequest request, Admin admin) {
        String company = RecruiterCompanyUtils.resolveCompany(admin, request.getCompany());
        if (company == null) {
            throw new BadRequestException("Set your company name in Profile before generating job descriptions");
        }
        request.setCompany(company);
        if (request.getLocation() == null || request.getLocation().isBlank()) {
            request.setLocation(admin.getLocation() != null && !admin.getLocation().isBlank()
                    ? admin.getLocation().trim() : "Hyderabad, India");
        } else {
            request.setLocation(request.getLocation().trim());
        }
        if (request.getExperienceLevel() == null || request.getExperienceLevel().isBlank()) {
            request.setExperienceLevel("Mid-Level");
        }
    }
}
