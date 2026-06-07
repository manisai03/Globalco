package com.globalco.jobboard.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private String title;
    private String message;
    private String type;
    private Boolean read;
    private Long referenceId;
    private LocalDateTime createdAt;
}
