package com.globalco.jobboard.auth;

import com.globalco.jobboard.common.client.ApplicationServiceClient;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(scanBasePackages = "com.globalco.jobboard")
@EnableFeignClients(clients = ApplicationServiceClient.class)
public class AuthServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }
}
