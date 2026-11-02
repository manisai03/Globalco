package com.globalco.jobboard.application.repository;

import com.globalco.jobboard.application.model.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    List<Application> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Application> findByJobIdAndUserId(Long jobId, Long userId);

    long countByJobIdAndStatusIn(Long jobId, Collection<String> statuses);

    @Query("""
            SELECT a.jobId, COUNT(a) FROM Application a
            WHERE a.jobId IN :jobIds AND a.status NOT IN ('WITHDRAWN', 'JOB_REMOVED')
            GROUP BY a.jobId
            """)
    List<Object[]> countByJobIds(@Param("jobIds") Collection<Long> jobIds);

    @Query("SELECT a.jobId FROM Application a WHERE a.userId = :userId AND a.jobId IN :jobIds AND a.status <> 'WITHDRAWN'")
    List<Long> findAppliedJobIds(@Param("userId") Long userId, @Param("jobIds") Collection<Long> jobIds);

    List<Application> findByRecruiterIdOrderByCreatedAtDesc(Long recruiterId);

    List<Application> findByRecruiterIdOrderByCreatedAtDesc(Long recruiterId, Pageable pageable);

    long countByRecruiterId(Long recruiterId);

    long countByRecruiterIdAndCreatedAtAfter(Long recruiterId, LocalDateTime since);

    @Query("SELECT a.status, COUNT(a) FROM Application a WHERE a.recruiterId = :recruiterId GROUP BY a.status")
    List<Object[]> countByStatusForRecruiter(@Param("recruiterId") Long recruiterId);

    @Query("SELECT a.status, COUNT(a) FROM Application a WHERE a.recruiterId = :recruiterId AND a.createdAt >= :since GROUP BY a.status")
    List<Object[]> countByStatusSinceForRecruiter(@Param("recruiterId") Long recruiterId, @Param("since") LocalDateTime since);

    @Query("SELECT a.jobId, MAX(a.jobTitle), COUNT(a) FROM Application a WHERE a.recruiterId = :recruiterId GROUP BY a.jobId")
    List<Object[]> countByJobForRecruiter(@Param("recruiterId") Long recruiterId);

    @Query("""
            SELECT YEAR(a.createdAt), MONTH(a.createdAt), COUNT(a) FROM Application a
            WHERE a.recruiterId = :recruiterId
            GROUP BY YEAR(a.createdAt), MONTH(a.createdAt)
            ORDER BY YEAR(a.createdAt), MONTH(a.createdAt)
            """)
    List<Object[]> countByMonthForRecruiter(@Param("recruiterId") Long recruiterId);

    @Query("SELECT COUNT(DISTINCT a.userId) FROM Application a WHERE a.recruiterId = :recruiterId")
    long countDistinctApplicantsForRecruiter(@Param("recruiterId") Long recruiterId);

    @Query("""
            SELECT COUNT(a) > 0 FROM Application a
            WHERE a.userId = :userId AND a.recruiterId = :recruiterId AND a.recruiterViewed = true
            """)
    boolean hasRecruiterViewedApplicant(@Param("userId") Long userId, @Param("recruiterId") Long recruiterId);

    @Query("SELECT a.userId FROM Application a WHERE a.recruiterId = :recruiterId GROUP BY a.userId ORDER BY MAX(a.createdAt) DESC")
    List<Long> findCandidateIdsForRecruiter(@Param("recruiterId") Long recruiterId);

    @Query("SELECT DISTINCT a.userId FROM Application a WHERE a.recruiterId = :recruiterId AND a.recruiterViewed = true")
    List<Long> findViewedCandidateIdsForRecruiter(@Param("recruiterId") Long recruiterId);

    boolean existsByUserIdAndResumeUrl(Long userId, String resumeUrl);

    @Query("""
            SELECT COUNT(a) > 0 FROM Application a
            WHERE a.recruiterId = :recruiterId AND a.recruiterViewed = true
              AND (a.resumeUrl = :url OR a.userId = :profileOwnerId)
            """)
    boolean recruiterCanAccessResume(@Param("recruiterId") Long recruiterId, @Param("url") String url,
                                     @Param("profileOwnerId") Long profileOwnerId);

    @Query("""
            SELECT a FROM Application a
            WHERE a.recruiterId = :recruiterId
              AND (:jobId IS NULL OR a.jobId = :jobId)
              AND (:search IS NULL OR LOWER(a.jobTitle) LIKE :search ESCAPE '\\' OR a.userId IN :matchingUserIds)
            """)
    Page<Application> searchForRecruiter(@Param("recruiterId") Long recruiterId, @Param("jobId") Long jobId,
                                         @Param("search") String search,
                                         @Param("matchingUserIds") Collection<Long> matchingUserIds,
                                         Pageable pageable);

    List<Application> findByJobId(Long jobId);

    @Modifying
    @Query("UPDATE Application a SET a.jobTitle = :title, a.company = :company WHERE a.jobId = :jobId")
    int updateJobSnapshot(@Param("jobId") Long jobId, @Param("title") String title, @Param("company") String company);

    @Modifying
    @Query("DELETE FROM Application a WHERE a.userId = :userId")
    int deleteByUserId(@Param("userId") Long userId);
}
