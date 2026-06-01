package com.rabbitrole.ai;

import com.rabbitrole.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * text-embedding-3-small access, shared by job matching (cosine similarity) and
 * later the pgvector RAG knowledge base. Centralized alongside {@link OpenAiClient}.
 */
@Component
public class EmbeddingClient {

    private final RestClient http;
    private final String model;

    public EmbeddingClient(
            @Value("${openai.base-url}") String baseUrl,
            @Value("${openai.api-key}") String apiKey,
            @Value("${openai.embedding-model}") String model) {
        this.model = model;
        this.http = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    /** Embeds one piece of text into its vector. */
    public float[] embed(String text) {
        return embedAll(List.of(text)).get(0);
    }

    /** Embeds many texts in a single request (cheaper than one call each). */
    @SuppressWarnings("unchecked")
    public List<float[]> embedAll(List<String> texts) {
        Map<String, Object> body = Map.of("model", model, "input", texts);

        Map<String, Object> response;
        try {
            response = http.post()
                    .uri("/embeddings")
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (RuntimeException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OpenAI embeddings failed: " + e.getMessage());
        }

        if (response == null || response.get("data") == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Empty embedding response from OpenAI.");
        }
        List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
        return data.stream().map(this::toVector).toList();
    }

    @SuppressWarnings("unchecked")
    private float[] toVector(Map<String, Object> item) {
        List<Number> values = (List<Number>) item.get("embedding");
        float[] vec = new float[values.size()];
        for (int i = 0; i < vec.length; i++) {
            vec[i] = values.get(i).floatValue();
        }
        return vec;
    }
}
