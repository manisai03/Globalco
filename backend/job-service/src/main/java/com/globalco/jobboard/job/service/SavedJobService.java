package com.globalco.jobboard.job.service;

import com.globalco.jobboard.common.dto.response.JobResponse;
import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.job.model.Job;
import com.globalco.jobboard.job.model.SavedJob;
import com.globalco.jobboard.job.repository.JobRepository;
import com.globalco.jobboard.job.repository.SavedJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SavedJobService {

    private final SavedJobRepository savedJobRepository;
    private final JobRepository jobRepository;

    @Transactional(readOnly = true)
    public List<JobResponse> getSavedJobs(AccountPrincipal user) {
        return savedJobRepository.findWithJobsByUserId(user.id()).stream()
                .map(sj -> JobMapper.toResponse(sj.getJob(), true, false))
                .toList();
    }

    @Transactional
    public void saveJob(Long jobId, AccountPrincipal user) {
        if (savedJobRepository.existsByUserIdAndJobId(user.id(), jobId)) {
            throw new BadRequestException("Job already saved");
        }
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        savedJobRepository.save(SavedJob.builder().userId(user.id()).job(job).build());
    }

    @Transactional
    public void unsaveJob(Long jobId, AccountPrincipal user) {
        SavedJob saved = savedJobRepository.findByUserIdAndJobId(user.id(), jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Saved job not found"));
        savedJobRepository.delete(saved);
    }
}
