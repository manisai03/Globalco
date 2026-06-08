package com.globalco.jobboard.repository;

import com.globalco.jobboard.model.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    List<Application> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Application> findByJobIdOrderByCreatedAtDesc(Long jobId);

    Optional<Application> findByJobIdAndUserId(Long jobId, Long userId);

    boolean existsByJobIdAndUserId(Long jobId, Long userId);

    long countByStatus(String status);

    @Query("SELECT a.job.id, COUNT(a) FROM Application a GROUP BY a.job.id")
    List<Object[]> countByJob();

    @Query("SELECT MONTH(a.createdAt), COUNT(a) FROM Application a GROUP BY MONTH(a.createdAt)")
    List<Object[]> countByMonth();

    @Query("SELECT a.status, COUNT(a) FROM Application a WHERE a.createdAt >= :since GROUP BY a.status")
    List<Object[]> countByStatusSince(@Param("since") LocalDateTime since);

    long countByCreatedAtAfter(LocalDateTime since);

    @Query("SELECT a FROM Application a WHERE a.job.createdBy.id = :adminId ORDER BY a.createdAt DESC")
    List<Application> findByJobCreatedByIdOrderByCreatedAtDesc(Long adminId);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.job.createdBy.id = :adminId")
    long countByJobCreatedById(Long adminId);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.job.createdBy.id = :adminId AND a.status = :status")
    long countByJobCreatedByIdAndStatus(Long adminId, String status);

    @Query("SELECT a.status, COUNT(a) FROM Application a WHERE a.job.createdBy.id = :adminId AND a.createdAt >= :since GROUP BY a.status")
    List<Object[]> countByStatusSinceForAdmin(Long adminId, LocalDateTime since);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.job.createdBy.id = :adminId AND a.createdAt >= :since")
    long countByJobCreatedByIdAndCreatedAtAfter(Long adminId, LocalDateTime since);

    @Query("SELECT a.job.id, COUNT(a) FROM Application a WHERE a.job.createdBy.id = :adminId GROUP BY a.job.id")
    List<Object[]> countByJobForAdmin(Long adminId);

    @Query("SELECT COUNT(DISTINCT a.user.id) FROM Application a WHERE a.job.createdBy.id = :adminId")
    long countDistinctApplicantsByAdmin(Long adminId);

    @Query("""
            SELECT COUNT(a) > 0 FROM Application a
            WHERE a.user.id = :userId AND a.job.createdBy.id = :adminId AND a.recruiterViewed = true
            """)
    boolean hasRecruiterViewedApplicant(@Param("userId") Long userId, @Param("adminId") Long adminId);
}
