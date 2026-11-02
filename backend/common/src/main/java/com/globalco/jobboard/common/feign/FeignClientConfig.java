package com.globalco.jobboard.common.feign;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.exception.DownstreamServiceException;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.exception.UnauthorizedException;
import com.globalco.jobboard.common.security.InternalApiFilter;
import com.globalco.jobboard.common.web.RequestIdFilter;
import feign.RequestInterceptor;
import feign.Response;
import feign.codec.ErrorDecoder;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.InputStream;

/**
 * Applies to every Feign client: authenticates as an internal caller, forwards the end-user token
 * and correlation id, and turns downstream error bodies back into the same exceptions the caller would
 * have thrown in the monolith (so 400/404 messages reach the browser unchanged).
 */
@Slf4j
@Configuration
public class FeignClientConfig {

    public static final String CORRELATION_HEADER = "X-Request-Id";

    @Bean
    public RequestInterceptor internalAuthInterceptor(@Value("${app.internal.token}") String internalToken) {
        return template -> {
            template.header(InternalApiFilter.HEADER, internalToken);
            if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
                String auth = attrs.getRequest().getHeader("Authorization");
                if (auth != null) template.header("Authorization", auth);
            }
            String requestId = MDC.get(RequestIdFilter.MDC_KEY);
            if (requestId != null) template.header(CORRELATION_HEADER, requestId);
        };
    }

    @Bean
    public ErrorDecoder apiErrorDecoder(ObjectMapper objectMapper) {
        return (methodKey, response) -> {
            String message = readMessage(objectMapper, response);
            return switch (response.status()) {
                case 400, 409, 422 -> new BadRequestException(message != null ? message : "Invalid request");
                case 401, 403 -> new UnauthorizedException(message != null ? message : "Not authorized");
                case 404 -> new ResourceNotFoundException(message != null ? message : "Not found");
                default -> {
                    log.warn("{} failed with HTTP {}: {}", methodKey, response.status(), message);
                    yield new DownstreamServiceException(methodKey + " failed with HTTP " + response.status());
                }
            };
        };
    }

    private static String readMessage(ObjectMapper objectMapper, Response response) {
        if (response.body() == null) return null;
        try (InputStream body = response.body().asInputStream()) {
            JsonNode node = objectMapper.readTree(body);
            JsonNode message = node != null ? node.get("message") : null;
            return message != null && !message.isNull() ? message.asText() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
