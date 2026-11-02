package com.globalco.jobboard.application;

import com.globalco.jobboard.common.client.AiServiceClient;
import com.globalco.jobboard.common.client.AuthServiceClient;
import com.globalco.jobboard.common.client.JobServiceClient;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(scanBasePackages = "com.globalco.jobboard")
@EnableFeignClients(clients = {AuthServiceClient.class, JobServiceClient.class, AiServiceClient.class})
public class ApplicationServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApplicationServiceApplication.class, args);
    }
}
