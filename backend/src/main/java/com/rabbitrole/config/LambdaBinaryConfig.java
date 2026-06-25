package com.rabbitrole.config;

import com.amazonaws.serverless.proxy.internal.LambdaContainerHandler;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * On Lambda the app runs inside aws-serverless-java-container, which only returns
 * a response as real binary (base64-encoded, {@code isBase64Encoded=true}) when its
 * content type is registered as binary — otherwise it serializes the byte[] body as
 * a UTF-8 string and the browser receives mangled bytes (e.g. a PDF shown as raw
 * {@code %PDF-1.4 …} text). The default binary set is only octet-stream + a few
 * image types, so resume downloads ({@code /api/resumes/{id}/file}) break in the
 * deployed env while working locally under bootRun (which serves the bytes directly).
 *
 * <p>Registering the resume content types here — during context init, which is part
 * of the SnapStart snapshot — makes the container base64-encode them for every
 * request. {@code getContainerConfig()} is a shared static, so this affects the
 * handler that serves responses. Only needed on the {@code aws} profile.
 */
@Configuration
@Profile("aws")
public class LambdaBinaryConfig {

    @PostConstruct
    void registerBinaryContentTypes() {
        LambdaContainerHandler.getContainerConfig().addBinaryContentTypes(
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    }
}
