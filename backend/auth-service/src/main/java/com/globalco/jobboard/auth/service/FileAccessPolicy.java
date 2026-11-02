package com.globalco.jobboard.auth.service;

import com.globalco.jobboard.auth.model.User;
import com.globalco.jobboard.auth.repository.UserRepository;
import com.globalco.jobboard.common.client.ApplicationServiceClient;
import com.globalco.jobboard.common.feign.RemoteCalls;
import com.globalco.jobboard.common.security.AccountPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Who may download a stored resume: the candidate who uploaded it, or a recruiter who has opened an
 * application from that candidate (the same rule that reveals the candidate's identity).
 * If application-service can't answer, access is denied rather than guessed.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileAccessPolicy {

    private final UserRepository userRepository;
    private final ApplicationServiceClient applicationServiceClient;
    private final RemoteCalls remoteCalls;

    public boolean canRead(AccountPrincipal requester, String subfolder, String filename) {
        if (!FileStorageService.RESUMES.equals(subfolder)) {
            return true;
        }
        String url = FileStorageService.URL_PREFIX + subfolder + "/" + filename;
        Long profileOwnerId = userRepository.findFirstByResumeUrl(url).map(User::getId).orElse(null);
        if (requester.isUser() && requester.id().equals(profileOwnerId)) {
            return true;
        }
        try {
            return remoteCalls.call("application-service", () -> applicationServiceClient.canAccessResume(
                    url, requester.accountType().name(), requester.id(), profileOwnerId));
        } catch (RuntimeException e) {
            log.warn("Resume access check unavailable, denying {}: {}", url, e.getMessage());
            return false;
        }
    }
}
