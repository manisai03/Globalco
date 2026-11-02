package com.globalco.jobboard.common.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank @Email
    private String email;

    @NotBlank
    @Size(min = 6, max = 6)
    private String otp;

    @NotBlank
    @Size(min = PasswordRules.MIN, max = PasswordRules.MAX, message = PasswordRules.MESSAGE)
    private String newPassword;
}
