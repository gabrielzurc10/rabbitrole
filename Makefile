# rabbitrole — infra & deploy convenience targets.
#
# Secrets live in .env at the repo root (gitignored) and are mapped to the
# TF_VAR_* names Terraform expects, so `make plan-dev` / `make deploy-dev`
# work without copying a tfvars file. Run all targets from the repo root.
#
# FIRST-TIME DEPLOY ORDER (see DEPLOY.md): the Lambda is a container image and
# AWS won't create it until an image exists in ECR. So the first deploy is:
#   make bootstrap          # one-time: state bucket + lock table + CI user
#   make init-dev
#   make ecr-dev            # create just the ECR repo
#   make image-dev          # build + push the backend image
#   make deploy-dev         # full apply (Lambda now finds the image)
#   make frontend-dev       # build the site with TF outputs + sync to S3
# Routine redeploys are just: make image-dev && make deploy-dev && make frontend-dev

SHELL    := /bin/bash
ROOT     := $(CURDIR)
REGION   ?= us-east-1
ENV_FILE := .env
BOOTSTRAP := infra/bootstrap
DEV      := infra/environments/dev
PROD     := infra/environments/prod

# Source .env and re-export the app secrets under their TF_VAR_* names.
# Single line on purpose: make runs each recipe line in its own shell.
TF_ENV = set -a; [ -f $(ENV_FILE) ] && . ./$(ENV_FILE); set +a; export TF_VAR_openai_api_key="$$OPENAI_API_KEY" TF_VAR_adzuna_app_id="$$ADZUNA_APP_ID" TF_VAR_adzuna_app_key="$$ADZUNA_APP_KEY" TF_VAR_budget_notify_email="$${BUDGET_NOTIFY_EMAIL:-}" TF_VAR_google_client_id="$${GOOGLE_CLIENT_ID:-}" TF_VAR_google_client_secret="$${GOOGLE_CLIENT_SECRET:-}";

.PHONY: help bootstrap \
        init-dev validate-dev plan-dev ecr-dev deploy-dev image-dev frontend-dev destroy-dev \
        init-prod validate-prod plan-prod ecr-prod deploy-prod image-prod frontend-prod destroy-prod

help:
	@echo "rabbitrole infra targets (run from repo root):"
	@echo "  bootstrap     create remote-state bucket + lock table + CI user (one-time)"
	@echo "  init-<env>      terraform init"
	@echo "  validate-<env>  terraform validate"
	@echo "  plan-<env>      terraform plan"
	@echo "  ecr-<env>       apply ONLY the ECR repo (needed before the first image push)"
	@echo "  image-<env>     build + push the backend container image to ECR"
	@echo "  deploy-<env>    terraform apply (full stack)"
	@echo "  frontend-<env>  build the site with TF outputs, sync to S3, invalidate CDN"
	@echo "  destroy-<env>   terraform destroy -> ~\$$0"
	@echo "  (<env> = dev|prod). First-time order is documented in DEPLOY.md."

# ---- bootstrap (persistent, local state) ----
bootstrap:
	cd $(BOOTSTRAP) && terraform init && terraform apply

# ---- dev ----
init-dev:
	cd $(DEV) && terraform init

validate-dev:
	cd $(DEV) && terraform validate

plan-dev:
	@$(TF_ENV) cd $(DEV) && terraform plan

ecr-dev:
	@$(TF_ENV) cd $(DEV) && terraform apply -target=module.rabbitrole.aws_ecr_repository.backend

deploy-dev:
	@$(TF_ENV) cd $(DEV) && terraform apply

image-dev:
	@$(call build_push_image,$(DEV),rabbitrole-dev-backend)

frontend-dev:
	@$(call build_sync_frontend,$(DEV))

destroy-dev:
	@$(TF_ENV) cd $(DEV) && terraform destroy

# ---- prod ----
init-prod:
	cd $(PROD) && terraform init

validate-prod:
	cd $(PROD) && terraform validate

plan-prod:
	@$(TF_ENV) cd $(PROD) && terraform plan

ecr-prod:
	@$(TF_ENV) cd $(PROD) && terraform apply -target=module.rabbitrole.aws_ecr_repository.backend

deploy-prod:
	@$(TF_ENV) cd $(PROD) && terraform apply

image-prod:
	@$(call build_push_image,$(PROD),rabbitrole-prod-backend)

frontend-prod:
	@$(call build_sync_frontend,$(PROD))

destroy-prod:
	@$(TF_ENV) cd $(PROD) && terraform destroy

# ---- reusable recipes ------------------------------------------------------
# $(1) = terraform env dir, $(2) = lambda function name.
# Build the backend image, push :latest, and refresh the Lambda if it exists.
define build_push_image
	cd $(1) && \
	  REPO=$$(terraform output -raw ecr_repository_url) && \
	  REGISTRY=$${REPO%%/*} && \
	  aws ecr get-login-password --region $(REGION) | docker login --username AWS --password-stdin $$REGISTRY && \
	  docker build --platform linux/amd64 -t $$REPO:latest $(ROOT)/backend && \
	  docker push $$REPO:latest && \
	  ( aws lambda update-function-code --region $(REGION) --function-name $(2) --image-uri $$REPO:latest >/dev/null 2>&1 \
	      && echo "Refreshed Lambda $(2)" \
	      || echo "Lambda $(2) not created yet — image is in ECR, ready for 'make deploy'." )
endef

# $(1) = terraform env dir. Build the static site with the env's TF outputs,
# sync to its frontend bucket, and invalidate CloudFront.
define build_sync_frontend
	cd $(1) && \
	  API=$$(terraform output -raw api_url) && \
	  DOMAIN=$$(terraform output -raw cognito_hosted_ui_domain) && \
	  CLIENT=$$(terraform output -raw cognito_client_id) && \
	  BUCKET=$$(terraform output -raw frontend_bucket) && \
	  DIST=$$(terraform output -raw cloudfront_distribution_id) && \
	  cd $(ROOT)/frontend && \
	  NEXT_PUBLIC_API_URL=$$API NEXT_PUBLIC_COGNITO_DOMAIN=$$DOMAIN NEXT_PUBLIC_COGNITO_CLIENT_ID=$$CLIENT npm run build && \
	  aws s3 sync out/ s3://$$BUCKET/ --delete && \
	  aws cloudfront create-invalidation --distribution-id $$DIST --paths '/*' >/dev/null && \
	  echo "Frontend deployed to s3://$$BUCKET and CDN invalidated."
endef
