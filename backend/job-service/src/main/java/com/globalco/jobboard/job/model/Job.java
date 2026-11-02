package com.globalco.jobboard.job.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "jobs", indexes = {
        @Index(name = "idx_jobs_admin", columnList = "admin_id"),
        @Index(name = "idx_jobs_status_created", columnList = "status,created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String company;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String location;

    private BigDecimal salaryMin;
    private BigDecimal salaryMax;
    private String experienceLevel;

    @Column(nullable = false)
    private String jobType;

    private String category;

    @Column(columnDefinition = "TEXT")
    private String skills;

    @Column(nullable = false)
    @Builder.Default
    private String status = "OPEN";

    @Builder.Default
    private Boolean featured = false;

    /** Recruiter account id in auth-service (no FK: that table lives in another database). */
    @Column(name = "admin_id")
    private Long recruiterId;

    // Read-model copy of the recruiter profile, refreshed by account.recruiter-updated events.
    private String recruiterName;

    @Column(columnDefinition = "TEXT")
    private String recruiterCompanyDescription;

    private String recruiterCompanyWebsite;
    private String recruiterTitle;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
