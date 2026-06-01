package com.rabbitrole.persistence;

import com.rabbitrole.config.AwsProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.rdsdata.RdsDataClient;
import software.amazon.awssdk.services.rdsdata.model.ExecuteStatementResponse;
import software.amazon.awssdk.services.rdsdata.model.Field;
import software.amazon.awssdk.services.rdsdata.model.SqlParameter;
import software.amazon.awssdk.services.rdsdata.model.TypeHint;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;
import java.util.List;

/**
 * Thin helper over the Aurora RDS Data API: every repository runs plain SQL
 * through here (no JPA — see CLAUDE.md), so the cluster/secret/database wiring
 * and parameter/result plumbing live in exactly one place. aws profile only.
 */
@Component
@Profile("aws")
public class DataApi {

    private static final DateTimeFormatter TS_OUT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS").withZone(ZoneOffset.UTC);

    // Postgres trims trailing fractional zeros, so accept 0–9 fractional digits.
    private static final DateTimeFormatter TS_IN = new DateTimeFormatterBuilder()
            .appendPattern("yyyy-MM-dd HH:mm:ss")
            .optionalStart().appendFraction(ChronoField.NANO_OF_SECOND, 0, 9, true).optionalEnd()
            .toFormatter();

    private final RdsDataClient client;
    private final AwsProperties props;

    public DataApi(RdsDataClient client, AwsProperties props) {
        this.client = client;
        this.props = props;
    }

    public ExecuteStatementResponse execute(String sql, SqlParameter... params) {
        return client.executeStatement(b -> b
                .resourceArn(props.getDb().getClusterArn())
                .secretArn(props.getDb().getSecretArn())
                .database(props.getDb().getName())
                .sql(sql)
                .parameters(params));
    }

    // --- parameter builders ---

    /** A nullable text parameter. */
    public static SqlParameter str(String name, String value) {
        Field field = value == null
                ? Field.builder().isNull(true).build()
                : Field.builder().stringValue(value).build();
        return SqlParameter.builder().name(name).value(field).build();
    }

    /** A jsonb parameter — {@code jsonValue} must already be a JSON string. */
    public static SqlParameter json(String name, String jsonValue) {
        return SqlParameter.builder()
                .name(name)
                .typeHint(TypeHint.JSON)
                .value(Field.builder().stringValue(jsonValue).build())
                .build();
    }

    /** A timestamptz parameter from an Instant (rendered as UTC). */
    public static SqlParameter timestamp(String name, Instant value) {
        return SqlParameter.builder()
                .name(name)
                .typeHint(TypeHint.TIMESTAMP)
                .value(Field.builder().stringValue(TS_OUT.format(value)).build())
                .build();
    }

    // --- result readers ---

    /** Reads a (possibly null) text column from a result row. */
    public static String string(List<Field> row, int index) {
        Field field = row.get(index);
        return Boolean.TRUE.equals(field.isNull()) ? null : field.stringValue();
    }

    /** Parses a Data API timestamptz string back into an Instant (UTC). */
    public static Instant instant(String raw) {
        return LocalDateTime.parse(raw, TS_IN).toInstant(ZoneOffset.UTC);
    }
}
