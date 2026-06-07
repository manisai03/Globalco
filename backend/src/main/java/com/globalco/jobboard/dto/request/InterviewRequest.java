package com.globalco.jobboard.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class InterviewRequest {

    @NotNull
    private Long applicationId;

    @NotNull
    private LocalDateTime scheduledAt;

    private String location;
    private String notes;
}
