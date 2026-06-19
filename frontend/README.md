# frontend — rabbitrole

The rabbitrole web app: a **Next.js (App Router) static export** in TypeScript + Tailwind,
served from S3 + CloudFront (no Node server at runtime). For the conventions (semantic component
classes, file-based icons, theming) see [`CLAUDE.md`](./CLAUDE.md); for the overall system
architecture see the repo-root [`CLAUDE.md`](../CLAUDE.md).

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export → ./out
npm run lint     # eslint
```

With no Cognito env vars set, the app runs in **demo mode** — sign-in just routes into the app and
there's no real auth or bearer token — so you can develop the whole UI without AWS. (You still walk
through the email-code screen; any code is accepted.)

The configured (real-auth) build reads these env vars, injected by `make frontend` / CI from the
Terraform outputs:

- `NEXT_PUBLIC_API_URL` — backend base URL
- `NEXT_PUBLIC_COGNITO_DOMAIN` — Hosted UI domain
- `NEXT_PUBLIC_COGNITO_CLIENT_ID` — app client id
- `NEXT_PUBLIC_COGNITO_REGION` — AWS region

## Build & deploy

Static export only (`output: "export"`, `images.unoptimized` — see `next.config.ts`). It is **not**
deployed on Vercel. The production build + S3 sync + CloudFront invalidation are driven from the repo
root:

```bash
make frontend    # build with live infra outputs, sync to S3, invalidate the CDN
```

CI ships it automatically on push to `main` (`.github/workflows/deploy.yml`). See the repo-root
[`DEPLOY.md`](../DEPLOY.md) for the full flow.
