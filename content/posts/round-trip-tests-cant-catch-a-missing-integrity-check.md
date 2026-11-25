---
title: "Round-Trip Tests Can't Catch a Missing Integrity Check"
excerpt: "While building WinRM message sealing for wsmancer, my Kerberos RC4 path decrypted tampered ciphertext without complaint and every test passed. Here's why, and the mutation testing and live differentials I now use to prove a crypto check actually runs."
publishedAt: 2026-11-24
categories: ["Security", "Go", "Testing"]
project: wsmancer
featuredImage: /images/covers/round-trip-tests-cant-catch-a-missing-integrity-check.png
draft: false
---
[wsmancer](https://github.com/sresarehumantoo/wsmancer) is a WinRM shell I wrote in Go. It speaks the PowerShell Remoting Protocol end to end, so command results come back as typed objects instead of scraped console text. To work against a stock Windows listener at all, it has to implement message sealing, which is what this post is about.

Short version: I had a Kerberos sealing path that would accept attacker-chosen plaintext, every unit test was green, and the inbound `unwrap` entry point sat at 0.0% coverage. The tests weren't wrong. They were asking a question that could never fail.

## Why a WinRM client needs its own crypto

The default WinRM listener sets `AllowUnencrypted=false`. People often read that as "requires HTTPS." It doesn't. It means the SOAP body must be sealed with keys derived from the NTLM or Kerberos handshake. Even on plain HTTP port 5985, every request and response is encrypted and signed at the message layer. A client that can't seal gets a 401, which is why a lot of naive WinRM clients don't work against a hardened box.

So wsmancer has two sealing providers:

- `ntlmseal`: NTLMv2 (including pass-the-hash) with RC4 sealing and an HMAC-MD5 signature over a sequence number and the plaintext, per MS-NLMP.
- `krbseal`: Kerberos with RFC 4121 wrap tokens. AES etypes delegate the payload crypto to a well-tested upstream library. RC4 (etype 23) delegates nothing: the RFC 4757 key derivations and checksum are hand-rolled out of HMAC-MD5, MD5 and raw RC4.

Encryption alone doesn't get you much. If the client decrypts a response without verifying it, anyone on the path who can flip bits in RC4 ciphertext controls what you read. You need inbound verification before you can call it integrity-checked in both directions.

## The bug: tampered ciphertext, accepted

I found the gap through coverage: `krbseal`'s `unwrap` had never been executed by a test, and the RC4 helper underneath it was only exercised by a round-trip test. Before changing anything I wrote an exploit to confirm it was real: take a token sealed over `<Objs>Administrator</Objs>`, XOR `plain ^ chosen` into the ciphertext (RC4 is a stream cipher, so that's all it takes), and pass it back in.

The function returned `<Objs>GUEST........</Objs>`. Attacker-chosen text, accepted and rendered as if the target had said it. `unwrapRC4` derived the sequence number, decrypted, and returned the plaintext without ever recomputing the checksum.

The existing tests never saw it because every test in the file built its input with the production `wrap` and asserted that the unwrap side read it back. That's a round-trip test. It exercises the decrypt path and nothing else, because a round trip never tampers. No round-trip test can catch a missing integrity check; the tamper *is* the experiment.

The exploit is still in the repo, inverted, as `TestRC4RejectsTamperedCiphertext`.

## The two etypes needed different fixes

I couldn't fix one etype and assume the other was covered:

- AES already had payload integrity from the etype's own HMAC. What it lacked was the RFC 4121 comparison of the cleartext 16-byte token header against the encrypted copy the sender echoes inside the ciphertext. Without that, the header's flags and sequence number were attacker-writable even though the payload wasn't.
- RC4 had nothing. It needed the checksum recompute *and* a direction check. The direction check isn't there for symmetry: RFC 4757 keys both directions identically, so the client's own request reflected back at it recomputes a valid checksum. AES can't be attacked that way because the two directions use different key usages.

The NTLM side does it in the order the protocol requires. The RC4 handle is one continuous keystream, so the body has to be decrypted before the checksum bytes that follow it:

```go
plain := make([]byte, len(sealed))
k.serverSeal.XORKeyStream(plain, sealed)

got := make([]byte, 8)
k.serverSeal.XORKeyStream(got, sig[4:12])

mac := hmac.New(md5.New, k.serverSign)
seq := make([]byte, 4)
binary.LittleEndian.PutUint32(seq, k.serverSeq)
mac.Write(seq)
mac.Write(plain)

// Constant-time, following Samba's ntlmssp_check_packet.
if !hmac.Equal(got, mac.Sum(nil)[:8]) {
    return nil, errBadSignature
}
```

## Mutation testing in CI

Fixing the bug was easy. Knowing next time was harder, and the answer was mutation testing: break the production code on purpose, one way at a time, and confirm a test notices. Two committed scripts do this in CI, breaking `ntlmseal` twenty ways and `krbseal` fourteen ways, and each exits non-zero unless every mutant is caught.

The NTLM differential exposed something about the suite itself. Structural tests recompute expected values with the same primitives the production code uses, so they pin layout (offsets, buffer bounds, keystream alignment) but a self-consistent implementation of the *wrong algorithm* passes them untouched. Vector tests compare against the values published in MS-NLMP itself. Five mutants are caught *only* by the vectors, things like dropping the uppercase on the username in the NTOWFv2 derivation, or signing the ciphertext instead of the plaintext. Client and server derive the same wrong answer, so everything structural still passes. Moving `vectors_test.go` aside and rerunning makes exactly those five go MISSED.

The Kerberos side had the same shape. The RC4 derivation chain is shared between `wrapRC4` and `unwrapRC4`, so breaking it breaks both ends identically and any round trip still closes. Ten of the fourteen `krbseal` mutants are caught by the vectors alone. The ground truth there is impacket's output rather than a published RFC vector, and the docs say so.

A one-off differential on the new checks was more interesting for what it *didn't* catch. Three of eight mutants survived:

| Mutant | Result |
| --- | --- |
| RC4: skip checksum compare (the original bug) | caught |
| RC4: skip direction tag | caught |
| AES: skip echoed-header compare | caught |
| RC4: compare only 1 of 8 checksum bytes | missed: a 1-byte compare still rejects 255/256 tampers, so no small test catches it deterministically |
| AES: skip `SentByAcceptor`/`Sealed` flag check | missed by design: subsumed by the header compare and key usages |
| AES: skip TOK_ID check | missed by design: an early reject for a better error message |

That table sorted the checks that provide a guarantee from the ones that provide an error message. I rewrote the code comments to match what the differential showed instead of what the checks looked like they did.

## Unit tests can't prove a real server agrees

A perfect mutation score proves the code implements the spec. It doesn't prove a real Windows listener agrees. Since an integrity failure is deliberately terminal, a wrong reading of the RFC would break every session. And a green run against a live box isn't enough either, because a check that never runs passes identically. So the live verification is also a differential: build mutants that make a check reject a *valid* Windows response, run them against a Server 2016 domain controller in my lab, and expect them to fail.

| Build | Live result |
| --- | --- |
| baseline RC4 | session OK |
| baseline AES256 | session OK |
| RC4 checksum keyed with the wrong signing constant | session FAILED |
| AES echoed-header comparison inverted | session FAILED |

The mutants dying is the part that matters. It means the real server's checksum and header were actually recomputed and matched, so the baseline pass is the check succeeding rather than being skipped.

That method found a second real bug on the NTLM side. A mutant that compared the sequence number against the wrong value did fail, but with the wrong symptom: `XML syntax error ... illegal character code U+0010`. `unwrap` returned a plain error for a sequence mismatch, the transport only treated `errBadSignature` as terminal, so it filed the failure under "not really a sealed body," handed the caller raw ciphertext, and left the desynced connection open. A unit test at the `unwrap` boundary could never see it, because `unwrap` was returning the right error. The fix was an `errOutOfSequence` sentinel that both branches treat as terminal, pinned by `TestIntegrityFailuresAreTerminal`.

The live runs caught a bug in my harness too. The first attempt wrapped a shell *function* in `timeout`, which can't invoke functions, so every invocation errored, every mutant "failed as expected," and the differential reported a clean sweep while testing nothing. That's why the table has two baseline rows that must come back OK.

## Integrity isn't freshness

With the checks in, I moved on to replay protection. NTLM refuses a message whose sequence number isn't the one it expects. I assumed Kerberos could do the same, and measured before writing it. Instrumenting `unwrap` showed the server's sequence number was a constant zero across a session while mine climbed from 1 to 10, on both etypes. An `expected++` check would refuse the second response of every session.

So within the sealing layer, a captured response can be replayed and will verify. That's a smaller hole than the one I'd just closed (you can only replay what the server really said, not choose new text), but it's open, and it can't be closed there.

The fix lives a layer up. WS-Addressing already carries a correlator: the client stamps each request with a random `MessageID`, and the server echoes it back as `RelatesTo` on every response, faults included. In my go-psrp fork, every one of the eleven request methods funnels through one function, so that's where the check went:

```go
if got := env.Header.RelatesTo; !strings.EqualFold(got, requestID) {
    return fmt.Errorf("%w: got RelatesTo %q, sent MessageID %q",
        ErrUncorrelatedResponse, got, requestID)
}
```

A missing `RelatesTo` fails the check instead of skipping it; otherwise stripping one header is the bypass. The compare is case-insensitive for a real reason: the library generated one request's ID in lowercase and every other one in uppercase, and the server echoes whatever case it was given. A case-sensitive compare would have that one call reject its own server's reply.

## Takeaways

The failure that kept recurring in this project was tests passing for the wrong reason. So now I build the broken version and confirm the test notices before I believe a pass, and I check the mutated binary actually compiled, because a failed `go build` leaves the old one in place. I keep ground truth that doesn't share primitives with the code. Every live differential gets a row that must succeed. And I measure the protocol before designing against it; I would not have guessed the Kerberos sequence number was a constant zero.

All of the harnesses and the measurements behind this post are documented in the [wsmancer repo](https://github.com/sresarehumantoo/wsmancer), and the transport patches live in my [go-psrp fork](https://github.com/sresarehumantoo/go-psrp).
