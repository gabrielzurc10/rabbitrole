package com.rabbitrole;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.amazonaws.services.lambda.runtime.ClientContext;
import com.amazonaws.services.lambda.runtime.CognitoIdentity;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.serverless.proxy.spring.SpringDelegatingLambdaContainerHandler;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/**
 * Exercises the real Lambda entrypoint that replaces the Lambda Web Adapter: an API
 * Gateway HTTP API v2 event is fed to {@link SpringDelegatingLambdaContainerHandler}
 * (the handler configured on the deployed function), which boots the Spring app named
 * by the MAIN_CLASS env var (set on the test task in build.gradle.kts) and routes the
 * request to the controllers. No web server, no AWS — runs under the default (local)
 * profile, so security is permit-all and no SSM/Cognito calls happen.
 */
class LambdaHandlerTest {

  // Minimal HTTP API v2 (payload format 2.0) event for `GET /healthz`.
  private static final String HEALTHZ_EVENT =
      """
      {"version":"2.0","routeKey":"GET /healthz","rawPath":"/healthz","rawQueryString":"",
       "headers":{"accept":"*/*"},
       "requestContext":{"accountId":"123456789012","apiId":"api","domainName":"api.example.com",
        "domainPrefix":"api","stage":"$default","requestId":"id","time":"01/Jan/2026:00:00:00 +0000",
        "timeEpoch":1767225600000,
        "http":{"method":"GET","path":"/healthz","protocol":"HTTP/1.1","sourceIp":"127.0.0.1","userAgent":"junit"}},
       "isBase64Encoded":false}
      """;

  @Test
  void healthzReturns200ThroughLambdaHandler() throws Exception {
    var handler = new SpringDelegatingLambdaContainerHandler();
    var in = new ByteArrayInputStream(HEALTHZ_EVENT.getBytes(StandardCharsets.UTF_8));
    var out = new ByteArrayOutputStream();

    handler.handleRequest(in, out, new TestContext());

    String response = out.toString(StandardCharsets.UTF_8);
    assertTrue(response.contains("\"statusCode\":200"), "expected 200, got: " + response);
    assertTrue(response.contains("ok"), "expected health body, got: " + response);
  }

  /** Minimal no-op Lambda Context for the in-process invocation. */
  private static final class TestContext implements Context {
    public String getAwsRequestId() {
      return "test-request";
    }

    public String getLogGroupName() {
      return null;
    }

    public String getLogStreamName() {
      return null;
    }

    public String getFunctionName() {
      return "rabbitrole-backend";
    }

    public String getFunctionVersion() {
      return "$LATEST";
    }

    public String getInvokedFunctionArn() {
      return null;
    }

    public CognitoIdentity getIdentity() {
      return null;
    }

    public ClientContext getClientContext() {
      return null;
    }

    public int getRemainingTimeInMillis() {
      return 30_000;
    }

    public int getMemoryLimitInMB() {
      return 2048;
    }

    public LambdaLogger getLogger() {
      return new LambdaLogger() {
        public void log(String message) {}

        public void log(byte[] message) {}
      };
    }
  }
}
