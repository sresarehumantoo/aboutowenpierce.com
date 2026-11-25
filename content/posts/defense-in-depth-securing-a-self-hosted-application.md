---
title: "Defense in Depth - Securing a Self-Hosted Application"
excerpt: "Security isn't a checkbox; it's a strategy. Learn how layered defenses protect a self-hosted web application from the edge to the database."
publishedAt: 2026-02-04
categories: ["Security", "Infrastructure", "DevOps"]
featuredImage: /images/covers/defense-in-depth-securing-a-self-hosted-application.png
draft: false
---
When you self-host an application, you become responsible for its security. There's no cloud provider handling the basics, no managed service hiding the complexity. Every layer is your responsibility.

This can feel overwhelming, but it's also an opportunity. By understanding each layer of defense, you build systems that are genuinely secure, not just compliant with a checklist.

## The Onion Model

Think of security like an onion. Each layer provides protection, and an attacker must peel through all of them to reach the core. If any single layer fails, the others still provide protection.

```
┌─────────────────────────────────────┐
│          Edge (CDN/WAF)             │ ← First contact
├─────────────────────────────────────┤
│        Firewall (Network)           │ ← Traffic filtering
├─────────────────────────────────────┤
│       Host (OS Hardening)           │ ← System security
├─────────────────────────────────────┤
│    Application (TLS, Auth, CSRF)    │ ← App security
├─────────────────────────────────────┤
│         Data (Encryption)           │ ← Last resort
└─────────────────────────────────────┘
```

## Layer 1: Edge Protection

The edge is where your application meets the internet. For a self-hosted application, this is typically a reverse proxy or CDN.

**Why it matters:** Edge protection stops attacks before they reach your infrastructure. A DDoS attack absorbed at the edge never consumes your server's resources.

**Key capabilities:**
- **IP masking**: Visitors only ever see the CDN's addresses, so your origin's real IP isn't advertised in DNS.
- **DDoS mitigation**: Distributed attacks are absorbed across global infrastructure. A traffic spike that would overwhelm your server becomes a rounding error.
- **WAF rules**: Common attack patterns (SQL injection, XSS, path traversal) are blocked automatically.
- **Rate limiting**: Brute-force attacks are throttled before they become a problem.

**Implementation tip:** IP masking only helps if attackers can't go around the CDN. Many CDN providers publish their IP ranges, and your firewall can accept web traffic only from those. A stronger option is mutual TLS between the CDN and your origin (Cloudflare calls it Authenticated Origin Pulls): the origin refuses any TLS handshake that doesn't present the CDN's client certificate, so a leaked origin IP is useless on its own.

## Layer 2: Network Firewall

The firewall filters traffic before it reaches your servers. This applies to both the perimeter firewall and host-level firewalls.

**Why it matters:** Even with edge protection, you need to control what traffic reaches your servers. The firewall is your access control list.

**Key principles:**

**Default deny**: Start by blocking everything. Then explicitly allow only what's needed. This is the opposite of the common approach (allow everything, block the bad stuff) and is far more secure.

**Minimal ports**: Only expose ports that are absolutely necessary. A web server needs 80 and 443. It probably doesn't need SSH accessible from the internet (use a VPN or bastion host instead).

**Network segmentation**: Different systems should be on different network segments. Your database server shouldn't be reachable from the internet at all, only from your application server.

```
Internet → Edge → Firewall → App Server → Database Server
                     ↓              ↓
                  Web ports    Internal only
                  (80, 443)    (5432)
```

**Example rule set:**
```
# Perimeter firewall
ALLOW: CDN IP ranges → 80, 443 (web traffic)
ALLOW: VPN subnet → 22 (SSH for management)
DENY: * → * (everything else)

# Database zone
ALLOW: App server → Database server:5432
DENY: * → Database server:5432
```

## Layer 3: Host Hardening

Each server should be hardened to resist compromise. Even if an attacker gets past the network layer, the host should limit what they can do.

**Why it matters:** No system is perfectly secure. Host hardening limits the blast radius when something goes wrong.

**Essential measures:**

**Minimal installation**: Install only what's needed. Every additional package is potential attack surface. A web server doesn't need a mail server, desktop environment, or development tools.

**Automatic updates**: Security patches should be applied automatically. The window between vulnerability disclosure and exploitation is often measured in hours.

**SSH hardening**:
- Key-only authentication (no passwords)
- Non-standard port (reduces log noise from automated scanners)
- Fail2ban or similar to block repeated failures
- Disable root login

**Process isolation**: Use containers or VMs to isolate services. A compromised web application shouldn't have access to database credentials it doesn't need. For containers, a read-only root filesystem, dropped Linux capabilities, and `no-new-privileges` go a long way.

**Audit logging**: Know what's happening on your systems. Log authentication attempts, privilege escalation, and access to sensitive files.

## Layer 4: Application Security

The application itself must be secure. This is where many attacks ultimately target.

**Why it matters:** This is your code. It's the most complex layer and often the most vulnerable.

**Critical areas:**

**TLS everywhere**: All traffic should be encrypted. Allow TLS 1.2 at minimum and prefer 1.3, with automatic certificate renewal. HSTS headers prevent downgrade attacks.

**Authentication**: Use strong password hashing (bcrypt, Argon2). Implement CSRF protection. Consider rate limiting on login endpoints.

**Input validation**: Never trust user input. Validate on the server side, even if you also validate on the client. Use parameterized queries to prevent SQL injection.

**Dependency management**: Keep dependencies updated. Use automated tools to detect known vulnerabilities in your dependency tree.

**Error handling**: Don't expose stack traces or internal details in error messages. Log errors for debugging, but show users generic messages.

## Layer 5: Data Protection

The final layer protects the data itself. If all other layers fail, this limits what an attacker can access.

**Why it matters:** This is what attackers want. Protecting the data means protecting your users.

**Key practices:**

**Encryption at rest**: Database files should be encrypted. Even if someone steals the disk, they can't read the data.

**Encryption in transit**: Already covered by TLS, but worth emphasizing: data should never travel unencrypted between systems, including between your app server and your database.

**Backup isolation**: Backups should be stored separately from production data, with different credentials. A compromised application server shouldn't be able to delete or encrypt backups.

**Data minimization**: Don't store what you don't need. The data you don't have can't be stolen.

## Putting It Together

Defense in depth isn't about being paranoid. It's about being realistic. Any single security measure can fail. Layered defenses ensure that a single failure doesn't mean total compromise.

Consider this attack scenario:

1. **Edge layer**: Attacker tries DDoS → absorbed by CDN
2. **Network layer**: Attacker scans for open ports → firewall blocks non-essential ports
3. **Host layer**: Attacker tries SSH brute force → key-only auth, fail2ban blocks IP
4. **Application layer**: Attacker tries SQL injection → parameterized queries prevent exploitation
5. **Data layer**: Attacker walks off with a disk or a backup file → encryption at rest keeps it unreadable

Each layer stopped a different attack. Together, they provide comprehensive protection.

## How This Site Applied It

While this site was self-hosted (it now runs as a static export on GitHub Pages), the layers above looked like this:

- **Edge**: Cloudflare proxy with WAF rules and rate limiting, plus Authenticated Origin Pulls so the origin only talked TLS to Cloudflare.
- **Network**: The web servers lived in a VLAN-segmented DMZ behind a default-deny zone firewall, with the production database in its own isolated zone reachable only from the application server. Traffic from less-trusted segments also passed through a separate firewall pair running Suricata for inspection.
- **Host**: Minimal Ubuntu VMs with a default-deny host firewall, key-only SSH on a non-standard port, no root login, fail2ban, and unattended security updates, all applied by Ansible.
- **Application**: Containers ran read-only with all capabilities dropped and resource limits set. Traefik enforced TLS 1.2+, HSTS, and per-route rate limits, and secrets came from HashiCorp Vault at deploy time instead of living on disk.
- **Data**: PostgreSQL accepted only TLS connections with SCRAM authentication, and backups went to separate storage hardware.

## Practical Implementation

Here's a checklist for implementing defense in depth:

**Edge:**
- [ ] CDN/WAF in front of application
- [ ] Origin reachable only through the CDN (IP allowlist or origin mTLS)
- [ ] WAF rules enabled
- [ ] Rate limiting configured

**Network:**
- [ ] Default deny firewall policy
- [ ] Only necessary ports exposed
- [ ] Database not internet-accessible
- [ ] Network segmentation between services

**Host:**
- [ ] Minimal package installation
- [ ] Automatic security updates
- [ ] SSH key-only authentication
- [ ] Fail2ban or equivalent
- [ ] Regular audit log review

**Application:**
- [ ] TLS 1.2+ with auto-renewal
- [ ] HSTS headers
- [ ] CSRF protection
- [ ] Input validation on all endpoints
- [ ] Dependencies regularly updated

**Data:**
- [ ] Encryption at rest
- [ ] Backups on separate infrastructure
- [ ] Backup credentials separate from production
- [ ] Regular backup testing

## Conclusion

Security is a practice, not a product. Defense in depth acknowledges that any single control can fail, and designs systems to remain secure regardless.

The good news: once you've built this mindset, it becomes automatic. Every new service gets evaluated through the lens of "what layer does this protect, and what happens if it fails?"

That's the goal. Not perfect security (which doesn't exist), but resilient security that degrades gracefully and limits damage when things go wrong.

---

*Security is about making the cost of attack higher than the value of the target. Multiple layers multiply that cost.*
