---
title: "Homelab as code"
description: "A zero trust home lab run like production: Proxmox hosts, an HA router pair, segmented networks and short-lived secrets, all declared in Terraform and Ansible and shipped through GitLab CI."
techStack: ["Proxmox", "Terraform", "Ansible", "GitLab CI", "VyOS", "HashiCorp Vault"]
links: {}
featured: true
status: active
privateSource: true
completedAt: 2026-02-04
featuredImage: /images/covers/homelab-as-code.png
---
## What it is

My home lab is where I practice the infrastructure and security work I do professionally, and it is built the same way: everything is code, every change goes through CI, and nothing important depends on a box I configured by hand. It's a case study rather than a tool, so there's no install line. The repositories are private because they describe a real network, and this page stays at the level of design. The posts linked below tell the individual stories in full.

## Why it exists

Personal infrastructure invites shortcuts: "it's just for me" becomes a router nobody can rebuild and a token sitting in a home directory. I wanted a lab where the shortcuts are harder than the right way, so that what I learn here transfers to work. It also gives AI agents a realistic environment to operate in, which forced me to make least privilege concrete instead of aspirational.

## How it's built

- **Compute.** Proxmox hypervisors run the VMs. Terraform clones them from cloud-init templates, and Ansible roles configure them idempotently, from hardening and Docker to databases and application deploys. [Terraform and Ansible](/blog/terraform-ansible-the-infrastructure-as-code-power-couple/) covers how the two tools split the work.
- **Network.** A VyOS router pair, one on each hypervisor, runs VRRP so the gateways survive losing a host, and the WAN follows the active router without anyone moving a cable. Networks are segmented by trust, and traffic from the less-trusted segments passes an inspection hop before it leaves.
- **Secrets.** HashiCorp Vault holds every credential. Machines and agents read through a read-only identity whose short-lived token Vault Agent keeps fresh, and writes go through tokens minted per task by [vault-scope](/projects/vault-scope/).
- **Delivery.** Each piece lives in its own repository with GitLab CI running lint and secret scanning, and changes that touch real infrastructure wait behind a manual gate.

## Key design decisions

- **Fail over on local signals only.** The router pair first demoted itself when it couldn't reach the modem, so an ISP outage caused two pointless failovers. Now only carrier loss on the active router's own WAN link triggers one, because a failover can't fix a failure both routers share. [WAN Failover Without Moving the Cable](/blog/wan-failover-without-moving-the-cable/)
- **Bound every automatic retry.** A watchdog that restarted Vault Agent on failure kept an authentication lockout alive for about 22 hours. It now restarts a bounded number of times, then classifies the failure and stops. [The Watchdog That Kept My Outage Alive](/blog/the-watchdog-that-kept-my-outage-alive/)
- **No standing write credentials.** Agents get a file path to a token that dies within half an hour, minted from a default-deny allow-list. [Agents Get a Path, Not a Token](/blog/agents-get-a-path-not-a-token/)
- **Layers, not a perimeter.** Edge protection, segmentation, host hardening, read-only containers and TLS to the database, each assuming the one in front of it can fail. [Defense in Depth](/blog/defense-in-depth-securing-a-self-hosted-application/)
- **Prove it in preprod first.** Separate environments built from the same code, with promotion gated by hand. [Environment Separation](/blog/environment-separation-dev-preprod-and-production-done-right/)
- **Backups that live somewhere else.** Nightly and weekly database dumps go to separate S3-compatible storage, off every VM they protect. [Backup Strategies for the Solo Developer](/blog/backup-strategies-for-the-solo-developer/)
- **Right-size what you run.** This blog spent most of 2026 on the full stack (separate app and database VMs, preprod, CI and Vault) before I moved it to a static site. It was a good lab and a bad way to publish a handful of posts. [Building a Production-Grade Self-Hosted Blog](/blog/building-a-production-grade-self-hosted-blog/) and [Why I Retired My Self-Hosted Blog Stack](/blog/why-i-retired-my-self-hosted-blog-stack/)

## Status

Running and changing constantly. Open items include connection-state sync so NAT flows survive a router failover, and alerting if both routers ever claim to be active at once. One modem and one ISP remain a single point of failure that no amount of VRRP fixes.
