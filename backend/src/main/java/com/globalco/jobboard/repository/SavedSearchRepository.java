package com.globalco.jobboard.repository;

import com.globalco.jobboard.model.SavedSearch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavedSearchRepository extends JpaRepository<SavedSearch, Long> {
    List<SavedSearch> findByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserId(Long userId);
}
