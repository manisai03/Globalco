package com.globalco.jobboard.common.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiJobDescriptionRequest {

    @NotBlank
    private String jobTitle;

    @NotBlank
    private String skills;

    private String company;
    private String location;
    private String experienceLevel;
}
