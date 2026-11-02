package com.globalco.jobboard.ai.service;

import com.globalco.jobboard.common.dto.internal.MatchInput;
import com.globalco.jobboard.common.dto.response.MatchBreakdownResponse;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class MatchServiceTest {

    private final MatchService service = new MatchService();

    @Test
    void matchesSkillsIgnoringCaseButKeepsTheJobsSpelling() {
        MatchBreakdownResponse result = service.score(new MatchInput(
                "Spring Boot, React, AWS", "Hyderabad", LocalDateTime.now(), 1,
                "spring boot, aws", "Hyderabad, India", true));

        assertThat(result.getMatchedSkills()).containsExactly("AWS", "Spring Boot");
        assertThat(result.getMissingSkills()).containsExactly("React");
        assertThat(result.isSkillsMatch()).isTrue();
        assertThat(result.isLocationMatch()).isTrue();
        assertThat(result.getOverallScore()).isEqualTo(100);
    }

    @Test
    void handlesMissingSkills() {
        MatchBreakdownResponse result = service.score(new MatchInput(
                null, null, null, 50, null, null, false));

        assertThat(result.getMatchedSkills()).isEmpty();
        assertThat(result.getOverallScore()).isEqualTo(35);
    }
}
