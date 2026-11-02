package com.globalco.jobboard.common.util;

import java.util.Locale;

/** Builds SQL LIKE patterns from user input; use with escape character {@link #ESCAPE}. */
public final class LikePatterns {

    public static final char ESCAPE = '\\';

    private LikePatterns() {}

    public static String escape(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    /** Lower-cased "%value%" with LIKE wildcards in the input escaped. */
    public static String contains(String value) {
        return "%" + escape(value.trim().toLowerCase(Locale.ROOT)) + "%";
    }
}
