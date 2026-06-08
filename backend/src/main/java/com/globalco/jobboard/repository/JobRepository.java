package com.globalco.jobboard.repository;

import com.globalco.jobboard.model.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface JobRepository extends JpaRepository<Job, Long>, JpaSpecificationExecutor<Job> {

    List<Job> findTop6ByFeaturedTrueAndStatusOrderByCreatedAtDesc(String status);

    long countByStatus(String status);

    @Query("SELECT j.category, COUNT(j) FROM Job j GROUP BY j.category")
    List<Object[]> countByCategory();

    List<Job> findByCreatedByIdOrderByCreatedAtDesc(Long createdById);

    long countByCreatedById(Long createdById);

    long countByCreatedByIdAndStatus(Long createdById, String status);

    @Query("SELECT j.category, COUNT(j) FROM Job j WHERE j.createdBy.id = :adminId GROUP BY j.category")
    List<Object[]> countByCategoryForAdmin(Long adminId);

    List<Job> findTop6ByCategoryAndStatusAndIdNotOrderByCreatedAtDesc(String category, String status, Long id);

    List<Job> findTop12ByStatusOrderByCreatedAtDesc(String status);
}
