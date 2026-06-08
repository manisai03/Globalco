package com.globalco.jobboard.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class InterviewResponse {
    private Long id;
    private Long applicationId;
    private Long jobId;
    private String jobTitle;
    private String company;
    private LocalDateTime scheduledAt;
    private String location;
    private String notes;
    private String status;
    private String applicationStatus;
    private LocalDateTime createdAt;
}
