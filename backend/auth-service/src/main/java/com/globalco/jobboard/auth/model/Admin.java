package com.globalco.jobboard.auth.model;

import com.globalco.jobboard.common.security.AccountType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "admins")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Admin implements AuthenticatedAccount {

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

    private String companyName;
    private String companyWebsite;
    @Column(columnDefinition = "TEXT")
    private String companyDescription;
    private String recruiterTitle;

    @Column(name = "token_version", nullable = false)
    @Builder.Default
    private int tokenVersion = 0;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Override
    public AccountType getAccountType() {
        return AccountType.ADMIN;
    }
}
