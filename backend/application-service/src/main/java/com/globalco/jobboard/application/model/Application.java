package com.globalco.jobboard.application.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * A candidate's application to a job. {@code jobId}, {@code userId} and {@code recruiterId} reference
 * rows owned by other services; {@code jobTitle}/{@code company} are copies kept fresh by job.updated events.
 */
@Entity
@Table(name = "applications",
        uniqueConstraints = @UniqueConstraint(columnNames = {"job_id", "user_id"}),
        indexes = {
                @Index(name = "idx_applications_recruiter_created", columnList = "recruiter_id,created_at"),
                @Index(name = "idx_applications_user", columnList = "user_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "recruiter_id")
    private Long recruiterId;

    private String jobTitle;

    private String company;

    private String resumeUrl;

    @Column(columnDefinition = "TEXT")
    private String coverLetter;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING";

    private Integer matchScore;

    @Builder.Default
    private Boolean recruiterViewed = false;

    @Column(name = "reapply_count", nullable = false)
    @Builder.Default
    private Integer reapplyCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
