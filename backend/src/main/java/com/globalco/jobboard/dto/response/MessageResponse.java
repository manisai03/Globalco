package com.globalco.jobboard.dto.response;

import com.globalco.jobboard.model.AccountType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MessageResponse {
    private Long id;
    private Long senderId;
    private AccountType senderAccountType;
    private String senderName;
    private Long receiverId;
    private AccountType receiverAccountType;
    private String receiverName;
    private String content;
    private Boolean read;
    private LocalDateTime createdAt;
}
