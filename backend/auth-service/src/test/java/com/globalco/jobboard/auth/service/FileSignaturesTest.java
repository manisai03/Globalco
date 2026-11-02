package com.globalco.jobboard.auth.service;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;

class FileSignaturesTest {

    private static boolean matches(String ext, byte[] bytes) throws IOException {
        return FileSignatures.matches(ext, () -> new ByteArrayInputStream(bytes));
    }

    private static byte[] zipWith(String entryName) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry(entryName));
            zip.write("<xml/>".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        return out.toByteArray();
    }

    @Test
    void realPdfAndWordFilesPass() throws IOException {
        assertThat(matches(".pdf", "%PDF-1.7\n...".getBytes(StandardCharsets.US_ASCII))).isTrue();
        assertThat(matches(".doc", new byte[]{(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1, 0})).isTrue();
        assertThat(matches(".docx", zipWith("word/document.xml"))).isTrue();
    }

    @Test
    void renamedFilesAreRejected() throws IOException {
        byte[] html = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8);
        assertThat(matches(".pdf", html)).isFalse();
        assertThat(matches(".doc", html)).isFalse();
        assertThat(matches(".docx", html)).isFalse();
        assertThat(matches(".pdf", new byte[0])).isFalse();
    }

    @Test
    void zipThatIsNotAWordDocumentIsRejected() throws IOException {
        assertThat(matches(".docx", zipWith("xl/workbook.xml"))).isFalse();
        assertThat(matches(".docx", zipWith("evil.exe"))).isFalse();
    }
}
