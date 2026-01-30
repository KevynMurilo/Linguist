package com.linguist.core.ai;

import com.linguist.core.ai.AIClient;
import com.linguist.core.ai.AIClientFactory;
import com.linguist.core.user.User;
import com.linguist.core.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AIService {

    private final AIClientFactory aiClientFactory;
    private final UserService userService;

    @Transactional(readOnly = true)
    public String chat(UUID userId, String message, String provider, String apiKey) {
        User user = userService.findById(userId);
        AIClient client = aiClientFactory.getClient(provider);

        String systemPrompt = buildAssistantSystemPrompt(user);

        return client.generateContent(systemPrompt, message, apiKey);
    }

    private String buildAssistantSystemPrompt(User user) {
        return new StringBuilder()
                .append("You are the 'Linguist AI Assistant', a professional English Coach.\n")
                .append("USER CONTEXT:\n")
                .append("- Name: ").append(user.getName()).append("\n")
                .append("- Level: ").append(user.getLevel()).append("\n")
                .append("- Native Language: ").append(user.getNativeLanguage()).append("\n\n")
                .append("GUIDELINES:\n")
                .append("1. If level is A1/A2: Explain concepts simply in ").append(user.getNativeLanguage()).append(".\n")
                .append("2. If level is B1/B2: Mix English and ").append(user.getNativeLanguage()).append(".\n")
                .append("3. If level is C1/C2: Respond strictly in English.\n")
                .append("4. Focus on practical examples and natural speech.\n")
                .append("5. Be encouraging but direct.")
                .toString();
    }
}