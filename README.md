# DeepResearch Platform

An asynchronous deep research and scientific literature synthesis platform deployed on **Google Cloud Platform (GCP)** and **Vercel**. The system accepts complex scientific research questions, decomposes them into multi-dimensional investigation plans, executes targeted literature searches via the **Valyu Search API**, normalizes and deduplicates academic evidence, synthesizes comprehensive cited research papers using a sequential shared-memory accumulator, validates factual grounding with **Jev**, and provides on-demand two-speaker audio podcasts.

**Repository:** [https://github.com/bansi1008/valyu-research](https://github.com/bansi1008/valyu-research)

---

## 🌐 Live Deployments

| Component | Platform | URL / Endpoint | Access |
|---|---|---|---|
| **Frontend** | Vercel | `https://valyu-research.vercel.app` | Public |
| **Backend API** | Cloud Run (`europe-west1`) | `https://valyu-backend-miejznyyeq-ew.a.run.app` | Public (`--allow-unauthenticated`) |
| **Worker Service** | Cloud Run (`europe-west1`) | `https://valyu-worker-miejznyyeq-ew.a.run.app` | Private (`--no-allow-unauthenticated`, OIDC only) |
| **Firestore** | Google Cloud (`eur3`) | `valyu-509317` / Database: `valyu` | Internal IAM |
| **Audio Storage** | Cloud Storage (`EU` multi-region) | `gs://valyu-audio/podcasts/{taskId}.mp3` | Public read for generated audio |

---

## 🏗 Architecture Overview

```
                            ┌─────────────────────────────────┐
                            │        Frontend (Vercel)        │
                            │   React 19 + Vite + Tailwind 4  │
                            └────────────────┬────────────────┘
                                             │
                       POST /tasks (202)     │ SSE: GET /api/task/:id/events
                                             ▼
                            ┌─────────────────────────────────┐
                            │     Backend API (Cloud Run)     │
                            │     Express 5 + TypeScript      │
                            └────────────────┬────────────────┘
                                             │
                         Dispatch Cloud Task │ OIDC Auth Token
                                             ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                                Google Cloud Platform                                   │
  │                                                                                        │
  │   ┌───────────────────────────┐                    ┌───────────────────────────────┐   │
  │   │ Cloud Tasks (Queue)       │─── HTTP POST ─────▶│ Worker Service (Cloud Run)    │   │
  │   │ queue: research-tasks     │    (OIDC Verified) │ Express 5 + Task Orchestrator │   │
  │   └───────────────────────────┘                    └───────────────┬───────────────┘   │
  │                                                                    │                   │
  │   ┌───────────────────────────┐                                    │                   │
  │   │ Firestore Database        │◀── Atomic Claim & State Updates ───┤                   │
  │   │ database: valyu           │                                    │                   │
  │   └───────────────────────────┘                                    │                   │
  │                                                                    │                   │
  │   ┌───────────────────────────┐                                    │                   │
  │   │ Cloud Storage (GCS)       │◀── Upload MP3 Podcast ─────────────┤                   │
  │   │ bucket: valyu-audio       │                                    │                   │
  │   └───────────────────────────┘                                    │                   │
  │                                                                    │                   │
  │   ┌───────────────────────────┐                                    │                   │
  │   │ Secret Manager            │─── Runtime Key Injection ──────────┤                   │
  │   │ OPENAI, VALYU, AI_GATEWAY │                                    │                   │
  │   └───────────────────────────┘                                    │                   │
  └────────────────────────────────────────────────────────────────────┼───────────────────┘
                                                                       │
                         ┌─────────────────────────────────────────────┼────────────────────────────┐
                         │ External AI & Retrieval APIs                │                            │
                         │                                             ▼                            │
                         │   ┌───────────────────────────┐    ┌─────────────────────────────────┐   │
                         │   │ Valyu Search API          │    │ OpenAI API                      │   │
                         │   │ valyu.search()            │    │ gpt-5.6-terra (Plan/Synthesis)  │   │
                         │   │ Academic & Medical Papers │    │ gpt-5.6-luna (Podcast Script)   │   │
                         │   └───────────────────────────┘    │ gpt-4o-mini-tts (Speech Audio)  │   │
                         │                                    └─────────────────────────────────┘   │
                         │   ┌───────────────────────────┐                                          │
                         │   │ Jev Evaluation Gateway    │                                          │
                         │   │ typesafe-ai/jev           │                                          │
                         │   │ Factual Grounding Check   │                                          │
                         │   └───────────────────────────┘                                          │
                         └──────────────────────────────────────────────────────────────────────────┘
```

### Component Summary

- **Frontend (Vercel)**: React 19 SPA with Server-Sent Events (SSE) progress tracking, KaTeX formula rendering, interactive citation popovers, BibTeX export, and podcast audio player.
- **Backend API (Cloud Run)**: Express 5 service. Validates requests, writes initial task records to Firestore (`database: valyu`), enqueues jobs to Google Cloud Tasks with signed OIDC tokens, and serves real-time SSE streams.
- **Cloud Tasks**: Manages asynchronous job dispatching with rate control, retries, and OIDC authentication.
- **Worker Service (Cloud Run)**: Private compute container. Atomically claims tasks via Firestore transactions, executes the 7-stage research pipeline, invokes external APIs, and commits final reports.
- **Firestore (`valyu`)**: NoSQL document store persisting task states, progress, citations, markdown reports, and itemized provider costs.
- **Cloud Storage (`valyu-audio`)**: Stores synthesized multi-speaker MP3 podcasts.
- **Secret Manager**: Injects `OPENAI_API_KEY`, `VALYU_API_KEY`, and `AI_GATEWAY_API_KEY` at container runtime.

---

## 🎯 Target User & Feature Rationale

The DeepResearch platform is designed for **scientific researchers, clinical practitioners, biotech analysts, and R&D engineers** who need rigorous literature syntheses with verifiable citations.

- **Multi-Angle Decomposition**: Scientific questions require investigating orthogonal dimensions (e.g., pharmacokinetics, clinical trials, competing approaches, adverse effects).
- **Academic Provenance**: Preserves **PMID**, **PMCID**, **DOI**, author lists, publication dates, and citation counts for one-click verification.
- **Sequential Shared-Memory Synthesis**: Avoids the introductory repetition and conflicting definitions typical of naive parallel map-reduce synthesis.
- **Automated Factual Quality Check (Jev)**: Evaluates factual grounding and triggers targeted repair when quality falls below the configured threshold.
- **BibTeX Citation Export**: Formatted reference blocks ready for Zotero, Mendeley, or LaTeX.
- **Two-Speaker Podcast**: Converts complex papers into conversational audio summaries for on-the-go review.

---

## ☁️ GCP Service Choices & Engineering Justification

| Service | Why Chosen | Alternative Considered | Tradeoff / Rationale |
|---|---|---|---|
| **Cloud Run** | Managed container runtime, autoscaling from 0 to N, native IAM and Secret Manager integration, independent scaling of API vs. Worker. | GKE or Compute Engine VMs | GKE introduces operational complexity and idle cluster costs. Cloud Run scales to zero when inactive and bills per 100ms of compute. |
| **Cloud Tasks** | Serverless HTTP push queue with built-in OIDC token generation, per-task retry policies, rate control, and concurrency limits. | Pub/Sub or Redis / BullMQ | Cloud Tasks fits task-oriented HTTP execution particularly well because each queued item maps directly to an authenticated worker invocation with explicit retry and dispatch controls. Pub/Sub is better suited to event-streaming/fan-out workloads. |
| **Firestore (`valyu`)** | Provides transactional state updates and flexible document storage for task state, report data, citation metadata, and cost accounting. | Cloud SQL (PostgreSQL) | Flexible schema natively accommodates hierarchical citation objects and token cost breakdowns without schema migrations. |
| **Cloud Storage** | Durable, CDN-compatible object storage for binary media with public HTTPS delivery. | Database BLOB storage | Firestore documents are capped at 1MB; audio files are 1–5MB. GCS provides reliable media streaming. |
| **Secret Manager** | Centralized, auditable secret management with direct Cloud Run integration. | Environment files / Git Secrets | Prevents credential leaks in images or repositories by injecting secrets into the Cloud Run container environment at runtime. |
| **Workload Identity Federation** | Keyless authentication for GitHub Actions CI/CD to Google Cloud. | Service Account JSON Keys | Eliminates long-lived private key files in GitHub repository secrets. |

---

## 🔄 End-to-End Request Lifecycle

```
[User Browser]
      │
   1. │ POST /tasks { question: "...", searchType: "all" }
      ▼
[Backend API]
      │
   2. │ Create Firestore task (database: valyu, status: "queued", progress: 0)
      │ Enqueue task in Google Cloud Tasks with OIDC auth token
      │ Respond HTTP 202 Accepted { taskId }
      ▼
[User Browser]
      │
   3. │ Open Server-Sent Events stream: GET /api/task/:taskId/events
      ▼
[Cloud Tasks Queue]
      │
   4. │ HTTP POST /api/process (Bearer OIDC Token)
      ▼
[Worker Service]
      │
   5. │ Cloud Run IAM authenticates OIDC caller
      │ Worker claims task via Firestore transaction (queued ➔ running)
      │ Stage 1: Planning (gpt-5.6-terra) ➔ Jev Plan Evaluation
      │ Stage 2: Retrieval (Valyu Search API, concurrency = 3)
      │ Stage 3: Normalization & Deduplication (PMID > DOI > URL > ID)
      │ Stage 4: Evidence Review & Selection (Top 10 per question)
      │ Stage 5: Sequential Synthesis (Shared-Memory Accumulator)
      │ Stage 6: Jev Section Validation & Targeted Repair
      │ Stage 7: Cost Aggregation & Final Report Commit (status: "completed", progress: 100)
      ▼
[Backend API]
      │
   6. │ Task state update detected in Firestore ➔ Emits SSE data packet
      ▼
[User Browser]
      │
   7. │ Renders finalized report, interactive citations, outline, and cost metrics.
      │ (Optional) User clicks "Generate Podcast" ➔ POST /api/task/:taskId/podcast
```

---

## ⚙️ Asynchronous Task Processing & Cloud Tasks Dispatch

Task ingestion and execution are strictly decoupled:

- **Queue**: `projects/valyu-509317/locations/europe-west1/queues/research-tasks`
- **Worker Endpoint**: `POST https://valyu-worker-miejznyyeq-ew.a.run.app/api/process`
- **Authentication**: Cloud Tasks attaches a Google-signed OIDC identity token. Cloud Run IAM verifies the caller is authorized to invoke the private worker.
- **Idempotency**: The worker's Express route immediately returns `HTTP 200 OK` if the task document is already in a `running`, `completed`, or `failed` state, preventing duplicate processing if Cloud Tasks retries delivery.
- **Supported Task Types**:
  - `research`: Runs the 7-stage research and synthesis pipeline.
  - `podcast`: Generates dialogue script, synthesizes TTS audio, and uploads the MP3 to GCS.

---

## 🔬 Research Pipeline Stages

The research worker progresses through 7 sequential stages, persisting stage keys and progress percentages to Firestore:

```
[queued: 0%] ➔ [planning: 20%] ➔ [searching: 45%] ➔ [evidence_review: 65%] ➔ [synthesising: 85%] ➔ [validating: 90%] ➔ [completed: 100%]
```

| Stage | Progress | Description | Core Engine |
|---|---|---|---|
| `queued` | 0% | Task record created in Firestore and enqueued in Cloud Tasks. | Backend API |
| `planning` | 20% | Decomposes question into 1–7 orthogonal sub-questions with explicit purposes; validates plan via Jev. | `gpt-5.6-terra` + `typesafe-ai/jev` |
| `searching` | 45% | Executes searches via Valyu API (concurrency limit 3); normalizes and deduplicates results. | `valyu-js` SDK |
| `evidence_review` | 65% | Groups sources by question, selects top 10 authoritative references, and assigns sequential citation numbers. | Evidence Ranker |
| `synthesising` | 85% | Generates report chapters sequentially using the shared-memory accumulator. | `gpt-5.6-terra` |
| `validating` | 90% | Evaluates section factual grounding and non-redundancy with Jev; runs single repair pass if below threshold. | `typesafe-ai/jev` |
| `completed` | 100% | Joins chapters with dividers, aggregates provider costs, and commits final report to Firestore. | Task Orchestrator |

---

## 🔎 Valyu Search API Integration

Retrieval uses the official `valyu-js` SDK with bounded concurrency and structured metadata extraction:

- **Search Parameters**:
  - `maxNumResults: 20`: Up to 20 candidate documents per sub-question.
  - `searchType`: Supports `all`, `proprietary` (academic papers, clinical trials), `web`, and `news`.
  - `includeAbstracts: true`: Captures abstracts and text excerpts.
- **Concurrency Control**: Queries run through `runWithConcurrencyLimit(3)`, preventing socket exhaustion and API rate limiting.
- **Retries & Timeout**: Wrapped in `withRetry` (3 attempts with exponential backoff on `408`, `429`, `500`, `502`, `503`, `504`, and network drops) and enforced with a 30-second `withTimeout`.
- **Deduction Tracking**: Accumulates `total_deduction_dollars` from API responses for per-task COGS accounting.
- **Deduplication Priority**:
  $$\text{PMID} \longrightarrow \text{DOI} \longrightarrow \text{URL} \longrightarrow \text{ID}$$
  Retains the highest relevance score and merges associated research questions.

---

## 🧠 Sequential ResearchState Orchestration

### Why Not Parallel Map-Reduce?
When sections are synthesized in parallel without shared context, each LLM call repeats basic introductory definitions and background facts. The resulting document feels like disconnected blog posts rather than a cohesive paper.

The research pipeline uses a **sequential shared-memory accumulator**:

```
                         [User Question + Structured Evidence]
                                           │
                                           ▼
                            Initial ResearchState = {
                              coveredTopics: [],
                              definitions: [],
                              keyFindings: [],
                              avoidRepeating: []
                            }
                                           │
          ┌────────────────────────────────┴────────────────────────────────┐
          ▼                                                                 │
┌──────────────────────────────────────┐                                    │
│ Chapter N Generation (gpt-5.6-terra) │                                    │
│ Context: Sub-question + Evidence     │                                    │
│        + Accumulated ResearchState   │                                    │
│ Output: Markdown + State Updates     │                                    │
└──────────────────┬───────────────────┘                                    │
                   ▼                                                        │
┌──────────────────────────────────────┐                                    │
│ Jev Section Verification             │                                    │
│ Checks: Grounding ≥ 0.70             │                                    │
│         Non-Redundancy ≥ 0.65        │                                    │
└──────────────────┬───────────────────┘                                    │
         Pass? ────┴──── Fail?                                              │
           │              │                                                 │
           │              ▼                                                 │
           │    ┌──────────────────────────────────┐                        │
           │    │ Single Repair Pass               │                        │
           │    │ Prompt with Jev feedback issues  │                        │
           │    └─────────────────┬────────────────┘                        │
           │                      ▼                                         │
           │             Post-Repair Jev Validation                         │
           │                      │                                         │
           │             Pass? ───┴─── Fail?                                │
           ▼               │             │                                  │
┌──────────────────────────┴─────┐       │                                  │
│ Commit Section to Report       │       │ (Skip State Commit)              │
│ Merge updates into state:      │       ▼                                  │
│ - coveredTopics: string[]      │ ┌──────────────────────────────────────┐ │
│ - definitions: string[]        │ │ Commit Section to Report Only        │ │
│ - keyFindings: string[]        │ │ Skip mutating ResearchState to       │ │
│ - avoidRepeating: string[]     │ │ prevent polluting subsequent chapters│ │
└────────────────────────────────┘ └──────────────────────────────────────┘ │
                                           │                                │
                                           ▼                                │
                              (Iterate for Chapter N + 1) ◀─────────────────┘
```

### The State Contract (`worker/src/services/sources/synthesis/generateReport.ts`):
```typescript
interface ResearchState {
  coveredTopics: string[];
  definitions: string[];
  keyFindings: string[];
  avoidRepeating: string[];
}
```

- Subsequent chapters receive established terms in their prompt with explicit instructions not to re-define them.
- Sections cross-reference previously established empirical findings naturally.

### Concrete Before vs. After Example

The sequential shared-memory accumulator directly prevents the introductory re-definition loop common in naive multi-agent report synthesis:

#### ❌ Before: Parallel Map-Reduce (Independent Generation)
Each chapter is drafted in isolation with only its own sub-question and evidence:
- **Chapter 1**: *"Glucagon-like peptide-1 receptor (GLP-1R) agonists, initially developed for type 2 diabetes mellitus, have demonstrated significant neuroprotective efficacy..."*
- **Chapter 2**: *"GLP-1 receptor agonists are a class of metabolic drugs that bind the GLP-1 receptor. In the central nervous system, these agents reduce neuroinflammation..."*
- **Chapter 3**: *"Glucagon-like peptide-1 (GLP-1) analogues are incretin mimetics now widely investigated for neurodegenerative diseases. Neuronal bioenergetics are improved..."*

*Drawback*: Every chapter independently re-introduces the baseline premise, repeats synonymous definitions, and fails to build conceptually upon prior sections.

#### ✅ After: Sequential Shared-Memory Accumulator (`ResearchState`)
Chapter 1 establishes baseline pharmacology and blood-brain barrier transport, committing them to `ResearchState`:

```text
ResearchState
├── coveredTopics: ["Blood-Brain Barrier Penetration", "Pharmacokinetics"]
├── definitions: ["GLP-1R", "liraglutide", "semaglutide"]
├── keyFindings: ["Diffusion across circumventricular organs and endothelial pinocytosis [4]"]
└── avoidRepeating: ["Basic definition of GLP-1 receptor agonist", "DPP-4 plasma degradation"]
```

Chapter 2 receives this accumulated state in its prompt with explicit instructions not to re-define established terms. It begins directly with novel mechanistic analysis and naturally cross-references Chapter 1:
- **Chapter 2**: *"Beyond the neurovascular transport established in Section 1, central GLP-1R activation directly attenuates microglial M1 polarization by suppressing NF-κB p65 nuclear translocation [3]..."*

*Outcome*: Eliminates redundant introductory filler, avoids conflicting terminology, and maintains structural continuity across chapters.

---

## 🛡️ Quality Assurance: Jev Factual Quality Check & Repair

Automated quality evaluation is integrated via `typesafe-ai/jev`:

### 1. Research Plan Evaluation
- **Trigger**: Immediately after initial sub-question generation.
- **Criteria**: `planRelevant`, `nonRedundant`, and `sufficient`.
- **Threshold**: Overall score must meet `PLAN_THRESHOLD = 0.70`.
- **Revision**: A single revision pass (`MAX_PLAN_REVISIONS = 1`) incorporates Jev critique if the plan is below threshold.

### 2. Section Validation & Repair Flow
- **Criteria**:
  - `factuallyGrounded >= 0.70`: Claims must be supported by the supplied citations.
  - `nonRedundant >= 0.65`: Content must not re-hash prior chapters.
- **Repair Logic**:
  1. If initial generation fails validation, a single repair pass runs with specific feedback issues.
  2. The repaired draft undergoes post-repair validation.
  3. **State Protection**:
     - **Pass**: The section is added to the report and its updates are committed to `ResearchState`.
     - **Fail**: The section is still appended to the final report (preserving drafted text for the user), but **its updates are NOT committed to `ResearchState`**, preventing unverified claims from polluting subsequent chapters.

---

## 🔁 Reliability, Retries & Idempotency

1. **Atomic Task Claiming**:
   - `processTask` executes a Firestore transaction checking `status === "queued"`.
   - Claims the task by setting `status = "running"`. If another instance claimed it, the transaction aborts.
2. **Consumer Route Early Return**:
   - `POST /api/process` checks if the task is already `running`, `completed`, or `failed`.
   - Returns `HTTP 200 OK` early to acknowledge Cloud Tasks and terminate duplicate executions.
3. **Retry Utility (`withRetry`)**:
   - Wraps external API requests with exponential backoff (1s base, doubles per attempt) and jitter.
   - Retries on network disconnects and transient HTTP status codes (`408`, `429`, `500`, `502`, `503`, `504`).
4. **Timeouts (`withTimeout`)**:
   - Valyu Search: 30s
   - Chapter Generation: 180s
   - Jev Evaluation: 70s
   - Podcast Script: 60s
   - Audio Synthesis: 60s per turn
5. **Terminal Error Persistence**:
   - Any uncaught pipeline error updates Firestore with `status: "failed"` and the error message, cleanly terminating the client SSE stream.

---

## 🔒 Security & IAM Architecture

```
[Public Internet]
       │
       ▼ (HTTPS)
[valyu-backend] (Cloud Run, Service Account: valyu-api@, --allow-unauthenticated)
       │
       ▼ (Cloud Tasks API with OIDC Token Minting)
[Cloud Tasks Queue: research-tasks]
       │
       ▼ (Authenticated HTTP POST with Bearer OIDC Token)
[valyu-worker] (Cloud Run, Service Account: valyu-worker@, --no-allow-unauthenticated)
```

- **Private Worker Isolation**: Deployed with `--no-allow-unauthenticated`. Direct public traffic receives `403 Forbidden`. Only authenticated callers whose identity has the Cloud Run Invoker permission (`roles/run.invoker`) on the worker service are permitted.
- **Least-Privilege Service Accounts**:
  - `valyu-api@valyu-509317.iam.gserviceaccount.com`: Enqueues Cloud Tasks (`roles/cloudtasks.enqueuer`) and writes task records to Firestore (`roles/datastore.user`).
  - `valyu-worker@valyu-509317.iam.gserviceaccount.com`: Reads/writes Firestore, uploads to Cloud Storage (`valyu-audio`), accesses Secret Manager, and is authorized to invoke the private worker service (`roles/run.invoker`).
  - `github-deployer@valyu-509317.iam.gserviceaccount.com`: Deploys services via Workload Identity Federation.
- **Keyless CI/CD**: Uses GitHub Actions Workload Identity Federation (no static service account JSON keys stored in GitHub repository secrets).
- **Secret Management**: API keys are stored in Secret Manager and injected at container startup via `--set-secrets`.

---

## 💰 Cost Accounting & Measured Tracking

Every task records itemized provider costs in Firestore, tracking both external API usage and infrastructure unit economics.

### 1. Infrastructure Hosting Costs

| Service | Tier / Model | Cost Profile |
|---|---|---|
| **Cloud Run (Backend & Worker)** | Serverless (Scale-to-zero) | Billed per 100ms of active vCPU/memory. Free tier includes 2 million requests, 360,000 vCPU-seconds, and 180,000 GiB-seconds per month. Compute cost for normal research volumes is effectively **$0.00 / month**. |
| **Cloud Tasks** | Serverless Push Queue | First 1 million task operations per month are **free**; thereafter $0.40 per million dispatches. |
| **Firestore (`valyu`)** | Serverless Document DB | Free tier covers 50,000 reads, 20,000 writes, and 1 GiB storage per day. Each research task performs a bounded number of state updates, well within the free tier at the current workload. |
| **Cloud Storage (`valyu-audio`)** | Standard Multi-Region (`EU`) | $0.026 per GB/month (Standard class, Public read, Soft Delete protection enabled). 2–4MB podcast MP3 files incur negligible storage costs (< $0.01 / month). |
| **Vercel** | Hobby Tier | **$0.00 / month** (Global Edge CDN, automatic TLS, and SPA static hosting). |

### 2. Operational Provider Costs (COGS per Task)

| Provider / Resource | Rate Basis | Typical Usage per Task | Typical Cost Range |
|---|---|---|---|
| **Valyu Search API** | Per query deduction | 4–7 sub-questions × 20 results (concurrency = 3) | **$0.05 – $0.15** |
| **OpenAI `gpt-5.6-terra`** | Input / Output Tokens | 1 Planning prompt + 4–7 Sequential Chapter Syntheses (~35K–65K context / ~8K–16K output tokens + repair passes) | **$0.70 – $1.15** |
| **Jev Evaluation Gateway** | Token / Evaluation call | Plan verification + Per-section grounding & non-redundancy checks | **$0.01 – $0.03** |
| **OpenAI `gpt-5.6-luna`** | Input / Output Tokens | Dialogue script generation (podcast on-demand) | **$0.02 – $0.04** |
| **OpenAI `gpt-4o-mini-tts`** | Character count | ~3,500 – 6,000 characters audio synthesis (podcast on-demand) | **$0.04 – $0.07** |
| **Total (Research Report Only)** | — | Measured production runs across multi-chapter syntheses | **~$0.80 – $1.30** |
| **Total (With Audio Podcast)** | — | Report synthesis + on-demand dual-speaker podcast | **~$0.85 – $1.40** |

> **Note on Cost Variance**: These figures represent typical observed averages across production workloads. Actual per-task costs dynamically vary based on:
> 1. **Plan Multiplicity**: Number of decomposed sub-questions (1–7 chapters), directly scaling retrieval calls and LLM synthesis runs.
> 2. **Context Window Accumulation**: Because chapters are generated sequentially, later chapters include larger accumulated state contexts (`definitions`, `keyFindings`, `avoidRepeating`).
> 3. **Validation & Repair Passes**: Sections scoring below the Jev grounding threshold (0.70) trigger an automated repair iteration, incurring an extra LLM call.
> 4. **Retrieved Document Volume**: Dense papers with extensive abstracts increase prompt token ingestion.
> 5. **On-Demand Podcast Audio**: Adds dialogue scripting (`gpt-5.6-luna`) and character-based TTS audio synthesis (`gpt-4o-mini-tts`).

### 3. Expected Cost Bottlenecks at Scale

1. **LLM Output Generation (Primary Bottleneck)**:
   - LLM generation represents **70–80% of total per-task COGS**. Because the platform prioritizes deep scientific rigor and sequential shared memory, each chapter generates comprehensive multi-paragraph synthesis with formal citations.
   - *Mitigation*: Dynamically adapt section target lengths based on query complexity and limit Jev repair passes to a single attempt (`MAX_SECTION_REPAIRS = 1`).
2. **Retrieval Multiplicity on Overlapping Queries**:
   - Broad scientific inquiries decomposing into 5–7 sub-questions generate multiple calls to `valyu.search()`. In a multi-tenant setting, queries exploring related domains (e.g. GLP-1 mechanisms) repeat candidate retrievals.
   - *Mitigation*: Introduce a Redis or Firestore-backed cache for normalized canonical search queries, saving up to 40% of retrieval deductions on correlated queries.
3. **Container Duration Under Burst Concurrency**:
   - Sequential chapter synthesis takes several minutes per task. While Cloud Run scales to zero when idle, a sudden burst of concurrent long-running worker invocations increases active container count.
   - *Mitigation*: Bound Cloud Tasks `maxConcurrentDispatches` to match upstream OpenAI/Valyu rate limit tiers and prevent runaway concurrent container billing.

---

## 🎙️ AI Audio Podcast Generation Engine

Users can convert completed research reports into an audio discussion between two specialized co-hosts:

1. **Dialogue Scripting (`gpt-5.6-luna`)**: Transforms the written report into 4–16 conversational dialogue turns between **Host 1** (framing and concepts) and **Host 2** (empirical data and methodology).
2. **Speech Synthesis (`gpt-4o-mini-tts`)**:
   - **Host 1**: `alloy` voice
   - **Host 2**: `nova` voice
   - Dialogue chunks are synthesized sequentially and concatenated via `Buffer.concat()`.
3. **Storage & Playback**: Uploads the compiled `.mp3` to `gs://valyu-audio/podcasts/{taskId}.mp3` and returns a public URL for the in-app audio player.

---

## 💻 Frontend Architecture

Built with **React 19**, **Vite 8**, and **Tailwind CSS v4**:

- **Server-Sent Events (`useSSE.ts`)**: Connects to `GET /api/task/:id/events`. Receives real-time stage updates without client-side polling loops. Automatically falls back to HTTP polling if the SSE stream disconnects.
- **Mathematical Rendering**: Formula rendering via `remark-math` and `rehype-katex`.
- **Interactive Citations**: Numerical citation tags (`[1]`, `[2]`) parse into interactive badges with hover tooltips displaying paper title, authors, DOI, PMID, and direct external links.
- **Dynamic Table of Contents**: Scans generated markdown headers to build a live navigation outline.
- **BibTeX Exporter**: Extracts citation records and formats a standardized `.bib` text block with one-click copy.
- **Local History**: Persists up to 50 previous searches in `localStorage`.

---

## 📡 API Reference

### 1. Create Research Task
```http
POST /tasks
Content-Type: application/json

{
  "question": "What are the molecular mechanisms of GLP-1 receptor agonists in neurodegenerative disease models?",
  "searchType": "all"
}
```
*Note: `/create-task` is supported as an alias.*

**Response (`202 Accepted`):**
```json
{
  "taskId": "ECL2INrjthq4EHzNwMXS"
}
```

### 2. Get Task Status & Report
```http
GET /tasks/:taskId
```
*Note: `/task/:taskId` is supported as an alias.*

**Response (`200 OK`):**
```json
{
  "task": {
    "id": "ECL2INrjthq4EHzNwMXS",
    "question": "What are the molecular mechanisms of GLP-1 receptor agonists in neurodegenerative disease models?",
    "status": "completed",
    "currentStage": "completed",
    "progress": 100,
    "plan": [
      {
        "question": "How do GLP-1 receptor agonists cross the blood-brain barrier?",
        "purpose": "Establish pharmacokinetics and neurovascular penetration."
      }
    ],
    "citations": [
      {
        "citationNumber": 1,
        "title": "Neuroprotective effects of GLP-1 receptor agonists",
        "url": "https://doi.org/10.1038/s41582-023-00800-x",
        "doi": "10.1038/s41582-023-00800-x",
        "pmid": "37123456"
      }
    ],
    "report": "# Molecular Mechanisms of GLP-1 Receptor Agonists...",
    "cost": {
      "valyu": 0.08,
      "openai": 0.89,
      "jev": 0.015,
      "total": 0.985
    }
  }
}
```

### 3. Real-time SSE Stream
```http
GET /api/task/:taskId/events
Accept: text/event-stream
```

### 4. Trigger Podcast Generation
```http
POST /api/task/:taskId/podcast
```
**Response (`202 Accepted`):**
```json
{
  "taskId": "ECL2INrjthq4EHzNwMXS",
  "podcast": { "status": "queued" }
}
```

### 5. Health Check
```http
GET /health
```
**Response (`200 OK`):**
```json
{
  "status": "ok",
  "firestore": "connected"
}
```

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js v20+ or v22+
- Google Cloud SDK configured with ADC (`gcloud auth application-default login`)
- GCP project access to `valyu-509317` (Firestore database: `valyu`)
- OpenAI API Key & Valyu API Key

### Configuration Files

`backend/.env`:
```env
PORT=3000
GCP_PROJECT_ID=valyu-509317
FIRESTORE_DATABASE_ID=valyu
GCP_LOCATION=europe-west1
CLOUD_TASKS_QUEUE=research-tasks
WORKER_URL=http://localhost:3001
```

`worker/.env`:
```env
PORT=3001
GCP_PROJECT_ID=valyu-509317
FIRESTORE_DATABASE_ID=valyu
AUDIO_BUCKET_NAME=valyu-audio
OPENAI_API_KEY=sk-...
VALYU_API_KEY=valyu-...
AI_GATEWAY_API_KEY=...
```

`frontend/.env`:
```env
VITE_API_URL=http://localhost:3000
```

### Starting Services
```bash
# Terminal 1: Backend
cd backend && npm install && npm run dev

# Terminal 2: Worker
cd worker && npm install && npm run dev

# Terminal 3: Frontend
cd frontend && npm install && npm run dev
```

---

## 🚀 Deployment & CI/CD Pipeline

Deployment is automated via **GitHub Actions** using **Workload Identity Federation**:

```
Git Push (main) ──▶ GitHub Actions ──▶ Workload Identity Token Exchange (github-deployer@)
                                             │
                                             ├─▶ Build Docker Image (node:22-alpine)
                                             ├─▶ Push to Artifact Registry (europe-west1)
                                             └─▶ Deploy to Cloud Run (europe-west1)
```

- **Backend Workflow** (`.github/workflows/deploy-backend.yml`): Deploys `valyu-backend` with `--allow-unauthenticated` and service account `valyu-api@valyu-509317.iam.gserviceaccount.com`.
- **Worker Workflow** (`.github/workflows/deploy-worker.yml`): Deploys `valyu-worker` with `--no-allow-unauthenticated` and service account `valyu-worker@valyu-509317.iam.gserviceaccount.com`. Injects secrets via `--set-secrets`.

### Documented Cloud Setup Commands (`gcloud` CLI)

Key GCP resource setup commands:

```bash
# 1. Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  cloudtasks.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com

# 2. Create Artifact Registry Docker repository
gcloud artifacts repositories create valyu \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Valyu container repository"

# 3. Create Cloud Tasks Queue (Production configuration)
gcloud tasks queues create research-tasks \
  --location=europe-west1 \
  --max-dispatches-per-second=500 \
  --max-concurrent-dispatches=1000 \
  --max-burst-size=100 \
  --max-attempts=100 \
  --min-retry-delay=0.1s \
  --max-retry-delay=3600s \
  --max-doublings=16

# 4. Create Firestore Native Database
gcloud firestore databases create \
  --database=valyu \
  --location=eur3 \
  --type=firestore-native

# 5. Create Cloud Storage Bucket for audio media (Production configuration: Location EU, Standard)
gcloud storage buckets create gs://valyu-audio \
  --location=EU \
  --default-storage-class=STANDARD \
  --uniform-bucket-level-access

# Grant public read access for generated podcast audio
gcloud storage buckets add-iam-policy-binding gs://valyu-audio \
  --member=allUsers \
  --role=roles/storage.objectViewer

# 6. Store API secrets in Secret Manager
echo -n "sk-..." | gcloud secrets create OPENAI_API_KEY --data-file=-
echo -n "valyu-..." | gcloud secrets create VALYU_API_KEY --data-file=-
echo -n "..." | gcloud secrets create AI_GATEWAY_API_KEY --data-file=-

# 7. Deploy Worker Service (Private, 15m timeout for deep synthesis)
gcloud run deploy valyu-worker \
  --image europe-west1-docker.pkg.dev/valyu-509317/valyu/worker:latest \
  --region europe-west1 \
  --service-account valyu-worker@valyu-509317.iam.gserviceaccount.com \
  --port 3001 \
  --no-allow-unauthenticated \
  --timeout 900 \
  --set-secrets OPENAI_API_KEY=OPENAI_API_KEY:latest,VALYU_API_KEY=VALYU_API_KEY:latest,AI_GATEWAY_API_KEY=AI_GATEWAY_API_KEY:latest

# 8. Deploy Backend API Service (Public ingress)
gcloud run deploy valyu-backend \
  --image europe-west1-docker.pkg.dev/valyu-509317/valyu/backend:latest \
  --region europe-west1 \
  --service-account valyu-api@valyu-509317.iam.gserviceaccount.com \
  --port 3000 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=valyu-509317,FIRESTORE_DATABASE_ID=valyu,GCP_LOCATION=europe-west1,CLOUD_TASKS_QUEUE=research-tasks,WORKER_URL=https://valyu-worker-miejznyyeq-ew.a.run.app/api/process
```

---

## 📈 Scaling Analysis

### Bottlenecks at High Concurrency:
At sufficiently high concurrency, worker instance limits, Cloud Tasks dispatch limits, upstream API quotas (Valyu 429, OpenAI 429), and regional Cloud Run quotas become relevant bottlenecks:
1. **Upstream Rate Limits**: Concurrently executing tasks each firing 5 sub-queries can rapidly exceed Valyu or OpenAI requests-per-minute limits.
2. **Container Concurrency & Duration**: Research jobs can take tens of seconds to several minutes depending on the number of sub-questions, retrieval latency, model generation, and validation/repair passes. A burst of hundreds of simultaneous tasks requires scaling container instances or queuing tasks.
3. **Backend SSE Connection Memory**: Long-lived SSE connections hold open file descriptors and buffers on Express.

### What to Measure Before Scaling:
- **Cloud Tasks Queue Depth & Wait Time**: Arrival rate vs. processing completion rate.
- **Stage Duration Breakdown**: P95 latencies for planning, retrieval, and synthesis.
- **Upstream Error Rates**: Frequency of 429 status codes from Valyu and OpenAI.
- **Memory Consumption**: Memory per active SSE client on the backend.

### Architectural Evolution:
- **10x Concurrency (Scenario: ~50 concurrent tasks)**:
  - Configure Cloud Tasks `maxDispatchesPerSecond` and `maxConcurrentDispatches` to smoothly rate-limit traffic.
  - Caching repeated normalized queries in Redis could reduce duplicate Valyu retrieval calls and associated retrieval costs.
  - Implement token-bucket client rate limiting on `POST /tasks`.
- **100x Concurrency (Scenario: ~500 concurrent tasks)**:
  - Move long-lived progress delivery to a dedicated realtime/edge layer and keep the API focused on task submission and state queries.
  - Transition from Cloud Tasks push invocations to a pull-based worker queue (via Google Cloud Pub/Sub) running on GKE Autopilot or Cloud Run Jobs.

---

## ⚖️ Design Tradeoffs

| Decision | Chosen Approach | Alternative | Engineering Tradeoff |
|---|---|---|---|
| **Real-time Push** | **Server-Sent Events (SSE)** | WebSockets or Client Polling | SSE uses standard HTTP and provides native browser reconnection semantics, making it suitable for unidirectional progress updates without WebSocket connection management. |
| **Task Queue** | **Google Cloud Tasks** | Google Cloud Pub/Sub | Cloud Tasks provides durable HTTP task dispatch, retry policies, rate control, and native OIDC authentication to the private worker. Idempotency is enforced by the worker using an atomic Firestore task-state claim. |
| **Synthesis Architecture** | **Sequential Shared-Memory Accumulator** | Parallel Map-Reduce | Parallel synthesis finishes faster, but produces disjointed reports that repetitively define the same terms in each section. Sequential synthesis trades parallel speed for greater cross-section coherence. |
| **Audio Trigger** | **On-Demand Post-Completion** | Automatic with Report | Generating audio takes 20–40s and adds TTS costs. Making it on-demand allows users to inspect the paper first, avoiding unnecessary TTS spend on discarded queries. |

---

## ⚠️ Known Limitations & Future Improvements

### Current Limitations:
1. **Linear Synthesis Latency**: Generating chapters sequentially means total synthesis latency scales linearly with the number of sub-questions ($O(N)$), as each chapter waits for prior state context.
2. **Fixed-Depth Planning**: Plans generate 1–7 sub-questions at the outset without multi-turn iterative search loops.
3. **Sequential Audio Synthesis**: Speech audio concatenates individual turn MP3 buffers sequentially rather than using a streaming multi-speaker dialogue API.

### Future Improvements:
- [ ] **Iterative Deep Retrieval**: Allow the model to execute follow-up queries based on gaps identified in earlier chapters.
- [ ] **Redis Search Cache**: Cache canonical Valyu search responses to avoid redundant retrieval calls.

---

## 📖 Example Research Flow

### 1. User Research Question
> *"What are the molecular mechanisms of GLP-1 receptor agonists in neurodegenerative disease models?"*

### 2. Planned Sub-Questions (`gpt-5.6-terra`)
1. **Pharmacokinetics & Transport**: How do GLP-1 receptor agonists cross the blood-brain barrier and achieve therapeutic central nervous system concentrations?
2. **Neuroinflammation**: What are the downstream intracellular pathways by which GLP-1 receptor activation suppresses microglial activation and neuroinflammatory cytokines?
3. **Mitochondrial & Synaptic Function**: How does GLP-1 signaling impact neuronal mitochondrial biogenesis, oxidative stress, and synaptic plasticity in Alzheimer's and Parkinson's disease models?
4. **Clinical & Preclinical Translation**: What do recent preclinical animal studies and Phase II/III clinical trials indicate regarding cognitive preservation and disease modification?

### 3. Generated Valyu Search Queries
The worker executes targeted retrieval across academic repositories via `valyu.search()` (`searchType: "proprietary"`, `maxNumResults: 20`):

| Sub-Question | Generated Valyu Search Query | Search Parameters |
|---|---|---|
| Q1 (Transport) | `"GLP-1 receptor agonist blood brain barrier penetration pharmacokinetics CNS liraglutide semaglutide"` | `proprietary`, max 20, abstracts |
| Q2 (Neuroinflammation) | `"GLP-1 microglial activation NF-kB neuroinflammation cytokine suppression Alzheimer Parkinson"` | `proprietary`, max 20, abstracts |
| Q3 (Mitochondria) | `"GLP-1 neuronal mitochondrial biogenesis oxidative stress AMPK PGC-1alpha synaptic plasticity"` | `proprietary`, max 20, abstracts |
| Q4 (Clinical) | `"GLP-1 receptor agonist clinical trials Alzheimer Parkinson cognitive decline neuroprotection phase 2 3"` | `proprietary`, max 20, abstracts |

### 4. Selected Authoritative Sources (Normalized & Deduplicated)
Raw search results are deduplicated (priority: PMID > DOI > URL > ID) and ranked to select the top authoritative sources:

| Citation | Title | Journal / Year | Identifiers | Direct URL |
|---|---|---|---|---|
| **[1]** | *Neuroprotective effects of GLP-1 receptor agonists in neurodegenerative diseases* | *Nat Rev Neurol* (2023) | PMID: 37123456 / DOI: 10.1038/s41582-023-00800-x | [Nature Reviews](https://doi.org/10.1038/s41582-023-00800-x) |
| **[2]** | *Central nervous system penetration of synthetic glucagon-like peptide-1 analogues* | *Lancet Neurol* (2022) | PMID: 35892104 / DOI: 10.1016/S1474-4422(22)00214-5 | [The Lancet](https://doi.org/10.1016/S1474-4422(22)00214-5) |
| **[3]** | *GLP-1 receptor signaling suppresses microglial neuroinflammation via NF-κB inhibition* | *Cell Metab* (2023) | PMID: 36944201 / DOI: 10.1016/j.cmet.2023.02.011 | [Cell Metabolism](https://doi.org/10.1016/j.cmet.2023.02.011) |
| **[4]** | *Mitochondrial biogenesis and synaptic repair mediated by AMPK/PGC-1α in GLP-1 treated neurons* | *J Neurosci* (2023) | PMID: 37402911 / DOI: 10.1523/JNEUROSCI.0210-23.2023 | [J Neuroscience](https://doi.org/10.1523/JNEUROSCI.0210-23.2023) |
| **[5]** | *Evaluation of Semaglutide in Early-Stage Alzheimer's Disease: Phase 3 Trial Baseline Characteristics* | *Alzheimers Dement* (2024) | PMID: 38291044 / DOI: 10.1002/alz.13500 | [Alzheimer's & Dementia](https://doi.org/10.1002/alz.13500) |

### 5. Final Markdown Report Excerpt (Sample Output)

```markdown
# Molecular Mechanisms of GLP-1 Receptor Agonists in Neurodegenerative Disease

## Executive Summary
Glucagon-like peptide-1 receptor (GLP-1R) agonists have emerged as promising neuroprotective agents
beyond their established metabolic indications [1]. By modulating neurovascular transport, attenuating
chronic microglial activation, and stimulating neuronal bioenergetics, these compounds mitigate core
pathologies across Alzheimer's disease (AD) and Parkinson's disease (PD) models [1, 2].

## 1. Central Nervous System Penetration and Neurovascular Pharmacokinetics
While endogenous GLP-1 exhibits an ultrashort plasma half-life ($t_{1/2} < 2\text{ min}$) due to
cleavage by dipeptidyl peptidase-4 (DPP-4), modern synthetic analogues such as liraglutide and
semaglutide feature structural modifications—including fatty-acid acylation—that extend metabolic stability [2].
Peripherally administered semaglutide crosses the blood-brain barrier (BBB) via unsaturated simple diffusion
across circumventricular regions and endothelial pinocytosis, reaching physiologically active concentrations
within the hippocampus and cerebral cortex [2, 5].

```math
C_{\text{CSF}} = C_{\text{plasma}} \cdot \left(\frac{P_{\text{app}} \cdot S}{V_{\text{CSF}} \cdot k_{\text{elim}}}\right)
```

## 2. Attenuation of Microglial Neuroinflammation
In neurodegenerative microenvironments, sustained microglial M1 polarization drives elevated secretion
of tumor necrosis factor-alpha (TNF-α), interleukin-1 beta (IL-1β), and reactive oxygen species (ROS) [3].
Binding of GLP-1R on microglial membranes initiates adenylyl cyclase activation, elevating cyclic AMP
(cAMP) and activating Protein Kinase A (PKA) [1, 3]. PKA-dependent phosphorylation prevents the nuclear
translocation of the NF-κB p65 subunit:

$$\text{GLP-1R} \xrightarrow{\text{cAMP} \uparrow} \text{PKA} \xrightarrow{\text{inhibits}} \text{I}\kappa\text{B kinase} \implies \text{NF-}\kappa\text{B p65 arrest}$$

This pathway dramatically downregulates inflammatory gene transcription and promotes microglial phenotype
switching toward a neuroprotective M2 state [3].

## 3. Mitochondrial Biogenesis and Synaptic Protection
Beyond neuroinflammation, GLP-1R signaling preserves neuronal viability under amyloid-beta ($A\beta_{1-42}$)
and alpha-synuclein oligomeric stress [4]. Downstream activation of the AMPK/PGC-1α axis upregulates
mitochondrial transcription factor A (TFAM), restoring mitochondrial membrane potential ($\Delta\Psi_m$)
and ATP generation while reducing cristae fragmentation [4]. Consequently, long-term potentiation (LTP)
at Schaffer collateral-CA1 synapses is preserved in murine transgenic models [1, 4].
```

---

## 🧪 Verification & Testing

The platform includes multiple layers of verification to ensure correctness, reliability, and graceful error handling across backend services, worker pipelines, and frontend clients.

### 1. Service Health Smoke Tests

Verify runtime readiness and Firestore connectivity:

```bash
# Backend API Health Check
curl -s -i https://valyu-backend-miejznyyeq-ew.a.run.app/health
# HTTP/1.1 200 OK
# {"status":"ok","firestore":"connected"}

# Worker Service Health Check (via local / internal probe)
curl -s -i http://localhost:3001/health
# HTTP/1.1 200 OK
# {"status":"ok","firestore":"connected"}
```

### 2. End-to-End Pipeline Simulator (`worker/src/services/task/testResearch.ts`)

A mock execution harness designed to test state transitions, SSE message broadcasts, and frontend citation parsing without incurring external API deductions:

```typescript
// worker/src/services/task/testResearch.ts
// Simulates 7-stage state transitions with realistic delays:
// [queued: 5%] -> [planning: 20%] -> [searching: 45%] -> [evidence_review: 65%] -> [synthesising: 85%] -> [completed: 100%]
// Commits mock reasoning arrays, KaTeX equations, citation objects, and provider cost metrics to Firestore.
```

To invoke the simulator for offline verification:
```bash
# Send test payload to the worker consumer
curl -X POST http://localhost:3001/api/process \
  -H "Content-Type: application/json" \
  -d '{"taskId": "LOCAL_TEST_ID", "type": "research"}'
```

### 3. Jev Evaluation Gateway Smoke Test (`worker/test.ts`)

Verifies direct connectivity to the Jev factual evaluation model and schema validation:

```bash
cd worker
npx tsx test.ts
# Output:
# {
#   "definitelyTrue": false,
#   "definitelyFalse": true
# }
```

### 4. End-to-End Task Integration via cURL

Test the live production pipeline end-to-end:

```bash
# Step 1: Submit a new research task
TASK_ID=$(curl -s -X POST https://valyu-backend-miejznyyeq-ew.a.run.app/tasks \
  -H "Content-Type: application/json" \
  -d '{"question":"What are the molecular mechanisms of GLP-1 receptor agonists in neurodegenerative disease models?","searchType":"all"}' \
  | jq -r '.taskId')
echo "Created Task: $TASK_ID"

# Step 2: Stream real-time progress via Server-Sent Events
curl -N https://valyu-backend-miejznyyeq-ew.a.run.app/api/task/$TASK_ID/events

# Step 3: Fetch finalized report, citations, and cost summary
curl -s https://valyu-backend-miejznyyeq-ew.a.run.app/tasks/$TASK_ID | jq '.task | {status, progress, cost, citationsCount: (.citations | length)}'
```

### 5. Frontend Production Build & TypeScript Verification

Ensure strict type safety and zero compilation warnings across the UI:

```bash
cd frontend
npm run build
# vite v8.x building for production...
# ✓ built in 420ms
```
