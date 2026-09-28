package com.scholarsync.service.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {

    /**
     * Stores an uploaded file for a given task and version number.
     * @param file the multipart file
     * @param taskId the task ID
     * @param versionNumber the version number (e.g. "v1.0")
     * @return the stored relative file path
     */
    String storeFile(MultipartFile file, Long taskId, String versionNumber);

    /**
     * Loads a file as a Spring Resource.
     * @param filePath relative or stored file path
     * @return the Resource
     */
    Resource loadAsResource(String filePath);

    /**
     * Deletes a stored file if needed.
     * @param filePath relative or stored file path
     */
    void deleteFile(String filePath);
}
