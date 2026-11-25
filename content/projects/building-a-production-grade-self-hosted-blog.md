---
title: "Building a Production-Grade Self-Hosted Blog"
description: "A deep dive into building a modern tech blog with enterprise-grade infrastructure practices, from virtualization to automated deployments."
techStack: ["Next.js 15", "Payload CMS", "PostgreSQL", "Docker", "Terraform", "Ansible", "Traefik"]
links: {}
featured: true
status: published
completedAt: 2026-02-04
featuredImage: /images/hero-coding.png
---
## The Philosophy: Treating Personal Projects Like Production Systems

There's a common trap in personal projects: "It's just for me, so I don't need to do it properly." This thinking leads to systems that are fragile, hard to maintain, and—ironically—consume more time than they save.

This project takes the opposite approach. By applying the same rigor I use professionally to my personal infrastructure, I've created a system that:

- Can be rebuilt from scratch in under an hour
- Survives VM failures without data loss
- Updates with a single command
- Documents itself through code

## Architecture: Separation of Concerns

The fundamental architectural decision was to separate compute from data. Instead of running everything on a single server, the system uses two virtual machines:

**Application VM**: Runs the web application, reverse proxy, and container runtime. This node is *stateless*—it can be destroyed and rebuilt without losing any data. All application code, container images, and configuration can be reproduced from the infrastructure code.

**Database VM**: Runs PostgreSQL natively (not containerized) and handles persistent data. This separation means application deployments never risk database corruption, and database maintenance doesn't require application downtime.

**Object Storage**: Media files and database backups are stored on S3-compatible storage, separate from both VMs. This provides durability and makes disaster recovery straightforward.

```
┌─────────────────┐         ┌─────────────────┐
│   Application   │────────▶│    Database     │
│   (stateless)   │         │  (persistent)   │
└───────┬─────────┘         └────────┬────────┘
        │                            │
        └──────────┬─────────────────┘
                   ▼
           ┌──────────────┐
           │  S3 Storage  │
           │  (durable)   │
           └──────────────┘
```

## Infrastructure as Code: The Safety Net

Every aspect of the infrastructure is defined in code:

**Terraform** provisions the virtual machines on the hypervisor. VM specifications, network configuration, and cloud-init templates are all version-controlled. Running `terraform apply` creates identical infrastructure every time.

**Ansible** configures the servers. Roles handle security hardening, Docker installation, PostgreSQL setup, and application deployment. Each role is idempotent—running it multiple times produces the same result.

This approach provides several benefits:

1. **Reproducibility**: The infrastructure can be rebuilt exactly as it was
2. **Documentation**: The code *is* the documentation
3. **Version Control**: Changes are tracked, reviewed, and reversible
4. **Disaster Recovery**: Rebuilding is as simple as running two commands

## Security: Defense in Depth

Security isn't a single feature—it's layers of protection that complement each other:

**Edge Protection**: Cloudflare sits in front of the application, providing DDoS mitigation, WAF rules, and IP masking. The actual server IP is never exposed to the internet.

**Network Segmentation**: The firewall only allows connections from known-good IP ranges (Cloudflare's published IP list) to reach the web ports. All other traffic is dropped before it reaches the server.

**Host Hardening**: VMs run minimal services with strict firewall rules. SSH uses key-only authentication. Automatic security updates are enabled.

**Application Security**: TLS 1.3 with automatic certificate renewal. Database connections require password authentication and are restricted by IP address.

**Backup Isolation**: Backups are stored on separate infrastructure, protected by different credentials. A compromised application server cannot delete backups.

## Deployment: Speed Without Sacrifice

The deployment system provides multiple levels of abstraction:

**Full Stack**: Provision VMs and configure everything from scratch. Used for initial deployment or disaster recovery.

**Configure**: Run all Ansible roles to ensure servers match the desired state. Used after infrastructure changes.

**Deploy**: Sync code, run migrations, rebuild containers. The standard deployment for code changes.

**Sync**: Direct file sync and container rebuild. The fastest option for rapid iteration.

This layered approach means choosing the right tool for the job. Most deployments use the fast path; full rebuilds are reserved for when they're actually needed.

## The Result

What started as a simple blog became an exercise in proper engineering practices. The system is:

- **Resilient**: Any single component can fail without data loss
- **Maintainable**: Updates are automated and reversible
- **Secure**: Multiple layers of protection with no single point of compromise
- **Documented**: The code explains itself

More importantly, it's a learning platform. Every component represents a decision point, a trade-off evaluated, a best practice applied. The blog isn't just content—it's a demonstration of how modern infrastructure should work.

## Lessons Learned

**Start with separation**: It's easier to combine later than to separate later. Keeping compute and data on different VMs paid dividends immediately.

**Automate from day one**: The first deployment should use infrastructure code. Manual steps become forgotten steps.

**Document with code**: README files get stale. Configuration files don't.

**Security is architecture**: You can't bolt on security later. It needs to be considered at every level from the start.

**Personal projects deserve production practices**: The skills transfer. The reliability compounds. The time investment pays back.

---

*This project represents the intersection of application development and site reliability engineering—building systems that are not just functional, but operable.*
