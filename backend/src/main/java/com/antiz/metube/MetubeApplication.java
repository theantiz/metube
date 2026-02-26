package com.antiz.metube;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.redis.connection.RedisConnectionFactory;


@SpringBootApplication
public class MetubeApplication {

    @Bean
    CommandLineRunner checkRedis(RedisConnectionFactory factory) {
        return args -> {
            try {
                System.out.println("Redis PING: " + factory.getConnection().ping());
            } catch (Exception e) {
                System.err.println("Redis check skipped: " + e.getMessage());
            }
        };
    }

	public static void main(String[] args) {
		SpringApplication.run(MetubeApplication.class, args);
	}

}
