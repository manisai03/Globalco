package com.globalco.jobboard.ai;

import com.globalco.jobboard.common.client.AuthServiceClient;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(scanBasePackages = "com.globalco.jobboard")
@EnableFeignClients(clients = AuthServiceClient.class)
public class AiServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AiServiceApplication.class, args);
    }
}
