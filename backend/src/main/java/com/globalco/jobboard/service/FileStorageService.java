package com.globalco.jobboard.service;

import com.globalco.jobboard.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    public static final Set<String> RESUME_EXTENSIONS = Set.of(".pdf", ".doc", ".docx");

    @Value("${app.upload.dir}")
    private String uploadDir;

    public String store(MultipartFile file, String subfolder, Set<String> allowedExtensions) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        String originalName = file.getOriginalFilename();
        String extension = originalName != null && originalName.contains(".")
                ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase(Locale.ROOT)
                : "";
        if (!allowedExtensions.contains(extension)) {
            throw new BadRequestException("Unsupported file type. Allowed: " + String.join(", ", allowedExtensions));
        }

        String filename = UUID.randomUUID() + extension;
        Path targetDir = Paths.get(uploadDir, subfolder);

        try {
            Files.createDirectories(targetDir);
            Path targetPath = targetDir.resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            return "/api/files/" + subfolder + "/" + filename;
        } catch (IOException e) {
            throw new BadRequestException("Failed to store file: " + e.getMessage());
        }
    }
}
