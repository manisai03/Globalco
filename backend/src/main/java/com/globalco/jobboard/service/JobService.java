package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.JobRequest;
import com.globalco.jobboard.dto.response.JobResponse;
import com.globalco.jobboard.dto.response.PageResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.Admin;
import com.globalco.jobboard.model.Job;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.ApplicationRepository;
import com.globalco.jobboard.repository.JobRepository;
import com.globalco.jobboard.repository.SavedJobRepository;
import com.globalco.jobboard.util.RecruiterCompanyUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JobService {

    private static final int MAX_PAGE_SIZE = 50;

    private final JobRepository jobRepository;
    private final SavedJobRepository savedJobRepository;
    private final ApplicationRepository applicationRepository;
    private final NotificationService notificationService;
    private final AiService aiService;

    @Transactional(readOnly = true)
    public PageResponse<JobResponse> searchJobs(
            String search, String location, String jobType, String experienceLevel,
            String category, BigDecimal minSalary, BigDecimal maxSalary, String status,
            String postedWithin, String sort, int page, int size, User currentUser) {

        Sort sorting = resolveSort(sort);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<Job> jobs = jobRepository.findAll(
                JobSpecification.withFilters(search, location, jobType, experienceLevel,
                        category, minSalary, maxSalary, status != null ? status : "OPEN", postedWithin),
                PageRequest.of(safePage, safeSize, sorting));

        List<JobResponse> content = mapWithUserContext(jobs.getContent(), currentUser);

        return PageResponse.<JobResponse>builder()
                .content(content)
                .page(jobs.getNumber())
                .size(jobs.getSize())
                .totalElements(jobs.getTotalElements())
                .totalPages(jobs.getTotalPages())
                .build();
    }

    @Transactional(readOnly = true)
    public List<JobResponse> getFeaturedJobs(User currentUser) {
        return mapWithUserContext(
                jobRepository.findTop6ByFeaturedTrueAndStatusOrderByCreatedAtDesc("OPEN"), currentUser);
    }

    @Transactional(readOnly = true)
    public JobResponse getJobById(Long id, User currentUser) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        return mapWithUserContext(List.of(job), currentUser).get(0);
    }

    @Transactional(readOnly = true)
    public List<JobResponse> getSimilarJobs(Long id, User currentUser) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        String category = job.getCategory() != null ? job.getCategory() : "Engineering";
        return mapWithUserContext(
                jobRepository.findTop6ByCategoryAndStatusAndIdNotOrderByCreatedAtDesc(category, "OPEN", id), currentUser);
    }

    @Transactional(readOnly = true)
    public List<JobResponse> getRecommendedJobs(User currentUser) {
        List<Job> openJobs = jobRepository.findTop12ByStatusOrderByCreatedAtDesc("OPEN");
        if (currentUser == null || currentUser.getSkills() == null || currentUser.getSkills().isBlank()) {
            return mapWithUserContext(openJobs.stream().limit(6).toList(), currentUser);
        }
        Set<String> userSkills = parseSkillTokens(currentUser.getSkills());
        List<Job> ranked = openJobs.stream()
                .sorted((a, b) -> Integer.compare(skillOverlap(b, userSkills), skillOverlap(a, userSkills)))
                .limit(6)
                .toList();
        return mapWithUserContext(ranked, currentUser);
    }

    private static Set<String> parseSkillTokens(String skills) {
        return Arrays.stream(skills.toLowerCase().split("[,;|/]"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    private static int skillOverlap(Job job, Set<String> userSkills) {
        if (job.getSkills() == null || job.getSkills().isBlank()) return 0;
        Set<String> jobSkills = parseSkillTokens(job.getSkills());
        int overlap = 0;
        for (String skill : userSkills) {
            if (jobSkills.contains(skill)) overlap++;
            else if (jobSkills.stream().anyMatch(js -> js.contains(skill) || skill.contains(js))) overlap++;
        }
        return overlap;
    }

    @Transactional
    public JobResponse createJob(JobRequest request, Admin admin) {
        Job job = Job.builder()
                .title(request.getTitle())
                .company(resolveCompany(request, admin))
                .description(request.getDescription())
                .location(request.getLocation())
                .salaryMin(request.getSalaryMin())
                .salaryMax(request.getSalaryMax())
                .experienceLevel(request.getExperienceLevel())
                .jobType(request.getJobType())
                .category(request.getCategory())
                .skills(request.getSkills())
                .featured(request.getFeatured() != null && request.getFeatured())
                .createdBy(admin)
                .build();

        Job saved = jobRepository.save(job);
        notificationService.create(admin, "Job Posted", "Job '" + saved.getTitle() + "' has been published.", "JOB_POSTED", saved.getId());
        return EntityMapper.toJobResponse(saved);
    }

    public List<JobResponse> getMyJobs(Admin admin) {
        return jobRepository.findByCreatedByIdOrderByCreatedAtDesc(admin.getId()).stream()
                .map(EntityMapper::toJobResponse)
                .toList();
    }

    @Transactional
    public JobResponse updateJob(Long id, JobRequest request, Admin admin) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        assertJobOwner(job, admin);

        job.setTitle(request.getTitle());
        job.setCompany(resolveCompany(request, admin));
        job.setDescription(request.getDescription());
        job.setLocation(request.getLocation());
        job.setSalaryMin(request.getSalaryMin());
        job.setSalaryMax(request.getSalaryMax());
        job.setExperienceLevel(request.getExperienceLevel());
        job.setJobType(request.getJobType());
        job.setCategory(request.getCategory());
        job.setSkills(request.getSkills());
        if (request.getFeatured() != null) job.setFeatured(request.getFeatured());

        return EntityMapper.toJobResponse(jobRepository.save(job));
    }

    @Transactional
    public void deleteJob(Long id, Admin admin) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        assertJobOwner(job, admin);
        jobRepository.delete(job);
    }

    @Transactional
    public JobResponse closeJob(Long id, Admin admin) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        assertJobOwner(job, admin);
        job.setStatus("CLOSED");
        return EntityMapper.toJobResponse(jobRepository.save(job));
    }

    @Transactional
    public JobResponse reopenJob(Long id, Admin admin) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        assertJobOwner(job, admin);
        job.setStatus("OPEN");
        return EntityMapper.toJobResponse(jobRepository.save(job));
    }

    private String resolveCompany(JobRequest request, Admin admin) {
        String company = RecruiterCompanyUtils.resolveCompany(admin, request.getCompany());
        if (company == null) {
            throw new BadRequestException("Company name is required. Add it in your Profile or the job form.");
        }
        return company;
    }

    private void assertJobOwner(Job job, Admin admin) {
        if (job.getCreatedBy() == null || !job.getCreatedBy().getId().equals(admin.getId())) {
            throw new BadRequestException("You can only manage your own job postings");
        }
    }

    public List<String> getCategories() {
        return List.of("Engineering", "Design", "Marketing", "Sales", "Finance", "HR", "Operations", "Data Science");
    }

    public long getPlatformStats(String type) {
        return switch (type) {
            case "jobs" -> jobRepository.countByStatus("OPEN");
            case "companies" -> jobRepository.count();
            default -> jobRepository.count();
        };
    }

    private List<JobResponse> mapWithUserContext(List<Job> jobs, User currentUser) {
        if (jobs.isEmpty()) {
            return List.of();
        }
        List<Long> jobIds = jobs.stream().map(Job::getId).toList();

        Map<Long, Long> applicantCounts = new HashMap<>();
        applicationRepository.countByJobIds(jobIds).forEach(row ->
                applicantCounts.put((Long) row[0], ((Number) row[1]).longValue()));

        Set<Long> savedIds = currentUser != null
                ? new HashSet<>(savedJobRepository.findSavedJobIds(currentUser.getId(), jobIds))
                : Set.of();
        Set<Long> appliedIds = currentUser != null
                ? new HashSet<>(applicationRepository.findAppliedJobIds(currentUser.getId(), jobIds))
                : Set.of();

        return jobs.stream().map(job -> {
            long applicantCount = applicantCounts.getOrDefault(job.getId(), 0L);
            JobResponse response = EntityMapper.toJobResponse(
                    job, savedIds.contains(job.getId()), appliedIds.contains(job.getId()));
            response.setApplicantCount(applicantCount);
            if (currentUser != null) {
                response.setMatchPreview(aiService.calculateMatchBreakdown(job, currentUser, applicantCount));
            }
            return response;
        }).toList();
    }

    private Sort resolveSort(String sort) {
        if (sort == null) return Sort.by(Sort.Direction.DESC, "createdAt");
        return switch (sort) {
            case "salary_asc" -> Sort.by(Sort.Direction.ASC, "salaryMin");
            case "salary_desc" -> Sort.by(Sort.Direction.DESC, "salaryMax");
            case "title" -> Sort.by(Sort.Direction.ASC, "title");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }
}
