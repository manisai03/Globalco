package com.globalco.jobboard.job.repository;

import com.globalco.jobboard.job.model.SavedSearch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SavedSearchRepository extends JpaRepository<SavedSearch, Long> {

    List<SavedSearch> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserId(Long userId);

    List<SavedSearch> findByAlertsEnabledTrue();

    @Modifying
    @Query("DELETE FROM SavedSearch s WHERE s.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
