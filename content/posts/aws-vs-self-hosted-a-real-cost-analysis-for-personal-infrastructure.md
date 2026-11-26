---
title: "AWS vs Self-Hosted: A Real Cost Analysis for Personal Infrastructure"
excerpt: "I ran the numbers on hosting my personal site on AWS vs my homelab. Self-hosting cost ~$5/mo, AWS ran ~$32/mo, a 6.4x multiplier. But the real trade-off isn't cost, it's reliability vs learning value."
publishedAt: 2026-03-22
categories: ["Homelab"]
project: homelab-as-code
featuredImage: /images/covers/aws-vs-self-hosted-a-real-cost-analysis-for-personal-infrastructure.png
draft: false
---
> **Update, November 2026:** the self-hosted setup described here has since been retired. The site now runs as a static Next.js export on GitHub Pages, and [Why I Retired My Self-Hosted Blog Stack](/blog/why-i-retired-my-self-hosted-blog-stack/) explains the move. It changes the math below: a static site on Pages costs nothing to host, which beats both columns in this comparison, and that was part of why I moved. The reasoning still applies to anything that genuinely needs a server.

There's a question every homelab enthusiast eventually asks: *should I just move this to the cloud?*

I run [aboutowenpierce.com](https://aboutowenpierce.com) on self-hosted infrastructure: Proxmox VMs, PostgreSQL on a dedicated box, S3-compatible storage on TrueNAS, the works. It's automated with Terraform and Ansible, fronted by Traefik and Cloudflare, and it costs me about five dollars a month in electricity.

But is that actually cheaper than AWS? And more importantly, does the cost difference matter once you factor in reliability, maintenance burden, and the value of what you learn?

I ran the numbers.

## The Setup

The site runs on a standard modern stack:

- **Next.js 15** with App Router for the frontend
- **Payload CMS 3.x** for headless content management
- **PostgreSQL 16** on a dedicated VM
- **Traefik** as a reverse proxy with Let's Encrypt
- **Cloudflare** for DNS, CDN, and DDoS protection
- **RustFS on TrueNAS** for S3-compatible media storage

On-prem, this runs across two VMs (2 vCPU / 2 GB each) on a Proxmox hypervisor I already own. The marginal cost is just the electricity to keep those VMs running.

For the AWS comparison, I priced out two scenarios:

- **AWS Minimal**: Single EC2 instance + RDS, no load balancer, Cloudflare for TLS
- **AWS Proper**: EC2 + RDS with reserved instances, ALB, proper separation of concerns

## The Cost Breakdown

Self-hosting costs **~$5/month** ($60/year), while the cheapest viable AWS setup runs **~$32/month** ($384/year). That's a **6.4x multiplier**.

In absolute terms, the difference is $27/month, roughly the cost of a nice lunch. In relative terms, you're paying 540% more for essentially the same capability.

### Where AWS Costs Come From

The two biggest line items on AWS are **compute** and **database**:

- **EC2 t3.small** ($15.18/mo on-demand): This is the minimum viable instance for a Next.js + Payload CMS app. You could squeeze into a t3.micro, but Payload's build process needs the RAM.
- **RDS db.t4g.micro** ($12.53/mo): The cheapest managed PostgreSQL option. You're paying for automated backups, patching, and the option to enable multi-AZ failover.

Everything else (EBS storage, S3, data transfer) is negligible for a personal site. The load balancer ($16.20/mo for ALB) is the item that pushes the "proper" setup significantly higher, but you can skip it if you're already using Cloudflare.

### Where On-Prem Costs Come From

Almost nothing.

- **Power**: The VMs consume roughly 20W of a shared hypervisor. At Michigan residential rates ($0.18/kWh), that's about $2.60/month. Add proportional networking gear and you're at $3-5.
- **Internet**: Already paying for residential internet regardless.
- **Hardware**: Already owned. The Proxmox servers serve multiple purposes beyond this site.

What matters here is **marginal cost**. The servers are already running. The network is already there. Adding two lightweight VMs costs almost nothing.

## The Reliability Question

Cost isn't the whole story. The real trade-off is reliability.

### The SPOF Problem

Self-hosting a personal site means accepting single points of failure:

- **ISP goes down** → site goes down
- **Power outage** → site goes down (even with a UPS, you get minutes, not hours)
- **Hardware failure** → site goes down until you fix or replace it
- **You're on vacation** → hope nothing breaks

AWS eliminates all of these. EC2 instances auto-recover. RDS handles failover. You don't care about the ISP serving the data center in Ohio.

### But Does It Matter?

For a personal portfolio and blog? **Not really.**

Nobody is losing money if aboutowenpierce.com is unreachable for a few hours. There's no SLA to meet. No customers to page. The Cloudflare error page handles the graceful degradation.

If this were an e-commerce site, a SaaS product, or anything generating revenue, AWS would be the obvious choice at $32/month. But for a personal site, the 99.5% uptime you get from self-hosting is fine.

### The Middle Ground

There's a cheap hybrid approach: keep your primary on-prem, but pre-render your key pages (resume, about, recent posts) to a static S3 bucket behind CloudFront as a failover origin in Cloudflare. Cost: ~$1/month. Covers the "my server is dead" scenario for the pages that actually matter.

## Making the Decision

The right answer depends on three things: whether the site makes money, whether you own hardware, and how much downtime you can tolerate.

**Self-host if:**

- You already have the hardware (or want to build a homelab)
- The site is personal, non-revenue
- You enjoy infrastructure work and want to learn
- You value ownership over convenience

**Use AWS/cloud if:**

- Downtime directly costs you money
- You don't want to think about hardware, OS patches, or disk failures
- You need multi-region availability
- Your time is worth more than $27/month

**Consider a VPS (Lightsail, Hetzner, DigitalOcean) if:**

- You don't own hardware and don't want to
- You want cloud convenience at lower cost
- A single box running Docker Compose is good enough

## The Hidden ROI of Self-Hosting

The cost analysis above ignores the biggest benefit of self-hosting: **what you learn by doing it.**

Running your own infrastructure means you've touched:

- **Networking**: VLANs, firewall rules, DNS, reverse proxies, TLS certificates
- **Virtualization**: Proxmox, cloud-init templates, VM lifecycle management
- **Infrastructure as Code**: Terraform for provisioning, Ansible for configuration
- **Storage**: S3-compatible object storage, automated backup pipelines
- **Security**: Hardening, access control, vulnerability scanning, CSP headers
- **CI/CD**: Automated deployments, Docker Compose orchestration

Every one of these maps directly to real-world SRE, DevOps, and platform engineering work, at a depth you don't get from clicking through the AWS console.

The homelab isn't a cost center. It's a training ground, and for a site reliability engineer, **the infrastructure _is_ the resume.**

## The Verdict

For personal infrastructure on hardware you already own: **self-host**. The 6x cost savings are nice, but the real value is the hands-on experience with every layer of the stack. Accept the SPOF risk, automate your recovery path with Terraform + Ansible, and spend the $27/month you saved on better coffee.

For anything that needs to be up when you're asleep: **use the cloud**. The $32-38/month buys you SLAs, managed ops, and the peace of mind of making your uptime someone else's problem.
