package com.globalco.jobboard.ai.service;

import com.globalco.jobboard.common.dto.request.AiJobDescriptionRequest;
import com.globalco.jobboard.common.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.stream.Collectors;

@Slf4j
@Service
public class JobDescriptionService {

    @Value("${app.openai.api-key:}")
    private String openAiApiKey;

    @Value("${app.openai.enabled:false}")
    private boolean openAiEnabled;

    public String generate(AiJobDescriptionRequest request) {
        if (openAiEnabled && openAiApiKey != null && !openAiApiKey.isBlank()) {
            log.info("OpenAI integration placeholder - would call API for: {}", request.getJobTitle());
        }
        return buildTemplateDescription(request);
    }

    private String buildTemplateDescription(AiJobDescriptionRequest req) {
        String company = req.getCompany() != null ? req.getCompany().trim() : "";
        if (company.isBlank()) {
            throw new BadRequestException("Company name is required for job descriptions");
        }
        String location = req.getLocation() != null && !req.getLocation().isBlank()
                ? req.getLocation().trim() : "Hyderabad, India";
        String level = req.getExperienceLevel() != null && !req.getExperienceLevel().isBlank()
                ? req.getExperienceLevel().trim() : "Mid-Level";

        return """
                **%s** — %s

                **Location:** %s | **Experience:** %s

                **About the Role**
                We are seeking a talented %s to join %s. You will work on challenging projects, collaborate with cross-functional teams, and contribute to building scalable solutions.

                **Required Skills**
                %s

                **Responsibilities**
                • Design, develop, and maintain high-quality software solutions
                • Collaborate with product and engineering teams
                • Write clean, testable, and well-documented code
                • Participate in code reviews and technical discussions
                • Stay current with industry trends and best practices

                **Qualifications**
                • Proven experience in relevant technologies
                • Strong problem-solving and communication skills
                • Bachelor's degree in Computer Science or equivalent experience

                **What We Offer**
                • Competitive salary and benefits
                • Flexible work arrangements
                • Professional development opportunities
                • Collaborative and inclusive work environment
                """.formatted(
                req.getJobTitle(), company, location, level,
                req.getJobTitle(), company,
                formatSkills(req.getSkills())
        ).trim();
    }

    private static String formatSkills(String skills) {
        return Arrays.stream(skills.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> "• " + s)
                .collect(Collectors.joining("\n"));
    }
}
