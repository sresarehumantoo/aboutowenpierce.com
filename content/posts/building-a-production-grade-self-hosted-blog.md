---
title: "Building a Production-Grade Self-Hosted Blog"
excerpt: "How this site was self-hosted for most of 2026: Next.js and Payload CMS on Proxmox VMs, provisioned with Terraform, configured with Ansible, and deployed through GitLab CI."
publishedAt: 2026-02-04
categories: ["Infrastructure", "Security", "DevOps"]
project: homelab-as-code
featuredImage: /images/covers/building-a-production-grade-self-hosted-blog.png
draft: false
---
> **Update, November 2026:** this site now runs as a static Next.js export on GitHub Pages, with posts kept as Markdown in the repository. What follows describes the self-hosted setup it ran on before that.

## The Philosophy: Treating Personal Projects Like Production Systems

There's a common trap in personal projects: "It's just for me, so I don't need to do it properly." This thinking leads to systems that are fragile, hard to maintain, and, ironically, consume more time than they save.

This project took the opposite approach. By applying the same rigor I use professionally to my personal infrastructure, I built a system that:

- Can be rebuilt from code, VMs included, without hand-configuring anything
- Keeps every piece of persistent data off the application server
- Deploys with a single command or a single button in the CI pipeline
- Documents itself through code

## Architecture: Separation of Concerns

The fundamental architectural decision was to separate compute from data. Instead of running everything on a single server, each environment uses two virtual machines on Proxmox:

**Application VM**: Runs the Next.js + Payload CMS application, a small MCP service for content management, and Traefik as the reverse proxy, all in Docker. This node is *stateless*: it can be destroyed and rebuilt without losing any data. All application code, container images, and configuration can be reproduced from the infrastructure code.

**Database VM**: Runs PostgreSQL 16 natively (not containerized) and holds the persistent data. Application deployments never touch the database host, and database maintenance doesn't require redeploying the application.

**Object Storage**: Media uploads and database backups live on self-hosted S3-compatible storage (RustFS on a TrueNAS box), separate from both VMs. That makes disaster recovery straightforward: rebuild the VMs, restore the latest dump, and the images are already where the application expects them.

```
┌─────────────────┐         ┌─────────────────┐
│   Application   │────────▶│    Database     │
│   (stateless)   │         │  (persistent)   │
└───────┬─────────┘         └────────┬────────┘
        │ media                      │ backups
        └──────────┬─────────────────┘
                   ▼
           ┌──────────────┐
           │  S3 Storage  │
           │  (NAS-backed)│
           └──────────────┘
```

## Infrastructure as Code: The Safety Net

Every aspect of the infrastructure is defined in code:

**Terraform** provisions the virtual machines on Proxmox by cloning a cloud-init template. VM specifications, static addressing, and SSH keys are all version-controlled, and each environment has its own workspace and variable file.

**Ansible** configures the servers. Roles handle system hardening, Docker installation, PostgreSQL setup (including the backup jobs), and application deployment. Each role is idempotent: running it again produces the same result.

This approach provides several benefits:

1. **Reproducibility**: The infrastructure can be rebuilt exactly as it was
2. **Documentation**: The code *is* the documentation
3. **Version Control**: Changes are tracked, reviewed, and reversible
4. **Disaster Recovery**: Rebuilding is a Terraform apply plus an Ansible run, wrapped in one deploy script

## Security: Defense in Depth

Security isn't a single feature. It's layers of protection that complement each other:

**Edge Protection**: Cloudflare sits in front of the application, providing DDoS mitigation, WAF rules, and rate limiting. The origin requires Cloudflare's Authenticated Origin Pulls client certificate, so even a client that finds the origin directly can't complete a TLS handshake with it.

**Network Segmentation**: The application servers live in a VLAN-segmented DMZ, and the production database sits in its own isolated zone that only the application server can reach. An HA router pair handles routing and zone firewalling, and traffic from the less-trusted segments is steered through a separate firewall pair running Suricata for inspection.

**Host Hardening**: VMs run minimal services behind a default-deny host firewall. SSH is key-only, on a non-default port, with root login disabled and fail2ban watching for brute force. Automatic security updates are enabled.

**Container Hardening**: Containers run with read-only filesystems, all Linux capabilities dropped, `no-new-privileges`, and CPU and memory limits. Application secrets are pulled from HashiCorp Vault at deploy time rather than sitting in plaintext on disk.

**Application Security**: TLS 1.2 or newer, with certificates issued and renewed automatically by Let's Encrypt, plus HSTS and per-route rate limits in Traefik. PostgreSQL accepts only TLS connections with SCRAM password authentication, and only from the application server.

**Backup Isolation**: Backups are stored on separate storage hardware, not on either VM, so losing a VM doesn't take its backups with it.

## Deployment: Speed Without Sacrifice

The deployment script provides multiple levels of abstraction:

**Full Stack**: Provision VMs and configure everything from scratch. Used for initial deployment or disaster recovery.

**Configure**: Run all Ansible roles to ensure servers match the desired state. Used after infrastructure changes.

**Deploy**: Sync code, write the environment file, and rebuild and restart the containers through the `app_deploy` role. The standard path before CI existed.

**Sync**: Direct file sync and container rebuild. The fastest option for rapid iteration.

Later, GitLab CI took over day-to-day releases. Every push to `develop` or `main` runs type checking, linting, and a secret scan, then builds and pushes container images. Deploying to preprod (from `main`) or production (from a version tag) is a manual button press that pulls the image CI just built.

## The Result

What started as a simple blog became an exercise in proper engineering practices. The system was:

- **Recoverable**: The application VM can be lost outright with no data loss; the database can be rebuilt from its most recent nightly backup
- **Maintainable**: Updates are automated and reversible
- **Layered**: No single control is the only thing standing between the internet and the data
- **Documented**: The code explains itself

More importantly, it was a learning platform. Every component represents a decision point, a trade-off evaluated, a best practice applied. The blog wasn't just content; it was a demonstration of how I think infrastructure should work.

## Lessons Learned

**Start with separation**: It's easier to combine later than to separate later. Keeping compute and data on different VMs paid dividends immediately, and it made moving the database into its own network zone a small change later on.

**Automate from day one**: The first deployment should use infrastructure code. Manual steps become forgotten steps.

**Document with code**: README files get stale. Configuration files don't.

**Security is architecture**: You can't bolt on security later. It needs to be considered at every level from the start.

**Give backups their own credentials**: Separate storage is only half of backup isolation. The jobs that write backups should use credentials nothing else holds, ideally with object locking, so a compromised application can't reach them.

**Personal projects deserve production practices**: The skills transfer. The reliability compounds. The time investment pays back.


---

*This project represents the intersection of application development and site reliability engineering: building systems that are not just functional, but operable.*
