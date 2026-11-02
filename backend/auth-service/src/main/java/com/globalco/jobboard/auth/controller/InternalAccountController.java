package com.globalco.jobboard.auth.controller;

import com.globalco.jobboard.auth.model.User;
import com.globalco.jobboard.auth.repository.AdminRepository;
import com.globalco.jobboard.auth.repository.UserRepository;
import com.globalco.jobboard.auth.service.AccountMapper;
import com.globalco.jobboard.auth.service.AccountService;
import com.globalco.jobboard.auth.service.FileStorageService;
import com.globalco.jobboard.common.dto.internal.RecruiterSummary;
import com.globalco.jobboard.common.dto.internal.UserSearch;
import com.globalco.jobboard.common.dto.internal.UserSummary;
import com.globalco.jobboard.common.security.AccountType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collection;
import java.util.List;
import java.util.Locale;

/** Service-to-service API (guarded by the internal token, never routed by the gateway). */
@RestController
@RequestMapping("/internal/accounts")
@RequiredArgsConstructor
public class InternalAccountController {

    private final AccountService accountService;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final FileStorageService fileStorageService;

    @GetMapping("/users/{id}")
    public UserSummary getUser(@PathVariable Long id) {
        return AccountMapper.toSummary(accountService.getUserById(id));
    }

    @PostMapping("/users/batch")
    public List<UserSummary> getUsers(@RequestBody Collection<Long> ids) {
        return userRepository.findAllById(ids).stream().map(AccountMapper::toSummary).toList();
    }

    @PostMapping("/users/search")
    public List<Long> searchUsers(@RequestBody UserSearch search) {
        if (search.query() == null || search.query().isBlank()
                || search.candidateIds() == null || search.candidateIds().isEmpty()) {
            return List.of();
        }
        String query = search.query().trim().toLowerCase(Locale.ROOT);
        return userRepository.findAllById(search.candidateIds()).stream()
                .filter(u -> contains(u.getFullName(), query) || contains(u.getEmail(), query))
                .map(User::getId)
                .toList();
    }

    private static boolean contains(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }

    /** Current token version for the gateway's revocation check; -1 when the account no longer exists. */
    @GetMapping("/token-versions/{type}/{id}")
    public int getTokenVersion(@PathVariable AccountType type, @PathVariable Long id) {
        return (type == AccountType.ADMIN ? adminRepository.findById(id).map(a -> a.getTokenVersion())
                : userRepository.findById(id).map(u -> u.getTokenVersion()))
                .orElse(-1);
    }

    @GetMapping("/recruiters/{id}")
    public RecruiterSummary getRecruiter(@PathVariable Long id) {
        return AccountMapper.toSummary(accountService.getAdminById(id));
    }

    @PostMapping("/recruiters/batch")
    public List<RecruiterSummary> getRecruiters(@RequestBody Collection<Long> ids) {
        return adminRepository.findAllById(ids).stream().map(AccountMapper::toSummary).toList();
    }

    @PostMapping(value = "/users/{id}/application-resumes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.TEXT_PLAIN_VALUE)
    public String uploadApplicationResume(@PathVariable Long id, @RequestPart("file") MultipartFile file) {
        accountService.getUserById(id);
        return fileStorageService.store(file, FileStorageService.RESUMES, FileStorageService.RESUME_EXTENSIONS);
    }

    /** Never deletes the candidate's current profile resume. */
    @DeleteMapping("/users/{id}/application-resumes")
    public void deleteApplicationResume(@PathVariable Long id, @RequestParam String url) {
        if (url.equals(accountService.getUserById(id).getResumeUrl())) return;
        fileStorageService.deleteQuietly(url);
    }
}
