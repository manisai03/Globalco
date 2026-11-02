package com.globalco.jobboard.messaging;

import com.globalco.jobboard.common.client.ApplicationServiceClient;
import com.globalco.jobboard.common.client.AuthServiceClient;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "com.globalco.jobboard")
@EnableScheduling
@EnableFeignClients(clients = {AuthServiceClient.class, ApplicationServiceClient.class})
public class MessagingServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(MessagingServiceApplication.class, args);
    }
}
