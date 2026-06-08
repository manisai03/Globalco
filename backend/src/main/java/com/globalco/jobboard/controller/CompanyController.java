package com.globalco.jobboard.controller;

import com.globalco.jobboard.dto.response.ApiResponse;
import com.globalco.jobboard.dto.response.CompanyResponse;
import com.globalco.jobboard.security.SecurityUtils;
import com.globalco.jobboard.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;
    private final SecurityUtils securityUtils;

    @GetMapping("/{adminId}")
    public ApiResponse<CompanyResponse> getCompany(@PathVariable Long adminId) {
        return ApiResponse.ok(companyService.getCompany(adminId, securityUtils.getCurrentUserOrNull()));
    }
}
