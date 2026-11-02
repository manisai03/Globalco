package com.globalco.jobboard.gateway;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * CORS is answered once, here. Downstream services have CORS disabled.
 * Outside APP_ENV=local/test only the origins listed in CORS_ORIGINS are allowed.
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsWebFilter corsWebFilter(@Value("${app.cors.allowed-origins:}") String allowedOrigins,
                                       @Value("${app.env:local}") String env) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(allowedOriginPatterns(allowedOrigins, env));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Retry-After", "X-Request-Id"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsWebFilter(source);
    }

    static List<String> allowedOriginPatterns(String allowedOrigins, String env) {
        List<String> patterns = new ArrayList<>();
        if ("local".equalsIgnoreCase(env) || "test".equalsIgnoreCase(env)) {
            patterns.add("http://localhost:*");
            patterns.add("http://127.0.0.1:*");
        }
        Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .forEach(patterns::add);
        return patterns.stream().distinct().toList();
    }
}
