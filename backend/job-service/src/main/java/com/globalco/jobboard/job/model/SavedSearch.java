package com.globalco.jobboard.job.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_searches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedSearch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    private String name;
    private String search;
    private String location;
    private String jobType;
    private String experienceLevel;
    private String category;
    private BigDecimal minSalary;
    private String sort;

    @Column(name = "posted_within", length = 20)
    private String postedWithin;

    @Builder.Default
    private Boolean alertsEnabled = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
