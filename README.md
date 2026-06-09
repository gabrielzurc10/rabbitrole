# rabbitrole

**An AI resume reviewer and job matcher.** Upload a resume, pick the roles you're targeting, and get
prioritized, explained feedback on what to fix, then a list of *live* job postings ranked by how well
your resume actually fits them.

## The problem

Applying for jobs is a guessing game. Resume tools hand you a generic "ATS score" with no sense of the
role you're chasing, advice you can't act on, and feedback disconnected from the postings you're
actually competing for. Tailoring a resume per role, and figuring out which openings are even worth
applying to, is slow, manual, and unrewarding.

## The outcome

rabbitrole closes that loop in one place:

- **Targeted, explained critique.** The resume is scored against your **primary role** and returned as
  interactive tags grouped by severity (**critical**, **warning**, **optional**), each with *why it
  matters* and a *concrete suggested replacement*. No opaque score; every point is actionable.
- **Grounded in the real market.** The critique is **RAG grounded in live job postings** for your role,
  so suggestions reflect what employers are *currently* asking for, not generic best practices.
- **Jobs ranked by fit.** Your resume is embedded and matched against live postings via cosine
  similarity, each shown with a **match %** and an on-demand "why this match?" explanation.
- **Tweak and rerun.** Change your primary role from the review or the job filter and the resume is
  reanalyzed against it automatically, so the score and feedback follow.

### How it flows

```
 ┌─────────┐   ┌────────────┐   ┌─────────┐   ┌────────┐   ┌──────────────┐
 │ Sign in │──▶│ Onboarding │──▶│ Analyze │──▶│ Review │──▶│ Matched jobs │
 └─────────┘   └────────────┘   └─────────┘   └────────┘   └──────────────┘
```

- **Sign in:** Cognito, with Google or a passwordless email code.
- **Onboarding:** name, resume upload, target roles, and search preferences.
- **Analyze:** extract the text, embed it, score it against the primary role, and write the RAG critique.
- **Review:** severity tags (critical, warning, optional) plus the score for that role.
- **Matched jobs:** live postings, each with a cosine match % and a "why this match?" on demand.

## Architecture

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js (static export), React, TypeScript, Tailwind. Hosted on **S3 + CloudFront**. |
| **Backend** | Java 21, Spring Boot 3 (Gradle Kotlin DSL). Packaged as a **container image AWS Lambda** (via the Lambda Web Adapter), fronted by **API Gateway**. |
| **AI** | OpenAI `gpt-4o-mini` (analysis), `text-embedding-3-small` (matching and RAG). |
| **RAG** | Resume critique grounded in live job postings for the target role. |
| **Database** | **DynamoDB** (on demand) via the AWS SDK. Always warm, no VPC. |
| **Object storage** | **S3** for uploaded resumes, with presigned access. |
| **Auth** | **Amazon Cognito**. Google sign in and passwordless email codes, with cross provider account linking. |
| **Jobs** | **JSearch** (OpenWeb Ninja direct API). Aggregates Google for Jobs; direct apply links and employer logos. |
| **Infra** | **Terraform** (single environment), secrets in **SSM Parameter Store**. |
| **CI/CD** | **GitHub Actions**. Build and test on PRs, deploy on push to `main`. |

```
                 Browser
                    │
                    ▼
        ┌──────────────────────┐
        │   CloudFront  +  S3  │ static Next.js export, cached at the edge
        └──────────┬───────────┘
                   │ API request + Cognito JWT
                   ▼
 ┌────────────┐   ┌──────────────────────┐
 │  Cognito   │◀─▶│      API Gateway     │
 └────────────┘   └──────────┬───────────┘
  sign in / JWT              │
                             ▼
                  ┌──────────────────────┐      ┌────────────────────────┐
                  │       Lambda         │ ───▶ │ OpenAI  (LLM + embeds) │
                  │ Spring Boot container│ ───▶ │ JSearch (live postings)│
                  └──────────┬───────────┘      └────────────────────────┘
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
      ┌────────────┐  ┌────────────┐  ┌────────────┐
      │  DynamoDB  │  │     S3     │  │    SSM     │
      │ profiles,  │  │  resume    │  │  secrets   │
      │ resumes,   │  │  files     │  │            │
      │ analyses   │  └────────────┘  └────────────┘
      └────────────┘
```

## Engineering decisions

The interesting part isn't the feature list. It's the constraints these choices resolve.

### Spring Boot on Lambda via the Lambda Web Adapter

The backend runs as an **unmodified web server**, with no Lambda specific handler. The Web Adapter
translates API Gateway events to and from HTTP, so the same image runs locally (`./gradlew bootRun`)
and in production. The trade off is **no SnapStart** (it ships as a zip), so a cold start after idle
pays Spring's full startup. That is *mitigated, not hidden*: a 2 GB memory size (more CPU during init)
plus a frontend ping to `/healthz` fired from the landing and login pages, so the container wakes while
the user is reading or typing, and their first real request lands warm.

### DynamoDB, on demand, and no VPC

Every data access is a **key lookup** (get by id, query by user GSI), which DynamoDB serves in single
digit milliseconds. Because it is a VPC free AWS API, the Lambda reaches the database **and** the public
internet (OpenAI, JSearch) with **no NAT Gateway and no VPC** at all, removing a major source of cost
and cold start latency. On demand billing means **no idle baseline** and **no auto pause resume
penalty** on the first request, so the stack idles at near zero and stays instantly responsive.

### A static export frontend, not a Node server

The UI ships as prerendered HTML and JS to S3 and CloudFront, so there is **no server to run, patch, or
scale**, with global edge caching and a cheap, fast site. State and auth are handled client side: silent
token refresh, and a back/forward cache auth guard so signing out can't be reached with the Back button.
A **demo mode** runs the entire UI locally with no AWS at all.

### RAG that grounds critique in the live market

Matching and critique share one embedding model. The resume review isn't generic: the relevant **live
postings for the target role are retrieved and fed as context**, so the model critiques against what is
actually being asked for right now.

### Cognito for auth, JSearch for jobs, used deliberately

Auth is **passwordless** (email one time codes) plus Google, with a Cognito pre sign up trigger that
**links the same email across providers**, so users never end up with split accounts. Jobs come from
JSearch's **direct OpenWeb Ninja API** (not the RapidAPI gateway), filtered only on **native** fields
(a single remote toggle, employment type, city level location), with no brittle LLM classification in
the hot path.

### Swap points, on purpose

OpenAI access is centralized behind a small client, so the model provider is a **single swap point** (for
example, Bedrock). The backend is organized by feature (`resume`, `analysis`, `jobs`) with thin
controllers, services, and repositories, so each concern stays replaceable.

## Repository layout

```
rabbitrole/
├── frontend/   # Next.js app (static export to S3 + CloudFront)
├── backend/    # Spring Boot service (container image Lambda)
├── infra/      # Terraform (bootstrap + single environment)
└── .github/    # CI (PR gate) + deploy (push to main)
```

## Running locally

```bash
# Frontend: runs in demo mode, no AWS needed
cd frontend && npm install && npm run dev      # http://localhost:3000

# Backend
cd backend && ./gradlew bootRun                # http://localhost:8080
```

## Deploying

The whole stack is Terraform plus a container image Lambda, driven by `make` from the repo root
(`make bootstrap` once, then `make deploy`, `make frontend`, `make image`). GitHub Actions ships it
automatically on push to `main`. Tear down to ~$0 with `make destroy`.

## What you'll need

- An AWS account, the AWS CLI, Docker, Terraform 1.5+, Node 20+, and JDK 21
- An **OpenAI** API key
- A **JSearch** API key (OpenWeb Ninja, an `ak_…` key)
- A **Google OAuth 2.0** client for Google sign in (optional; passwordless email works without it)
