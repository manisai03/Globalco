package com.globalco.jobboard.config;

import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Configuration
@Slf4j
public class DatabaseConfig {

    private static final Pattern MYSQL_URI = Pattern.compile(
            "^mysql://([^:]+):([^@]+)@([^:/]+):(\\d+)/(.+)$"
    );

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource.hikari")
    public DataSource dataSource(DataSourceProperties properties) {
        String url = properties.getUrl();
        if (url == null || (!url.startsWith("mysql://") && !url.startsWith("jdbc:mysql:"))) {
            return properties.initializeDataSourceBuilder()
                    .type(HikariDataSource.class)
                    .build();
        }

        String username = properties.getUsername();
        String password = properties.getPassword();

        if (url.startsWith("mysql://")) {
            Matcher matcher = MYSQL_URI.matcher(url);
            if (matcher.matches()) {
                username = matcher.group(1);
                password = matcher.group(2);
                String host = matcher.group(3);
                String port = matcher.group(4);
                String database = matcher.group(5).split("\\?")[0];
                url = "jdbc:mysql://" + host + ":" + port + "/" + database
                        + "?useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=UTC";
                log.info("Converted Railway mysql:// URL to JDBC format for host {}", host);
            } else {
                url = "jdbc:" + url + "?useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=UTC";
            }
        }

        if (url.contains("railway.internal")) {
            log.error("DATABASE_URL uses Railway internal host (railway.internal). "
                    + "Render cannot reach it. Use Railway Public TCP proxy host instead "
                    + "(Railway MySQL -> Connect -> Public Network).");
        }

        HikariDataSource dataSource = properties.initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
        dataSource.setJdbcUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        dataSource.setDriverClassName("com.mysql.cj.jdbc.Driver");
        return dataSource;
    }
}
