package com.globalco.jobboard.common.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class InterviewRequest {

    @NotNull
    private Long applicationId;

    @NotNull
    @Future(message = "Interview time must be in the future")
    private LocalDateTime scheduledAt;

    @Size(max = 255)
    private String location;

    @Size(max = 2000)
    private String notes;
}
