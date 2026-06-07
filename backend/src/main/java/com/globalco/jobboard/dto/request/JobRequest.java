package com.globalco.jobboard.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class JobRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String company;

    @NotBlank
    private String description;

    @NotBlank
    private String location;

    private BigDecimal salaryMin;
    private BigDecimal salaryMax;
    private String experienceLevel;

    @NotBlank
    private String jobType;

    private String category;
    private String skills;
    private Boolean featured;
}
