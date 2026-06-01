# rabbitrole — infra & deploy convenience targets.
#
# Secrets live in .env at the repo root (gitignored) and are mapped to the
# TF_VAR_* names Terraform expects, so `make plan-dev` / `make deploy-dev`
# work without copying a tfvars file. Run all targets from the repo root.
#
# NOTE: the first `deploy-*` (terraform apply) needs a backend image already in
# ECR (the Lambda points at `<repo>:latest`). Pushing that image is Phase 6.

SHELL    := /bin/bash
ENV_FILE := .env
DEV      := infra/environments/dev
PROD     := infra/environments/prod

# Source .env and re-export the three app secrets under their TF_VAR_* names.
# Single line on purpose: make runs each recipe line in its own shell.
TF_ENV = set -a; [ -f $(ENV_FILE) ] && . ./$(ENV_FILE); set +a; export TF_VAR_openai_api_key="$$OPENAI_API_KEY" TF_VAR_adzuna_app_id="$$ADZUNA_APP_ID" TF_VAR_adzuna_app_key="$$ADZUNA_APP_KEY" TF_VAR_budget_notify_email="$${BUDGET_NOTIFY_EMAIL:-}";

.PHONY: help \
        init-dev validate-dev plan-dev deploy-dev destroy-dev \
        init-prod validate-prod plan-prod deploy-prod destroy-prod

help:
	@echo "rabbitrole infra targets (run from repo root):"
	@echo "  init-dev      terraform init        (dev)"
	@echo "  validate-dev  terraform validate    (dev)"
	@echo "  plan-dev      terraform plan         (dev)"
	@echo "  deploy-dev    terraform apply        (dev)"
	@echo "  destroy-dev   terraform destroy -> ~\$$0 (dev)"
	@echo "  *-prod        same targets for the prod environment"

# ---- dev ----
init-dev:
	cd $(DEV) && terraform init

validate-dev:
	cd $(DEV) && terraform validate

plan-dev:
	@$(TF_ENV) cd $(DEV) && terraform plan

deploy-dev:
	@$(TF_ENV) cd $(DEV) && terraform apply

destroy-dev:
	@$(TF_ENV) cd $(DEV) && terraform destroy

# ---- prod ----
init-prod:
	cd $(PROD) && terraform init

validate-prod:
	cd $(PROD) && terraform validate

plan-prod:
	@$(TF_ENV) cd $(PROD) && terraform plan

deploy-prod:
	@$(TF_ENV) cd $(PROD) && terraform apply

destroy-prod:
	@$(TF_ENV) cd $(PROD) && terraform destroy
