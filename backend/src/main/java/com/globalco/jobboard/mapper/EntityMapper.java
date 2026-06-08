package com.globalco.jobboard.mapper;

import com.globalco.jobboard.dto.response.*;
import com.globalco.jobboard.model.*;

public final class EntityMapper {

    private EntityMapper() {}

    public static UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .location(user.getLocation())
                .bio(user.getBio())
                .skills(user.getSkills())
                .resumeUrl(user.getResumeUrl())
                .resumeUploadedAt(user.getResumeUploadedAt())
                .profilePictureUrl(user.getProfilePictureUrl())
                .profilePictureUploadedAt(user.getProfilePictureUploadedAt())
                .currentTitle(user.getCurrentTitle())
                .headline(user.getHeadline())
                .openToWork(user.getOpenToWork())
                .educationProfile(user.getEducationProfile())
                .internshipsProfile(user.getInternshipsProfile())
                .employmentProfile(user.getEmploymentProfile())
                .role("ROLE_USER")
                .createdAt(user.getCreatedAt())
                .build();
    }

    public static UserResponse toUserResponse(Admin admin) {
        return UserResponse.builder()
                .id(admin.getId())
                .email(admin.getEmail())
                .fullName(admin.getFullName())
                .phone(admin.getPhone())
                .location(admin.getLocation())
                .companyName(admin.getCompanyName())
                .companyWebsite(admin.getCompanyWebsite())
                .companyDescription(admin.getCompanyDescription())
                .recruiterTitle(admin.getRecruiterTitle())
                .role("ROLE_ADMIN")
                .createdAt(admin.getCreatedAt())
                .build();
    }

    public static UserResponse toUserResponse(AuthenticatedAccount account) {
        if (account instanceof Admin admin) {
            return toUserResponse(admin);
        }
        return toUserResponse((User) account);
    }

    public static JobResponse toJobResponse(Job job) {
        return toJobResponse(job, false, false);
    }

    public static JobResponse toJobResponse(Job job, boolean saved, boolean applied) {
        JobResponse.JobResponseBuilder builder = JobResponse.builder()
                .id(job.getId())
                .title(job.getTitle())
                .company(job.getCompany())
                .description(job.getDescription())
                .location(job.getLocation())
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .experienceLevel(job.getExperienceLevel())
                .jobType(job.getJobType())
                .category(job.getCategory())
                .skills(job.getSkills())
                .status(job.getStatus())
                .featured(job.getFeatured())
                .createdAt(job.getCreatedAt())
                .saved(saved)
                .applied(applied);

        if (job.getCreatedBy() != null) {
            builder.createdById(job.getCreatedBy().getId())
                    .createdByName(job.getCreatedBy().getFullName())
                    .companyDescription(job.getCreatedBy().getCompanyDescription())
                    .companyWebsite(job.getCreatedBy().getCompanyWebsite())
                    .recruiterTitle(job.getCreatedBy().getRecruiterTitle());
        }

        return builder.build();
    }

    public static InterviewResponse toInterviewResponse(Interview interview) {
        Application app = interview.getApplication();
        return InterviewResponse.builder()
                .id(interview.getId())
                .applicationId(app.getId())
                .jobId(app.getJob().getId())
                .jobTitle(app.getJob().getTitle())
                .company(app.getJob().getCompany())
                .scheduledAt(interview.getScheduledAt())
                .location(interview.getLocation())
                .notes(interview.getNotes())
                .status(interview.getStatus())
                .applicationStatus(app.getStatus())
                .createdAt(interview.getCreatedAt())
                .build();
    }

    public static ApplicationResponse toApplicationResponse(Application app) {
        return toApplicationResponse(app, false);
    }

    public static ApplicationResponse toApplicationResponse(Application app, boolean maskUnviewedCandidate) {
        String resume = app.getResumeUrl();
        boolean revealed = !maskUnviewedCandidate || Boolean.TRUE.equals(app.getRecruiterViewed());
        Long userId = app.getUser().getId();
        return ApplicationResponse.builder()
                .id(app.getId())
                .jobId(app.getJob().getId())
                .jobTitle(app.getJob().getTitle())
                .company(app.getJob().getCompany())
                .userId(userId)
                .userName(revealed ? app.getUser().getFullName() : maskedCandidateLabel(userId))
                .userEmail(revealed ? app.getUser().getEmail() : null)
                .userPhone(revealed ? app.getUser().getPhone() : null)
                .userLocation(revealed ? app.getUser().getLocation() : null)
                .userSkills(revealed ? app.getUser().getSkills() : null)
                .resumeUrl(revealed ? resume : null)
                .coverLetter(revealed ? app.getCoverLetter() : null)
                .hasResume(revealed && resume != null && !resume.isBlank())
                .status(app.getStatus())
                .matchScore(app.getMatchScore())
                .recruiterViewed(app.getRecruiterViewed())
                .createdAt(app.getCreatedAt())
                .updatedAt(app.getUpdatedAt())
                .build();
    }

    public static String maskedCandidateLabel(Long userId) {
        return "Candidate #" + userId;
    }

    public static ApplicationDetailResponse toApplicationDetailResponse(
            Application app, MatchBreakdownResponse matchBreakdown) {
        return ApplicationDetailResponse.builder()
                .id(app.getId())
                .jobId(app.getJob().getId())
                .jobTitle(app.getJob().getTitle())
                .company(app.getJob().getCompany())
                .jobLocation(app.getJob().getLocation())
                .jobSkills(app.getJob().getSkills())
                .jobExperienceLevel(app.getJob().getExperienceLevel())
                .jobType(app.getJob().getJobType())
                .jobCategory(app.getJob().getCategory())
                .userId(app.getUser().getId())
                .userName(app.getUser().getFullName())
                .userEmail(app.getUser().getEmail())
                .userPhone(app.getUser().getPhone())
                .userLocation(app.getUser().getLocation())
                .userBio(app.getUser().getBio())
                .userSkills(app.getUser().getSkills())
                .userProfileResumeUrl(app.getUser().getResumeUrl())
                .applicationResumeUrl(app.getResumeUrl())
                .coverLetter(app.getCoverLetter())
                .status(app.getStatus())
                .matchScore(app.getMatchScore())
                .matchBreakdown(matchBreakdown)
                .createdAt(app.getCreatedAt())
                .updatedAt(app.getUpdatedAt())
                .build();
    }

    public static MessageResponse toMessageResponse(Message message, String senderName, String receiverName) {
        return MessageResponse.builder()
                .id(message.getId())
                .senderId(message.getSenderId())
                .senderAccountType(message.getSenderType())
                .senderName(senderName)
                .receiverId(message.getReceiverId())
                .receiverAccountType(message.getReceiverType())
                .receiverName(receiverName)
                .content(message.getContent())
                .read(message.getReadFlag())
                .createdAt(message.getCreatedAt())
                .build();
    }

    public static NotificationResponse toNotificationResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .read(notification.getReadFlag())
                .referenceId(notification.getReferenceId())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
