# infra — rabbitrole Terraform

Three stacks:

| Stack | State | Purpose |
|-------|-------|---------|
| `bootstrap/` | **local** | One-time: state bucket, lock table, CI IAM user. Persistent. |
| `modules/rabbitrole/` | — | All app resources, parameterized by env. |
| `environments/{dev,prod}/` | **remote (S3)** | Compose the module per env. |

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
export TF_VAR_adzuna_app_id=...
export TF_VAR_adzuna_app_key=...
terraform init
terraform validate
terraform plan        # review; apply only when ready
```

## Teardown / cost control

```bash
cd infra/environments/dev && terraform destroy   # -> ~$0/mo
```

App buckets use `force_destroy` and ECR uses `force_delete`, so destroy is clean
(⚠️ permanently deletes uploaded resumes + the static site — fine for a portfolio).
`bootstrap/` is intentionally **excluded** so destroy/recreate keeps working (~$0.01/mo).

## Notes

- **Lambda stays out of the VPC** and reaches Aurora via the **RDS Data API**, so
  there's no NAT Gateway (~$32/mo saved). The VPC exists only to host the cluster.
- Aurora Serverless v2 with `min_capacity = 0` **auto-pauses to $0** when idle.
- Secrets live in **SSM Parameter Store**, passed in via `TF_VAR_*`.
- `lambda_function.image_uri` is `ignore_changes`d — CI updates the image
  out-of-band (Phase 6), so Terraform won't fight the deploy.
