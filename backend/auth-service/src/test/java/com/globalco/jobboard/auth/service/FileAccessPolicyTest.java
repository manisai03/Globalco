package com.globalco.jobboard.auth.service;

import com.globalco.jobboard.auth.model.User;
import com.globalco.jobboard.auth.repository.UserRepository;
import com.globalco.jobboard.common.client.ApplicationServiceClient;
import com.globalco.jobboard.common.exception.DownstreamServiceException;
import com.globalco.jobboard.common.feign.RemoteCalls;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.security.AccountType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class FileAccessPolicyTest {

    private static final String FILE = "resume.pdf";
    private static final String URL = FileStorageService.URL_PREFIX + FileStorageService.RESUMES + "/" + FILE;

    private final UserRepository users = mock(UserRepository.class);
    private final ApplicationServiceClient applications = mock(ApplicationServiceClient.class);
    private final FileAccessPolicy policy = new FileAccessPolicy(users, applications, new RemoteCalls(50, 10, 20));

    private final AccountPrincipal owner = new AccountPrincipal(7L, "o@x.com", AccountType.USER, "Owner");
    private final AccountPrincipal stranger = new AccountPrincipal(8L, "s@x.com", AccountType.USER, "Stranger");
    private final AccountPrincipal recruiter = new AccountPrincipal(3L, "r@x.com", AccountType.ADMIN, "Recruiter");

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(7L);
        when(users.findFirstByResumeUrl(URL)).thenReturn(Optional.of(user));
    }

    @Test
    void nonResumeFilesAreReadable() {
        assertThat(policy.canRead(stranger, "avatars", "pic.png")).isTrue();
        verifyNoInteractions(applications);
    }

    @Test
    void ownerCanReadOwnResumeWithoutRemoteCall() {
        assertThat(policy.canRead(owner, FileStorageService.RESUMES, FILE)).isTrue();
        verifyNoInteractions(applications);
    }

    @Test
    void otherAccountsDependOnApplicationService() {
        when(applications.canAccessResume(URL, "ADMIN", 3L, 7L)).thenReturn(true);
        when(applications.canAccessResume(URL, "USER", 8L, 7L)).thenReturn(false);

        assertThat(policy.canRead(recruiter, FileStorageService.RESUMES, FILE)).isTrue();
        assertThat(policy.canRead(stranger, FileStorageService.RESUMES, FILE)).isFalse();
    }

    @Test
    void deniesWhenApplicationServiceIsDown() {
        when(applications.canAccessResume(anyString(), anyString(), anyLong(), any()))
                .thenThrow(new DownstreamServiceException("down"));
        assertThat(policy.canRead(recruiter, FileStorageService.RESUMES, FILE)).isFalse();
    }
}
