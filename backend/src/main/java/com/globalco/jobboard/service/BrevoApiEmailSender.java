package com.globalco.jobboard.service;

import com.globalco.jobboard.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

/**
 * Sends email via Brevo HTTP API (port 443). Required on Render free tier because SMTP ports are blocked.
 */
@Component
@Slf4j
public class BrevoApiEmailSender {

    private final RestClient restClient;

    @Value("${app.brevo.api-key:}")
    private String apiKey;

    public BrevoApiEmailSender() {
        this.restClient = RestClient.builder()
                .baseUrl("https://api.brevo.com")
                .build();
    }

    public boolean isConfigured() {
        return StringUtils.hasText(apiKey);
    }

    public void send(String fromEmail, String toEmail, String subject, String body) {
        if (!isConfigured()) {
            throw new BadRequestException("Brevo API key is not configured. Set BREVO_API_KEY on Render.");
        }

        Map<String, Object> payload = Map.of(
                "sender", Map.of("email", fromEmail, "name", "Globalco Jobs"),
                "to", List.of(Map.of("email", toEmail)),
                "subject", subject,
                "textContent", body
        );

        try {
            restClient.post()
                    .uri("/v3/smtp/email")
                    .header("api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("OTP email sent via Brevo API to {}", toEmail);
        } catch (RestClientResponseException ex) {
            log.error("Brevo API rejected email to {}: {} {}", toEmail, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new BadRequestException("Failed to send OTP email. Check BREVO_API_KEY and verify sender email in Brevo.");
        } catch (Exception ex) {
            log.error("Brevo API request failed for {}: {}", toEmail, ex.getMessage());
            throw new BadRequestException("Failed to send OTP email. Please try again later.");
        }
    }
}
