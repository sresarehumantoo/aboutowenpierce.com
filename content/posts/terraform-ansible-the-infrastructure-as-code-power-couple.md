---
title: "Terraform + Ansible - The Infrastructure as Code Power Couple"
excerpt: "Why use two tools when you could use one? Because they solve different problems. Here's how Terraform and Ansible complement each other for complete infrastructure automation."
publishedAt: 2026-03-22
categories: ["Infrastructure", "DevOps", "Automation"]
project: homelab-as-code
featuredImage: /images/covers/terraform-ansible-the-infrastructure-as-code-power-couple.png
draft: false
---
"Just use Terraform for everything." "Ansible can do provisioning too." "Why complicate things with two tools?"

I've heard all of these. And while both tools *can* do more than their primary purpose, there's a reason the industry landed on using them together. They solve fundamentally different problems, and recognizing this leads to cleaner, more maintainable infrastructure.

## The Core Difference

**Terraform** answers: "What infrastructure should exist?"

**Ansible** answers: "How should that infrastructure be configured?"

This isn't just semantics. The distinction shapes how you think about your systems.

Terraform is *declarative*. You describe the desired end state, and Terraform figures out how to get there. "I want two VMs with these specs on this network." Terraform creates them if they don't exist, modifies them if they're different, and leaves them alone if they match.

Ansible is *procedural* (mostly). You describe the steps to configure a system. "Install these packages, create this user, copy this file, start this service." Ansible runs through the steps in order.

Both tools have tried to expand into each other's territory. Terraform has `provisioners` for running scripts. Ansible has modules for cloud provisioning. But using them this way feels like forcing a screwdriver to be a hammer.

## What Terraform Does Best

Terraform excels at managing *resources*: things with a lifecycle that exist independently of your servers.

**Virtual machines**: Create, modify, destroy VMs based on templates. Track which VMs exist, their specifications, and their relationships.

**Networking**: VLANs, subnets, firewall rules, load balancers. Infrastructure that isn't tied to a single machine.

**Cloud services**: Databases, storage buckets, DNS records. Resources that your applications depend on but don't run on your servers.

**State management**: Terraform tracks what it created. It knows the difference between "this VM doesn't exist" and "this VM exists but isn't managed by Terraform."

```hcl
# Terraform: Declare what should exist
resource "proxmox_vm_qemu" "app_server" {
  name        = "app-server"
  target_node = "proxmox1"
  clone       = "ubuntu-template"

  cores  = 2
  memory = 2048

  disk {
    size    = "32G"
    storage = "local-lvm"
  }

  network {
    bridge = "vmbr0"
  }
}
```

This code says "an app server should exist with these specs." Terraform handles:
- Creating it if it doesn't exist
- Updating it if specs changed (or recreating if changes require it)
- Knowing to destroy it if you remove this block

## What Ansible Does Best

Ansible excels at *configuration*: making a server behave the way you want.

**Package management**: Install, update, remove software. Ensure specific versions are present.

**File management**: Template configuration files with variables. Manage permissions and ownership.

**Service management**: Start, stop, enable services. Wait for services to be ready.

**User management**: Create accounts, manage SSH keys, set up sudo rules.

**Orchestration**: Coordinate actions across multiple servers. Run migrations before deploying, health check after.

```yaml
# Ansible: Define how to configure
- name: Configure web server
  hosts: app_servers
  tasks:
    - name: Install Docker
      apt:
        name: docker.io
        state: present

    - name: Create application directory
      file:
        path: /opt/app
        state: directory
        owner: deploy

    - name: Copy docker-compose file
      template:
        src: docker-compose.yml.j2
        dest: /opt/app/docker-compose.yml

    - name: Start application
      community.docker.docker_compose:
        project_src: /opt/app
        state: present
```

This code says "run these steps on the app servers." Ansible handles:
- Connecting to each server
- Running tasks in order
- Skipping tasks that are already complete (idempotency)
- Reporting what changed

## The Workflow

In practice, Terraform and Ansible form a pipeline:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Terraform  │────▶│   Ansible    │────▶│  Application │
│  Provision   │     │  Configure   │     │   Running    │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Step 1: Terraform provisions infrastructure**
- Creates VMs from templates
- Sets up networking
- Outputs IP addresses and connection information

**Step 2: Ansible configures servers**
- Uses Terraform outputs to build inventory
- Hardens OS, installs dependencies
- Deploys application code

**Step 3: Application runs**
- Container orchestration starts services
- Health checks verify deployment

This separation means you can:
- Reprovision infrastructure without reconfiguring (fresh VMs)
- Reconfigure without reprovisioning (update existing VMs)
- Destroy and rebuild everything from scratch

## Connecting Them Together

The handoff between Terraform and Ansible is typically the IP addresses. Terraform creates resources and outputs their addresses. Ansible uses those addresses to connect and configure.

**Terraform outputs:**
```hcl
output "app_server_ip" {
  value = proxmox_vm_qemu.app_server.default_ipv4_address
}

output "db_server_ip" {
  value = proxmox_vm_qemu.db_server.default_ipv4_address
}
```

**Ansible inventory (dynamic or generated):**
```yaml
all:
  children:
    app_servers:
      hosts:
        app-server:
          ansible_host: 192.0.2.10
    db_servers:
      hosts:
        db-server:
          ansible_host: 192.0.2.11
```

Some teams use dynamic inventory scripts that query Terraform state. Others generate static inventory files as part of the deployment pipeline. A third option, and the one I used for this site, is to assign static addresses: the IP lives in the Terraform variables, cloud-init applies it at first boot, and the Ansible inventory lists the same address. It's less clever, but there's nothing to regenerate. All of these work.

## Why Not Just One Tool?

**"Terraform can run provisioners"**

Yes, but provisioners are explicitly documented as a last resort. They run once at creation time, don't track state, and can't be re-run without destroying the resource. They're useful for bootstrapping (installing Python so Ansible can run), not for ongoing configuration.

**"Ansible can provision cloud resources"**

Yes, but Ansible's cloud modules don't track state the way Terraform does. If you run the playbook twice, Ansible doesn't know if it created the resource last time or if someone created it manually. This leads to either duplicates or errors.

**"I'm using [other tool] that does both"**

Some tools try to combine both concerns. These can work, but often end up being mediocre at both jobs. The complexity of doing both well is substantial.

The Unix philosophy applies here: tools that do one thing well compose better than tools that try to do everything.

## Practical Patterns

### Pattern 1: Environment Separation

Use Terraform workspaces or separate state files for different environments, with a variable file per environment:

```
terraform/
├── environments/
│   ├── common.tfvars
│   ├── preprod.tfvars
│   └── prod.tfvars
└── main.tf
```

Selecting the workspace and the variable file together (`terraform workspace select prod`, then `terraform apply -var-file=environments/common.tfvars -var-file=environments/prod.tfvars`) keeps each environment's state separate while sharing one definition.

Use Ansible group_vars for environment-specific configuration:

```
ansible/
├── group_vars/
│   ├── all.yml
│   ├── preprod/
│   └── prod/
└── site.yml
```

### Pattern 2: Roles and Modules

Terraform modules encapsulate reusable infrastructure patterns:

```hcl
module "web_server" {
  source = "./modules/vm"

  name   = "web-1"
  cores  = 2
  memory = 4096
}
```

Ansible roles encapsulate reusable configuration:

```yaml
- hosts: web_servers
  roles:
    - system_hardening
    - docker
    - app_deploy
```

### Pattern 3: Deployment Levels

Create multiple entry points for different scenarios. These don't have to be separate playbooks; tagging roles in one playbook and wrapping the commands in a small script works just as well:

| Scenario | Terraform | Ansible |
|----------|-----------|---------|
| Initial deploy | apply | site.yml (all roles) |
| Code update | (skip) | site.yml, `app` and `deploy` tags only |
| Config change | (skip) | site.yml (all roles) |
| Full rebuild | destroy, apply | site.yml (all roles) |

This avoids running the full stack when you only need a subset. For this site, a `deploy.sh <env> <action>` wrapper mapped actions like `full-stack`, `configure`, and `deploy` onto exactly these combinations.

## The Mental Model

Think of it this way:

- **Terraform** manages your **infrastructure inventory**: what machines exist, what networks connect them, what services they can access.

- **Ansible** manages your **configuration inventory**: what software runs on those machines, how it's configured, what state it should maintain.

Infrastructure changes are relatively rare (add a server, change a network). Configuration changes are frequent (update an application, change a setting). The tools should match the change frequency.

## Conclusion

Using Terraform and Ansible together isn't about complexity. It's about clarity. Each tool has a clear responsibility. When something goes wrong, you know where to look.

Terraform state shows you what infrastructure exists. Ansible playbooks show you how it's configured. Together, they provide a complete picture of your systems that can be version controlled, reviewed, and reproduced.

The best infrastructure is the kind you can delete and recreate without fear. With Terraform and Ansible together, that's not just possible; it's the standard workflow.

---

*Two tools, two concerns, one coherent system. That's the goal.*
