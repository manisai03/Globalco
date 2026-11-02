package com.globalco.jobboard.common.client;

import com.globalco.jobboard.common.dto.internal.RecruiterSummary;
import com.globalco.jobboard.common.dto.internal.UserSearch;
import com.globalco.jobboard.common.dto.internal.UserSummary;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collection;
import java.util.List;

@FeignClient(name = "auth-service", contextId = "authServiceClient", path = "/internal/accounts")
public interface AuthServiceClient {

    @GetMapping("/users/{id}")
    UserSummary getUser(@PathVariable("id") Long id);

    @PostMapping("/users/batch")
    List<UserSummary> getUsers(@RequestBody Collection<Long> ids);

    @PostMapping("/users/search")
    List<Long> searchUsers(@RequestBody UserSearch search);

    @GetMapping("/recruiters/{id}")
    RecruiterSummary getRecruiter(@PathVariable("id") Long id);

    @PostMapping("/recruiters/batch")
    List<RecruiterSummary> getRecruiters(@RequestBody Collection<Long> ids);

    /** Stores a resume for one application (the profile resume is left untouched) and returns its URL. */
    @PostMapping(value = "/users/{id}/application-resumes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    String uploadApplicationResume(@PathVariable("id") Long id, @RequestPart("file") MultipartFile file);

    @DeleteMapping("/users/{id}/application-resumes")
    void deleteApplicationResume(@PathVariable("id") Long id, @RequestParam("url") String url);
}
