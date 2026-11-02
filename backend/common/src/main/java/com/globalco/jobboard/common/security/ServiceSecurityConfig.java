package com.globalco.jobboard.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.globalco.jobboard.common.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.List;

/**
 * Shared stateless security for every servlet service. CORS is handled once at the gateway,
 * so services never emit CORS headers themselves (duplicates break browsers).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class ServiceSecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final InternalApiFilter internalApiFilter;
    private final ObjectMapper objectMapper;

    @Value("${app.security.public-paths:}")
    private List<String> publicPaths;

    @Value("${app.security.public-get-paths:}")
    private List<String> publicGetPaths;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        String[] open = publicPaths.stream().filter(p -> !p.isBlank()).toArray(String[]::new);
        String[] openGet = publicGetPaths.stream().filter(p -> !p.isBlank()).toArray(String[]::new);

        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();
                    auth.requestMatchers("/actuator/health/**", "/actuator/info", "/actuator/prometheus",
                            "/v3/api-docs/**", "/internal/**", "/error").permitAll();
                    if (open.length > 0) auth.requestMatchers(open).permitAll();
                    if (openGet.length > 0) auth.requestMatchers(HttpMethod.GET, openGet).permitAll();
                    auth.anyRequest().authenticated();
                })
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> writeError(res, HttpStatus.UNAUTHORIZED, "Not authenticated"))
                        .accessDeniedHandler((req, res, ex) -> writeError(res, HttpStatus.FORBIDDEN,
                                "You do not have permission for this action")))
                .addFilterBefore(internalApiFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void writeError(jakarta.servlet.http.HttpServletResponse res, HttpStatus status, String message)
            throws java.io.IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(res.getOutputStream(), ApiResponse.error(message));
    }
}
