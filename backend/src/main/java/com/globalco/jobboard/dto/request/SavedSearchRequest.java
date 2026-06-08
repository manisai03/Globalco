package com.globalco.jobboard.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SavedSearchRequest {
    @Size(max = 100)
    private String name;

    private String search;
    private String location;
    private String jobType;
    private String experienceLevel;
    private String category;
    private BigDecimal minSalary;
    private String sort;
    private Boolean alertsEnabled;
}
