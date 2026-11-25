---
title: "Environment Separation - Dev, Preprod, and Production Done Right"
excerpt: "Why you need more than just \"local\" and \"production,\" and how to build environment separation that actually helps instead of becoming a maintenance burden."
publishedAt: 2026-02-04
categories: ["DevOps", "Best Practices", "Infrastructure"]
project: homelab-as-code
featuredImage: /images/covers/environment-separation-dev-preprod-and-production-done-right.png
draft: false
---
Plenty of projects start with two environments: a laptop and production. Testing means deploying to production and hoping nothing breaks. Debugging means adding console.log statements to the live site.

It works, until it doesn't. One bad deployment takes the site down, real users notice, and the lesson arrives the expensive way.

Environment separation isn't bureaucracy. It's how you ship with confidence.

## Why Environments Exist

Each environment serves a specific purpose:

**Development (local)**: Where you write code. Fast iteration, full access, no risk to real users. You can break things freely because you're the only one affected.

**Preprod/Staging**: Where you test before production. Mirrors production closely, but with synthetic data and no real user impact. The dress rehearsal.

**Production**: Where users actually are. Changes here affect real people. Stability is paramount.

The boundaries between these environments protect you from yourself. When you're tired, rushing, or just having a bad day, the separation prevents costly mistakes.

## The Progression of Confidence

Environments form a pipeline of increasing confidence:

```
┌───────────┐    ┌───────────┐    ┌───────────┐
│    Dev    │───▶│  Preprod  │───▶│   Prod    │
│           │    │           │    │           │
│ "It works │    │"It works  │    │"It works  │
│  on my    │    │ like prod │    │ for       │
│  machine" │    │ would"    │    │ everyone" │
└───────────┘    └───────────┘    └───────────┘
```

Each transition increases confidence:
- **Dev → Preprod**: Catches environment-specific bugs, configuration issues, and integration problems
- **Preprod → Prod**: Catches issues with real infrastructure, load, and edge cases

If something breaks in preprod, you've saved yourself from a production incident. That's the whole point.

## What Should Differ Between Environments

Not everything should be different. The goal is environments similar enough to catch bugs but different enough to be practical.

**Should be IDENTICAL:**
- Application code
- Configuration structure (same keys, different values)
- Database schema
- Infrastructure architecture (same components, maybe different sizes)

**Should be DIFFERENT:**
- Data (production has real data, preprod has synthetic)
- Secrets (each environment has its own)
- Scale (preprod can be smaller/cheaper)
- Domain/URLs (obvious, but important)
- TLS certificates (self-signed OK for preprod, real certs for prod)

**Configuration by environment:**
```
# Development
DATABASE_URL=postgresql://localhost:5432/myapp_dev
DEBUG=true
TLS=false

# Preprod
DATABASE_URL=postgresql://preprod-db:5432/myapp
DEBUG=false
TLS=true (self-signed)

# Production
DATABASE_URL=postgresql://prod-db:5432/myapp
DEBUG=false
TLS=true (Let's Encrypt)
```

## The Infrastructure Approach

Environment separation shouldn't require maintaining entirely separate codebases. Use the same infrastructure code with environment-specific variables.

**Terraform** handles this with variable files:
```
terraform/
├── main.tf           # Shared infrastructure definition
├── variables.tf      # Variable declarations
└── environments/
    ├── preprod.tfvars   # Preprod values
    └── prod.tfvars      # Production values
```

Apply with: `terraform apply -var-file=environments/preprod.tfvars`

**Ansible** handles this with group_vars:
```
ansible/
├── site.yml           # Shared playbook
├── inventory.yml      # All hosts
└── group_vars/
    ├── preprod/
    │   └── vars.yml   # Preprod-specific variables
    └── prod/
        └── vars.yml   # Production-specific variables
```

Run with: `ansible-playbook -l preprod site.yml`

**Docker Compose** handles this with overlay files:
```
.
├── docker-compose.yml           # Base configuration
├── docker-compose.dev.yml       # Dev overrides
├── docker-compose.preprod.yml   # Preprod overrides
└── docker-compose.prod.yml      # Production overrides
```

Run with: `docker compose -f docker-compose.yml -f docker-compose.preprod.yml up`

## The Data Problem

The hardest part of environment separation is data. Production data is valuable for realistic testing, but:

1. **Privacy**: Production data contains PII. Moving it to preprod may violate privacy policies or regulations.
2. **Size**: Production databases are large. Copying them is slow and storage-expensive.
3. **Drift**: If you copy once and never again, preprod data becomes stale and unrealistic.

**Solutions:**

**Synthetic data generation**: Create realistic fake data that matches production patterns without containing real user information. Tools like Faker help.

**Anonymized snapshots**: Copy production data but scrub PII. Email addresses become random@example.com, names become "User 12345", etc. Requires careful implementation to avoid missing fields.

**Subset copies**: Take a representative sample rather than the full dataset. Useful for performance testing with realistic data distribution.

**Production-like but empty**: Start preprod fresh for each testing cycle. Relies more on automated tests than manual exploration.

Pick based on your constraints. Privacy regulations often mandate synthetic data. Performance testing often requires production-scale data.

## Development Environment Patterns

The development environment has different needs than preprod and prod.

**Docker Compose for local dev:**
```yaml
# docker-compose.dev.yml
services:
  app:
    build: .
    volumes:
      - .:/app          # Mount source for hot reload
      - /app/node_modules  # Don't override dependencies
    environment:
      - DEBUG=true
      - DATABASE_URL=postgresql://db:5432/myapp
    ports:
      - "3000:3000"

  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_PASSWORD=devpassword
```

Key differences from production:
- Source code mounted for hot reload
- Local database (not external)
- Debug mode enabled
- Simple passwords (it's local-only)

**Local services**: The development environment typically includes services that are external in production: database, cache, message queue. Running these locally means fast iteration without network latency or shared resource conflicts.

## Preprod: The Proving Ground

Preprod should be as close to production as possible while remaining practical.

**Infrastructure parity:**
- Same OS version
- Same container runtime
- Same network topology (or as close as possible)
- Same TLS configuration (can use self-signed certs)

**Scale differences (acceptable):**
- Smaller VMs (1 core instead of 4)
- Less RAM
- Smaller database
- No geographic redundancy

**What to test in preprod:**
- New deployments before production
- Configuration changes
- Database migrations
- Integration with external services (use sandboxes where available)
- Performance baselines (not full load tests if scaled down)

**Access patterns:**
```
Development:  Developer machine only
Preprod:      Team access via VPN or internal network
Production:   Public access with proper auth
```

## Promotion Workflow

Code should flow in one direction: dev → preprod → prod.

```
┌──────────────┐
│  Git Branch  │
│   (feature)  │
└──────┬───────┘
       │ merge
       ▼
┌──────────────┐
│    main      │
│   branch     │
└──────┬───────┘
       │ deploy
       ▼
┌──────────────┐
│   Preprod    │  ← Test here
└──────┬───────┘
       │ promote (same artifact)
       ▼
┌──────────────┐
│  Production  │  ← Users here
└──────────────┘
```

The key principle: **promote artifacts, don't rebuild**.

When you deploy to preprod, you build a Docker image. When you promote to production, you deploy the *same image*. No rebuilding. This ensures what you tested is exactly what you deploy.

I'll admit my own pipeline for this site didn't fully follow this rule. Preprod deployed the image built from `main`, but a release tag kicked off a fresh build for production. Same commit, same Dockerfile, but technically a different artifact. Retagging the tested image would have closed that gap.

```bash
# Build and tag
docker build -t myapp:v1.2.3 .

# Deploy to preprod
docker tag myapp:v1.2.3 registry.example.com/myapp:preprod
docker push registry.example.com/myapp:preprod

# After testing, promote to production
docker tag myapp:v1.2.3 registry.example.com/myapp:prod
docker push registry.example.com/myapp:prod
```

## Managing Secrets

Each environment needs its own secrets. Never share credentials between environments.

**Why:**
- Compromised preprod credentials shouldn't give access to production
- Different API endpoints often require different keys anyway
- Audit trails should clearly show which environment accessed what

**Pattern:**
```
# Environment-specific secret files
secrets/
├── dev.env         # Gitignored, local only
├── preprod.env     # Encrypted or in secrets manager
└── prod.env        # Encrypted or in secrets manager
```

**For production systems**, use a proper secrets manager:
- HashiCorp Vault
- AWS Secrets Manager
- Cloud provider native solutions

**For simpler setups**, encrypted files with age or sops work well:
```bash
# Encrypt secrets
sops -e secrets.yml > secrets.enc.yml

# Decrypt at deploy time
sops -d secrets.enc.yml > secrets.yml
```

## Common Mistakes

**"Works in dev, ship to prod"**: Skipping preprod because you're in a hurry. This is how outages happen.

**Snowflake environments**: Each environment is configured differently, manually. Differences creep in. What works in preprod fails in prod for mysterious reasons.

**Shared databases**: Using the production database from preprod "for realistic testing." Until a bug in preprod code corrupts production data.

**Shared secrets**: Same API keys everywhere. One compromised environment exposes all.

**Outdated preprod**: Preprod drifts from production because it's not maintained. It stops catching real issues.

## Keeping Environments in Sync

The goal is infrastructure as code that can deploy identical (except for variables) environments:

```bash
# Same code, different variables
./deploy.sh preprod  # Deploys to preprod
./deploy.sh prod     # Deploys to production
```

This only works if you:
1. Never make manual changes to servers
2. Track all configuration in version control
3. Apply changes to all environments (preprod first, then prod)

When preprod and prod drift, you lose the protection that preprod provides. If they're running different versions of infrastructure, you're not testing what you'll deploy.

## How This Site Did It

When this site was self-hosted (it now runs as a static export on GitHub Pages), it used the layout described above:

- **Dev**: Docker Compose with a local PostgreSQL container on the developer machine.
- **Preprod**: Its own app and database VMs, a self-signed certificate, and access only from the internal network. To save resources, its app and database shared one network segment.
- **Production**: Separate VMs, Let's Encrypt certificates, Cloudflare in front, and the database in its own isolated network zone.

Terraform workspaces with per-environment variable files, Ansible `group_vars`, and Compose overlays kept all three on one codebase. Each environment had its own secrets in HashiCorp Vault. Merges to `main` built images that could be deployed to preprod with one click, and version tags did the same for production.

The preprod network shortcut is a good example of the trade-offs above. It was cheaper, but it meant preprod would never have caught a firewall rule that blocked the app from reaching the database in production.

## Conclusion

Environment separation isn't about bureaucracy. It's about sleeping well at night. When you have confidence that preprod caught issues before users saw them, deployments stop being scary.

Start with the basics:
1. Local dev with containerized dependencies
2. A preprod environment that mirrors production architecture
3. A promotion workflow that moves tested artifacts (not rebuilds)

Add sophistication as needed. Not every project needs a full staging environment, but every project that serves real users needs *something* between "my laptop" and "the users."

The cost of environment separation is real: more infrastructure, more complexity, more to maintain. But the cost of production incidents is higher. Pick your pain.

---

*The purpose of preprod is to have production incidents somewhere they don't matter.*
