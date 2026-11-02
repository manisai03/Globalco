package com.globalco.jobboard.common.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotBlank
    private String currentPassword;

    @NotBlank
    @Size(min = PasswordRules.MIN, max = PasswordRules.MAX, message = PasswordRules.MESSAGE)
    private String newPassword;
}
