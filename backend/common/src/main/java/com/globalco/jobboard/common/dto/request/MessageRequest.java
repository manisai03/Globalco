package com.globalco.jobboard.common.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MessageRequest {

    @NotNull
    private Long receiverId;

    @NotBlank
    @Size(max = 4000, message = "Message must be under 4000 characters")
    private String content;
}
