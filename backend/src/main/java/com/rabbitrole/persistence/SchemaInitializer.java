package com.rabbitrole.persistence;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
                score      integer,
                created_at timestamptz NOT NULL DEFAULT now()
            )""";

    // For clusters created before the score column existed (idempotent).
    private static final String ANALYSES_SCORE =
            "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS score integer";

    private static final String PROFILES = """
            CREATE TABLE IF NOT EXISTS profiles (
                user_id      text PRIMARY KEY,
                full_name    text NOT NULL,
                target_roles jsonb NOT NULL,
                work_mode    text NOT NULL,
                cities       jsonb NOT NULL,
                resume_id    text,
                analysis_id  text,
                score        integer,
                updated_at   timestamptz NOT NULL DEFAULT now()
            )""";

    private static final Logger log = LoggerFactory.getLogger(SchemaInitializer.class);

    private final DataApi db;

    public SchemaInitializer(DataApi db) {
        this.db = db;
    }

    @Override
    public void run(ApplicationArguments args) {
        // Off the startup thread: a paused Aurora makes the first Data API call
        // block ~20s (DataApi retries the resume). Doing that synchronously would
        // delay the app becoming ready; the DDL is idempotent and existing
        // deployments already have the tables, so create them in the background.
        Thread thread = new Thread(this::initSchema, "schema-init");
        thread.setDaemon(true);
        thread.start();
    }

    private void initSchema() {
        try {
            db.execute(RESUMES);
            db.execute(ANALYSES);
            db.execute(ANALYSES_SCORE);
            db.execute(PROFILES);
            log.info("Schema initialized.");
        } catch (RuntimeException e) {
            // Never crash the app over schema init — log and rely on existing tables.
            log.warn("Schema init failed; relying on existing tables: {}", e.getMessage());
        }
    }
}
