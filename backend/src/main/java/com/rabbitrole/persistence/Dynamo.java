package com.rabbitrole.persistence;

import com.rabbitrole.config.AwsProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DeleteRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.WriteRequest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Thin helper over the DynamoDB client: every repository runs item operations
 * through here (no JPA — see CLAUDE.md), so table-name resolution and the
 * AttributeValue plumbing live in exactly one place. aws profile only. Replaces
 * the old RDS Data API {@code DataApi} — DynamoDB needs no VPC and never pauses.
 */
@Component
@Profile("aws")
public class Dynamo {

    /** DynamoDB caps a BatchWriteItem at 25 requests. */
    private static final int BATCH_LIMIT = 25;

    private final DynamoDbClient client;
    private final String prefix;

    public Dynamo(DynamoDbClient client, AwsProperties props) {
        this.client = client;
        this.prefix = props.getDynamoTablePrefix();
    }

    /** Full table name for a logical name, e.g. "profiles" -> "rabbitrole-dev-profiles". */
    private String table(String name) {
        return prefix + "-" + name;
    }

    public void put(String table, Map<String, AttributeValue> item) {
        String t = table(table);
        client.putItem(b -> b.tableName(t).item(item));
    }

    public Optional<Map<String, AttributeValue>> get(String table, String keyName, String keyValue) {
        String t = table(table);
        // Strongly consistent: these single-item gets often run right after a write in the
        // same flow (e.g. save preferences → immediately match jobs against them). An
        // eventually-consistent read can return the pre-write item, so a just-applied
        // filter would match against the OLD profile. A single-item consistent read is
        // cheap (~2x RCU on a tiny item) and the tables are always warm / VPC-less.
        Map<String, AttributeValue> item = client.getItem(b -> b
                .tableName(t)
                .consistentRead(true)
                .key(Map.of(keyName, s(keyValue)))).item();
        return item == null || item.isEmpty() ? Optional.empty() : Optional.of(item);
    }

    public void delete(String table, String keyName, String keyValue) {
        String t = table(table);
        client.deleteItem(b -> b.tableName(t).key(Map.of(keyName, s(keyValue))));
    }

    /** Query a GSI by its (string) partition key; returns the matching items. */
    public List<Map<String, AttributeValue>> queryByIndex(
            String table, String index, String keyName, String keyValue) {
        QueryRequest req = QueryRequest.builder()
                .tableName(table(table))
                .indexName(index)
                .keyConditionExpression("#k = :v")
                .expressionAttributeNames(Map.of("#k", keyName))
                .expressionAttributeValues(Map.of(":v", s(keyValue)))
                .build();
        return client.query(req).items();
    }

    /** Delete many items by primary-key value, chunked to DynamoDB's 25-item limit. */
    public void batchDelete(String table, String keyName, List<String> keyValues) {
        if (keyValues.isEmpty()) {
            return;
        }
        String t = table(table);
        for (int i = 0; i < keyValues.size(); i += BATCH_LIMIT) {
            List<WriteRequest> writes = new ArrayList<>();
            for (String v : keyValues.subList(i, Math.min(i + BATCH_LIMIT, keyValues.size()))) {
                writes.add(WriteRequest.builder()
                        .deleteRequest(DeleteRequest.builder().key(Map.of(keyName, s(v))).build())
                        .build());
            }
            client.batchWriteItem(b -> b.requestItems(Map.of(t, writes)));
        }
    }

    // --- AttributeValue builders ---

    public static AttributeValue s(String value) {
        return AttributeValue.fromS(value);
    }

    /** A fresh mutable item map; pair with the put* helpers (which skip nulls). */
    public static Map<String, AttributeValue> item() {
        return new HashMap<>();
    }

    /** Adds a string attribute only if non-null (DynamoDB rejects null values). */
    public static void putS(Map<String, AttributeValue> item, String key, String value) {
        if (value != null) {
            item.put(key, AttributeValue.fromS(value));
        }
    }

    /** Adds a numeric attribute only if non-null. */
    public static void putN(Map<String, AttributeValue> item, String key, Integer value) {
        if (value != null) {
            item.put(key, AttributeValue.fromN(value.toString()));
        }
    }

    public static void putBool(Map<String, AttributeValue> item, String key, boolean value) {
        item.put(key, AttributeValue.fromBool(value));
    }

    // --- readers ---

    public static String getS(Map<String, AttributeValue> item, String key) {
        AttributeValue v = item.get(key);
        return v == null ? null : v.s();
    }

    public static Integer getN(Map<String, AttributeValue> item, String key) {
        AttributeValue v = item.get(key);
        return v == null || v.n() == null ? null : Integer.valueOf(v.n());
    }

    public static boolean getBool(Map<String, AttributeValue> item, String key) {
        AttributeValue v = item.get(key);
        return v != null && Boolean.TRUE.equals(v.bool());
    }
}
