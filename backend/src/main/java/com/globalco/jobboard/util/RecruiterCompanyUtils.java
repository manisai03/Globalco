package com.globalco.jobboard.util;

import com.globalco.jobboard.model.Admin;

import java.util.Set;

public final class RecruiterCompanyUtils {

    private static final Set<String> LEGACY_NAMES = Set.of(
            "globalco technologies",
            "globalco",
            "globalco jobs",
            "our company"
    );

    private RecruiterCompanyUtils() {}

    public static boolean isLegacyPlaceholder(String name) {
        if (name == null || name.isBlank()) {
            return true;
        }
        return LEGACY_NAMES.contains(name.trim().toLowerCase());
    }

    public static String resolveCompany(Admin admin, String formCompany) {
        if (formCompany != null && !formCompany.isBlank() && !isLegacyPlaceholder(formCompany)) {
            return formCompany.trim();
        }
        if (admin.getCompanyName() != null && !admin.getCompanyName().isBlank()
                && !isLegacyPlaceholder(admin.getCompanyName())) {
            return admin.getCompanyName().trim();
        }
        return null;
    }
}
