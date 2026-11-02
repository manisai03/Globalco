package com.globalco.jobboard.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Guards service-to-service endpoints under /internal/**. The gateway never routes these paths,
 * and callers must present the shared internal token that only services know.
 */
@Component
public class InternalApiFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Internal-Token";
    public static final String PATH_PREFIX = "/internal/";

    private final byte[] expectedToken;

    public InternalApiFilter(@Value("${app.internal.token}") String token) {
        this.expectedToken = token.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return !request.getRequestURI().startsWith(PATH_PREFIX);
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String provided = request.getHeader(HEADER);
        if (provided == null || !MessageDigest.isEqual(expectedToken, provided.getBytes(StandardCharsets.UTF_8))) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Internal endpoint\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
