package com.rabbitrole.resume;

import com.rabbitrole.common.ApiException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;

/**
 * Pulls plain text out of an uploaded resume. PDFBox handles PDF, Apache POI
 * handles Word .docx. The chosen extractor is keyed off the content type so
 * features downstream (analysis, matching) never touch file parsing.
 */
@Component
public class ResumeTextExtractor {

    public String extract(String filename, String contentType, byte[] bytes) {
        FileType type = FileType.detect(filename, contentType);
        try {
            return switch (type) {
                case PDF -> fromPdf(bytes);
                case DOCX -> fromDocx(bytes);
            };
        } catch (IOException e) {
            throw ApiException.badRequest("Could not read the resume file: " + e.getMessage());
        }
    }

    private String fromPdf(byte[] bytes) throws IOException {
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            return new PDFTextStripper().getText(doc).strip();
        }
    }

    private String fromDocx(byte[] bytes) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes));
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText().strip();
        }
    }

    /** Resolves the upload to a supported type, or rejects it. */
    enum FileType {
        PDF, DOCX;

        static FileType detect(String filename, String contentType) {
            String name = filename == null ? "" : filename.toLowerCase();
            String ct = contentType == null ? "" : contentType.toLowerCase();
            if (name.endsWith(".pdf") || ct.contains("pdf")) {
                return PDF;
            }
            if (name.endsWith(".docx") || ct.contains("wordprocessingml")) {
                return DOCX;
            }
            throw ApiException.badRequest("Unsupported file type — upload a PDF or .docx resume.");
        }
    }
}
