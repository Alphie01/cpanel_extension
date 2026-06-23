Project Role

You are working inside the Relation AI Extension Module Repository.

This repository is used to develop tenant-specific extension modules for the Relation AI platform.

An extension module may include:

* frontend routes
* backend APIs
* workers
* Prisma schema extensions
* migrations
* seed data
* Docker services
* Python services
* TypeScript/JavaScript services
* scheduled jobs
* configuration files
* tenant-specific business logic

This repository is not a standalone SaaS product.

It is an extension package that must be safely installable, deployable, migratable, and removable from the main Relation AI platform.

⸻

Core Principle

Every extension must be:

* tenant-aware
* permission-aware
* migration-safe
* container-safe
* observable
* reversible
* secure by default
* compatible with the Relation AI extension platform

Never build features as if they are globally available to all tenants.

An extension only works for tenants explicitly assigned by the Platform Admin.

⸻

Relation AI Platform Context

Relation AI is a multi-tenant SaaS platform with:

* platform admin panel
* tenant-specific databases or schemas
* Prisma/PostgreSQL
* JWT authentication
* plan and entitlement system
* wallet/credit system
* CRM
* AI sales assistant
* email automation
* Google Places enrichment
* Apollo enrichment
* Python research workers
* proposal automation
* financial operations
* voice AI / Supsis AI
* audit logging
* Docker-based deployment

Extensions must integrate into this ecosystem without breaking tenant isolation or core platform behavior.

⸻

Non-Negotiable Rules

1. Never Break Tenant Isolation

Every database query, API action, job, file operation, or background process must be scoped to the correct tenant.

Never assume a global tenant.

Never access another tenant’s data.

Never use shared state without tenant scoping.

Required tenant context:

tenantId
userId
permissions
extensionSlug

For background jobs:

tenantId
extensionId
jobId

⸻

2. Never Write Directly to Core Tables Without Approval

Extension code must not modify Relation AI core tables unless the extension contract explicitly allows it.

Allowed:

* extension-owned tables
* extension settings tables
* approved integration events
* approved API service calls

Not allowed:

* direct unsafe writes to core CRM
* direct unsafe writes to wallet
* direct unsafe writes to tenant auth
* direct unsafe writes to platform admin tables

Use official platform services or extension APIs where available.

⸻

3. Always Use Extension-Owned Namespaces

All database tables, models, API routes, permissions, environment variables, jobs, and Docker services must be namespaced.

Examples:

ext_my_module_*
/api/extensions/my-module/*
my_module.view
my_module.edit
MY_MODULE_API_KEY
my-module-worker

Avoid generic names such as:

settings
jobs
users
tasks
sync
worker

⸻

4. Always Provide a Manifest

Every extension must include:

extension.manifest.json

This file defines how the Relation AI platform installs, validates, migrates, runs, and displays the extension.

The manifest must be complete and valid.

⸻

Required Repository Structure

Use this structure unless the module has a documented reason not to:

.
├── CLAUDE.md
├── README.md
├── extension.manifest.json
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.extension.yml
├── prisma/
│   ├── extension.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── backend/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── dto/
│   │   ├── validators/
│   │   ├── jobs/
│   │   └── utils/
│   ├── frontend/
│   │   ├── routes/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types/
│   ├── shared/
│   │   ├── types/
│   │   ├── schemas/
│   │   └── constants/
│   └── workers/
├── scripts/
│   ├── validate-manifest.ts
│   ├── migrate.ts
│   ├── seed.ts
│   ├── build.ts
│   └── healthcheck.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── security/
└── docs/
    ├── installation.md
    ├── configuration.md
    ├── migration.md
    └── rollback.md

If the extension is Python-based:

python/
├── pyproject.toml
├── requirements.txt
├── src/
├── tests/
└── Dockerfile

⸻

Manifest Standard

Every extension must define an extension.manifest.json.

Example:

{
  "name": "custom-module",
  "displayName": "Custom Module",
  "slug": "custom-module",
  "version": "1.0.0",
  "description": "Tenant-specific extension module for Relation AI.",
  "moduleType": "tenant_extension",
  "runtime": "node",
  "language": "typescript",
  "trustLevel": "verified",
  "frontend": {
    "enabled": true,
    "routes": [
      {
        "path": "/dashboard/extensions/custom-module",
        "label": "Custom Module",
        "icon": "Puzzle",
        "requiredPermissions": ["custom_module.view"]
      }
    ]
  },
  "backend": {
    "enabled": true,
    "apiPrefix": "/api/extensions/custom-module",
    "entrypoint": "src/backend/index.ts"
  },
  "database": {
    "enabled": true,
    "prismaSchema": "prisma/extension.prisma",
    "migrationsPath": "prisma/migrations",
    "seed": "prisma/seed.ts",
    "tablePrefix": "ext_custom_module_"
  },
  "docker": {
    "enabled": true,
    "dockerfile": "Dockerfile",
    "serviceName": "custom-module-worker",
    "healthcheck": "/health"
  },
  "permissions": [
    "custom_module.view",
    "custom_module.create",
    "custom_module.edit",
    "custom_module.delete"
  ],
  "env": [
    {
      "name": "CUSTOM_MODULE_API_KEY",
      "required": false,
      "secret": true
    }
  ],
  "jobs": [
    {
      "name": "custom-module-sync",
      "schedule": "0 3 * * *",
      "entrypoint": "src/workers/sync.ts"
    }
  ]
}

Rules:

* slug must be stable and URL-safe.
* version must follow semantic versioning.
* permissions must be namespaced.
* env secrets must never be exposed to frontend.
* apiPrefix must stay under /api/extensions/{slug}.
* table names must use the configured prefix.

⸻

Database & Prisma Rules

Extension Schema

Use:

prisma/extension.prisma

Do not modify the core platform schema directly from this repo.

Extension tables must use clear prefixes:

model ExtCustomModuleRecord {
  id        String   @id @default(cuid())
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("ext_custom_module_records")
}

Every tenant-owned extension table must include:

tenantId String
createdAt DateTime
updatedAt DateTime

Recommended fields:

createdById String?
updatedById String?
deletedAt DateTime?
metadata Json?

⸻

Migration Rules

Migrations must be:

* safe
* reversible where possible
* tenant-scoped
* non-destructive by default
* reviewed before production

Do not write migrations that:

* drop columns without fallback
* drop tables without explicit confirmation
* rename tables without data migration
* mutate core tables unexpectedly
* assume a single tenant database

Migration scripts must support:

npm run migrate -- --tenantId=<tenantId>
npm run migrate:all-assigned

⸻

Seed Rules

Seeds must be idempotent.

Running seed twice must not create duplicates.

Use stable keys/slugs.

Bad:

await prisma.item.create({ data: { name: "Default" } })

Good:

await prisma.item.upsert({
  where: { slug: "default" },
  update: {},
  create: { slug: "default", name: "Default" }
})

⸻

Backend Standards

Use TypeScript for backend modules unless the extension is explicitly Python-based.

Required standards:

* strict TypeScript
* service/controller/repository separation
* DTO validation
* Zod validation preferred
* typed responses
* no untyped any unless justified
* no business logic inside route files
* no direct SQL unless necessary and reviewed
* consistent error format
* structured logging
* audit events for important actions

⸻

Backend Layering

Use this pattern:

route → controller → service → repository

Responsibilities:

Routes

* define endpoints
* attach auth middleware
* attach permission middleware
* attach tenant context middleware

Controllers

* parse request
* call service
* return response

Services

* business logic
* validation coordination
* workflow orchestration
* audit logging

Repositories

* database access only
* no business decisions

⸻

API Route Rules

All APIs must live under:

/api/extensions/{extensionSlug}

Every API must check:

* authenticated user
* tenant context
* extension enabled for tenant
* required permission
* input validation

Never expose APIs globally without extension entitlement checks.

⸻

Error Format

Return errors consistently:

{
  "error": {
    "code": "EXTENSION_ERROR_CODE",
    "message": "Human-readable error message.",
    "details": {}
  }
}

Do not leak secrets, connection URLs, stack traces, or internal paths.

⸻

Frontend Standards

Extension frontend must integrate cleanly into Relation AI dashboard.

Do not create a disconnected UI.

Use the platform design system where available.

Frontend must support:

* loading states
* empty states
* error states
* permission states
* disabled states
* responsive layout
* audit-friendly actions
* clear user feedback

Do not hardcode tenant data.

Do not hardcode API URLs.

Do not use random colors.

Do not create generic admin template UI.

⸻

Frontend Route Rules

All extension frontend routes must be declared in the manifest.

Example:

/dashboard/extensions/custom-module

Navigation must be dynamic and permission-aware.

A user may only see extension menu items if:

* tenant has extension active
* user has required permission

⸻

UI Quality Bar

The UI must feel like part of Relation AI:

* premium
* clean
* enterprise-grade
* data-rich but readable
* consistent spacing
* consistent typography
* consistent cards/tables/buttons
* no childish colors
* no raw unstyled forms

⸻

Worker & Job Standards

Jobs must be:

* tenant-scoped
* retryable
* idempotent
* observable
* safe under concurrency

Every job must store:

* jobId
* tenantId
* extensionId
* status
* progress
* startedAt
* finishedAt
* errorMessage if failed

Job states:

QUEUED
RUNNING
COMPLETED
FAILED
CANCELLED

Jobs must never process all tenants unless explicitly instructed.

⸻

Docker Standards

If the extension includes a service/container:

* provide Dockerfile
* provide healthcheck
* do not expose public ports by default
* use internal network
* use least privilege user if possible
* keep image small
* do not bake secrets into image
* use environment variables for config
* document required env vars

Required scripts:

npm run build
npm run start
npm run healthcheck

Python services must include:

python -m src.healthcheck

⸻

GitHub / Deployment Compatibility

This repository may be pulled by the Relation AI Platform Admin Extension Center.

Therefore:

* keep manifest valid
* keep build scripts deterministic
* avoid machine-specific paths
* avoid manual setup steps
* document env requirements
* document migration requirements
* document rollback steps

Do not assume the developer will manually SSH and patch production.

⸻

Security Standards

Security is mandatory.

Secrets

* never commit secrets
* never log secrets
* never expose secrets to frontend
* mark secret env vars in manifest
* use platform secret injection

Input Validation

Validate every external input.

Use Zod or equivalent.

Permissions

Every sensitive action needs a permission.

Example:

custom_module.view
custom_module.edit
custom_module.run_job
custom_module.admin

Tenant Access

Never trust frontend tenantId.

Always use authenticated tenant context.

File Access

If editing files:

* restrict to extension workspace
* prevent path traversal
* version changes
* do not allow editing system files

⸻

Audit Logging

Every important action must write an audit event.

Audit these actions:

* extension setting changed
* record created
* record updated
* record deleted
* job started
* job completed
* job failed
* migration run
* seed run
* external API called
* file edited
* permission-sensitive action executed

Audit metadata must include:

tenantId
userId
extensionSlug
action
entityType
entityId
metadata
timestamp

⸻

Observability & Logs

Use structured logs.

Include:

tenantId
extensionSlug
jobId
requestId
operation
status
durationMs

Never log:

* passwords
* tokens
* API keys
* private customer email bodies unless explicitly needed and masked
* database connection strings

⸻

Wallet / Credit Integration

If the extension performs expensive operations, it must integrate with Relation AI wallet.

Examples:

* AI calls
* Apollo calls
* Places calls
* web research
* voice calls
* external enrichment
* bulk processing

Before expensive action:

estimate cost
check wallet balance
reserve credits
perform operation
finalize spend
release unused reservation
write usage event

Never bypass wallet for paid operations.

⸻

AI Integration Standards

If the extension uses AI:

* use tenant AI profile where relevant
* obey tenant forbidden claims
* return structured JSON
* log prompt version
* avoid hallucination
* validate output before use
* never let AI write directly to DB
* route AI-proposed actions through validated service methods

AI output must include:

{
  "confidenceScore": 0.0,
  "reasoning": "",
  "riskFlags": [],
  "requiresHumanReview": false
}

⸻

External API Standards

If the extension calls external APIs:

* use retry with backoff
* use rate limiting
* handle timeouts
* handle partial failures
* store source metadata
* respect wallet/credits if paid
* avoid duplicate calls through caching when possible

⸻

Testing Requirements

Every extension must include tests.

Minimum:

* manifest validation test
* permission tests
* tenant isolation tests
* service unit tests
* migration dry-run test if possible
* API validation tests
* job idempotency tests

Run:

npm run typecheck
npm run lint
npm test

Before considering work complete.

⸻

TypeScript Standards

Use:

{
  "strict": true
}

Rules:

* no implicit any
* no unused variables
* no dead code
* no TODO comments in final code
* no console.log in production code
* prefer explicit return types for services
* define shared types in src/shared/types

⸻

Python Standards

If using Python:

* use type hints
* use pydantic for schemas
* use logging, not print
* structure modules clearly
* add tests with pytest
* handle timeouts/retries
* keep dependencies minimal
* document runtime requirements

⸻

Documentation Requirements

Every extension must include README.md with:

* what the extension does
* required permissions
* required environment variables
* installation steps
* migration steps
* seed steps
* Docker usage
* tenant assignment steps
* rollback steps
* troubleshooting

Also include:

docs/installation.md
docs/configuration.md
docs/migration.md
docs/rollback.md

⸻

Definition of Done

A module is complete only if:

* manifest validates
* tenant assignment works
* permissions work
* migrations run for assigned tenant
* seed is idempotent
* backend APIs are protected
* frontend routes are dynamic and permission-aware
* Docker service runs if required
* logs are structured
* audit logs are written
* tests pass
* README is updated
* rollback path is documented

⸻

Development Workflow

When developing a new feature:

1. Read this CLAUDE.md
2. Inspect manifest
3. Identify tenant impact
4. Identify database impact
5. Identify permissions
6. Identify wallet impact
7. Design migration safely
8. Implement backend
9. Implement frontend
10. Add tests
11. Add logs/audit events
12. Update docs
13. Validate build
14. Provide final summary

Do not skip planning.

⸻

What Not To Do

Do not:

* create global-only features
* hardcode tenant IDs
* hardcode secrets
* bypass permissions
* bypass wallet
* modify core platform tables directly
* write destructive migrations casually
* expose public ports unnecessarily
* create UI outside platform design language
* leave mock data in production code
* leave TODOs
* ignore migration failure
* silently swallow errors
* assume extension is enabled for every tenant

⸻

Final Instruction

Build every extension as if it will be installed in production for enterprise customers.

Tenant safety, migration safety, security, observability, and maintainability are more important than speed.

If unsure, choose the safer and more explicit implementation.