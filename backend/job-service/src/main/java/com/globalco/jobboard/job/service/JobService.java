package com.globalco.jobboard.job.service;

import com.globalco.jobboard.common.client.AuthServiceClient;
import com.globalco.jobboard.common.dto.internal.RecruiterJobStats;
import com.globalco.jobboard.common.dto.internal.RecruiterSummary;
import com.globalco.jobboard.common.dto.internal.UserSummary;
import com.globalco.jobboard.common.dto.request.JobRequest;
import com.globalco.jobboard.common.dto.response.JobResponse;
import com.globalco.jobboard.common.dto.response.PageResponse;
import com.globalco.jobboard.common.event.EventPublisher;
import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.util.RecruiterCompanyUtils;
import com.globalco.jobboard.job.model.Job;
import com.globalco.jobboard.job.repository.JobRepository;
import com.globalco.jobboard.job.repository.SavedJobRepository;
import com.globalco.jobboard.job.repository.SavedSearchRepository;
import com.globalco.jobboard.common.security.AccountType;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.support.TransactionTemplate;
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
    private final JobEnricher jobEnricher;
    private final SavedSearchRepository savedSearchRepository;
    private final SavedSearchService savedSearchService;
    private final AuthServiceClient authServiceClient;
    private final EventPublisher eventPublisher;
    private final TransactionTemplate transactionTemplate;

    public PageResponse<JobResponse> searchJobs(
            String search, String location, String jobType, String experienceLevel,
            String category, BigDecimal minSalary, BigDecimal maxSalary,
            String postedWithin, String sort, int page, int size, AccountPrincipal viewer) {

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<Job> jobs = jobRepository.findAll(
                JobSpecification.withFilters(search, location, jobType, experienceLevel,
                        category, minSalary, maxSalary, "OPEN", postedWithin),
                PageRequest.of(safePage, safeSize, resolveSort(sort)));

        return PageResponse.<JobResponse>builder()
                .content(jobEnricher.enrich(jobs.getContent(), viewer))
                .page(jobs.getNumber())
                .size(jobs.getSize())
                .totalElements(jobs.getTotalElements())
                .totalPages(jobs.getTotalPages())
                .build();
    }

    public List<JobResponse> getFeaturedJobs(AccountPrincipal viewer) {
        return jobEnricher.enrich(jobRepository.findTop6ByFeaturedTrueAndStatusOrderByCreatedAtDesc("OPEN"), viewer);
    }

    public JobResponse getJobById(Long id, AccountPrincipal viewer) {
        return jobEnricher.enrich(List.of(getJob(id)), viewer).get(0);
    }

    public List<JobResponse> getSimilarJobs(Long id, AccountPrincipal viewer) {
        Job job = getJob(id);
        String category = job.getCategory() != null ? job.getCategory() : "Engineering";
        return jobEnricher.enrich(
                jobRepository.findTop6ByCategoryAndStatusAndIdNotOrderByCreatedAtDesc(category, "OPEN", id), viewer);
    }

    public List<JobResponse> getRecommendedJobs(AccountPrincipal viewer) {
        List<Job> openJobs = jobRepository.findTop12ByStatusOrderByCreatedAtDesc("OPEN");
        UserSummary user = viewer != null ? jobEnricher.fetchUser(viewer.id()) : null;
        if (user == null || user.skills() == null || user.skills().isBlank()) {
            return jobEnricher.enrich(openJobs.stream().limit(6).toList(), viewer);
        }
        Set<String> userSkills = parseSkillTokens(user.skills());
        List<Job> ranked = openJobs.stream()
                .sorted((a, b) -> Integer.compare(skillOverlap(b, userSkills), skillOverlap(a, userSkills)))
                .limit(6)
                .toList();
        return jobEnricher.enrich(ranked, viewer);
    }

    /** The recruiter lookup runs before any transaction opens, so a slow auth-service never holds a DB connection. */
    public JobResponse createJob(JobRequest request, AccountPrincipal admin) {
        RecruiterSummary recruiter = authServiceClient.getRecruiter(admin.id());
        Job job = Job.builder()
                .title(request.getTitle())
                .company(resolveCompany(recruiter))
                .description(request.getDescription())
                .location(request.getLocation())
                .salaryMin(request.getSalaryMin())
                .salaryMax(request.getSalaryMax())
                .experienceLevel(request.getExperienceLevel())
                .jobType(request.getJobType())
                .category(request.getCategory())
                .skills(request.getSkills())
                .build();
        applyRecruiterSnapshot(job, recruiter);

        Job saved = transactionTemplate.execute(tx -> {
            Job created = jobRepository.save(job);
            eventPublisher.publish(EventTopics.JOB_CREATED,
                    new Events.JobCreated(created.getId(), admin.id(), created.getTitle()));
            savedSearchService.announceNewJob(created);
            return created;
        });
        return JobMapper.toResponse(saved);
    }

    public List<JobResponse> getMyJobs(AccountPrincipal admin) {
        return jobRepository.findByRecruiterIdOrderByCreatedAtDesc(admin.id()).stream()
                .map(JobMapper::toResponse)
                .toList();
    }

    public JobResponse updateJob(Long id, JobRequest request, AccountPrincipal admin) {
        assertJobOwner(getJob(id), admin);
        RecruiterSummary recruiter = authServiceClient.getRecruiter(admin.id());
        return transactionTemplate.execute(tx -> applyUpdate(getJob(id), request, recruiter));
    }

    private JobResponse applyUpdate(Job job, JobRequest request, RecruiterSummary recruiter) {

        job.setTitle(request.getTitle());
        job.setCompany(resolveCompany(recruiter));
        job.setDescription(request.getDescription());
        job.setLocation(request.getLocation());
        job.setSalaryMin(request.getSalaryMin());
        job.setSalaryMax(request.getSalaryMax());
        job.setExperienceLevel(request.getExperienceLevel());
        job.setJobType(request.getJobType());
        job.setCategory(request.getCategory());
        job.setSkills(request.getSkills());
        applyRecruiterSnapshot(job, recruiter);

        return saveAndAnnounce(job);
    }

    @Transactional
    public void deleteJob(Long id, AccountPrincipal admin) {
        Job job = getJob(id);
        assertJobOwner(job, admin);
        remove(job);
    }

    /** account.deleted: a recruiter's postings go away (applicants are told); a candidate's saved items too. */
    @Transactional
    public void removeAccountData(Events.AccountDeleted event) {
        if (event.accountType() == AccountType.ADMIN) {
            jobRepository.findByRecruiterIdOrderByCreatedAtDesc(event.accountId()).forEach(this::remove);
        } else {
            savedJobRepository.deleteByUserId(event.accountId());
            savedSearchRepository.deleteByUserId(event.accountId());
        }
    }

    private void remove(Job job) {
        savedJobRepository.deleteByJobId(job.getId());
        jobRepository.delete(job);
        eventPublisher.publish(EventTopics.JOB_DELETED, new Events.JobDeleted(job.getId()));
    }

    @Transactional
    public JobResponse closeJob(Long id, AccountPrincipal admin) {
        return setStatus(id, "CLOSED", admin);
    }

    @Transactional
    public JobResponse reopenJob(Long id, AccountPrincipal admin) {
        return setStatus(id, "OPEN", admin);
    }

    public List<String> getCategories() {
        return List.of("Engineering", "Design", "Marketing", "Sales", "Finance", "HR", "Operations", "Data Science");
    }

    public long countOpenJobs() {
        return jobRepository.countByStatus("OPEN");
    }

    public long countAllJobs() {
        return jobRepository.count();
    }

    public RecruiterJobStats getRecruiterStats(Long recruiterId) {
        Map<String, Long> byCategory = jobRepository.countByCategoryForRecruiter(recruiterId).stream()
                .collect(Collectors.toMap(
                        row -> row[0] != null ? (String) row[0] : "Uncategorized",
                        row -> ((Number) row[1]).longValue(),
                        Long::sum,
                        HashMap::new));
        return new RecruiterJobStats(
                jobRepository.countByRecruiterId(recruiterId),
                jobRepository.countByRecruiterIdAndStatus(recruiterId, "OPEN"),
                byCategory);
    }

    @Transactional
    public void refreshRecruiterSnapshot(Events.RecruiterUpdated event) {
        String company = RecruiterCompanyUtils.resolveCompany(event.companyName(), null);
        jobRepository.updateRecruiterSnapshot(event.recruiterId(), event.fullName(), event.companyDescription(),
                event.companyWebsite(), event.recruiterTitle(), company);
        if (company == null) return;
        for (Job job : jobRepository.findByRecruiterIdOrderByCreatedAtDesc(event.recruiterId())) {
            eventPublisher.publish(EventTopics.JOB_UPDATED,
                    new Events.JobUpdated(job.getId(), job.getTitle(), company, job.getStatus()));
        }
    }

    Job getJob(Long id) {
        return jobRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Job not found"));
    }

    private JobResponse setStatus(Long id, String status, AccountPrincipal admin) {
        Job job = getJob(id);
        assertJobOwner(job, admin);
        job.setStatus(status);
        return saveAndAnnounce(job);
    }

    private JobResponse saveAndAnnounce(Job job) {
        Job saved = jobRepository.save(job);
        eventPublisher.publish(EventTopics.JOB_UPDATED,
                new Events.JobUpdated(saved.getId(), saved.getTitle(), saved.getCompany(), saved.getStatus()));
        return JobMapper.toResponse(saved);
    }

    private static void applyRecruiterSnapshot(Job job, RecruiterSummary recruiter) {
        job.setRecruiterId(recruiter.id());
        job.setRecruiterName(recruiter.fullName());
        job.setRecruiterCompanyDescription(recruiter.companyDescription());
        job.setRecruiterCompanyWebsite(recruiter.companyWebsite());
        job.setRecruiterTitle(recruiter.recruiterTitle());
    }

    /** Jobs are always posted under the recruiter's own profile company. */
    private static String resolveCompany(RecruiterSummary recruiter) {
        String company = RecruiterCompanyUtils.resolveCompany(recruiter.companyName(), null);
        if (company == null) {
            throw new BadRequestException("Set your real company name in your Profile before posting jobs.");
        }
        return company;
    }

    private static void assertJobOwner(Job job, AccountPrincipal admin) {
        if (job.getRecruiterId() == null || !job.getRecruiterId().equals(admin.id())) {
            throw new ResourceNotFoundException("Job not found");
        }
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

    private static Sort resolveSort(String sort) {
        if (sort == null) return Sort.by(Sort.Direction.DESC, "createdAt");
        return switch (sort) {
            case "salary_asc" -> Sort.by(Sort.Direction.ASC, "salaryMin");
            case "salary_desc" -> Sort.by(Sort.Direction.DESC, "salaryMax");
            case "title" -> Sort.by(Sort.Direction.ASC, "title");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }
}
