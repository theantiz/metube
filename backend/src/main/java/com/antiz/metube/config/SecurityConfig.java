package com.antiz.metube.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/**").permitAll() // ✅ allow progress and download APIs
                        .anyRequest().permitAll()
                )
                .headers(headers -> headers.frameOptions().disable());

        return http.build();
    }
    @Bean
    public UserDetailsService userDetailsService() {
        // Disable default in-memory user creation
        return username -> null;
    }
    // ✅ Enable CORS globally for frontend dev server
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("http://localhost:5173", "http://127.0.0.1:5173") // adjust if needed
                        .allowedMethods("GET", "POST", "OPTIONS")
                        .allowCredentials(true);
            }
        };
    }
}
