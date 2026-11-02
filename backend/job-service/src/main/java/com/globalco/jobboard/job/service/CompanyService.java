package com.globalco.jobboard.job.service;

import com.globalco.jobboard.common.client.AuthServiceClient;
import com.globalco.jobboard.common.dto.internal.RecruiterSummary;
import com.globalco.jobboard.common.dto.response.CompanyResponse;
import com.globalco.jobboard.common.dto.response.JobResponse;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.util.RecruiterCompanyUtils;
import com.globalco.jobboard.job.model.Job;
import com.globalco.jobboard.job.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final AuthServiceClient authServiceClient;
    private final JobRepository jobRepository;
    private final JobEnricher jobEnricher;

    public CompanyResponse getCompany(Long recruiterId, AccountPrincipal viewer) {
        RecruiterSummary recruiter;
        try {
            recruiter = authServiceClient.getRecruiter(recruiterId);
        } catch (ResourceNotFoundException e) {
            throw new ResourceNotFoundException("Company not found");
        }

        List<Job> openJobs = jobRepository.findByRecruiterIdOrderByCreatedAtDesc(recruiterId).stream()
                .filter(j -> "OPEN".equals(j.getStatus()))
                .toList();
        List<JobResponse> jobResponses = jobEnricher.enrich(openJobs, viewer, false);

        String companyName = RecruiterCompanyUtils.resolveCompany(recruiter.companyName(), null);
        if (companyName == null) {
            companyName = openJobs.stream()
                    .map(Job::getCompany)
                    .filter(c -> c != null && !RecruiterCompanyUtils.isLegacyPlaceholder(c))
                    .findFirst()
                    .orElse("Company");
        }

        return CompanyResponse.builder()
                .id(recruiter.id())
                .companyName(companyName)
                .companyWebsite(recruiter.companyWebsite())
                .companyDescription(recruiter.companyDescription())
                .recruiterName(recruiter.fullName())
                .recruiterTitle(recruiter.recruiterTitle())
                .location(recruiter.location())
                .openJobsCount(jobResponses.size())
                .openJobs(jobResponses)
                .build();
    }
}
