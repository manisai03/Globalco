package com.globalco.jobboard.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Sends account emails via the Brevo HTTP API when configured (SMTP ports are blocked on Render's free tier),
 * otherwise via SMTP. Failures throw, so the listener retries and finally parks the event on the DLQ.
 */
@Slf4j
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final BrevoApiEmailSender brevo;
    private final String fromEmail;
    private final boolean logOtpWhenUnconfigured;

    public EmailService(
            ObjectProvider<JavaMailSender> mailSender,
            BrevoApiEmailSender brevo,
            @Value("${app.mail.from:noreply@jobboard.app}") String fromEmail,
            @Value("${app.mail.log-otp-when-unconfigured:false}") boolean logOtpWhenUnconfigured,
            @Value("${spring.mail.username:}") String smtpUsername) {
        this.mailSender = StringUtils.hasText(smtpUsername) ? mailSender.getIfAvailable() : null;
        this.brevo = brevo;
        this.fromEmail = fromEmail;
        this.logOtpWhenUnconfigured = logOtpWhenUnconfigured;
    }

    public void sendOtp(String toEmail, String otp) {
        String subject = "Job Board - Password Reset OTP";
        String body = """
                Your password reset OTP is: %s

                This code expires in 10 minutes.
                If you did not request this, please ignore this email.

                - Job Board Team
                """.formatted(otp);

        if (!isConfigured() && logOtpWhenUnconfigured) {
            log.warn("Email is not configured; local-dev OTP for {} is {}", toEmail, otp);
            return;
        }
        send(toEmail, subject, body);
    }

    /** Someone tried to register with this address. Best effort: without email configured it is only logged. */
    public void sendExistingAccountNotice(String toEmail) {
        if (!isConfigured()) {
            log.info("Email is not configured; skipped existing-account notice for {}", toEmail);
            return;
        }
        send(toEmail, "Job Board - You already have an account", """
                Someone (hopefully you) tried to create a Job Board account with this email address,
                but an account already exists for it.

                If that was you, sign in instead. Forgot your password? Use "Forgot password" on the sign-in page.
                If it wasn't you, you can ignore this email; nothing has changed on your account.

                - Job Board Team
                """);
    }

    private boolean isConfigured() {
        return brevo.isConfigured() || mailSender != null;
    }

    private void send(String toEmail, String subject, String body) {
        if (brevo.isConfigured()) {
            brevo.send(fromEmail, toEmail, subject, body);
            return;
        }
        if (mailSender == null) {
            throw new IllegalStateException("Email is not configured: set BREVO_API_KEY or MAIL_USERNAME/MAIL_PASSWORD");
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
        log.info("Email '{}' sent via SMTP to {}", subject, toEmail);
    }
}
