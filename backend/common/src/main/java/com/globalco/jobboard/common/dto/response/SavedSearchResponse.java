package com.globalco.jobboard.common.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class SavedSearchResponse {
    private Long id;
    private String name;
    private String search;
    private String location;
    private String jobType;
    private String experienceLevel;
    private String category;
    private BigDecimal minSalary;
    private String sort;
    private String postedWithin;
    private Boolean alertsEnabled;
    private Long matchCount;
    private LocalDateTime createdAt;
}
