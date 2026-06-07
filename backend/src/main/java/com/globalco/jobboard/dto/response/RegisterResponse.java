package com.globalco.jobboard.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegisterResponse {
    private String email;
    private String fullName;
    private String message;
}
