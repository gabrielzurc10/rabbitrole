# Keep one backend instance warm. The analyze call (JSearch + OpenAI) is slow, and
# on a cold start Spring Boot's ~10-15s boot pushes it past API Gateway's hard 30s
# ceiling — the request is killed mid-flight and the analysis never persists. An
# EventBridge schedule pings /healthz every 5 minutes so the JVM is already up when a
# real request lands. Cost is negligible: Lambda only bills while running, and a
# /healthz hit is milliseconds.

resource "aws_cloudwatch_event_rule" "warm" {
  name                = "${local.name}-warm"
  description         = "Ping the backend /healthz to keep it warm (avoids cold-start timeouts on analyze)"
  schedule_expression = "rate(5 minutes)"
  tags                = local.tags
}

resource "aws_cloudwatch_event_target" "warm" {
  rule      = aws_cloudwatch_event_rule.warm.name
  target_id = "backend-healthz"
  arn       = aws_lambda_function.backend.arn

  # The Lambda Web Adapter turns an API Gateway v2 event into a local HTTP call, so
  # hand it a constant GET /healthz event (a raw scheduled event wouldn't route).
  input = jsonencode({
    version = "2.0"
    rawPath = "/healthz"
    headers = { host = "warmup" }
    requestContext = {
      http = { method = "GET", path = "/healthz" }
    }
    isBase64Encoded = false
  })
}

resource "aws_lambda_permission" "warm" {
  statement_id  = "AllowEventBridgeWarm"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.warm.arn
}
