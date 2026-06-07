package com.globalco.jobboard.service;

import com.globalco.jobboard.model.Job;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;

public final class JobSpecification {

    private JobSpecification() {}

    public static Specification<Job> withFilters(
            String search,
            String location,
            String jobType,
            String experienceLevel,
            String category,
            BigDecimal minSalary,
            BigDecimal maxSalary,
            String status) {

        return (root, query, cb) -> {
            var predicates = cb.conjunction();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates = cb.and(predicates, cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("company")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern),
                        cb.like(cb.lower(root.get("skills")), pattern)
                ));
            }
            if (location != null && !location.isBlank()) {
                predicates = cb.and(predicates, cb.like(cb.lower(root.get("location")),
                        "%" + location.toLowerCase() + "%"));
            }
            if (jobType != null && !jobType.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("jobType"), jobType));
            }
            if (experienceLevel != null && !experienceLevel.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("experienceLevel"), experienceLevel));
            }
            if (category != null && !category.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("category"), category));
            }
            if (minSalary != null) {
                predicates = cb.and(predicates, cb.greaterThanOrEqualTo(root.get("salaryMax"), minSalary));
            }
            if (maxSalary != null) {
                predicates = cb.and(predicates, cb.lessThanOrEqualTo(root.get("salaryMin"), maxSalary));
            }
            if (status != null && !status.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status));
            }

            return predicates;
        };
    }
}
