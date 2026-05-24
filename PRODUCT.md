# Reqcore — Product Vision & Goals

## A Modern, Self-Hosted ATS

Reqcore is a lean, open-source Applicant Tracking System (ATS) for recruiting teams who want control over their hiring data and workflow. It supports general hiring use cases with optional AI-assisted screening and scoring.

## Problem Statement

Modern ATS platforms suffer from three structural problems:

1. **Data Hostage**: Companies pay for *access* to their own candidate data. If the subscription lapses, the talent pool disappears.
2. **Opaque AI**: Incumbent platforms use proprietary algorithms to rank candidates. Recruiters cannot see *why* a candidate was surfaced or rejected — creating legal and ethical liability.
3. **Per-Seat Tax**: Adding a hiring manager or recruiter to the platform increases the software bill, punishing growing teams.

## Unique Value Proposition (UVP)

### 1. Ownership over Access
You *own* the infrastructure (Postgres + MinIO). Your talent pool is a permanent asset — not a monthly subscription. Self-host on your own servers or use a managed deployment; either way, the data is yours.

### 2. Auditable Intelligence
The source code is public — anyone can read exactly how the system works. AI features expose ranking logic in a visible **Matching Logic** summary so recruiters can verify and override results. No secret algorithms.

### 3. No Per-Seat Pricing
Reqcore is designed to let companies scale their hiring teams without increasing their software bill.

### 4. Runs on Your Network
By supporting local-first storage (MinIO) and local AI models (Ollama), Reqcore is an ATS where sensitive candidate PII can stay on your private network.

## Target Users

| Persona | Description | Primary Need |
|---------|-------------|--------------|
| **Operations / IT** | Deploys and maintains the stack | Simple self-hosting, Docker Compose, clear infra docs |
| **Recruiter** | Day-to-day user managing candidates and pipeline | Fast candidate pipeline, clean UI, minimal friction |
| **Hiring Manager** | Reviews candidates, makes hiring decisions | Clear candidate comparisons, process visibility |
| **HR Administrator** | Manages org settings, team access, compliance | Multi-tenant control, data ownership, audit trails |

### Who this is for

- **Growing companies** that want an ATS they can host and customize
- **Agencies and consultancies** that hire across roles and clients
- **Teams** that want to own hiring data and integrate AI on their terms
- **Anyone who deploys with Docker** and prefers open source over long procurement cycles

## Core Features (Current & Planned)

### MVP — Foundation
- [x] Multi-tenant organizations (Better Auth + org plugin)
- [x] Job management (CRUD with status workflow: draft → open → closed → archived)
- [x] Candidate management (per-org candidate pool with deduplication by email)
- [x] Application tracking (link candidates to jobs, status workflow)
- [x] Document storage (resumes, cover letters via MinIO/S3)
- [x] Dashboard with pipeline overview
- [x] Organic SEO (sitemap, robots, JSON-LD structured data)

### Phase 2 — Intelligence
- [x] Resume text extraction (PDF/DOCX)
- [x] AI candidate scoring with visible criterion breakdown
- [ ] Skill extraction and matching enhancements
- [ ] Broader local AI support via Ollama (privacy-first)

### Phase 3 — Collaboration
- [x] Team comments and notes on candidates
- [x] Interview scheduling
- [ ] Deeper email integration (send/receive from within Reqcore)
- [ ] Candidate portal (self-service application status)

## Design Principles

1. **Show the Proof**: Decisions should be backed by visible data. If a qualification matched, highlight it. If a candidate is ranked highly, show why.
2. **Efficient UX**: Screens should feel fast and purposeful — keyboard-friendly where it matters, no unnecessary friction.
3. **Progressive Disclosure**: Show summaries first, details on demand. Don't overwhelm with data.
4. **Tone**: Professional, high-integrity, and clear. No marketing fluff in the product UI.

## Success Metrics

- **Time to first hire**: How quickly can a new org go from setup to first candidate hired?
- **Transparency score**: % of AI decisions with visible matching logic
- **Self-hosting success rate**: % of deployments that complete without support tickets
- **Team adoption**: Number of users per org (validates anti-seat-pricing model)
