---
title: "The Watchdog That Kept My Outage Alive"
excerpt: "A Vault Agent token that died every time my laptop slept, the healthcheck I wrote to fix it, and how that healthcheck held a 22-hour lockout open until I taught it when to stop."
publishedAt: 2026-11-24
categories: ["Vault", "Reliability", "Incident Review"]
project: homelab-as-code
featuredImage: /images/covers/the-watchdog-that-kept-my-outage-alive.png
draft: false
---
Most of my homelab automation runs from one machine: a laptop that acts as the Ansible controller. Anything on it that needs a secret gets it from HashiCorp Vault, using a short-lived token kept fresh by Vault Agent. The agent logs in with an AppRole, writes the token to a file (a "sink"), renews it on a schedule, and every script and playbook reads that file. It replaced a standing token that used to live in my home directory, and the tokens it hands out have a one-hour TTL.

I still think that design is right. It also produced two failures that looked identical from the outside and needed opposite fixes. I fixed the first one with a watchdog. The watchdog then made the second one worse, for about 22 hours.

## Failure one: the token that died in its sleep

I'd open the laptop in the morning, run a playbook, and get `permission denied`. `systemctl status vault-agent` said `active (running)`. The journal had nothing useful in it. Restarting the agent fixed it. I got into the habit of restarting it by hand several times a day, which should have been my cue to go look.

The cause was two clocks disagreeing:

- Vault Agent schedules token renewal with Go timers, and Go timers run on `CLOCK_MONOTONIC`. That clock **does not advance while the machine is suspended**.
- The Vault server expires the token on wall-clock time.

Take a one-hour token whose renewal timer is set for about 40 minutes out. The laptop suspends 16 minutes in. When it wakes up the next morning, the agent believes it has about 24 minutes before it needs to renew. The server expired that token hours ago. The agent waits, perfectly content, until its stale timer fires, gets a 403, and re-authenticates. So it does heal itself, but it can take a full renewal interval to notice, and until then every consumer fails against a service that reports healthy.

Once I knew what to look for, the journal signature was a single `renewed auth token` line from hours ago with nothing after it. You can also measure how long a box has spent asleep by comparing two clocks, since `CLOCK_BOOTTIME` keeps counting through suspend and `CLOCK_MONOTONIC` doesn't:

```sh
python3 -c 'import ctypes;t=(ctypes.c_long*2)();l=ctypes.CDLL("libc.so.6");\
l.clock_gettime(1,t);m=t[0];l.clock_gettime(7,t);print("suspended:",(t[0]-m)/3600,"h")'
```

On my laptop that came out to roughly 180 hours of suspend against 71 hours of monotonic uptime. So this was hitting essentially every wake.

### The fix, version one

The obvious fix is a token that outlives any plausible nap. I didn't do that. It gives up the short TTL the whole design rests on, and it still breaks on a long weekend. Instead the Ansible role grew three pieces:

| Unit | What it does |
| --- | --- |
| `vault-agent-resume.service` | Hooked into the sleep targets; re-authenticates on wake. Handles the common case. |
| `vault-agent-healthcheck.timer` | Every 10 minutes, checks the sink token with `lookup-self` and restarts the agent on a real HTTP 403. |
| A polkit rule | Lets the automation user restart that one unit without a password, so tooling can force recovery instead of stalling. `stop` and `disable` stay denied. |

Two details mattered. The healthcheck timer uses `OnCalendar`, not `OnUnitActiveSec`, because a monotonic timer has the exact bug it's trying to catch. And it never restarts on a connection failure. An unreachable Vault means "can't tell," which on a laptop is most of the time.

I tested it against a live dead token, watched the watchdog log `rejected by Vault (HTTP 403) - restarting`, and moved on. I stopped restarting things by hand. Problem solved.

## Failure two: the lockout

Eight days later, Vault auth on the controller went down and stayed down for about 22 hours.

From the outside it looked exactly like the suspend bug. Logins returned 403 and the unit said `active (running)`. So the watchdog did what I built it to do: it saw a 403 and restarted the agent. Ten minutes later it did it again. And again.

What I hadn't accounted for: Vault 1.13 and later has user lockout for auth methods like AppRole. After 5 failed logins it locks that identity and returns 403 to **every** login attempt for 15 minutes, correct credentials included. Each attempt during the window re-arms it.

Now follow the watchdog. Every restart made the agent log in again. Every login during the lockout was a failed login, and every failed login reset the 15-minute window. The window could never elapse, because my own recovery mechanism poked it every 10 minutes, forever, while systemd cheerfully reported everything as running. The outage was being kept alive by the thing I'd written to end outages.

The trigger was upstream of all this. The monthly rotation of the AppRole secret had failed quietly at the start of the month. The rotation script depended on the sink token being valid (the very thing that breaks across suspend), and it wrote the new credential without checking it first. Nothing alerted, the credential went stale, and the failed logins that followed were enough to trip the lockout.

## Telling the two apart

The most useful thing to come out of the incident is a one-request check that needs no admin token. Send a login with the real role ID and a deliberately bogus secret:

| Real secret | Bogus secret | Meaning |
| --- | --- | --- |
| 403 | **403** | Lockout. Vault rejected the request before even checking the credential. |
| 403 or 400 | 400 `invalid role or secret ID` | A genuine credential problem. |
| 200 | 400 | Auth is fine; the problem is somewhere else. |

Normally a garbage secret gets a 400. Under lockout it gets a 403, because Vault refuses before it looks.

The fixes don't overlap. A restart fixes a stale sink and makes a lockout worse. The right response to a lockout is the opposite of what my watchdog was doing: **stop the agent**, leave the window alone until it elapses, and only then try again.

## The fix, version two

The healthcheck now behaves like this:

```
on 403 from lookup-self:
    if restarts so far < 2:
        restart the agent              # still covers the suspend case
    else:
        classify with a bogus-secret login
        if lockout:
            stop the agent             # no more logins, window can expire
            wait 20 minutes            # longer than the 15-minute window
            start it, re-test
            after two failed rounds: stay stopped and page me
```

Its state lives in `/var/lib/vault-agent`, not `/run`. That one bit me during review: the agent's unit uses `RuntimeDirectory=` without `RuntimeDirectoryPreserve`, so systemd deletes the runtime directory the moment the agent stops, and stopping the agent is exactly what the lockout handler does. A watchdog that forgets its retry count every time it intervenes isn't bounded.

I rebuilt the rotation script around the same lesson: recovery code must not depend on the thing it recovers.

- It tries the sink token first (free, no login attempt, no lockout exposure) and falls back to a direct AppRole login from the credential on disk, which still works when the sink is what broke.
- It **test-logs-in with the new secret before installing it**, keeps the previous one, and rolls back if the restarted agent doesn't publish a valid token.
- The timer runs daily, and the script does nothing until rotation is actually due. Same cadence, but a failure now retries in 24 hours instead of 30 days. It also fixed something I hadn't flagged: a laptop can easily sleep straight through a monthly window.

Alerts go to a self-hosted ntfy topic, and its credential is staged at deploy time instead of read from Vault when the alert fires. Every alert on this path is about Vault auth being broken, so an alert pipeline that needed Vault would fail exactly when I needed it.

Before converging, I ran the state machines against stubbed `systemctl` and `curl`: healthy, stale sink, confirmed lockout, off-network, cooldown recovery, rounds exhausted, and for rotation the age gate, a dead sink, a failed mint, and a failed verification.

## Two more surprises

**Changing a timer can fire it.** When I changed the rotation timer from monthly to daily, systemd treated the new schedule's window as already missed, and because the timer has `Persistent=true`, it ran the rotation service immediately at deploy. That was harmless only because the script checks the credential's age before doing anything. The check is now load-bearing, and there's a comment saying so.

**The credential lived 32 days, not 90.** Two months later the same symptoms came back. The 403s were lockout again, but once the window lapsed, the real credential returned 400: it had expired and been cleaned up server-side. The role asked for a 90-day secret TTL, but Vault quietly caps that at the auth mount's maximum lease TTL, which defaulted to the system's 768 hours. Every secret actually lived 32 days and expired two days after the 30-day rotation point, and two failed rotation runs had eaten that margin. Unlocking alone wouldn't have helped. I tuned the mount so it covers the secret's TTL, and the rotation script now asks the server for the secret's real expiration instead of trusting the age of a file on disk.

## What I took away

"Restart on failure" is only safe if a restart can't feed the failure. A watchdog that retries authentication needs a bound, and past that bound it has to classify instead of repeating itself.

`active (running)` was true the entire time. The process was fine; the credential it held was not. Status checks only see their own layer.

The rotation script used the sink, and the alerting used Vault. Both would have been dark at the moment they mattered.

And clocks are a dependency. Anything that schedules on monotonic time and validates on wall time will drift on a machine that sleeps, and nothing will log it.

I'd build the short-TTL design the same way again. The machinery around it now just checks why something failed before it acts.
