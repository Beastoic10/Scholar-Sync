package com.scholarsync.service.storage;

import com.scholarsync.exception.BadRequestException;
import com.scholarsync.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
public class LocalStorageService implements StorageService {

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".pdf", ".docx");

    private final Path rootLocation;

    public LocalStorageService(@Value("${app.storage.upload-dir:uploads/submissions}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootLocation);
            log.info("Storage root initialized at: {}", this.rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory", e);
        }
    }

    @Override
    public String storeFile(MultipartFile file, Long taskId, String versionNumber) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Failed to store empty file");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new BadRequestException("File name cannot be null");
        }

        String cleanFilename = StringUtils.cleanPath(originalFilename);
        if (cleanFilename.contains("..")) {
            throw new BadRequestException("Invalid filename with path traversal: " + cleanFilename);
        }

        String lowerName = cleanFilename.toLowerCase();
        boolean validExt = ALLOWED_EXTENSIONS.stream().anyMatch(lowerName::endsWith);
        if (!validExt) {
            throw new BadRequestException("Unsupported document type. Only PDF (.pdf) and DOCX (.docx) documents are supported.");
        }

        try {
            Path taskDir = this.rootLocation.resolve("task-" + taskId).normalize();
            Files.createDirectories(taskDir);

            String safePrefix = versionNumber != null ? versionNumber.replaceAll("[^a-zA-Z0-9.-]", "_") + "_" : "";
            String targetFileName = safePrefix + System.currentTimeMillis() + "_" + cleanFilename;
            Path destinationFile = taskDir.resolve(targetFileName).normalize();

            if (!destinationFile.getParent().equals(taskDir)) {
                throw new BadRequestException("Cannot store file outside current directory");
            }

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            }

            // Return relative path to rootLocation for portability
            String storedRelativePath = this.rootLocation.relativize(destinationFile).toString().replace('\\', '/');
            log.info("Stored file '{}' as '{}'", cleanFilename, storedRelativePath);
            return storedRelativePath;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + cleanFilename, e);
        }
    }

    @Override
    public Resource loadAsResource(String filePath) {
        try {
            Path file = this.rootLocation.resolve(filePath).normalize();
            if (!file.startsWith(this.rootLocation)) {
                throw new BadRequestException("Cannot access file outside storage directory");
            }

            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("File", "path", filePath);
            }
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("File", "path", filePath);
        }
    }

    @Override
    public void deleteFile(String filePath) {
        try {
            Path file = this.rootLocation.resolve(filePath).normalize();
            if (file.startsWith(this.rootLocation)) {
                Files.deleteIfExists(file);
            }
        } catch (IOException e) {
            log.warn("Could not delete file at: {}", filePath, e);
        }
    }
}
