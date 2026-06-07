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

    @Value("${app.mail.from:noreply@globalco.com}")
    private String fromEmail;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtp(String toEmail, String otp) {
        if (mailSender == null || !StringUtils.hasText(mailUsername)) {
            throw new BadRequestException(
                    "Email service is not configured. In the backend folder run .\\setup-mail.ps1 (or create mail-local.yml from mail-local.yml.example), then restart the backend.");
        }

        String subject = "Globalco Jobs - Password Reset OTP";
        String body = """
                Your password reset OTP is: %s

                This code expires in 10 minutes.
                If you did not request this, please ignore this email.

                — Globalco Jobs Team
                """.formatted(otp);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("OTP email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            throw new BadRequestException("Failed to send OTP email. Please verify MAIL_HOST, MAIL_USERNAME, and MAIL_PASSWORD settings.");
        }
    }
}
