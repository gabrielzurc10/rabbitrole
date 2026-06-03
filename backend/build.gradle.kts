plugins {
    java
    id("org.springframework.boot") version "3.4.1"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.rabbitrole"
version = "0.0.1"

java {
    // Pin the toolchain so a missing JAVA_HOME doesn't matter (CLAUDE.md).
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Auth: validate Cognito-issued JWTs as a resource server (aws profile);
    // locally security is permit-all so the app runs without Cognito.
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")

    // Loads the repo-root .env into the Spring Environment (OpenAI/Adzuna keys).
    implementation("me.paulschwarz:spring-dotenv:4.0.0")

    // AWS access (aws profile only): Aurora via the RDS Data API, S3 for resume
    // files, SSM for secrets. Keeps Lambda out of the VPC — see CLAUDE.md.
    implementation(platform("software.amazon.awssdk:bom:2.28.16"))
    implementation("software.amazon.awssdk:rdsdata")
    implementation("software.amazon.awssdk:s3")
    implementation("software.amazon.awssdk:ssm")
    // Account deletion removes the Cognito user (AdminDeleteUser).
    implementation("software.amazon.awssdk:cognitoidentityprovider")

    // Resume text extraction: PDFBox (PDF) + Apache POI (Word .docx).
    implementation("org.apache.pdfbox:pdfbox:3.0.3")
    implementation("org.apache.poi:poi-ooxml:5.3.0")

    // Local dev only: auto-restarts the running app when recompiled classes
    // change. `developmentOnly` keeps it out of the bootJar, so it never ships in
    // the Lambda image. Pair `./gradlew bootRun` with `./gradlew classes -t`
    // (continuous compile) in another terminal to get save -> restart.
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    // Stable artifact name so the Lambda Dockerfile copies build/libs/app.jar
    // regardless of the project version.
    archiveFileName.set("app.jar")
}

tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    // Run from the repo root so spring-dotenv finds the root .env (its default
    // lookup is ./.env in the working dir). Prod/Lambda use real env vars, not .env.
    workingDir = rootProject.projectDir.parentFile
    // Stay lenient if .env is absent (CI/prod inject real env vars instead).
    jvmArgs("-DDOTENV_FAIL_ON_ERROR=false")
}
