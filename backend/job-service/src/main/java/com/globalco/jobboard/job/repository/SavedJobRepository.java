package com.globalco.jobboard.job.repository;

import com.globalco.jobboard.job.model.SavedJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SavedJobRepository extends JpaRepository<SavedJob, Long> {

    @Query("SELECT s FROM SavedJob s JOIN FETCH s.job WHERE s.userId = :userId ORDER BY s.createdAt DESC")
    List<SavedJob> findWithJobsByUserId(@Param("userId") Long userId);

    Optional<SavedJob> findByUserIdAndJobId(Long userId, Long jobId);

    boolean existsByUserIdAndJobId(Long userId, Long jobId);

    @Query("SELECT s.job.id FROM SavedJob s WHERE s.userId = :userId AND s.job.id IN :jobIds")
    List<Long> findSavedJobIds(@Param("userId") Long userId, @Param("jobIds") Collection<Long> jobIds);

    @Modifying
    @Query("DELETE FROM SavedJob s WHERE s.job.id = :jobId")
    void deleteByJobId(@Param("jobId") Long jobId);

    @Modifying
    @Query("DELETE FROM SavedJob s WHERE s.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
