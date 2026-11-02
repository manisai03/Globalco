package com.globalco.jobboard.common.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank
    @Email
    @Size(max = 254)
    private String email;

    @NotBlank
    @Size(min = PasswordRules.MIN, max = PasswordRules.MAX, message = PasswordRules.MESSAGE)
    private String password;

    @NotBlank
    @Size(max = 100, message = "Full name must be under 100 characters")
    private String fullName;

    @Pattern(regexp = "^$|^[+]?[\\d\\s-]{10,15}$", message = "Phone must be 10-15 digits")
    private String phone;

    @Size(max = 100)
    private String location;

    /** CANDIDATE (or USER) or RECRUITER; anything else is rejected. */
    @Pattern(regexp = "(?i)^(CANDIDATE|USER|RECRUITER)?$", message = "Account type must be CANDIDATE or RECRUITER")
    private String accountType;

    // Candidate
    @Size(max = 150)
    private String currentTitle;

    @Size(max = 1000)
    private String skills;

    // Recruiter
    @Size(max = 150)
    private String companyName;

    @Size(max = 255)
    @Pattern(regexp = "^$|^https?://.+", message = "Website must start with http:// or https://")
    private String companyWebsite;

    @Size(max = 3000)
    private String companyDescription;

    @Size(max = 150)
    private String recruiterTitle;
}
