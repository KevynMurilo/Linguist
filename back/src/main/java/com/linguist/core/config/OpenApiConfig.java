package com.linguist.core.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI linguistOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Linguist-Core API")
                        .version("1.0.0")
                        .description("AI-orchestrated language learning engine focused on Shadowing, "
                                + "Connected Speech analysis, and Mastery Tracking. "
                                + "Supports BYOK (Bring Your Own Key) for multiple AI providers. "
                                + "Endpoints that consume AI require X-AI-Provider and X-AI-Key headers.")
                        .contact(new Contact()
                                .name("Linguist Team")));
    }
}
