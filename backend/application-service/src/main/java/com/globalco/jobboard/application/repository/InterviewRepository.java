package com.globalco.jobboard.application.repository;

import com.globalco.jobboard.application.model.Interview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InterviewRepository extends JpaRepository<Interview, Long> {

    @Query("SELECT i FROM Interview i JOIN FETCH i.application a WHERE a.userId = :userId ORDER BY i.scheduledAt ASC")
    List<Interview> findForCandidate(@Param("userId") Long userId);

    @Modifying
    @Query("""
            UPDATE Interview i SET i.status = 'CANCELLED'
            WHERE i.status = 'SCHEDULED' AND i.application.id IN (SELECT a.id FROM Application a WHERE a.jobId = :jobId)
            """)
    int cancelScheduledForJob(@Param("jobId") Long jobId);

    @Modifying
    @Query("UPDATE Interview i SET i.status = 'CANCELLED' WHERE i.status = 'SCHEDULED' AND i.application.id = :applicationId")
    int cancelScheduledForApplication(@Param("applicationId") Long applicationId);

    @Modifying
    @Query("DELETE FROM Interview i WHERE i.application.id IN (SELECT a.id FROM Application a WHERE a.userId = :userId)")
    int deleteByUserId(@Param("userId") Long userId);
}
