package com.globalco.jobboard.repository;

import com.globalco.jobboard.model.Application;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    List<Application> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Application> findByJobIdOrderByCreatedAtDesc(Long jobId);

    Optional<Application> findByJobIdAndUserId(Long jobId, Long userId);

    boolean existsByJobIdAndUserId(Long jobId, Long userId);

    long countByJobId(Long jobId);

    @Query("SELECT a.job.id, COUNT(a) FROM Application a WHERE a.job.id IN :jobIds GROUP BY a.job.id")
    List<Object[]> countByJobIds(@Param("jobIds") Collection<Long> jobIds);

    @Query("SELECT a.job.id FROM Application a WHERE a.user.id = :userId AND a.job.id IN :jobIds AND a.status <> 'WITHDRAWN'")
    List<Long> findAppliedJobIds(@Param("userId") Long userId, @Param("jobIds") Collection<Long> jobIds);

    long countByStatus(String status);

    @Query("SELECT a.job.id, COUNT(a) FROM Application a GROUP BY a.job.id")
    List<Object[]> countByJob();

    @Query("SELECT a.status, COUNT(a) FROM Application a WHERE a.createdAt >= :since GROUP BY a.status")
    List<Object[]> countByStatusSince(@Param("since") LocalDateTime since);

    long countByCreatedAtAfter(LocalDateTime since);

    @Query("SELECT a FROM Application a WHERE a.job.createdBy.id = :adminId ORDER BY a.createdAt DESC")
    List<Application> findByJobCreatedByIdOrderByCreatedAtDesc(@Param("adminId") Long adminId);

    @Query("SELECT a FROM Application a WHERE a.job.createdBy.id = :adminId ORDER BY a.createdAt DESC")
    List<Application> findRecentForAdmin(@Param("adminId") Long adminId, Pageable pageable);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.job.createdBy.id = :adminId")
    long countByJobCreatedById(@Param("adminId") Long adminId);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.job.createdBy.id = :adminId AND a.status = :status")
    long countByJobCreatedByIdAndStatus(@Param("adminId") Long adminId, @Param("status") String status);

    @Query("SELECT a.status, COUNT(a) FROM Application a WHERE a.job.createdBy.id = :adminId GROUP BY a.status")
    List<Object[]> countByStatusForAdmin(@Param("adminId") Long adminId);

    @Query("SELECT a.status, COUNT(a) FROM Application a WHERE a.job.createdBy.id = :adminId AND a.createdAt >= :since GROUP BY a.status")
    List<Object[]> countByStatusSinceForAdmin(@Param("adminId") Long adminId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.job.createdBy.id = :adminId AND a.createdAt >= :since")
    long countByJobCreatedByIdAndCreatedAtAfter(@Param("adminId") Long adminId, @Param("since") LocalDateTime since);

    @Query("SELECT a.job.id, COUNT(a) FROM Application a WHERE a.job.createdBy.id = :adminId GROUP BY a.job.id")
    List<Object[]> countByJobForAdmin(@Param("adminId") Long adminId);

    @Query("""
            SELECT YEAR(a.createdAt), MONTH(a.createdAt), COUNT(a) FROM Application a
            WHERE a.job.createdBy.id = :adminId
            GROUP BY YEAR(a.createdAt), MONTH(a.createdAt)
            ORDER BY YEAR(a.createdAt), MONTH(a.createdAt)
            """)
    List<Object[]> countByMonthForAdmin(@Param("adminId") Long adminId);

    @Query("SELECT COUNT(DISTINCT a.user.id) FROM Application a WHERE a.job.createdBy.id = :adminId")
    long countDistinctApplicantsByAdmin(@Param("adminId") Long adminId);

    @Query("""
            SELECT COUNT(a) > 0 FROM Application a
            WHERE a.user.id = :userId AND a.job.createdBy.id = :adminId AND a.recruiterViewed = true
            """)
    boolean hasRecruiterViewedApplicant(@Param("userId") Long userId, @Param("adminId") Long adminId);
}
