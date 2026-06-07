package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.response.JobResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.Job;
import com.globalco.jobboard.model.SavedJob;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.JobRepository;
import com.globalco.jobboard.repository.SavedJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SavedJobService {

    private final SavedJobRepository savedJobRepository;
    private final JobRepository jobRepository;

    public List<JobResponse> getSavedJobs(User user) {
        return savedJobRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(sj -> EntityMapper.toJobResponse(sj.getJob(), true, false))
                .toList();
    }

    @Transactional
    public void saveJob(Long jobId, User user) {
        if (savedJobRepository.existsByUserIdAndJobId(user.getId(), jobId)) {
            throw new BadRequestException("Job already saved");
        }
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        savedJobRepository.save(SavedJob.builder().user(user).job(job).build());
    }

    @Transactional
    public void unsaveJob(Long jobId, User user) {
        SavedJob saved = savedJobRepository.findByUserIdAndJobId(user.getId(), jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Saved job not found"));
        savedJobRepository.delete(saved);
    }
}
