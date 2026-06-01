package com.rabbitrole.persistence;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Creates the resume/analysis tables on startup if they don't exist. Keeps the
 * MVP migration-free (no Flyway) — an idempotent CREATE TABLE IF NOT EXISTS is
 * enough at portfolio scale. Runs before traffic is served; aws profile only.
 */
@Component
@Profile("aws")
@Order(0)
public class SchemaInitializer implements ApplicationRunner {

    private static final String RESUMES = """
            CREATE TABLE IF NOT EXISTS resumes (
                id             text PRIMARY KEY,
                user_id        text,
                filename       text NOT NULL,
                filetype       text,
                extracted_text text NOT NULL,
                created_at     timestamptz NOT NULL DEFAULT now()
            )""";

    private static final String ANALYSES = """
            CREATE TABLE IF NOT EXISTS analyses (
                id         text PRIMARY KEY,
                resume_id  text NOT NULL REFERENCES resumes(id),
                user_id    text,
                role       text NOT NULL,
                tags       jsonb NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now()
            )""";

    private final DataApi db;

    public SchemaInitializer(DataApi db) {
        this.db = db;
    }

    @Override
    public void run(ApplicationArguments args) {
        db.execute(RESUMES);
        db.execute(ANALYSES);
    }
}
