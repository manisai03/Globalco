package com.globalco.jobboard.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class ApplicationAnalyticsResponse {
    private String period;
    private String periodLabel;
    private long total;
    private Map<String, Long> statusBreakdown;
}
