package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.AiJobDescriptionRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AiServiceTest {

    @Autowired
    private AiService aiService;

    @Test
    void generatesJobDescription() {
        AiJobDescriptionRequest request = new AiJobDescriptionRequest();
        request.setJobTitle("Backend Developer");
        request.setSkills("Java, Spring Boot, MySQL");
        request.setCompany("XPO");
        request.setLocation("Hyderabad");

        String description = aiService.generateJobDescription(request);

        assertNotNull(description);
        assertTrue(description.contains("Backend Developer"));
        assertTrue(description.contains("Java"));
    }

    @Test
    void calculatesMatchScore() {
        int score = aiService.calculateMatchScore("Java, React, MySQL", "Java, Spring Boot, React");
        assertTrue(score > 0 && score <= 100);
    }
}
