package com.globalco.jobboard.common.dto.internal;

import java.util.Collection;

/** Find which of {@code candidateIds} have a name or email containing {@code query} (case-insensitive). */
public record UserSearch(String query, Collection<Long> candidateIds) {}
