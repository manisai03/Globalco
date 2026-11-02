package com.globalco.jobboard.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

/** Brevo transactional email over HTTPS (port 443). */
@Slf4j
@Component
public class BrevoApiEmailSender {

    private final RestClient restClient = RestClient.builder().baseUrl("https://api.brevo.com").build();

    @Value("${app.brevo.api-key:}")
    private String apiKey;

    public boolean isConfigured() {
        return StringUtils.hasText(apiKey);
    }

    public void send(String fromEmail, String toEmail, String subject, String body) {
        if (apiKey.startsWith("xsmtpsib-")) {
            throw new IllegalStateException("BREVO_API_KEY is an SMTP key (xsmtpsib-); create an API key (xkeysib-)");
        }
        Map<String, Object> payload = Map.of(
                "sender", Map.of("email", fromEmail, "name", "Job Board"),
                "to", List.of(Map.of("email", toEmail)),
                "subject", subject,
                "textContent", body);
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
            throw ex;
        }
    }
}
