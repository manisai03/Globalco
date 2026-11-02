package com.globalco.jobboard.ai.service;

import com.globalco.jobboard.common.dto.internal.MatchInput;
import com.globalco.jobboard.common.dto.response.MatchBreakdownResponse;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Rule-based candidate/job match scoring (pure function of its input, so it scales horizontally). */
@Service
public class MatchService {

    public MatchBreakdownResponse score(MatchInput input) {
        Map<String, String> jobSkills = displayNames(input.jobSkills());
        Set<String> jobSet = jobSkills.keySet();
        Set<String> candidateSet = displayNames(input.candidateSkills()).keySet();

        List<String> matched = jobSet.stream().filter(candidateSet::contains).sorted().map(jobSkills::get).toList();
        List<String> missing = jobSet.stream().filter(s -> !candidateSet.contains(s)).sorted().map(jobSkills::get).toList();

        boolean skillsMatch = !jobSet.isEmpty() && matched.size() >= Math.ceil(jobSet.size() * 0.5);
        boolean locationMatch = locationsMatch(input.jobLocation(), input.candidateLocation());
        boolean early = isEarlyApplicant(input.jobCreatedAt(), input.applicantCount());

        int score = 35;
        if (skillsMatch) score += 30;
        else if (!matched.isEmpty()) score += (int) (matched.size() * 30.0 / Math.max(jobSet.size(), 1));
        if (locationMatch) score += 15;
        if (input.profileComplete()) score += 10;
        if (early) score += 10;
        score = Math.min(100, score);

        return MatchBreakdownResponse.builder()
                .overallScore(score)
                .skillsMatch(skillsMatch)
                .locationMatch(locationMatch)
                .earlyApplicant(early)
                .profileComplete(input.profileComplete())
                .matchedSkills(matched)
                .missingSkills(missing)
                .build();
    }

    public List<MatchBreakdownResponse> scoreAll(List<MatchInput> inputs) {
        return inputs.stream().map(this::score).toList();
    }

    static boolean isEarlyApplicant(LocalDateTime jobCreatedAt, long applicantCount) {
        if (jobCreatedAt == null) return applicantCount < 10;
        long daysSincePosted = ChronoUnit.DAYS.between(jobCreatedAt, LocalDateTime.now());
        return daysSincePosted <= 7 && applicantCount < 20;
    }

    /** Lower-cased skill -> skill as first written, so matching ignores case but output keeps the original spelling. */
    private static Map<String, String> displayNames(String skills) {
        if (skills == null || skills.isBlank()) return Map.of();
        return Arrays.stream(skills.split("[,;]+"))
                .map(String::trim)
                .filter(s -> s.length() > 1)
                .collect(Collectors.toMap(s -> s.toLowerCase(Locale.ROOT), s -> s, (first, second) -> first,
                        LinkedHashMap::new));
    }

    private static boolean locationsMatch(String jobLocation, String candidateLocation) {
        if (jobLocation == null || candidateLocation == null) return false;
        String job = jobLocation.toLowerCase();
        String candidate = candidateLocation.toLowerCase();
        if (job.contains("remote") || candidate.contains("remote")) return true;
        return Arrays.stream(job.split("[,/\\s]+"))
                .filter(part -> part.length() > 2)
                .anyMatch(candidate::contains);
    }
}
