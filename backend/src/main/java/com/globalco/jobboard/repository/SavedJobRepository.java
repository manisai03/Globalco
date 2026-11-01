package com.globalco.jobboard.repository;

import com.globalco.jobboard.model.SavedJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SavedJobRepository extends JpaRepository<SavedJob, Long> {
    List<SavedJob> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<SavedJob> findByUserIdAndJobId(Long userId, Long jobId);
    boolean existsByUserIdAndJobId(Long userId, Long jobId);

    @Query("SELECT s.job.id FROM SavedJob s WHERE s.user.id = :userId AND s.job.id IN :jobIds")
    List<Long> findSavedJobIds(@Param("userId") Long userId, @Param("jobIds") Collection<Long> jobIds);
}
