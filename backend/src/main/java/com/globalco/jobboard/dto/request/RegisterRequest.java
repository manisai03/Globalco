package com.globalco.jobboard.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 6, max = 100)
    private String password;

    @NotBlank
    private String fullName;

    @Pattern(regexp = "^$|^[+]?[\\d\\s-]{10,15}$", message = "Phone must be 10-15 digits")
    private String phone;
    private String location;

    /** CANDIDATE or RECRUITER */
    private String accountType;

    // Candidate
    private String currentTitle;
    private String skills;

    // Recruiter
    private String companyName;
    private String companyWebsite;
    private String companyDescription;
    private String recruiterTitle;
}
