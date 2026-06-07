package com.globalco.jobboard.controller;

import com.globalco.jobboard.dto.request.AiJobDescriptionRequest;
import com.globalco.jobboard.dto.response.ApiResponse;
import com.globalco.jobboard.service.AiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/generate-job-description")
    public ApiResponse<Map<String, String>> generateJobDescription(@Valid @RequestBody AiJobDescriptionRequest request) {
        String description = aiService.generateJobDescription(request);
        return ApiResponse.ok(Map.of("description", description));
    }
}
