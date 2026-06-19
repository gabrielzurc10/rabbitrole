# rabbitrole — infra & deploy convenience targets (single environment).
#
# Secrets live in .env at the repo root (gitignored) and are mapped to the
# TF_VAR_* names Terraform expects, so `make deploy` works without a tfvars
# file. Run all targets from the repo root.
#
# FIRST-TIME DEPLOY ORDER (see DEPLOY.md): the zip Lambda is created from a
# placeholder in a single apply (no ECR chicken-and-egg). So the first deploy is:
#   make bootstrap      # one-time: state bucket + lock table + CI user
#   make init
#   make deploy         # full apply (creates the function, alias, artifacts bucket)
#   make build-backend  # build app.zip, publish a SnapStart version, repoint the alias
#   make frontend       # build the site with TF outputs + sync to S3
# Routine redeploys are just: make build-backend && make frontend
# (run `make deploy` only when the Terraform itself changes).

SHELL     := /bin/bash
ROOT      := $(CURDIR)
REGION    ?= us-east-1
ENV_FILE  := .env
BOOTSTRAP := infra/bootstrap
ENV       := infra/environments/dev

# Source .env and re-export the app secrets under their TF_VAR_* names.
# Single line on purpose: make runs each recipe line in its own shell.
TF_ENV = set -a; [ -f $(ENV_FILE) ] && . ./$(ENV_FILE); set +a; export TF_VAR_openai_api_key="$$OPENAI_API_KEY" TF_VAR_jsearch_api_key="$$JSEARCH_API_KEY" TF_VAR_google_client_id="$${GOOGLE_CLIENT_ID:-}" TF_VAR_google_client_secret="$${GOOGLE_CLIENT_SECRET:-}";

# terraform init with the state bucket derived from the caller's AWS account id,
# so the repo isn't pinned to any one account (the bucket name isn't hardcoded
# in backend.tf). bootstrap must have created it first.
TF_INIT = terraform init -reconfigure -backend-config="bucket=rabbitrole-tfstate-$$(aws sts get-caller-identity --query Account --output text)"

.PHONY: help bootstrap init validate plan deploy build-backend frontend destroy

help:
	@echo "rabbitrole infra targets (run from repo root):"
	@echo "  bootstrap     create remote-state bucket + lock table + CI user (one-time)"
	@echo "  init          terraform init"
	@echo "  validate      terraform validate"
	@echo "  plan          terraform plan"
	@echo "  deploy        terraform apply (full stack)"
	@echo "  build-backend build app.zip, publish a SnapStart version, repoint the alias"
	@echo "  frontend      build the site with TF outputs, sync to S3, invalidate CDN"
	@echo "  destroy       terraform destroy -> ~\$$0"
	@echo "  First-time order is documented in DEPLOY.md."

# ---- bootstrap (persistent, local state) ----
bootstrap:
	cd $(BOOTSTRAP) && terraform init && terraform apply

# ---- environment ----
init:
	cd $(ENV) && $(TF_INIT)

validate:
	cd $(ENV) && terraform validate

plan:
	@$(TF_ENV) cd $(ENV) && terraform plan

deploy:
	@$(TF_ENV) cd $(ENV) && terraform apply

build-backend:
	@$(build_backend_zip)

frontend:
	@$(build_sync_frontend)

destroy:
	@$(TF_ENV) cd $(ENV) && terraform destroy

# ---- reusable recipes ------------------------------------------------------
# Build the backend zip (Gradle), upload it to the artifacts bucket, publish a new
# SnapStart-enabled version, and point the live alias at it. Function name + bucket +
# alias come from TF outputs, so this works once `make deploy` has created them.
define build_backend_zip
	cd $(ROOT)/backend && ./gradlew --no-daemon lambdaZip && \
	cd $(ROOT)/$(ENV) && \
	  BUCKET=$$(terraform output -raw artifacts_bucket) && \
	  FUNC=$$(terraform output -raw lambda_function_name) && \
	  ALIAS=$$(terraform output -raw lambda_alias) && \
	  aws s3 cp $(ROOT)/backend/build/dist/app.zip s3://$$BUCKET/backend/app.zip && \
	  VERSION=$$(aws lambda update-function-code --region $(REGION) --function-name $$FUNC --s3-bucket $$BUCKET --s3-key backend/app.zip --publish --query Version --output text) && \
	  aws lambda wait published-version-active --region $(REGION) --function-name $$FUNC --qualifier $$VERSION && \
	  aws lambda update-alias --region $(REGION) --function-name $$FUNC --name $$ALIAS --function-version $$VERSION && \
	  echo "Deployed backend version $$VERSION to alias $$ALIAS."
endef

# Build the static site with the env's TF outputs, sync to its frontend bucket,
# and invalidate CloudFront.
define build_sync_frontend
	cd $(ENV) && \
	  API=$$(terraform output -raw api_url) && \
	  DOMAIN=$$(terraform output -raw cognito_hosted_ui_domain) && \
	  CLIENT=$$(terraform output -raw cognito_client_id) && \
	  BUCKET=$$(terraform output -raw frontend_bucket) && \
	  DIST=$$(terraform output -raw cloudfront_distribution_id) && \
	  cd $(ROOT)/frontend && \
	  NEXT_PUBLIC_API_URL=$$API NEXT_PUBLIC_COGNITO_DOMAIN=$$DOMAIN NEXT_PUBLIC_COGNITO_CLIENT_ID=$$CLIENT NEXT_PUBLIC_COGNITO_REGION=$(REGION) npm run build && \
	  aws s3 sync out/ s3://$$BUCKET/ --delete && \
	  aws cloudfront create-invalidation --distribution-id $$DIST --paths '/*' >/dev/null && \
	  echo "Frontend deployed to s3://$$BUCKET and CDN invalidated."
endef
