package com.globalco.jobboard.common.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/**
 * The posting company always comes from the recruiter's profile and "featured" is not recruiter-controlled,
 * so neither is part of this request.
 */
@Data
public class JobRequest {

    @NotBlank
    @Size(max = 150)
    private String title;

    @NotBlank
    @Size(max = 20000)
    private String description;

    @NotBlank
    @Size(max = 150)
    private String location;

    @PositiveOrZero
    private BigDecimal salaryMin;

    @PositiveOrZero
    private BigDecimal salaryMax;

    @Size(max = 50)
    private String experienceLevel;

    @NotBlank
    @Size(max = 50)
    private String jobType;

    @Size(max = 50)
    private String category;

    @Size(max = 1000)
    private String skills;

    @AssertTrue(message = "Minimum salary can't be more than the maximum")
    public boolean isSalaryRangeValid() {
        return salaryMin == null || salaryMax == null || salaryMin.compareTo(salaryMax) <= 0;
    }
}
