package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.response.CompanyResponse;
import com.globalco.jobboard.dto.response.JobResponse;
import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.Admin;
import com.globalco.jobboard.model.Job;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.AdminRepository;
import com.globalco.jobboard.repository.JobRepository;
import com.globalco.jobboard.repository.SavedJobRepository;
import com.globalco.jobboard.repository.ApplicationRepository;
import com.globalco.jobboard.util.RecruiterCompanyUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final AdminRepository adminRepository;
    private final JobRepository jobRepository;
    private final SavedJobRepository savedJobRepository;
    private final ApplicationRepository applicationRepository;

    @Transactional(readOnly = true)
    public CompanyResponse getCompany(Long adminId, User currentUser) {
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found"));

        List<Job> openJobs = jobRepository.findByCreatedByIdOrderByCreatedAtDesc(adminId).stream()
                .filter(j -> "OPEN".equals(j.getStatus()))
                .toList();

        List<JobResponse> jobResponses = openJobs.stream()
                .map(job -> mapJob(job, currentUser))
                .toList();

        String companyName = RecruiterCompanyUtils.resolveCompany(admin, null);
        if (companyName == null) {
            companyName = openJobs.stream()
                    .map(Job::getCompany)
                    .filter(c -> c != null && !RecruiterCompanyUtils.isLegacyPlaceholder(c))
                    .findFirst()
                    .orElse("Company");
        }

        return CompanyResponse.builder()
                .id(admin.getId())
                .companyName(companyName)
                .companyWebsite(admin.getCompanyWebsite())
                .companyDescription(admin.getCompanyDescription())
                .recruiterName(admin.getFullName())
                .recruiterTitle(admin.getRecruiterTitle())
                .location(admin.getLocation())
                .openJobsCount(jobResponses.size())
                .openJobs(jobResponses)
                .build();
    }

    private JobResponse mapJob(Job job, User currentUser) {
        boolean saved = false;
        boolean applied = false;
        if (currentUser != null) {
            saved = savedJobRepository.existsByUserIdAndJobId(currentUser.getId(), job.getId());
            applied = applicationRepository.existsByJobIdAndUserId(job.getId(), currentUser.getId());
        }
        JobResponse response = EntityMapper.toJobResponse(job, saved, applied);
        response.setApplicantCount((long) applicationRepository.findByJobIdOrderByCreatedAtDesc(job.getId()).size());
        return response;
    }
}
