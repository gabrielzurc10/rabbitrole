# infra — rabbitrole Terraform

Three stacks:

| Stack | State | Purpose |
|-------|-------|---------|
| `bootstrap/` | **local** | One-time: state bucket, lock table, CI IAM user. Persistent. |
| `modules/rabbitrole/` | — | All app resources. |
| `environments/dev/` | **remote (S3)** | Composes the module — the single environment. |

## First-time setup

```bash
# 1. Bootstrap (creates remote-state backend + CI user). Local state.
cd infra/bootstrap
terraform init && terraform apply
terraform output ci_access_key_id          # -> GitHub Secret AWS_ACCESS_KEY_ID
terraform output -raw ci_secret_access_key # -> GitHub Secret AWS_SECRET_ACCESS_KEY

# 2. Dev environment. Secrets via env vars (never committed):
cd ../environments/dev
export TF_VAR_openai_api_key=sk-...
export TF_VAR_jsearch_api_key=...
terraform init
terraform validate
terraform plan        # review; apply only when ready
```

## Teardown / cost control

```bash
cd infra/environments/dev && terraform destroy   # -> ~$0/mo
```

App buckets use `force_destroy`, so destroy is clean
(⚠️ permanently deletes uploaded resumes + the static site — fine for a portfolio).
`bootstrap/` is intentionally **excluded** so destroy/recreate keeps working (~$0.01/mo).

## Notes

- **Lambda needs no VPC** — it reaches **DynamoDB**, S3, and SSM over AWS's public
  APIs, so there's no NAT Gateway and no VPC at all.
- **DynamoDB** tables (`profiles`, `resumes`, `analyses`) use **on-demand** billing —
  ~$0 idle, always warm (no auto-pause resume penalty).
- Secrets live in **SSM Parameter Store**, passed in via `TF_VAR_*`.
- The backend is a **zip Lambda on `java21` + SnapStart**, seeded from a placeholder;
  CI ships real code out-of-band (`update-function-code` from the artifacts bucket +
  `publish-version`) and repoints the `live` alias, so the function's `filename` is
  `ignore_changes`d and Terraform won't fight the deploy. API Gateway invokes the
  alias so requests hit the SnapStart'd version.
