package com.globalco.jobboard.notification.event;

import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.event.MessagingConfig;
import com.globalco.jobboard.common.security.AccountType;
import com.globalco.jobboard.notification.service.EmailService;
import com.globalco.jobboard.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.rabbit.annotation.RabbitHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Turns domain events from every service into in-app notifications (same texts as the monolith) and emails.
 * Every handler runs through {@link ProcessedEvents}, so a redelivered message has no second effect.
 */
@Component
@RequiredArgsConstructor
@RabbitListener(queues = DomainEventsListener.QUEUE)
public class DomainEventsListener {

    static final String QUEUE = "notification-service.events";
    private static final String JOB_REMOVED = "JOB_REMOVED";
    static final DateTimeFormatter INTERVIEW_TIME = DateTimeFormatter.ofPattern("d MMM yyyy, h:mm a", Locale.ENGLISH);

    private final NotificationService notifications;
    private final EmailService emailService;
    private final ProcessedEvents processedEvents;

    @RabbitHandler
    public void onJobCreated(Events.JobCreated e, @Header(name = AmqpHeaders.MESSAGE_ID, required = false) String id) {
        processedEvents.runOnce(id, () -> notifications.create(AccountType.ADMIN, e.recruiterId(), "Job Posted",
                "Job '" + e.title() + "' has been published.", "JOB_POSTED", e.jobId()));
    }

    @RabbitHandler
    public void onJobAlertMatched(Events.JobAlertMatched e,
                                  @Header(name = AmqpHeaders.MESSAGE_ID, required = false) String id) {
        processedEvents.runOnce(id, () -> notifications.create(AccountType.USER, e.userId(), "New job for your alert",
                e.jobTitle() + " at " + e.company() + " matches your alert \"" + e.searchName() + "\".",
                "JOB_ALERT", e.jobId()));
    }

    @RabbitHandler
    public void onApplicationSubmitted(Events.ApplicationSubmitted e,
                                       @Header(name = AmqpHeaders.MESSAGE_ID, required = false) String id) {
        processedEvents.runOnce(id, () -> {
            notifications.create(AccountType.USER, e.userId(), "Application Submitted",
                    "Your application for " + e.jobTitle() + " has been submitted.", "APPLICATION_SUBMITTED",
                    e.applicationId());
            if (e.recruiterId() != null) {
                notifications.create(AccountType.ADMIN, e.recruiterId(), "New Application",
                        e.candidateName() + " applied for " + e.jobTitle(), "NEW_APPLICATION", e.applicationId());
            }
        });
    }

    @RabbitHandler
    public void onStatusChanged(Events.ApplicationStatusChanged e,
                                @Header(name = AmqpHeaders.MESSAGE_ID, required = false) String id) {
        processedEvents.runOnce(id, () -> notifications.create(AccountType.USER, e.userId(), "Application Update",
                statusMessage(e), "STATUS_UPDATE", e.applicationId()));
    }

    static String statusMessage(Events.ApplicationStatusChanged e) {
        if (JOB_REMOVED.equals(e.status())) {
            return "The " + e.jobTitle() + " job was removed by the recruiter, so your application has been closed.";
        }
        String status = e.status() == null ? "updated" : e.status().replace('_', ' ').toLowerCase(Locale.ROOT);
        return "Your application for " + e.jobTitle() + " is now " + status + ".";
    }

    @RabbitHandler
    public void onAccountDeleted(Events.AccountDeleted e,
                                 @Header(name = AmqpHeaders.MESSAGE_ID, required = false) String id) {
        processedEvents.runOnce(id, () -> notifications.deleteAllForAccount(e.accountType(), e.accountId()));
    }

    @RabbitHandler
    public void onApplicationWithdrawn(Events.ApplicationWithdrawn e,
                                       @Header(name = AmqpHeaders.MESSAGE_ID, required = false) String id) {
        processedEvents.runOnce(id, () -> notifications.create(AccountType.ADMIN, e.recruiterId(),
                "Application Withdrawn",
                "A candidate withdrew their application for " + e.jobTitle() + ".", "APPLICATION_WITHDRAWN",
                e.applicationId()));
    }

    @RabbitHandler
    public void onInterviewScheduled(Events.InterviewScheduled e,
                                     @Header(name = AmqpHeaders.MESSAGE_ID, required = false) String id) {
        String when = e.scheduledAt() != null ? INTERVIEW_TIME.format(e.scheduledAt()) : "a date to be confirmed";
        processedEvents.runOnce(id, () -> notifications.create(AccountType.USER, e.userId(), "Interview Scheduled",
                "Interview scheduled for " + e.jobTitle() + " on " + when, "INTERVIEW_SCHEDULED", e.interviewId()));
    }

    @RabbitHandler
    public void onMessageSent(Events.MessageSent e, @Header(name = AmqpHeaders.MESSAGE_ID, required = false) String id) {
        processedEvents.runOnce(id, () -> notifications.create(e.receiverType(), e.receiverId(), "New Message",
                e.senderName() + " sent you a message", "NEW_MESSAGE", e.messageId()));
    }

    @RabbitHandler
    public void onPasswordResetOtp(Events.PasswordResetOtpRequested e,
                                   @Header(name = AmqpHeaders.MESSAGE_ID, required = false) String id) {
        processedEvents.runOnce(id, () -> emailService.sendOtp(e.email(), e.otp()));
    }

    @RabbitHandler
    public void onRegistrationForExistingEmail(Events.RegistrationForExistingEmail e,
                                               @Header(name = AmqpHeaders.MESSAGE_ID, required = false) String id) {
        processedEvents.runOnce(id, () -> emailService.sendExistingAccountNotice(e.email()));
    }

    @Configuration
    static class QueueConfig {
        @Bean
        Declarables notificationServiceQueue() {
            return MessagingConfig.consumerQueue(QUEUE,
                    EventTopics.JOB_CREATED,
                    EventTopics.JOB_ALERT_MATCHED,
                    EventTopics.APPLICATION_SUBMITTED,
                    EventTopics.APPLICATION_STATUS_CHANGED,
                    EventTopics.APPLICATION_WITHDRAWN,
                    EventTopics.INTERVIEW_SCHEDULED,
                    EventTopics.MESSAGE_SENT,
                    EventTopics.PASSWORD_RESET_OTP,
                    EventTopics.REGISTRATION_FOR_EXISTING_EMAIL,
                    EventTopics.ACCOUNT_DELETED);
        }
    }
}
