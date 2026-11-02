package com.globalco.jobboard.auth.service;

import com.globalco.jobboard.common.exception.BadRequestException;
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
    public static final String URL_PREFIX = "/api/files/";
    public static final String RESUMES = "resumes";

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
        try {
            if (!FileSignatures.matches(extension, file::getInputStream)) {
                throw new BadRequestException("The file content doesn't match its " + extension
                        + " extension. Upload a real PDF or Word document.");
            }
        } catch (IOException e) {
            throw new BadRequestException("Could not read the uploaded file");
        }

        String filename = UUID.randomUUID() + extension;
        Path targetDir = Paths.get(uploadDir, subfolder);

        try {
            Files.createDirectories(targetDir);
            Path targetPath = targetDir.resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            return URL_PREFIX + subfolder + "/" + filename;
        } catch (IOException e) {
            throw new BadRequestException("Failed to store file: " + e.getMessage());
        }
    }

    /** Deletes a file previously returned by {@link #store}; ignores anything outside the upload folder. */
    public void deleteQuietly(String fileUrl) {
        if (fileUrl == null || !fileUrl.startsWith(URL_PREFIX)) return;
        Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path target = root.resolve(fileUrl.substring(URL_PREFIX.length())).normalize();
        if (!target.startsWith(root)) return;
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // A leftover file must not block deleting the account.
        }
    }

    /** @return {@code [subfolder, filename]} of a stored-file URL, or null if it is not one */
    public static String[] parseUrl(String fileUrl) {
        if (fileUrl == null || !fileUrl.startsWith(URL_PREFIX)) return null;
        String[] parts = fileUrl.substring(URL_PREFIX.length()).split("/");
        return parts.length == 2 ? parts : null;
    }
}
