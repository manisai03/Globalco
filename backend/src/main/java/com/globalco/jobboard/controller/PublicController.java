package com.globalco.jobboard.controller;

import com.globalco.jobboard.dto.response.ApiResponse;
import com.globalco.jobboard.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final JobService jobService;

    @GetMapping("/stats")
    public ApiResponse<Map<String, Long>> stats() {
        return ApiResponse.ok(Map.of(
                "openJobs", jobService.getPlatformStats("jobs"),
                "totalJobs", jobService.getPlatformStats("total")
        ));
    }
}
