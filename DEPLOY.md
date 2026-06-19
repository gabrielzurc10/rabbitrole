# Deploying rabbitrole

The whole stack is Terraform + a zip-packaged Lambda on the **Java 21 managed
runtime with SnapStart**. Terraform seeds the function from a placeholder, so the
entire stack comes up in a single apply (no ECR / image chicken-and-egg); the real
backend code ships separately as a zip via `make build-backend`.

All `make` targets run from the repo root. Secrets come from a gitignored
`.env` (mapped to `TF_VAR_*` in the Makefile).

**Account-agnostic:** the repo isn't tied to any one AWS account. The Terraform
state bucket is named `rabbitrole-tfstate-<your-account-id>` — bootstrap derives
it from your account, and `make init` passes it to the backend via
`-backend-config` (so nothing is hardcoded). Clone → set up creds + `.env` →
`make bootstrap` → deploy, against whatever account your credentials point to.

> Running raw `terraform` (not via `make`)? Pass the bucket yourself:
> `terraform init -backend-config="bucket=rabbitrole-tfstate-$(aws sts get-caller-identity --query Account --output text)"`

## Prerequisites

- AWS credentials configured locally (any account; resources land wherever they point).
- A JDK 21 (to build the backend zip via Gradle) and Node 20+ (for the frontend).
  No Docker — the backend ships as a plain zip.
- Repo-root `.env` with at least:
  ```
  OPENAI_API_KEY=...
  JSEARCH_API_KEY=...
  # optional — enables Google sign-in:
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  ```

## One-time: bootstrap

Creates the remote-state S3 bucket, the DynamoDB lock table, and the CI IAM
user. Persistent — it is **not** torn down by `make destroy-*`.

```bash
make bootstrap
```

After it applies, wire CI (Phase 6 GitHub Actions) by copying the outputs into
GitHub repo Secrets:

```bash
cd infra/bootstrap
terraform output ci_access_key_id          # -> AWS_ACCESS_KEY_ID
terraform output -raw ci_secret_access_key # -> AWS_SECRET_ACCESS_KEY
```

## First deploy

```bash
make init           # terraform init against the now-existing S3 backend
make deploy         # full apply — Lambda (placeholder), DynamoDB, API GW, Cognito, S3, CloudFront
make build-backend  # build app.zip, publish a SnapStart version, repoint the live alias
make frontend       # build the site with TF outputs, sync to S3, invalidate CDN
```

`make deploy` prompts for `yes` (standard Terraform apply).
After `deploy`, `terraform output` (in `infra/environments/dev`) shows the live URLs:

- `cloudfront_domain` — the site
- `api_url` — the backend
- `cognito_hosted_ui_domain`, `cognito_client_id` — used automatically by
  `make frontend`

### Google sign-in (optional)

Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env` before `make deploy`,
and add the Hosted-UI redirect URI to the Google OAuth client:
`https://<cognito_hosted_ui_domain>/oauth2/idpresponse`. Without these, the
Google IdP is simply skipped and native email sign-in still works.

## Routine redeploys

```bash
make build-backend  # rebuild app.zip + publish a new SnapStart version + repoint the alias
make deploy         # only if infra changed
make frontend       # only if the site changed
```

`make build-backend` uploads the zip, calls `aws lambda update-function-code
--publish`, and moves the `live` alias — so a code-only backend change doesn't need
a Terraform apply.

## Tear down to ~$0

```bash
make destroy
```

DynamoDB on-demand bills ~$0 when idle, so you can also just leave it up. Destroy
removes everything in the env (buckets use `force_destroy`,
DynamoDB tables drop with their data);
the bootstrap state bucket + lock table persist.
