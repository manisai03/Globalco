package com.globalco.jobboard.common.dto.request;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SavedSearchRequest {
    @Size(max = 100)
    private String name;

    @Size(max = 200)
    private String search;

    @Size(max = 150)
    private String location;

    @Size(max = 50)
    private String jobType;

    @Size(max = 50)
    private String experienceLevel;

    @Size(max = 50)
    private String category;

    @PositiveOrZero
    private BigDecimal minSalary;

    @Size(max = 30)
    private String sort;

    @Size(max = 10)
    private String postedWithin;

    private Boolean alertsEnabled;
}
