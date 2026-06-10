# CloudFront in front of the private frontend bucket via Origin Access Control.
# Uses the default *.cloudfront.net domain (no custom ACM cert for the portfolio).

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.name}-frontend-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Static export (trailingSlash) stores pages as <route>/index.html. With an S3
# REST origin (OAC), CloudFront doesn't auto-resolve directory -> index.html, so
# rewrite extensionless/trailing-slash requests here. Without this, deep links
# and the Cognito /login OAuth callback fall back to the landing page.
resource "aws_cloudfront_function" "rewrite_uri" {
  name    = "${local.name}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Redirect www->apex (when on custom domain) + map directory paths to index.html"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      ${local.www_redirect_js}
      var uri = request.uri;
      if (uri.endsWith('/')) {
        request.uri += 'index.html';
      } else if (!uri.includes('.')) {
        request.uri += '/index.html';
      }
      return request;
    }
  EOT
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "${local.name} frontend"
  price_class         = "PriceClass_100" # cheapest: NA + EU edges

  # Serve the site on rabbitrole.com + www when enabled (app_domain.tf), else only
  # the default *.cloudfront.net host.
  aliases = local.app_domain_enabled ? local.app_aliases : []

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "frontend-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    target_origin_id       = "frontend-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    # AWS managed "CachingOptimized" policy.
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    # CSP + HSTS + nosniff + frame-deny (security.tf via response_headers_policy below).
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_uri.arn
    }
  }

  # Static export uses trailingSlash, but SPA-style fallbacks keep deep links working.
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Custom-domain cert (rabbitrole.com + www) when enabled; otherwise the free
  # CloudFront default cert. Exactly one of these blocks renders.
  dynamic "viewer_certificate" {
    for_each = local.app_domain_enabled ? [1] : []
    content {
      acm_certificate_arn      = aws_acm_certificate_validation.app[0].certificate_arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }
  dynamic "viewer_certificate" {
    for_each = local.app_domain_enabled ? [] : [1]
    content {
      cloudfront_default_certificate = true
    }
  }

  tags = local.tags
}

# Let only this CloudFront distribution read the private frontend bucket.
data "aws_iam_policy_document" "frontend_oac" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_oac.json
}
