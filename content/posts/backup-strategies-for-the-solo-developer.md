---
title: "Backup Strategies for the Solo Developer"
excerpt: "Your side project's data matters. Here's a practical guide to backups that actually work: automated, tested, and ready for the day things go wrong."
publishedAt: 2026-02-04
categories: ["Operations", "DevOps", "Best Practices"]
featuredImage: /images/covers/backup-strategies-for-the-solo-developer.png
draft: false
---
"I'll set up backups later."

Famous last words. We've all been there. The project is working, the deadline is looming, and backups feel like something you can add once things settle down. But things never settle down, and one day you'll SSH into your server to find a corrupted database or a failed disk.

This post is about building a backup strategy that works for small teams and solo developers. Not enterprise-grade complexity, but solid fundamentals that you can set up in an afternoon and trust to work.

## The 3-2-1 Rule

Before diving into implementation, understand the principle: **3-2-1**.

- **3** copies of your data
- **2** different storage types
- **1** offsite location

For a typical web application:
1. **Production database**: the live copy
2. **Local backup**: on different storage (different disk, NAS, etc.)
3. **Remote backup**: cloud storage, a different data center, or another geographic location

This protects against different failure modes:
- Disk failure → restore from local backup (fast)
- Server compromise → restore from remote backup (secure)
- Fire, flood, or theft → restore from remote backup (geographic diversity)

## What to Back Up

Not everything needs the same backup strategy:

**Application code**: Lives in Git. If you're practicing infrastructure as code, your entire application can be rebuilt from your repository. No traditional backup needed; just keep your repos safe (use a hosted service with its own redundancy, or mirror to multiple locations).

**Database**: This is your primary backup concern. User data, content, application state: it all lives here. Databases need regular, consistent backups and tested restore procedures.

**Media/uploads**: User-uploaded files, images, documents. These change less frequently than database data but are equally important. Often stored separately from the database.

**Configuration/secrets**: Environment variables, API keys, certificates. These should be in a secrets manager or encrypted storage, not in your backups (you don't want backups to become a security liability).

## Database Backup Fundamentals

PostgreSQL (and most databases) provide built-in backup tools. Use them.

**Logical backups** (`pg_dump`): Export data as SQL statements. Portable, can restore to different versions, can selectively restore tables. Slower for large databases.

**Physical backups** (filesystem-level): Copy the data directory with a tool like `pg_basebackup`. Fast, but tied to the same major version and needs care to be consistent with a running database.

For most applications under 100GB, logical backups are the right choice. They're simpler, more flexible, and fast enough.

### A Simple Backup Script

```bash
#!/bin/bash
set -euo pipefail

# Configuration
DB_NAME="myapp"
BACKUP_DIR="/var/backups/postgresql"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump "$DB_NAME" | gzip > "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# Remove old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup is not empty
BACKUP_SIZE=$(stat -f%z "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz" 2>/dev/null || stat -c%s "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz")
if [ "$BACKUP_SIZE" -lt 1000 ]; then
    echo "ERROR: Backup suspiciously small ($BACKUP_SIZE bytes)"
    exit 1
fi

echo "Backup complete: ${DB_NAME}_${DATE}.sql.gz ($BACKUP_SIZE bytes)"
```

Key points:
- `set -euo pipefail`: fail fast on errors, including a failed `pg_dump` inside the pipe
- Compression: saves space and transfer time
- Retention policy: don't fill your disk
- Size check: catch empty or failed backups

### Scheduling

Use cron for scheduling. A reasonable schedule:

```cron
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-database.sh daily

# Weekly backup on Sunday at 3 AM
0 3 * * 0 /usr/local/bin/backup-database.sh weekly
```

Why both? Different retention policies:
- Daily backups: keep 30 days
- Weekly backups: keep 12 weeks

This gives you granular recovery for recent issues and long-term protection for data corruption that isn't noticed immediately.

## Getting Copies Off the Box

Backups on the database server's own disk aren't enough. You need copies somewhere else.

**S3-compatible storage** is the most practical choice. Options:
- AWS S3
- Backblaze B2
- Wasabi
- MinIO, RustFS, or another self-hosted S3 server on a NAS
- Any S3-compatible service

A self-hosted bucket on a NAS gets backups off the server, but it lives in the same building. It covers a dead disk or a lost VM, not a fire. For the offsite leg of 3-2-1 you still need a provider or location elsewhere.

Using `rclone` for synchronization:

```bash
# Configure rclone (one-time setup)
rclone config create backups s3 \
    provider=Minio \
    access_key_id=YOUR_KEY \
    secret_access_key=YOUR_SECRET \
    endpoint=https://s3.example.com

# Sync local backups to remote
rclone sync /var/backups/postgresql backups:db-backups/
```

Add this to your backup script:

```bash
# Upload to S3
rclone copy "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz" backups:db-backups/daily/

# Clean up old remote backups
rclone delete backups:db-backups/daily/ --min-age 30d
```

## Testing Your Backups

An untested backup isn't a backup. It's a hope.

**Automated testing**: A monthly restore to a scratch database:

```bash
#!/bin/bash
set -euo pipefail
# Monthly backup test

LATEST_BACKUP=$(rclone lsf backups:db-backups/daily/ | sort | tail -1)

# Download and restore to a scratch database
rclone copy "backups:db-backups/daily/$LATEST_BACKUP" /tmp/
createdb test_restore
gunzip -c "/tmp/$LATEST_BACKUP" | psql -q test_restore

# Run verification queries
RECORD_COUNT=$(psql -t -c "SELECT COUNT(*) FROM users" test_restore)
echo "Restored $RECORD_COUNT user records"

# Cleanup
dropdb test_restore
rm "/tmp/$LATEST_BACKUP"
```

**Manual testing**: Actually restore a backup at least once. Practice the procedure before you need it in an emergency.

Document your restore procedure. When things go wrong, you'll be stressed and possibly sleep-deprived. A clear runbook prevents mistakes.

## Recovery Time Objectives

Understanding your recovery requirements shapes your backup strategy:

**RTO (Recovery Time Objective)**: How long can you be down?

**RPO (Recovery Point Objective)**: How much data can you lose?

| Scenario | Example RTO | Example RPO |
|----------|-------------|-------------|
| Personal blog | 24 hours | 1 week |
| SaaS product | 4 hours | 1 hour |
| E-commerce | 1 hour | 15 minutes |
| Financial system | Minutes | Zero |

For a personal project, daily backups with 24-hour recovery time is probably fine. For a production SaaS, you might need continuous replication and hot standby.

Be realistic about your requirements. Over-engineering backups for a side project is a waste of time. Under-engineering them for a business is a disaster waiting to happen.

## Common Mistakes

**Backing up to the same disk**: If the disk fails, you lose both. Always use separate storage.

**Calling the NAS "offsite"**: A NAS in the same rack protects against hardware failure, not against fire, theft, or ransomware that reaches the NAS too.

**Not testing restores**: The backup file exists, but can you actually restore it? Test regularly.

**Backing up running databases incorrectly**: Copying database files while the database is running can result in corruption. Use proper database backup tools.

**Sharing credentials**: If the application server holds a key that can delete backups, a compromised application can take the backups with it. Give the backup job its own credentials, and consider object locking.

**Keeping secrets in backups**: If your database contains API keys or passwords, your backups are now a security target. Consider encryption or separate secrets management.

**No monitoring**: Backups fail silently. Set up alerts for backup job failures, and for backups that simply stop arriving.

**Ignoring media files**: Database backups are great, but user uploads are equally important. Don't forget them.

## A Complete Strategy

Putting it all together for a typical web application:

```
                       ┌─────────────┐
                       │ Production  │
                       │  Database   │
                       └──────┬──────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐  ┌──────▼─────┐  ┌──────▼──────┐
        │   Daily   │  │   Weekly   │  │ Continuous  │
        │  Backup   │  │   Backup   │  │    WAL*     │
        │ (30 days) │  │ (12 weeks) │  │  (if needed)│
        └─────┬─────┘  └──────┬─────┘  └─────────────┘
              │               │
              └───────┬───────┘
                      ▼
              ┌──────────────┐
              │  S3 Storage  │
              │   (offsite)  │
              └──────────────┘
```

*WAL (Write-Ahead Logging) archiving provides point-in-time recovery for applications that need minimal data loss. Overkill for most personal projects.

**Schedule:**
- Daily at 2 AM: Full database dump, upload to S3, 30-day retention
- Weekly on Sunday at 3 AM: Full database dump, upload to S3, 12-week retention
- Monthly: Test restore to verify backups work

**Monitoring:**
- Alert if backup job fails to run
- Alert if backup file is unusually small
- Alert if S3 upload fails

## How This Site Did It

When this site was self-hosted (it now runs as a static export on GitHub Pages), the database side of this plan ran as described: a cron job on the database server ran `pg_dump`, compressed the dump, uploaded it with `rclone` to a self-hosted S3 bucket on a NAS, confirmed the object landed, and pruned old copies, keeping 30 days of dailies and the last 12 weeklies. Media uploads went straight to the same object storage instead of the application server's disk.

Like most homelab setups it was a work in progress, and the parts of this post I'd have kept investing in were the ones that are easiest to put off: getting a copy fully offsite, running restore tests on a schedule instead of by hand, and alerting on the backup job itself.

## Conclusion

Backups aren't glamorous, but they're essential. The time to set them up is now, not after you've lost data.

Start simple:
1. Write a backup script
2. Schedule it with cron
3. Copy backups off the server, and eventually offsite, with rclone
4. Test the restore procedure

This basic setup takes an afternoon and protects against most common data loss scenarios. You can add complexity later if you need it.

The best backup strategy is one that actually runs. Don't let perfect be the enemy of good. Get something working today, and improve it over time.

---

*The best time to set up backups was when you started the project. The second best time is now.*
