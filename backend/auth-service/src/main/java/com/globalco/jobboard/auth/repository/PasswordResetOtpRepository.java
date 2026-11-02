package com.globalco.jobboard.auth.repository;

import com.globalco.jobboard.auth.model.PasswordResetOtp;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {
    Optional<PasswordResetOtp> findTopByEmailAndUsedFalseOrderByCreatedAtDesc(String email);

    /** Row lock so parallel guesses are counted one after another against the attempt limit. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetOtp> findFirstByEmailAndUsedFalseOrderByCreatedAtDesc(String email);

    long countByEmailAndCreatedAtAfter(String email, LocalDateTime since);

    @Modifying
    @Query("DELETE FROM PasswordResetOtp o WHERE o.email = :email")
    int deleteByEmail(@Param("email") String email);
}
