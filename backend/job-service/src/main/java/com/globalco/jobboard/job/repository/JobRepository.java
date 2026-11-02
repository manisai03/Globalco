package com.globalco.jobboard.job.repository;

import com.globalco.jobboard.job.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface JobRepository extends JpaRepository<Job, Long>, JpaSpecificationExecutor<Job> {

    List<Job> findTop6ByFeaturedTrueAndStatusOrderByCreatedAtDesc(String status);

    long countByStatus(String status);

    List<Job> findByRecruiterIdOrderByCreatedAtDesc(Long recruiterId);

    long countByRecruiterId(Long recruiterId);

    long countByRecruiterIdAndStatus(Long recruiterId, String status);

    @Query("SELECT j.category, COUNT(j) FROM Job j WHERE j.recruiterId = :recruiterId GROUP BY j.category")
    List<Object[]> countByCategoryForRecruiter(@Param("recruiterId") Long recruiterId);

    List<Job> findTop6ByCategoryAndStatusAndIdNotOrderByCreatedAtDesc(String category, String status, Long id);

    List<Job> findTop12ByStatusOrderByCreatedAtDesc(String status);

    @Modifying
    @Query("""
            UPDATE Job j SET j.recruiterName = :name, j.recruiterCompanyDescription = :description,
                j.recruiterCompanyWebsite = :website, j.recruiterTitle = :title,
                j.company = COALESCE(:company, j.company)
            WHERE j.recruiterId = :recruiterId
            """)
    int updateRecruiterSnapshot(@Param("recruiterId") Long recruiterId, @Param("name") String name,
                                @Param("description") String description, @Param("website") String website,
                                @Param("title") String title, @Param("company") String company);
}
