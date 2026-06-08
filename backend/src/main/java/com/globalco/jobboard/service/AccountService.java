package com.globalco.jobboard.service;

import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.model.AccountType;
import com.globalco.jobboard.model.Admin;
import com.globalco.jobboard.model.AuthenticatedAccount;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.AdminRepository;
import com.globalco.jobboard.repository.UserRepository;
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

    public Admin getAdminById(Long id) {
        return adminRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public AuthenticatedAccount resolvePartner(AccountType viewerType, Long partnerId) {
        if (viewerType == AccountType.ADMIN) {
            return getUserById(partnerId);
        }
        return getAdminById(partnerId);
    }
}
