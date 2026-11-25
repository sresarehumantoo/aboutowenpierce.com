---
title: "WAN Failover Without Moving the Cable"
excerpt: "My home edge router was highly available on paper, except for the one cable that mattered. How I made the WAN follow VRRP with one cloned MAC and an isolated switch segment, and the ISP outage that showed me which failures should never trigger a failover."
publishedAt: 2026-11-24
categories: ["Networking", "VyOS", "High Availability"]
project: homelab-as-code
featuredImage: /images/covers/wan-failover-without-moving-the-cable.png
draft: false
---
My home network's edge is VyOS, and for a long time it was "highly available" the way a lot of homelab HA is: two router VMs on two different hypervisors, running VRRP so the LAN gateway addresses float to whichever one is healthy. If a host died, the other router took over every internal gateway within a few seconds.

Except the internet. The cable modem had exactly one Ethernet cable, plugged into one hypervisor. VRRP could move the gateway all it liked; if the router holding the cable went away, the new master had no WAN. Failover meant walking to the rack and moving a cable by hand, and each router's "health check" was effectively a cable detector. The node without the cable sat permanently in FAULT, which was technically correct and practically useless.

So I set out to take the cable out of the failover path. An ISP outage later taught me I'd also picked the wrong trigger.

## Share the modem, not the cable

The modem only ever needs to see one device. The plan was to put the modem and every router's WAN NIC on the same isolated Layer 2 segment, and make sure only one of those NICs is ever alive at a time.

```
                     modem
                       |
          +------------+-------------+
          |   isolated WAN segment   |   (access ports only, no SVI,
          |     on the core switch   |    never on any trunk)
          +---+--------+---------+---+
              |        |         |
           router A  router B  router C
           WAN NIC   WAN NIC   WAN NIC
           (up)      (down)    (down)
             ^
         VRRP master
```

The WAN segment is a dedicated VLAN that exists on the switch only as untagged access ports for the modem and each router's WAN NIC. It has no IP interface on the switch, and it's deliberately absent from every trunk, every hypervisor bridge VLAN list, and every router VLAN list. I don't want the raw internet one typo away from a tagged port.

Every router clones the same WAN MAC. Cable modems typically lock onto the first MAC they see and won't talk to a new one without a reboot, but the *same* MAC showing up on a different switch port is invisible to the modem. I validated this live before building anything else: the lease moved between nodes with the same public address and no modem reboot.

That creates its own problem. Two live NICs with the same MAC on one segment make the switch's forwarding table flap between ports, so only the VRRP master may have its WAN NIC up. Keepalived (which VyOS uses for VRRP) runs transition scripts when the sync group changes state:

```
set high-availability vrrp sync-group FAILOVER transition-script master '/config/scripts/wan-takeover.sh'
set high-availability vrrp sync-group FAILOVER transition-script backup '/config/scripts/wan-release.sh'
set high-availability vrrp sync-group FAILOVER transition-script fault  '/config/scripts/wan-release.sh'
set high-availability vrrp sync-group FAILOVER transition-script stop   '/config/scripts/wan-release.sh'
```

The takeover script raises the WAN NIC and gets the DHCP client running. The release script darks it, and the order of operations in there mattered more than I expected:

```bash
# 1. Link down first: nothing can egress from the cloned MAC past this line.
ip link set "$WAN_IF" down

# 2. Deliberate stop. The unit's ExecStop sends a DHCPRELEASE, which is
#    harmless only because the link is already down.
timeout 25 systemctl stop "dhclient@${WAN_IF}.service"

# 3. The release can re-raise the link on its way out; down it again.
ip link set "$WAN_IF" down
ip -4 addr flush dev "$WAN_IF"
```

The DHCP client has to be stopped deliberately rather than killed. Its unit restarts on failure, so a killed client would respawn and bring the link back up every cycle.

## Inverting the election

The old health model said "I have the cable and the internet works, so I'm eligible." In the new model the standby's WAN NIC is down *by design*, so anything tracking the WAN interface directly would wedge the standby in FAULT forever. I removed WAN interface tracking from the VRRP groups entirely.

Each VRRP group now tracks a dummy interface, and the router's health check owns it: up means "eligible to be master," and taking it down demotes the node. A standby always keeps it up. Only the current master evaluates whether it should demote itself.

A side effect I liked: the standby stopped living in FAULT. It's now a healthy BACKUP, so FAULT means something again.

## Building it without breaking the switch

The core switch is configured over SNMP, and I already had a scar from that. Earlier in the year, a bulk write that tried to set VLAN membership for every port at once crashed the switch's management CPU, and the reboot meant to recover it came back at factory defaults. Everything went down, and recovery took hours.

So the switch work here followed a hard rule from that incident: never write a whole port bitmask from scratch. Read the current membership, flip exactly one port's bit, write it back, and confirm the management plane is still alive before touching the next port. Slow and boring, on purpose.

I ordered the cutover so only one step had any impact:

1. Create the WAN segment on the switch (all target ports were down, so zero impact).
2. Converge the standby router first, so its WAN NIC is dark *before* it's ever patched into the shared segment.
3. Patch the standby in.
4. Converge the master.
5. Move the modem cable onto the switch. This was the one scheduled window of WAN downtime.
6. Drill it: stop keepalived on the master, watch the standby promote with the same public address, start it again and watch it preempt back.

Rollback at any point was "plug the modem straight back into the master." The config stays correct with a direct cable; carrier presence just becomes the arbiter again.

The drill passed in both directions. Later a bare-metal router joined as the primary master (it only needed one more access port on the WAN segment), and one of the original VM routers was retired.

## The outage that rewrote the trigger

Node death and planned maintenance were covered. The open question was how the master should decide that *its own path* to the modem is broken, so it hands off to a peer.

My first answer was to ping the modem's management address out of the WAN NIC. If the master couldn't reach the modem three checks in a row, it demoted itself, with a cooldown to stop flapping. Internet reachability was alert-only, because both routers share one ISP: if the internet is down, failing over just trades one dead WAN for another.

Then the ISP had an outage and the modem went quiet. Its management address stopped answering. The master read that as a local-path fault and demoted. The standby took over a WAN that was exactly as dead, and when the cooldown expired, it cut over again. Two failovers, zero benefit, each adding a few seconds of disruption to an outage nobody could fix.

Meanwhile the one signal that would have told the truth held steady the whole time: carrier on the master's WAN NIC never dropped.

I was using a signal that could fail for **shared** reasons (the modem, the ISP) to decide about **node-local** faults. With the modem behind the switch, link carrier on a router's WAN NIC covers exactly the node-side faults: the NIC, its cable, its switch port. Nothing shared affects it. So now:

- Carrier loss is the only demote signal.
- The modem probe is alert-only.
- The demote cooldown went from five minutes to thirty, so even a bad decision can't flap quickly.

That leaves one gap, a NIC that wedges with link still up. For that I built an optional corroboration step that reads the switch. If the master's port shows no frames from the router, or frames the router never counted, that's positive evidence of a node-side fault. If the modem's own port recently bounced, or the switch doesn't answer, it never demotes. It's built and disabled by default, and until I turn it on, that case gets a manual demote.

## The ten-second handback

The same outage exposed a smaller problem. The expected failover gap was a few seconds: missed VRRP adverts, raise the NIC, the modem re-ACKs the existing lease. The handback that day took about ten and a half seconds, made up of link autonegotiation, a lost first DHCP DISCOVER, and VyOS's DHCP hooks.

There shouldn't have been a DISCOVER at all. The DHCP client's stop action runs a release, and a release rewrites the lease file with the lease marked expired, so every takeover started from scratch instead of re-requesting the lease it already had. The release script now saves the lease file before the stop and restores it after.

There was also a race. VyOS's own link daemon stops the DHCP client while a NIC negotiates and starts it again on carrier up. My takeover script was starting it too, and that collision triggered another release. Now the takeover script only starts the client itself if carrier was already up, or if nothing else has started it within 15 seconds.

## What I'd tell myself at the start

Before choosing a failover trigger, sort the failures into shared and local. If the signal can fail for a reason both nodes share, failing over can only make things worse. Link carrier is about the least interesting signal on the box, and it's the one scoped exactly to what a failover can fix.

The duplicate-MAC problem is handled by never letting two NICs be up, enforced on every state transition. I'm not relying on elections being clean.

Guard the config tool against its own inventory. Earlier in this project I converged the bare-metal profile against a VM router, which swapped its WAN and trunk interfaces and took out the LAN gateway. The role now refuses to push config unless the live WAN interface has the expected cloned MAC and isn't the trunk.

Still on the list: connection-state sync so NAT flows survive a failover (today they reset, which I tolerate), and an alert if two routers ever report master at once. The ISP itself is out of scope. One modem and one provider is a single point of failure, and no amount of VRRP fixes that.
