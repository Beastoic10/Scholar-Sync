package com.scholarsync.service.extraction;

import com.scholarsync.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

@Slf4j
@Service
public class TikaDocumentTextExtractor implements DocumentTextExtractor {

    private final Tika tika;

    public TikaDocumentTextExtractor() {
        this.tika = new Tika();
        // Set generous write limit for research papers (e.g. 10MB of text)
        this.tika.setMaxStringLength(10 * 1024 * 1024);
    }

    @Override
    public String extractText(InputStream inputStream, String fileName) {
        if (inputStream == null) {
            throw new BadRequestException("Input stream is null");
        }

        try {
            log.info("Extracting document text using Apache Tika for: {}", fileName);
            String text = tika.parseToString(inputStream);
            if (text == null) {
                return "";
            }
            log.info("Successfully extracted {} characters from {}", text.length(), fileName);
            return text.trim();
        } catch (IOException | TikaException e) {
            log.error("Apache Tika failed to extract text from {}: {}", fileName, e.getMessage(), e);
            throw new BadRequestException("Failed to extract text from document '" + fileName + "': " + e.getMessage());
        }
    }
}
