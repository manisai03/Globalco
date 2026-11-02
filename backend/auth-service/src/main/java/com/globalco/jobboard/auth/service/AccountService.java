package com.globalco.jobboard.auth.service;

import com.globalco.jobboard.auth.model.Admin;
import com.globalco.jobboard.auth.model.AuthenticatedAccount;
import com.globalco.jobboard.auth.model.User;
import com.globalco.jobboard.auth.repository.AdminRepository;
import com.globalco.jobboard.auth.repository.UserRepository;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.exception.UnauthorizedException;
import com.globalco.jobboard.common.security.AccountPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AdminRepository adminRepository;
    private final UserRepository userRepository;

    public Optional<AuthenticatedAccount> findByEmail(String email) {
        return adminRepository.findByEmail(email)
                .map(account -> (AuthenticatedAccount) account)
                .or(() -> userRepository.findByEmail(email).map(account -> (AuthenticatedAccount) account));
    }

    public boolean existsByEmail(String email) {
        return adminRepository.existsByEmail(email) || userRepository.existsByEmail(email);
    }

    /** Loads the account behind a verified JWT; 401 if it was deleted after the token was issued. */
    public AuthenticatedAccount load(AccountPrincipal principal) {
        Optional<? extends AuthenticatedAccount> account = principal.isAdmin()
                ? adminRepository.findById(principal.id())
                : userRepository.findById(principal.id());
        return account.orElseThrow(() -> new UnauthorizedException("Account not found"));
    }

    public User loadUser(AccountPrincipal principal) {
        return (User) load(principal);
    }

    public User getUserById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public Admin getAdminById(Long id) {
        return adminRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
    }
}
