package com.rabbitrole.eval;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.rabbitrole.ai.OpenAiClient;
import com.rabbitrole.analysis.AnalysisService;
import com.rabbitrole.analysis.InMemoryAnalysisRepository;
import com.rabbitrole.analysis.dto.AnalysisResponse;
import com.rabbitrole.jobs.JobRerankService;
import com.rabbitrole.jobs.JobService;
import com.rabbitrole.jobs.dto.Job;
import com.rabbitrole.resume.ResumeService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/**
 * Opt-in quality harness — runs ONLY via {@code ./gradlew eval} (the @Tag("eval") is
 * excluded from the normal {@code test}/{@code build} run). It makes REAL OpenAI calls
 * to grade resume scoring + job re-ranking against fixture expectations, printing a
 * scorecard. Skips itself when OPENAI_API_KEY is absent (the eval Gradle task loads it
 * from the repo-root .env).
 *
 * <p>Wired by hand (no Spring context) so it sidesteps the Lambda serverless-web
 * autoconfig: a real {@link OpenAiClient} + the real {@link AnalysisService} /
 * {@link JobRerankService}, with only the resume text + live job grounding mocked.
 */
@Tag("eval")
class EvalHarnessTest {

    private ResumeService resumes;
    private AnalysisService analysis;
    private JobRerankService reranker;

    @BeforeEach
    void setUp() {
        String key = System.getenv("OPENAI_API_KEY");
        assumeTrue(key != null && !key.isBlank(),
                "OPENAI_API_KEY not set — skipping the real-API eval harness.");

        OpenAiClient openai = new OpenAiClient(
                "https://api.openai.com/v1", key, "gpt-4o-mini", "gpt-5.4-mini");

        resumes = mock(ResumeService.class);
        JobService jobs = mock(JobService.class);
        when(jobs.forRole(anyString())).thenReturn(List.of()); // no live grounding in eval

        analysis = new AnalysisService(resumes, jobs, openai, new InMemoryAnalysisRepository());
        reranker = new JobRerankService(openai);
    }

    private record ScoreCase(String name, String role, String resume, int minScore, int maxScore) {
    }

    @Test
    void resumeScoringStaysInBand() {
        List<ScoreCase> cases = List.of(
                new ScoreCase("strong-backend", "Backend Engineer", STRONG_BACKEND, 60, 100),
                new ScoreCase("career-switcher", "Software Engineer", BARISTA, 0, 55),
                new ScoreCase("no-metrics", "Backend Engineer", NO_METRICS, 35, 85));

        System.out.println("\n=== Resume scoring eval ===");
        int passed = 0;
        for (ScoreCase c : cases) {
            when(resumes.extractedText(anyString(), anyString())).thenReturn(c.resume());
            AnalysisResponse r = analysis.analyze("resume-id", c.role(), "user-id");
            boolean ok = r.score() >= c.minScore() && r.score() <= c.maxScore();
            if (ok) {
                passed++;
            }
            System.out.printf("  [%s] %-16s score=%3d (want %d-%d)  subScores=%s  missing=%s%n",
                    ok ? "PASS" : "FAIL", c.name(), r.score(), c.minScore(), c.maxScore(),
                    r.subScores(), r.missingSkills());
            assertThat(r.score()).as("score for %s", c.name()).isBetween(c.minScore(), c.maxScore());
        }
        System.out.printf("Scoring: %d/%d in band%n", passed, cases.size());
    }

    @Test
    void rerankRanksTheRelevantPostingFirst() {
        Job good = job("g", "Senior Backend Engineer", "Acme",
                "Build Java/Spring Boot microservices on AWS; REST APIs, PostgreSQL, CI/CD.", 55);
        Job bad = job("b", "Registered Nurse", "City Clinic",
                "Provide direct patient care, administer medication, ICU experience required.", 50);

        // Deliberately listed worst-first; the re-rank must surface the relevant one.
        List<Job> top = reranker.topMatches(STRONG_BACKEND, List.of(bad, good), 2);

        System.out.println("\n=== Re-rank eval ===");
        top.forEach(j -> System.out.printf("  %3d%%  %-28s %s%n", j.matchPercent(), j.title(), j.reason()));

        assertThat(top).isNotEmpty();
        assertThat(top.get(0).title()).isEqualTo("Senior Backend Engineer");
        assertThat(top.get(0).reason()).isNotBlank();
    }

    private static Job job(String id, String title, String company, String desc, int pct) {
        return new Job(id, title, company, null, "Remote", "", "", "remote", null, desc,
                "http://example.com", null, null, null, null, null, null, pct);
    }

    // ---- fixtures (kept short; extend freely) --------------------------------
    private static final String STRONG_BACKEND = """
            Senior Backend Engineer with 6 years building Java and Spring Boot microservices on AWS
            (Lambda, ECS, DynamoDB). Designed REST APIs serving 2M requests/day; cut p99 latency 40%
            with Redis caching; led an event-driven migration to Kafka. Mentored 4 engineers.
            B.S. Computer Science.
            """;

    private static final String BARISTA = """
            Friendly barista with 4 years of customer service at a busy cafe. Prepared espresso
            drinks, trained new staff, managed inventory and cash handling. Known for speed and a
            positive attitude. High school diploma.
            """;

    private static final String NO_METRICS = """
            Backend developer. Worked on web applications using Java and Spring. Responsible for
            developing features, fixing bugs, and writing code. Collaborated with the team. Used
            databases and REST APIs. Familiar with AWS.
            """;
}
