---
title: "RustFS Setup Guide"
excerpt: "Let's set up a basic RustFS server. RustFS is open-source, S3-compatible object storage you can run on your own machine and test with the same tools you'd use against AWS."
publishedAt: 2026-01-25
categories: ["Homelab", "Storage", "AWS", "Tutorial"]
featuredImage: /images/covers/rustfs-setup.png
draft: false
---
> **Update, November 2026:** I originally ran RustFS on TrueNAS as the media and backup store for the self-hosted version of this site. TrueNAS has since been retired, and RustFS now runs in an LXC container on a Proxmox host. The commands below were rechecked against the upstream README as of November 2026 (latest stable release: 1.0.6).

Today we'll be exploring **RustFS**, setting it up locally so we can test content creation features and get familiar with its capabilities. RustFS is an **S3-compatible object storage system**, which means it behaves much like Amazon S3, but it can run entirely on your own machine.

Because RustFS is S3 compatible, it's a great tool for experimenting with **AWS-style workflows at zero cost**. You can use familiar tools like the AWS CLI, SDKs, or S3-compatible libraries without paying cloud fees. That makes RustFS especially useful for learning how object storage works, prototyping cloud-ready applications, or supporting local and on-prem development that may later move to the cloud.

In this guide, we'll get RustFS running locally and verify that we can create and access objects.

## What Is RustFS?

[RustFS](https://github.com/rustfs/rustfs) is an open-source object storage server written in Rust and released under the Apache 2.0 license. Its goal is a **fast, reliable, S3-compatible object store** that developers can run locally or deploy in their own environments.

Since it speaks the S3 API, many existing tools and applications that already support S3 work with RustFS with little to no modification. The project tracks exactly which S3 features it covers in a compatibility matrix linked from its README.

## Prerequisites

Before getting started, make sure you have:

- A Unix-like environment (Linux, macOS, or WSL)
- Docker (or Podman)
- AWS CLI, for testing S3 compatibility
- Git, only if you want the Compose file or to build from source

## Running RustFS With Docker

Docker is the simplest way to run RustFS for local testing, and it makes it easy to tear everything down later.

RustFS listens on two ports:

| Port | Purpose |
|------|---------|
| 9000 | S3 API |
| 9001 | Web console |

The container runs as a non-root user with UID/GID `10001:10001`, so any host directory you bind-mount has to be writable by that user, or startup fails with permission errors:

```bash
mkdir -p data logs
sudo chown -R 10001:10001 data logs
```

Then start the server. If you don't set credentials, RustFS falls back to `rustfsadmin` / `rustfsadmin`, so set your own even for a local test:

```bash
docker run -d --name rustfs \
  -p 9000:9000 -p 9001:9001 \
  -e RUSTFS_ACCESS_KEY=localadmin \
  -e RUSTFS_SECRET_KEY=change-me-please \
  -v "$(pwd)/data:/data" \
  -v "$(pwd)/logs:/logs" \
  rustfs/rustfs:1.0.6
```

Pinning a version tag rather than `latest` keeps the setup reproducible. RustFS releases often, so check the [releases page](https://github.com/rustfs/rustfs/releases) for the current version.

With Podman, the `:Z,U` mount options take care of SELinux labels and ownership, so the `chown` step isn't needed:

```bash
podman run -d --name rustfs -p 9000:9000 -p 9001:9001 \
  -e RUSTFS_ACCESS_KEY=localadmin \
  -e RUSTFS_SECRET_KEY=change-me-please \
  -v "$(pwd)/data:/data:Z,U" -v "$(pwd)/logs:/logs:Z,U" \
  rustfs/rustfs:1.0.6
```

## Using Docker Compose

The repository also ships a minimal Compose file:

```bash
git clone https://github.com/rustfs/rustfs.git
cd rustfs
docker compose -f docker-compose-simple.yml up -d
```

It runs RustFS across four named volumes, plus a one-shot helper container that fixes volume ownership. Its credentials are the `rustfsadmin` defaults, marked `CHANGEME` in the file, so edit `RUSTFS_ACCESS_KEY` and `RUSTFS_SECRET_KEY` before starting it. The larger `docker-compose.yml` adds an observability stack (Grafana, Prometheus, Jaeger), which is more than a local test needs.

## Building From Source

If you'd rather not use Docker, RustFS can be built with Rust's toolchain. This is useful if you want to explore the codebase, experiment with features, or debug behavior locally. From a clone of the repository, `./build-rustfs.sh` builds a release binary into `target/release` (`./build-rustfs.sh --help` lists the options). The README also covers a one-line install script, a Nix flake, and a Helm chart.

## Verifying the Setup

Once RustFS is running, check that it's accepting requests and behaving like an S3-compatible service.

The S3 port answers a health check:

```bash
curl -i http://localhost:9000/health
```

The web console is at `http://localhost:9001`. Log in with the access key and secret key you set.

Next, point the AWS CLI at your local instance. RustFS's default region is `us-east-1`:

```bash
export AWS_ACCESS_KEY_ID=localadmin
export AWS_SECRET_ACCESS_KEY=change-me-please
export AWS_DEFAULT_REGION=us-east-1
```

Then create a bucket, upload an object, list it, and download it again:

```bash
aws --endpoint-url http://localhost:9000 s3 mb s3://test-bucket
echo "hello from rustfs" > hello.txt
aws --endpoint-url http://localhost:9000 s3 cp hello.txt s3://test-bucket/
aws --endpoint-url http://localhost:9000 s3 ls s3://test-bucket/
aws --endpoint-url http://localhost:9000 s3 cp s3://test-bucket/hello.txt hello-copy.txt
```

If all four operations work, your RustFS setup is functioning correctly.

When you're done, `docker rm -f rustfs` removes the container. Your objects stay in `./data` until you delete it.

## Why This Is Useful for Content Creation

Running RustFS locally is especially helpful when building or testing content pipelines. You can simulate how assets, uploads, and generated files would behave in a real cloud environment without relying on external services.

This makes it easier to:

- Develop offline
- Write automated tests
- Prototype cloud-ready architectures
- Avoid vendor lock-in early in a project

## Next Steps

With RustFS running locally, the next steps might include:

- Integrating it with an existing application
- Testing SDK compatibility (JavaScript, Python, Rust, etc.)
- Exploring authentication and access controls
- Evaluating performance and storage behavior
