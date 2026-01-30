package com.linguist.core.ai;

import com.linguist.core.exception.InvalidProviderException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class AIClientFactory {

    private final Map<AIProvider, AIClient> clients;

    public AIClientFactory(List<AIClient> clientList) {
        this.clients = clientList.stream()
                .collect(Collectors.toMap(AIClient::getProvider, Function.identity()));
    }

    public AIClient getClient(String providerName) {
        AIProvider provider = AIProvider.fromString(providerName);
        AIClient client = clients.get(provider);
        if (client == null) {
            throw new InvalidProviderException(providerName);
        }
        return client;
    }
}
