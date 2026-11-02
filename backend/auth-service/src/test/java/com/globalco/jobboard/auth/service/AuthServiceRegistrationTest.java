package com.globalco.jobboard.auth.service;

import com.globalco.jobboard.auth.model.User;
import com.globalco.jobboard.auth.repository.AdminRepository;
import com.globalco.jobboard.auth.repository.PasswordResetOtpRepository;
import com.globalco.jobboard.auth.repository.UserRepository;
import com.globalco.jobboard.common.dto.request.RegisterRequest;
import com.globalco.jobboard.common.dto.response.RegisterResponse;
import com.globalco.jobboard.common.event.EventPublisher;
import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceRegistrationTest {

    private final UserRepository users = mock(UserRepository.class);
    private final AdminRepository admins = mock(AdminRepository.class);
    private final AccountService accounts = mock(AccountService.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final EventPublisher events = mock(EventPublisher.class);
    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(users, admins, accounts, mock(PasswordResetOtpRepository.class), encoder,
                mock(JwtService.class), mock(AuthenticationManager.class), events, mock(LoginAttemptService.class));
        when(encoder.encode(anyString())).thenReturn("hashed");
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static RegisterRequest candidate(String email) {
        RegisterRequest request = new RegisterRequest();
        request.setAccountType("CANDIDATE");
        request.setEmail(email);
        request.setPassword("Passw0rd!");
        request.setFullName("Asha Rao");
        return request;
    }

    @Test
    void takenEmailGetsTheSameAnswerAndNoAccountIsCreated() {
        RegisterResponse fresh = authService.register(candidate("new@example.com"));
        when(accounts.existsByEmail("taken@example.com")).thenReturn(true);

        RegisterResponse taken = authService.register(candidate("taken@example.com"));

        assertThat(taken.getMessage()).isEqualTo(fresh.getMessage());
        verify(users, times(1)).save(any(User.class));
        verify(encoder, times(2)).encode("Passw0rd!");
        verify(events).publish(EventTopics.REGISTRATION_FOR_EXISTING_EMAIL,
                new Events.RegistrationForExistingEmail("taken@example.com"));
    }

    @Test
    void ownerIsEmailedAtMostOncePerCooldown() {
        when(accounts.existsByEmail(anyString())).thenReturn(true);

        authService.register(candidate("taken@example.com"));
        authService.register(candidate("  Taken@Example.com "));

        verify(events, times(1)).publish(any(), any());
        verify(users, never()).save(any(User.class));
    }
}
