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
    private final String fallbackModel;

    public OpenAiClient(
            @Value("${openai.base-url}") String baseUrl,
            @Value("${openai.api-key}") String apiKey,
            @Value("${openai.chat-model}") String chatModel,
            @Value("${openai.judgment-model}") String judgmentModel,
            @Value("${openai.judgment-fallback-model}") String fallbackModel) {
        this.chatModel = chatModel;
        this.judgmentModel = judgmentModel;
        this.fallbackModel = fallbackModel;
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
     *
     * If the requested model fails — the key lacks access to it, or the model rejects
     * the request (e.g. a newer model that won't accept a custom temperature) — we
     * retry once on {@code judgment-fallback-model} (gpt-4o), so swapping in a stronger
     * judgment model can never take the feature down. Without this a bad judgment-model
     * name 502s every resume analysis and job re-rank.
     */
    public String completeJson(String systemPrompt, String userPrompt, String model) {
        try {
            return firstMessageContent(post(model, systemPrompt, userPrompt));
        } catch (RuntimeException primary) {
            if (model.equals(fallbackModel)) {
                throw primary; // already on the fallback model — nothing left to try
            }
            return firstMessageContent(post(fallbackModel, systemPrompt, userPrompt));
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> post(String model, String systemPrompt, String userPrompt) {
        Map<String, Object> body = Map.of(
                "model", model,
                "temperature", 0.2,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)));
        try {
            return http.post()
                    .uri("/chat/completions")
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (RuntimeException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OpenAI request failed: " + e.getMessage());
        }
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
