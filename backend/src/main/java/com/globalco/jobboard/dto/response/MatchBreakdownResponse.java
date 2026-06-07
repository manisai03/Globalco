package com.globalco.jobboard.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MatchBreakdownResponse {
    private int overallScore;
    private boolean skillsMatch;
    private boolean locationMatch;
    private boolean earlyApplicant;
    private boolean profileComplete;
    private List<String> matchedSkills;
    private List<String> missingSkills;
}
