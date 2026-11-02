package com.globalco.jobboard.common.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DeleteAccountRequest {

    @NotBlank(message = "Enter your password to confirm")
    private String password;
}
