package com.globalco.jobboard.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CompanyResponse {
    private Long id;
    private String companyName;
    private String companyWebsite;
    private String companyDescription;
    private String recruiterName;
    private String recruiterTitle;
    private String location;
    private long openJobsCount;
    private List<JobResponse> openJobs;
}
