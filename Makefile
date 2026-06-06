# rabbitrole — infra & deploy convenience targets (single environment).
#
# Secrets live in .env at the repo root (gitignored) and are mapped to the
# TF_VAR_* names Terraform expects, so `make deploy` works without a tfvars
# file. Run all targets from the repo root.
#
# FIRST-TIME DEPLOY ORDER (see DEPLOY.md): the Lambda is a container image and
# AWS won't create it until an image exists in ECR. So the first deploy is:
#   make bootstrap   # one-time: state bucket + lock table + CI user
#   make init
#   make ecr         # create just the ECR repo
#   make image       # build + push the backend image
#   make deploy      # full apply (Lambda now finds the image)
#   make frontend    # build the site with TF outputs + sync to S3
# Routine redeploys are just: make image && make deploy && make frontend

SHELL     := /bin/bash
ROOT      := $(CURDIR)
REGION    ?= us-east-1
ENV_FILE  := .env
BOOTSTRAP := infra/bootstrap
ENV       := infra/environments/dev
LAMBDA    := rabbitrole-dev-backend

# Source .env and re-export the app secrets under their TF_VAR_* names.
# Single line on purpose: make runs each recipe line in its own shell.
TF_ENV = set -a; [ -f $(ENV_FILE) ] && . ./$(ENV_FILE); set +a; export TF_VAR_openai_api_key="$$OPENAI_API_KEY" TF_VAR_jsearch_api_key="$$JSEARCH_API_KEY" TF_VAR_google_client_id="$${GOOGLE_CLIENT_ID:-}" TF_VAR_google_client_secret="$${GOOGLE_CLIENT_SECRET:-}";

# terraform init with the state bucket derived from the caller's AWS account id,
# so the repo isn't pinned to any one account (the bucket name isn't hardcoded
# in backend.tf). bootstrap must have created it first.
TF_INIT = terraform init -reconfigure -backend-config="bucket=rabbitrole-tfstate-$$(aws sts get-caller-identity --query Account --output text)"

.PHONY: help bootstrap init validate plan ecr deploy image frontend destroy

help:
	@echo "rabbitrole infra targets (run from repo root):"
	@echo "  bootstrap   create remote-state bucket + lock table + CI user (one-time)"
	@echo "  init        terraform init"
	@echo "  validate    terraform validate"
	@echo "  plan        terraform plan"
	@echo "  ecr         apply ONLY the ECR repo (needed before the first image push)"
	@echo "  image       build + push the backend container image to ECR"
	@echo "  deploy      terraform apply (full stack)"
	@echo "  frontend    build the site with TF outputs, sync to S3, invalidate CDN"
	@echo "  destroy     terraform destroy -> ~\$$0"
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

ecr:
	@$(TF_ENV) cd $(ENV) && terraform apply -target=module.rabbitrole.aws_ecr_repository.backend

deploy:
	@$(TF_ENV) cd $(ENV) && terraform apply

image:
	@$(build_push_image)

frontend:
	@$(build_sync_frontend)

destroy:
	@$(TF_ENV) cd $(ENV) && terraform destroy

# ---- reusable recipes ------------------------------------------------------
# Build the backend image and refresh the Lambda if it exists.
# NOTE: --provenance=false is required. Without it, buildx attaches a provenance
# attestation, which makes the pushed artifact a manifest LIST — and Lambda only
# accepts a single image manifest ("media type ... not supported" otherwise).
define build_push_image
	cd $(ENV) && \
	  REPO=$$(terraform output -raw ecr_repository_url) && \
	  REGISTRY=$${REPO%%/*} && \
	  aws ecr get-login-password --region $(REGION) | docker login --username AWS --password-stdin $$REGISTRY && \
	  docker buildx build --provenance=false --platform linux/amd64 -t $$REPO:latest --push $(ROOT)/backend && \
	  ( aws lambda update-function-code --region $(REGION) --function-name $(LAMBDA) --image-uri $$REPO:latest >/dev/null 2>&1 \
	      && echo "Refreshed Lambda $(LAMBDA)" \
	      || echo "Lambda $(LAMBDA) not created yet — image is in ECR, ready for 'make deploy'." )
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
