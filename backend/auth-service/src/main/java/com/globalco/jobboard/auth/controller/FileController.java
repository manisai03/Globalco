package com.globalco.jobboard.auth.controller;

import com.globalco.jobboard.auth.service.FileAccessPolicy;
import com.globalco.jobboard.common.security.CurrentAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileAccessPolicy accessPolicy;
    private final CurrentAccount currentAccount;

    @Value("${app.upload.dir}")
    private String uploadDir;

    /** Unauthorized requests get 404 as well, so file names can't be probed. */
    @GetMapping("/{subfolder}/{filename}")
    public ResponseEntity<Resource> getFile(@PathVariable String subfolder, @PathVariable String filename) {
        try {
            Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path filePath = root.resolve(subfolder).resolve(filename).normalize();
            if (!filePath.startsWith(root)) {
                return ResponseEntity.notFound().build();
            }
            if (!accessPolicy.canRead(currentAccount.require(), subfolder, filename)) {
                return ResponseEntity.notFound().build();
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }
            MediaType contentType = resolveContentType(filename);
            // The app fetches files with XHR and previews them from a blob, so nothing needs to render on this origin:
            // download-only, no MIME sniffing, and a sandbox in case the URL is opened directly.
            return ResponseEntity.ok()
                    .contentType(contentType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                    .header("X-Content-Type-Options", "nosniff")
                    .header("Content-Security-Policy", "sandbox; default-src 'none'")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    private static MediaType resolveContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf")) return MediaType.APPLICATION_PDF;
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
        if (lower.endsWith(".doc")) return MediaType.parseMediaType("application/msword");
        if (lower.endsWith(".docx")) return MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
