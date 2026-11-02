package com.globalco.jobboard.common.util;

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

    /** Prefers the company typed in the form, then the recruiter's profile company; null if neither is real. */
    public static String resolveCompany(String profileCompany, String formCompany) {
        if (formCompany != null && !formCompany.isBlank() && !isLegacyPlaceholder(formCompany)) {
            return formCompany.trim();
        }
        if (profileCompany != null && !profileCompany.isBlank() && !isLegacyPlaceholder(profileCompany)) {
            return profileCompany.trim();
        }
        return null;
    }

    public static String maskedCandidateLabel(Long userId) {
        return "Candidate #" + userId;
    }
}
