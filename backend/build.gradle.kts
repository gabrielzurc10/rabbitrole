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
    // Web stack WITHOUT the embedded Tomcat server: in Lambda, serverless-java-container
    // provides a servlet-less MVC, so a real web server must NOT start (it errors on
    // 'webServerStartStop'). Tomcat is added back as developmentOnly below so local
    // `./gradlew bootRun` still serves on :8080, but it's excluded from the Lambda zip
    // (runtimeClasspath) and tests.
    implementation("org.springframework.boot:spring-boot-starter-web") {
        exclude(group = "org.springframework.boot", module = "spring-boot-starter-tomcat")
    }
    developmentOnly("org.springframework.boot:spring-boot-starter-tomcat")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Auth: validate Cognito-issued JWTs as a resource server (aws profile);
    // locally security is permit-all so the app runs without Cognito.
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")

    // Loads the repo-root .env into the Spring Environment (OpenAI/JSearch keys).
    implementation("me.paulschwarz:spring-dotenv:4.0.0")

    // AWS access (aws profile only): DynamoDB for app data, S3 for resume files,
    // SSM for secrets. All are VPC-less AWS APIs — Lambda stays out of a VPC.
    implementation(platform("software.amazon.awssdk:bom:2.28.16"))
    implementation("software.amazon.awssdk:dynamodb")
    implementation("software.amazon.awssdk:s3")
    implementation("software.amazon.awssdk:ssm")
    // Account deletion removes the Cognito user (AdminDeleteUser).
    implementation("software.amazon.awssdk:cognitoidentityprovider")

    // Resume text extraction: PDFBox (PDF) + Apache POI (Word .docx).
    implementation("org.apache.pdfbox:pdfbox:3.0.3")
    implementation("org.apache.poi:poi-ooxml:5.3.0")

    // Lambda adapter: feeds API Gateway events into the Spring web stack with no
    // running web server (replaces the Lambda Web Adapter). The generic handler
    // SpringDelegatingLambdaContainerHandler boots the app named by MAIN_CLASS and
    // auto-detects the payload format (we use API Gateway HTTP API v2). Building the
    // context in the Lambda init phase is what SnapStart snapshots.
    implementation("com.amazonaws.serverless:aws-serverless-java-container-springboot3:2.1.5")

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
    // The generic Lambda handler resolves the Spring app from MAIN_CLASS; set it so
    // LambdaHandlerTest can exercise the real handler path in-process.
    environment("MAIN_CLASS", "com.rabbitrole.RabbitroleApplication")
}

// Lambda zip (java21 managed runtime): app classes/resources at the root, every
// runtime dependency under lib/. This deps-in-lib layout keeps each jar intact, so
// Spring Boot's per-jar autoconfiguration metadata is discovered normally — unlike a
// shaded uber-jar, which would need fragile META-INF merging. CI uploads this zip.
tasks.register<Zip>("lambdaZip") {
    archiveFileName.set("app.zip")
    destinationDirectory.set(layout.buildDirectory.dir("dist"))
    from(sourceSets.main.get().output) // compiled classes + resources at zip root
    into("lib") {
        // productionRuntimeClasspath = runtimeClasspath minus developmentOnly, so the
        // local-only Tomcat + devtools are excluded (same set bootJar would ship).
        from(configurations.productionRuntimeClasspath)
    }
}

tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    // Run from the repo root so spring-dotenv finds the root .env (its default
    // lookup is ./.env in the working dir). Prod/Lambda use real env vars, not .env.
    workingDir = rootProject.projectDir.parentFile
    // Stay lenient if .env is absent (CI/prod inject real env vars instead).
    jvmArgs("-DDOTENV_FAIL_ON_ERROR=false")
}
