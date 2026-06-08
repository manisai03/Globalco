package com.globalco.jobboard.model;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String name;

    private String search;
    private String location;
    private String jobType;
    private String experienceLevel;
    private String category;
    private BigDecimal minSalary;
    private String sort;

    @Builder.Default
    private Boolean alertsEnabled = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
