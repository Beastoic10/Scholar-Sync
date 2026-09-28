package com.scholarsync.service.extraction;

import java.io.InputStream;

public interface DocumentTextExtractor {

    /**
     * Extracts text content from an input stream (PDF, DOCX, etc.).
     * @param inputStream the file input stream
     * @param fileName the original file name
     * @return extracted plain text
     */
    String extractText(InputStream inputStream, String fileName);
}
