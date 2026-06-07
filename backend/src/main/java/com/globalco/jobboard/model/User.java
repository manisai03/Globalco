package com.globalco.jobboard.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String fullName;

    private String phone;
    private String location;
    @Column(columnDefinition = "TEXT")
    private String bio;
    @Column(columnDefinition = "TEXT")
    private String skills;
    private String resumeUrl;
    private LocalDateTime resumeUploadedAt;
    private String profilePictureUrl;
    private String profilePicturePublicId;
    private LocalDateTime profilePictureUploadedAt;

    // Candidate fields
    private String currentTitle;
    @Column(columnDefinition = "TEXT")
    private String educationProfile;
    @Column(columnDefinition = "TEXT")
    private String internshipsProfile;
    @Column(columnDefinition = "TEXT")
    private String employmentProfile;

    // Recruiter / company fields
    private String companyName;
    private String companyWebsite;
    @Column(columnDefinition = "TEXT")
    private String companyDescription;
    private String recruiterTitle;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
