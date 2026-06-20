package com.rabbitrole.ai;

import com.rabbitrole.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Chat-completion access to OpenAI, centralized so features never call the API
 * directly (CLAUDE.md). This is the deliberate swap point — re-implement
 * {@link #completeJson} against Bedrock and nothing else changes.
 */
@Component
public class OpenAiClient {

    private final RestClient http;
    private final String chatModel;
    private final String judgmentModel;

    public OpenAiClient(
            @Value("${openai.base-url}") String baseUrl,
            @Value("${openai.api-key}") String apiKey,
            @Value("${openai.chat-model}") String chatModel,
            @Value("${openai.judgment-model}") String judgmentModel) {
        this.chatModel = chatModel;
        this.judgmentModel = judgmentModel;
        this.http = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    /** The stronger model name for quality-critical calls (scoring, re-rank). */
    public String judgmentModel() {
        return judgmentModel;
    }

    /** Runs a chat completion on the default chat model. */
    public String completeJson(String systemPrompt, String userPrompt) {
        return completeJson(systemPrompt, userPrompt, chatModel);
    }

    /**
     * Runs a chat completion in JSON mode on the given model and returns the raw
     * JSON string the model produced. Callers own parsing it into their own DTOs.
     */
    @SuppressWarnings("unchecked")
    public String completeJson(String systemPrompt, String userPrompt, String model) {
        Map<String, Object> body = Map.of(
                "model", model,
                "temperature", 0.2,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)));

        Map<String, Object> response;
        try {
            response = http.post()
                    .uri("/chat/completions")
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (RuntimeException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OpenAI request failed: " + e.getMessage());
        }

        return firstMessageContent(response);
    }

    @SuppressWarnings("unchecked")
    private String firstMessageContent(Map<String, Object> response) {
        if (response == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Empty response from OpenAI.");
        }
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OpenAI returned no choices.");
        }
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }
}
