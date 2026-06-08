package com.globalco.jobboard.service;

import com.globalco.jobboard.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final BrevoApiEmailSender brevoApiEmailSender;

    @Value("${app.mail.from:noreply@globalco.com}")
    private String fromEmail;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public EmailService(
            @Autowired(required = false) JavaMailSender mailSender,
            BrevoApiEmailSender brevoApiEmailSender) {
        this.mailSender = mailSender;
        this.brevoApiEmailSender = brevoApiEmailSender;
    }

    public void sendOtp(String toEmail, String otp) {
        String subject = "Globalco Jobs - Password Reset OTP";
        String body = """
                Your password reset OTP is: %s

                This code expires in 10 minutes.
                If you did not request this, please ignore this email.

                — Globalco Jobs Team
                """.formatted(otp);

        if (brevoApiEmailSender.isConfigured()) {
            brevoApiEmailSender.send(fromEmail, toEmail, subject, body);
            return;
        }

        if (mailSender == null || !StringUtils.hasText(mailUsername)) {
            throw new BadRequestException(
                    "Email service is not configured. For local dev, create backend/mail-local.yml. "
                            + "For Render, set BREVO_API_KEY (Brevo API — SMTP is blocked on free tier).");
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("OTP email sent via SMTP to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            throw new BadRequestException(
                    "Failed to send OTP email. On Render free tier use BREVO_API_KEY instead of SMTP.");
        }
    }
}
