package com.globalco.jobboard.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.globalco.jobboard.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Service
@Slf4j
public class CloudinaryService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp"
    );
    private static final long MAX_BYTES = 5 * 1024 * 1024;

    private final Cloudinary cloudinary;

    @Value("${app.cloudinary.folder:globalco-jobs/avatars}")
    private String folder;

    @Value("${app.cloudinary.cloud-name:}")
    private String cloudName;

    public CloudinaryService(@Autowired(required = false) Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public record UploadResult(String url, String publicId) {}

    public UploadResult uploadProfilePicture(MultipartFile file, Long userId, String existingPublicId) {
        if (cloudinary == null || !StringUtils.hasText(cloudName)) {
            throw new BadRequestException(
                    "Cloudinary is not configured. Set app.cloudinary.cloud-name in backend/cloudinary-local.yml and restart.");
        }

        validateImage(file);

        if (StringUtils.hasText(existingPublicId)) {
            try {
                cloudinary.uploader().destroy(existingPublicId, ObjectUtils.emptyMap());
            } catch (Exception e) {
                log.warn("Could not delete previous avatar {}: {}", existingPublicId, e.getMessage());
            }
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", folder,
                    "public_id", "user-" + userId,
                    "overwrite", true,
                    "resource_type", "image",
                    "transformation", "c_fill,g_face,w_400,h_400"
            ));

            return new UploadResult(
                    (String) result.get("secure_url"),
                    (String) result.get("public_id")
            );
        } catch (IOException e) {
            throw new BadRequestException("Failed to read image file");
        } catch (Exception e) {
            log.error("Cloudinary upload failed: {}", e.getMessage());
            throw new BadRequestException("Failed to upload profile picture. Check Cloudinary credentials.");
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Image file is required");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BadRequestException("Profile picture must be under 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Only JPG, PNG, or WEBP images are allowed");
        }
    }
}
