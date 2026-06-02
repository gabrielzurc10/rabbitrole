# Spring Boot as a Lambda container image, fronted by the AWS Lambda Web Adapter
# (LWA). The app runs unchanged as a normal web server on :8080; LWA registers
# as a Lambda extension and translates API Gateway events <-> HTTP, so all the
# @RestControllers work without a Lambda-specific handler. See CLAUDE.md /
# Phase 6 (container packaging; SnapStart is zip-only and intentionally not used).

# --- build stage: compile + bootJar (produces build/libs/app.jar) -----------
FROM public.ecr.aws/docker/library/amazoncorretto:21 AS build
WORKDIR /workspace

# Warm the Gradle wrapper + dependency cache before copying source, so edits to
# src/ don't re-download everything on rebuild.
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

COPY src ./src
RUN ./gradlew --no-daemon clean bootJar

# --- runtime stage: JRE + LWA -----------------------------------------------
FROM public.ecr.aws/docker/library/amazoncorretto:21

# The Lambda Web Adapter binary, loaded as a Lambda external extension.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

# LWA proxies to this port; matches server.port in application.yml.
ENV PORT=8080
# Readiness probe: LWA marks the app ready only on a 2xx/3xx, so point it at the
# /healthz endpoint (200), NOT /error (500). It polls until ready, then forwards.
ENV AWS_LWA_READINESS_CHECK_PATH=/healthz

WORKDIR /var/task
COPY --from=build /workspace/build/libs/app.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
