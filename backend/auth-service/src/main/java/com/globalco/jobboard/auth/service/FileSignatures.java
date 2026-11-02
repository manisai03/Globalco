package com.globalco.jobboard.auth.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/** Checks that a file's bytes match its extension, so a renamed executable or HTML page isn't stored as a resume. */
final class FileSignatures {

    private static final byte[] PDF = "%PDF-".getBytes();
    private static final byte[] OLE2 = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};
    private static final byte[] ZIP = {0x50, 0x4B, 0x03, 0x04};
    private static final int MAX_ZIP_ENTRIES = 2_000;

    private FileSignatures() {}

    @FunctionalInterface
    interface StreamSource {
        InputStream open() throws IOException;
    }

    static boolean matches(String extension, StreamSource source) throws IOException {
        return switch (extension) {
            case ".pdf" -> startsWith(source, PDF);
            case ".doc" -> startsWith(source, OLE2);
            case ".docx" -> startsWith(source, ZIP) && isWordDocument(source);
            default -> false;
        };
    }

    private static boolean startsWith(StreamSource source, byte[] signature) throws IOException {
        try (InputStream in = source.open()) {
            return Arrays.equals(in.readNBytes(signature.length), signature);
        }
    }

    /** A .docx is a ZIP with word/document.xml; other Office files and plain archives are rejected. */
    private static boolean isWordDocument(StreamSource source) throws IOException {
        try (ZipInputStream zip = new ZipInputStream(source.open())) {
            ZipEntry entry;
            int seen = 0;
            while ((entry = zip.getNextEntry()) != null && seen++ < MAX_ZIP_ENTRIES) {
                if ("word/document.xml".equals(entry.getName())) return true;
            }
            return false;
        } catch (IOException e) {
            return false;
        }
    }
}
