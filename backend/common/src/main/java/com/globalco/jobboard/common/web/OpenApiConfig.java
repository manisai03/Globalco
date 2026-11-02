package com.globalco.jobboard.common.web;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Each service documents its public API at /v3/api-docs; the gateway serves them all in one Swagger UI.
 * The server URL is relative so "Try it out" goes through the gateway, never to a service directly.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI serviceOpenApi(@Value("${spring.application.name}") String serviceName) {
        return new OpenAPI()
                .info(new Info().title(serviceName).version("1.0").description("GlobalCo Job Board - " + serviceName))
                .servers(List.of(new Server().url("/")))
                .components(new Components().addSecuritySchemes("bearer",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }
}
