package com.globalco.jobboard.common.event;

/** Routing keys on the shared topic exchange. Consumers bind their own queue to the keys they need. */
public final class EventTopics {

    private EventTopics() {}

    public static final String EXCHANGE = "jobboard.events";
    public static final String DEAD_LETTER_EXCHANGE = "jobboard.events.dlx";

    public static final String RECRUITER_UPDATED = "account.recruiter-updated";
    public static final String PASSWORD_RESET_OTP = "account.password-reset-otp";
    public static final String ACCOUNT_DELETED = "account.deleted";
    public static final String REGISTRATION_FOR_EXISTING_EMAIL = "account.registration-existing-email";

    public static final String JOB_CREATED = "job.created";
    public static final String JOB_UPDATED = "job.updated";
    public static final String JOB_DELETED = "job.deleted";
    public static final String JOB_ALERT_MATCHED = "job.alert-matched";

    public static final String APPLICATION_SUBMITTED = "application.submitted";
    public static final String APPLICATION_STATUS_CHANGED = "application.status-changed";
    public static final String APPLICATION_WITHDRAWN = "application.withdrawn";
    public static final String INTERVIEW_SCHEDULED = "application.interview-scheduled";

    public static final String MESSAGE_SENT = "message.sent";
}
