package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.AiJobDescriptionRequest;
import com.globalco.jobboard.dto.response.MatchBreakdownResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.model.Job;
import com.globalco.jobboard.model.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AiService {

    @Value("${app.openai.api-key:}")
    private String openAiApiKey;

    @Value("${app.openai.enabled:false}")
    private boolean openAiEnabled;

    public String generateJobDescription(AiJobDescriptionRequest request) {
        if (openAiEnabled && openAiApiKey != null && !openAiApiKey.isBlank()) {
            log.info("OpenAI integration placeholder - would call API for: {}", request.getJobTitle());
            // Production: integrate OpenAI Chat Completions API here
        }
        return buildTemplateDescription(request);
    }

    public int calculateMatchScore(String jobSkills, String candidateSkills) {
        return calculateMatchBreakdown(jobSkills, candidateSkills, null, null, true).getOverallScore();
    }

    public MatchBreakdownResponse calculateMatchBreakdown(Job job, User user, long applicantCount) {
        MatchBreakdownResponse base = calculateMatchBreakdown(
                job.getSkills(),
                user.getSkills(),
                job.getLocation(),
                user.getLocation(),
                isProfileComplete(user)
        );
        boolean early = isEarlyApplicant(job.getCreatedAt(), applicantCount);
        int score = base.getOverallScore();
        if (!early && base.isEarlyApplicant()) score = Math.max(0, score - 10);
        if (early && !base.isEarlyApplicant()) score = Math.min(100, score + 10);
        return MatchBreakdownResponse.builder()
                .overallScore(score)
                .skillsMatch(base.isSkillsMatch())
                .locationMatch(base.isLocationMatch())
                .earlyApplicant(early)
                .profileComplete(base.isProfileComplete())
                .matchedSkills(base.getMatchedSkills())
                .missingSkills(base.getMissingSkills())
                .build();
    }

    public MatchBreakdownResponse calculateMatchBreakdown(
            String jobSkills,
            String candidateSkills,
            String jobLocation,
            String candidateLocation,
            boolean profileComplete) {

        Set<String> jobSet = parseSkills(jobSkills);
        Set<String> candidateSet = parseSkills(candidateSkills);

        List<String> matched = jobSet.stream()
                .filter(candidateSet::contains)
                .sorted()
                .toList();
        List<String> missing = jobSet.stream()
                .filter(s -> !candidateSet.contains(s))
                .sorted()
                .toList();

        boolean skillsMatch = !jobSet.isEmpty() && matched.size() >= Math.ceil(jobSet.size() * 0.5);
        boolean locationMatch = locationsMatch(jobLocation, candidateLocation);
        boolean earlyApplicant = true;

        int score = 35;
        if (skillsMatch) score += 30;
        else if (!matched.isEmpty()) score += (int) (matched.size() * 30.0 / Math.max(jobSet.size(), 1));
        if (locationMatch) score += 15;
        if (profileComplete) score += 10;
        if (earlyApplicant) score += 10;
        score = Math.min(100, score);

        return MatchBreakdownResponse.builder()
                .overallScore(score)
                .skillsMatch(skillsMatch)
                .locationMatch(locationMatch)
                .earlyApplicant(earlyApplicant)
                .profileComplete(profileComplete)
                .matchedSkills(matched)
                .missingSkills(missing)
                .build();
    }

    private Set<String> parseSkills(String skills) {
        if (skills == null || skills.isBlank()) return Set.of();
        return Arrays.stream(skills.toLowerCase().split("[,;]+"))
                .map(String::trim)
                .filter(s -> s.length() > 1)
                .collect(Collectors.toSet());
    }

    private boolean locationsMatch(String jobLocation, String candidateLocation) {
        if (jobLocation == null || candidateLocation == null) return false;
        String job = jobLocation.toLowerCase();
        String candidate = candidateLocation.toLowerCase();
        if (job.contains("remote") || candidate.contains("remote")) return true;
        return Arrays.stream(job.split("[,/\\s]+"))
                .filter(part -> part.length() > 2)
                .anyMatch(candidate::contains);
    }

    private boolean isProfileComplete(User user) {
        return user.getSkills() != null && !user.getSkills().isBlank()
                && user.getResumeUrl() != null && !user.getResumeUrl().isBlank();
    }

    public boolean isEarlyApplicant(LocalDateTime jobCreatedAt, long applicantCount) {
        if (jobCreatedAt == null) return applicantCount < 10;
        long daysSincePosted = ChronoUnit.DAYS.between(jobCreatedAt, LocalDateTime.now());
        return daysSincePosted <= 7 && applicantCount < 20;
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

    private String formatSkills(String skills) {
        return Arrays.stream(skills.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> "• " + s)
                .collect(Collectors.joining("\n"));
    }
}
