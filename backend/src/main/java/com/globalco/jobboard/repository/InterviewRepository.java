package com.globalco.jobboard.repository;

import com.globalco.jobboard.model.Interview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InterviewRepository extends JpaRepository<Interview, Long> {
    List<Interview> findByApplicationUserIdOrderByScheduledAtAsc(Long userId);
}
