# Monthly cost guardrail. Only created when an email is provided (prod), so a
# bare `dev` plan doesn't require one.

resource "aws_budgets_budget" "monthly" {
  count = var.budget_notify_email == "" ? 0 : 1

  name         = "${local.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_limit_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_notify_email]
  }
}
