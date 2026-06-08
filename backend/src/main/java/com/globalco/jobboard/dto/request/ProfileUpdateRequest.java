package com.globalco.jobboard.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfileUpdateRequest {
    @Size(max = 100, message = "Full name must be under 100 characters")
    private String fullName;

    @Pattern(regexp = "^$|^[+]?[\\d\\s-]{10,15}$", message = "Phone must be 10-15 digits")
    private String phone;

    @Size(max = 100)
    private String location;

    @Size(max = 2000)
    private String bio;

    @Size(max = 1000)
    private String skills;

    @Size(max = 150)
    private String currentTitle;

    @Size(max = 220)
    private String headline;

    private Boolean openToWork;

    @Size(max = 150)
    private String companyName;

    @Pattern(regexp = "^$|^https?://.+", message = "Website must start with http:// or https://")
    private String companyWebsite;

    @Size(max = 3000)
    private String companyDescription;

    @Size(max = 150)
    private String recruiterTitle;

    @Size(max = 10000)
    private String educationProfile;

    @Size(max = 20000)
    private String internshipsProfile;

    @Size(max = 20000)
    private String employmentProfile;
}
