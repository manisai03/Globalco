package com.globalco.jobboard.common.event;

import com.globalco.jobboard.common.security.AccountType;

import java.time.LocalDateTime;

/**
 * Integration events published on the {@link EventTopics#EXCHANGE} topic exchange.
 * Records are immutable contracts: add fields only in a backward-compatible way.
 */
public final class Events {

    private Events() {}

    /** auth-service: a recruiter changed profile/company details shown on their job postings. */
    public record RecruiterUpdated(
            Long recruiterId, String fullName, String companyName, String companyWebsite,
            String companyDescription, String recruiterTitle, String location) {}

    /** auth-service: password-reset OTP generated; notification-service emails it. */
    public record PasswordResetOtpRequested(String email, String otp) {}

    /**
     * auth-service: someone tried to register with an email that already has an account. The API answers as if
     * the registration worked (so it can't be used to discover accounts); notification-service tells the owner.
     */
    public record RegistrationForExistingEmail(String email) {}

    /** auth-service: the account was deleted; every service removes the data it holds for it. */
    public record AccountDeleted(AccountType accountType, Long accountId) {}

    /** job-service */
    public record JobCreated(Long jobId, Long recruiterId, String title) {}

    /** job-service: a newly posted job matches one of the candidate's saved searches with alerts on. */
    public record JobAlertMatched(Long userId, Long jobId, String jobTitle, String company, String searchName) {}

    /** job-service: title/company/status changed; consumers refresh their copies. */
    public record JobUpdated(Long jobId, String title, String company, String status) {}

    /** job-service */
    public record JobDeleted(Long jobId) {}

    /** application-service */
    public record ApplicationSubmitted(
            Long applicationId, Long jobId, String jobTitle, Long userId, String candidateName, Long recruiterId) {}

    /** application-service */
    public record ApplicationStatusChanged(Long applicationId, Long userId, String jobTitle, String status) {}

    /** application-service: the candidate withdrew; the recruiter is told (without revealing a masked name). */
    public record ApplicationWithdrawn(Long applicationId, Long recruiterId, String jobTitle) {}

    /** application-service */
    public record InterviewScheduled(
            Long interviewId, Long applicationId, Long userId, String jobTitle, LocalDateTime scheduledAt) {}

    /** messaging-service */
    public record MessageSent(
            Long messageId, AccountType receiverType, Long receiverId, String senderName) {}
}
