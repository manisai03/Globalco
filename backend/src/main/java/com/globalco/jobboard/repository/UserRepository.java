package com.globalco.jobboard.repository;

import com.globalco.jobboard.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByRoleName(String roleName);
    List<User> findByRole_Name(String roleName);
}
