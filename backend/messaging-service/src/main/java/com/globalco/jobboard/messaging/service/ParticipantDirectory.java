package com.globalco.jobboard.messaging.service;

import com.globalco.jobboard.common.client.ApplicationServiceClient;
import com.globalco.jobboard.common.client.AuthServiceClient;
import com.globalco.jobboard.common.dto.internal.RecruiterSummary;
import com.globalco.jobboard.common.dto.internal.UserSummary;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.security.AccountType;
import com.globalco.jobboard.common.util.RecruiterCompanyUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Who a chat participant is (names, company) and what the recruiter is allowed to see.
 * Accounts live in auth-service; "has the recruiter opened this candidate's application" lives in
 * application-service.
 */
@Component
@RequiredArgsConstructor
public class ParticipantDirectory {

    /** Display name and contact details of the other side of a conversation. */
    public record Participant(AccountType type, Long id, String fullName, String email, String companyName) {}

    private final AuthServiceClient authServiceClient;
    private final ApplicationServiceClient applicationServiceClient;

    /** Recruiters talk to candidates and vice versa. */
    public static AccountType partnerType(AccountPrincipal viewer) {
        return viewer.isAdmin() ? AccountType.USER : AccountType.ADMIN;
    }

    /** @throws com.globalco.jobboard.common.exception.ResourceNotFoundException if the account does not exist */
    public Participant get(AccountType type, Long id) {
        if (type == AccountType.ADMIN) {
            return fromRecruiter(authServiceClient.getRecruiter(id));
        }
        return fromUser(authServiceClient.getUser(id));
    }

    public List<Participant> getAll(AccountType type, Collection<Long> ids) {
        if (ids.isEmpty()) return List.of();
        if (type == AccountType.ADMIN) {
            return authServiceClient.getRecruiters(ids).stream().map(ParticipantDirectory::fromRecruiter).toList();
        }
        return authServiceClient.getUsers(ids).stream().map(ParticipantDirectory::fromUser).toList();
    }

    public boolean hasRecruiterViewed(Long candidateId, Long recruiterId) {
        return applicationServiceClient.hasRecruiterViewedApplicant(candidateId, recruiterId);
    }

    public Set<Long> viewedCandidateIds(Long recruiterId) {
        return new HashSet<>(applicationServiceClient.getViewedCandidateIds(recruiterId));
    }

    public List<Long> candidateIds(Long recruiterId) {
        return applicationServiceClient.getCandidateIds(recruiterId);
    }

    private static Participant fromUser(UserSummary user) {
        return new Participant(AccountType.USER, user.id(), user.fullName(), user.email(), null);
    }

    private static Participant fromRecruiter(RecruiterSummary recruiter) {
        return new Participant(AccountType.ADMIN, recruiter.id(), recruiter.fullName(), recruiter.email(),
                RecruiterCompanyUtils.resolveCompany(recruiter.companyName(), null));
    }
}
