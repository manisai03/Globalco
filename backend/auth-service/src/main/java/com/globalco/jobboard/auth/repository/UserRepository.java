package com.globalco.jobboard.auth.repository;

import com.globalco.jobboard.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findFirstByResumeUrl(String resumeUrl);
}
