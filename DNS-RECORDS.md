# Qlisted — DNS records (Hostinger)

DNS records to add for **qlisted.com** in Hostinger → *Domains → qlisted.com → DNS / Nameservers*.

- **Domain:** qlisted.com
- **Server IP:** 31.97.158.10
- **Mail host (shared mailcow):** mail.entrequipos.com
- The Hostinger **Name** field auto-appends `.qlisted.com`, so `@` = the root domain.

> Generated 2026-06-25. DKIM pulled live from mailcow (`/api/v1/get/dkim/qlisted.com`, selector `dkim`).

---

## A. Core mail — REQUIRED (4 records)

| # | Type | Name | Value / Points to | Priority | TTL |
|---|------|------|-------------------|----------|-----|
| 1 | MX | `@` | `mail.entrequipos.com` | `10` | 3600 |
| 2 | TXT (SPF) | `@` | `v=spf1 mx a:mail.entrequipos.com ~all` | — | 3600 |
| 3 | TXT (DKIM) | `dkim._domainkey` | *(long value below — one line)* | — | 3600 |
| 4 | TXT (DMARC) | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:postmaster@qlisted.com` | — | 3600 |

**DKIM value for record #3** (paste as a single string, no line breaks):

```
v=DKIM1;k=rsa;t=s;s=email;p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArtx0zXoL95IgwOUWsP6YKc3jUBGW6+9obtj5Y+hhGlS+j8M4BM2GpI6ASPpcKTdBfmR0Cw5QAbvnurafKx17AqdYNiFEJCHe9RB+a8o2YY6jk6Wk9RvoPlwT5lp67WEE+q/hkm1RaPRehgbNqVP4dWTaAGr+iqXFKGf/kxKaNA8e/nLfmb6CHi195shlNXnTU3If5/PGhw3RXXN7TGJ8c7cAcaXbGuPT58Gr+ac/VH0nLGQnkGOyLr1HFirwZwmk8RZWlD4i3bUqZ+XqINnIwvnBuJJ5exp40nAe85Sg7RVvd+2ont+aWBmM4KKsnlSrusRZmN0/NYOJlARLRW/nHQIDAQAB
```

---

## B. Mail-client auto-config — OPTIONAL (recommended)

Lets staff add a mailbox with just email + password (Outlook / Thunderbird / Apple Mail self-configure).

### CNAMEs

| # | Type | Name | Points to | TTL |
|---|------|------|-----------|-----|
| 5 | CNAME | `autodiscover` | `mail.entrequipos.com` | 3600 |
| 6 | CNAME | `autoconfig` | `mail.entrequipos.com` | 3600 |

### SRV records

Hostinger SRV form: Name (`_service._proto`), Priority, Weight, Port, Target.

| # | Type | Name | Priority | Weight | Port | Target | TTL |
|---|------|------|----------|--------|------|--------|-----|
| 7  | SRV | `_autodiscover._tcp` | 1 | 1 | 443 | `mail.entrequipos.com` | 3600 |
| 8  | SRV | `_submission._tcp`   | 0 | 1 | 587 | `mail.entrequipos.com` | 3600 |
| 9  | SRV | `_submissions._tcp`  | 0 | 1 | 465 | `mail.entrequipos.com` | 3600 |
| 10 | SRV | `_imaps._tcp`        | 0 | 1 | 993 | `mail.entrequipos.com` | 3600 |
| 11 | SRV | `_pop3s._tcp`        | 0 | 1 | 995 | `mail.entrequipos.com` | 3600 |

---

## C. Monitoring — OPTIONAL (2 records)

| # | Type | Name | Points to | TTL |
|---|------|------|-----------|-----|
| 12 | A | `errors` | `31.97.158.10` | 3600 |
| 13 | A | `logs`   | `31.97.158.10` | 3600 |

- `errors.qlisted.com` → GlitchTip (error tracking)
- `logs.qlisted.com` → Dozzle (live container logs)

---

## Notes / gotchas

- **Check for conflicts first.** If qlisted.com already has an **MX** or a root **TXT/SPF** record, edit/replace it — do NOT add a second SPF (two SPF records is invalid). DKIM, DMARC, the CNAMEs, SRVs and A records all have unique names, so they're safe to add as-is.
- **DKIM is one long line** (2048-bit). Paste it whole even if the field looks short; Hostinger stores/chunks it fine.
- **DMARC policy.** `p=quarantine` routes failures to spam. To observe first without affecting delivery, use `p=none` and tighten to `quarantine`/`reject` later.
- **Auto-config TLS.** Once #5/#6 resolve, mailcow auto-issues Let's Encrypt certs for `autodiscover/autoconfig.qlisted.com` — no action needed. The SRV records (#7–11) target `mail.entrequipos.com`, which already has a valid cert, so they work immediately.
- **Trailing dot.** If Hostinger requires it on CNAME/SRV targets, use `mail.entrequipos.com.` — most panels add it automatically.
- **Propagation.** 5 min – 2 hrs typically.

## After the records are live

1. **Mail:** send a real `no-reply@qlisted.com` → external Gmail test and confirm SPF / DKIM / DMARC all pass.
2. **Monitoring:** add `errors.qlisted.com` + `logs.qlisted.com` to the shared Caddyfile for HTTPS, then enable browser-side (frontend) error capture for the app.
