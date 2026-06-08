package com.globalco.jobboard.config;

import com.globalco.jobboard.model.Admin;
import com.globalco.jobboard.model.Job;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.AdminRepository;
import com.globalco.jobboard.repository.JobRepository;
import com.globalco.jobboard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final AdminRepository adminRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        Admin admin = adminRepository.findByEmail("admin@globalco.com").orElseGet(() ->
                adminRepository.save(Admin.builder()
                        .email("admin@globalco.com")
                        .password(passwordEncoder.encode("admin123"))
                        .fullName("Globalco Admin")
                        .location("Hitech City, Hyderabad")
                        .companyName("Globalco Technologies")
                        .companyWebsite("https://globalco.com")
                        .companyDescription("Leading recruitment and technology company based in Hitech City, Hyderabad.")
                        .recruiterTitle("Senior Talent Acquisition Manager")
                        .build()));

        userRepository.findByEmail("candidate@globalco.com").orElseGet(() ->
                userRepository.save(User.builder()
                        .email("candidate@globalco.com")
                        .password(passwordEncoder.encode("user123"))
                        .fullName("Demo Candidate")
                        .location("Hyderabad")
                        .currentTitle("Software Engineer")
                        .skills("Java, Spring Boot, React, MySQL, REST APIs")
                        .build()));

        if (jobRepository.count() == 0) {
            seedJobs(admin);
            log.info("Sample jobs seeded");
        }

        log.info("Demo accounts: admin@globalco.com / admin123 | candidate@globalco.com / user123");
    }

    private void seedJobs(Admin admin) {
        jobRepository.save(Job.builder()
                .title("Senior Software Engineer")
                .company("Globalco Technologies")
                .description("Build scalable recruitment platforms using Java and React.")
                .location("Hitech City, Hyderabad")
                .salaryMin(new BigDecimal("1200000"))
                .salaryMax(new BigDecimal("2000000"))
                .experienceLevel("Senior")
                .jobType("Full-time")
                .category("Engineering")
                .skills("Java, Spring Boot, React, MySQL")
                .featured(true)
                .createdBy(admin)
                .build());

        jobRepository.save(Job.builder()
                .title("Frontend Developer")
                .company("Globalco Technologies")
                .description("Create beautiful, responsive UIs with React and Tailwind CSS.")
                .location("Hyderabad")
                .salaryMin(new BigDecimal("800000"))
                .salaryMax(new BigDecimal("1400000"))
                .experienceLevel("Mid-Level")
                .jobType("Full-time")
                .category("Engineering")
                .skills("React, TypeScript, Tailwind CSS, Vite")
                .featured(true)
                .createdBy(admin)
                .build());

        jobRepository.save(Job.builder()
                .title("Product Designer")
                .company("Globalco Technologies")
                .description("Design intuitive user experiences for our job platform.")
                .location("Remote")
                .salaryMin(new BigDecimal("700000"))
                .salaryMax(new BigDecimal("1200000"))
                .experienceLevel("Mid-Level")
                .jobType("Remote")
                .category("Design")
                .skills("Figma, UI/UX, Prototyping")
                .featured(false)
                .createdBy(admin)
                .build());
    }
}
