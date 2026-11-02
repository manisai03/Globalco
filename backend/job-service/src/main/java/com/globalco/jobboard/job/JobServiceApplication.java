package com.globalco.jobboard.job;

import com.globalco.jobboard.common.client.AiServiceClient;
import com.globalco.jobboard.common.client.ApplicationServiceClient;
import com.globalco.jobboard.common.client.AuthServiceClient;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(scanBasePackages = "com.globalco.jobboard")
@EnableFeignClients(clients = {AuthServiceClient.class, ApplicationServiceClient.class, AiServiceClient.class})
public class JobServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(JobServiceApplication.class, args);
    }
}
