# LocalHub MVP — Must Have Implementation Plan

**Region:** Seoul · **Deadline:** 2026-07-16 (Thu) 15:00 · **Written:** 2026-07-14

> Korean version: [`mvp-must-have-plan.ko.md`](./mvp-must-have-plan.ko.md) — both versions are kept in sync.

This document locks down the data schemas and storage architecture needed to implement the **Must have**
scope of the `4_MVP정의(실습)` sheet in the 실습기획서. Optional features (map, etc.) are covered separately.

## 0. Out of Scope (final)

The following three are **removed from the product entirely**. Do not reopen.

| Excluded | Reason |
|----------|--------|
| **Shopping (쇼핑)** | Lowest value for a community app while consuming 69% of the raw data (3.9MB / 4,368 records). Moved to `서울_data/deferred/` |
| **Restaurant recommendations** | `서울_음식점.json` **does not exist on disk.** We cannot build a feature on data we do not have |
| **Festival calendar** | The festival JSON has **no date fields** (`eventstartdate`/`eventenddate` absent in all 201 records) |

> Festival **data itself stays in scope.** Coordinates are 100% populated, so festivals remain valid POIs
> (map markers, chatbot answers). What is impossible is the *date-driven calendar feature*, not the use of
> festival data.

**In-scope data after exclusions: 6 files / 2,150 records / 1.81MB.**

---

## 1. Storage Architecture Decisions

| Data | Storage | Rationale |
|------|---------|-----------|
| Posts (게시글) | **localStorage** | Mandated by RFP III-2-나. Small, mutable, user-owned data. Synchronous access keeps the CRUD code simple |
| Chatbot conversation history | **localStorage** | Capped at the last 30 messages — tens of KB |
| POI tourism data | **Static JSON → memory** | Immutable, read-only. The HTTP cache gives us persistence for free |

### Why we are NOT using IndexedDB

We evaluated it and concluded it is the wrong tool for *this* data.

1. **The data is static and read-only.** It ships as a build artifact, so the browser HTTP cache and the
   Netlify CDN already provide persistence and selective loading with zero lines of code. IndexedDB exists
   to persist *mutable* client state.
2. **It cannot perform the query we actually need.** IndexedDB indexes support exact-match and range
   queries only — they have **no substring or full-text search**. Our chatbot query is "records whose
   `title`/`addr` *contains* 경복궁," a substring match. That degrades to a full cursor scan, which is
   slower than scanning a plain JS array and requires more code.
3. **It isn't large to begin with.** With 쇼핑 excluded, in-scope data is 2,150 records / 1.81MB, and the
   slim index brings that to **661KB (−64%)** — small enough to hold in memory without a second thought.

> **Revisit if:** we add semantic search (embeddings). Persisting 2,150 vectors client-side would genuinely
> justify IndexedDB. That is out of MVP scope.

### ⚠️ localStorage quota warning

- The localStorage quota is roughly **5MB per origin** (not 10MB).
- Strings are stored as **UTF-16**, so Korean text costs **2 bytes per character**.
- **Do not cache the POI index into localStorage.** With 쇼핑 excluded the slim index is down to 661KB, so it
  would no longer blow the quota (~1.3MB once UTF-16 is accounted for) — but **still don't**: the HTTP cache
  already does this for free, so there is no gain, and it eats quota that posts need. POI data stays in memory.
- Actual usage: posts + conversation history = **well under 1MB**. Plenty of headroom.

---

## 2. Post Schema

`localStorage["localhub:posts:v1"]` — store the whole array under a single versioned envelope rather than
one key per post.

```jsonc
{ schemaVersion: 1, posts: Post[] }

Post {
  post_id        string    // PK — crypto.randomUUID()
  category       string    // board category
  title          string    // 1–100 chars
  content        string    // 1–5000 chars
  password       string    // plaintext, min 4 chars — RFP III-2-나 intentional design
                           // (no server, so it is stored and compared unencrypted)
  created_at     string    // ISO 8601
  updated_at     string    // ISO 8601
  deleted_at     string    // ISO 8601 | null — soft delete
  view_count     number
  like_count     number
  dislike_count  number
}
```

**Design notes**

- `deleted_at` is a soft delete. **Every list and detail query must filter `deleted_at === null`.**
  Keep that filter in exactly one place (a store getter); do not re-implement it per view.
- `view_count` / `like_count` / `dislike_count` belong to **Could scope**, not Must. The fields are included
  now because carrying them costs nothing and avoids a schema migration if we add the features later.
  Default to `0`.
- The post **number** shown in the wireframe (RFP 참고4 ②) is **not stored** — derive it from the list index
  at render time. Storing it leaves gaps in the numbering once posts are deleted.
- `schemaVersion` is the branch point for migrations if the storage format changes.

---

## 3. POI Index Schema (shared by chatbot + map)

The source JSON **must not be modified** (공공누리 Type 3, no-derivatives on the original), so we generate a
**derived file** at build time and leave the originals untouched.

`scripts/build-index.mjs` → `public/index/{contentTypeId}.json`

```jsonc
{ contentTypeId, contentType, total, items: Poi[] }

Poi {
  id    string   // contentid
  type  string   // contenttypeid (12/14/15/25/28/32/38)
  name  string   // title       — 100% populated
  addr  string   // addr1       — 99.2% populated
  lat   number   // parseFloat(mapy) — source is a string; convert at build time
  lng   number   // parseFloat(mapx)
  img   string   // firstimage  — "" means no image (94.3% populated)
  l1    string   // lclsSystm1  — category filter key (100% populated)
  l2    string   // lclsSystm2
}
```

**Field selection, based on measured fill rates**

- ❌ `tel` excluded — only **3.1% populated**. Do not put phone numbers in map popups or detail views.
- ❌ `cat1`/`cat2`/`cat3` excluded — only **22% populated**, and the code table (`lclsSystemCode.json`) is not
  even in the repo.
- ✅ Filter on **`lclsSystm1`/`lclsSystm2`** (100% populated) or `contenttypeid`.
  Actual `lclsSystm1` values: `AC`, `C01`, `EV`, `EX`, `HS`, `LS`, `NA`, `SH`, `VE`

**Runtime loading**

- `fetch()` per category **on demand only**, memoized in a Pinia store. Never eager-load everything.
- The index covers the **6 files in `서울_data/*.json` only**. The build script must **ignore**
  `서울_data/deferred/` so 쇼핑 cannot creep back into the bundle.

---

## 4. Chatbot Schema and Retrieval Contract

### Conversation state — `localStorage["localhub:chat:v1"]`

```jsonc
{ schemaVersion: 1, messages: Message[] }   // capped at the last 30

Message {
  id          string
  role        'user' | 'assistant'
  content     string
  created_at  string              // ISO 8601
  sources     { id, name }[]?     // cited POIs — a credibility win in the demo
}
```

### Retrieval contract (this is what keeps us inside the API budget)

```
retrieve(query: string): Poi[]        // top 6 (K=6)
  → buildContext(pois): string        // compress to one line per POI
  → OpenAI chat/completions call      // system + context + last N messages
```

- **Never put all 2,150 records into the prompt.** Filter by keyword in the browser first and send only the
  top handful.
- Limits: **6 POIs**, **30 messages** of history, plus a token guard.
- `VITE_`-prefixed env vars are **exposed in the build output**. Use only a rate-limited key and set a low
  billing cap.

---

## 5. Data Risks (must be recorded in the 기능명세서)

| Risk | Detail | Status / Mitigation |
|------|--------|---------------------|
| Restaurant data missing | **`서울_음식점.json` does not exist on disk**, though SOURCE.md claims 1,632 records | **Resolved (out of scope).** Restaurant recommendations removed from the product. However, the fact that the RFP-specified chatbot query type "모범음식점 위치" cannot be answered **must be recorded in the 기능명세서** and disclosed to the client (professor) |
| Festival dates missing | The festival JSON has **no `eventstartdate`/`eventenddate`** (all 201 records) | **Resolved (out of scope).** Festival calendar dropped. Festival data remains in use as POIs |
| Oversized single file | `서울_쇼핑.json` — 3.9MB / 4,368 records | **Resolved (out of scope).** Moved to `서울_data/deferred/` |
| License | 공공누리 Type 3 (attribution required + **no derivatives**) | **Open — ongoing obligation.** Credit "한국관광공사" and the source API URL in the app. Never modify the source JSON — transform only into derived files |
| API key exposure | `VITE_` values are embedded verbatim in the build output and readable in the browser | **Open — structural.** With no backend the key cannot be hidden. Contain the blast radius with a usage-limited key and a low billing cap. `.env` only prevents **repository** leakage (see §7) |

---

## 6. Work Order

**Day 1 (7/14)** — Planning & design
1. ~~Finalize the Must-have rows of `4_MVP정의(실습)`~~ ✅ **done**
2. ~~Lock down the schemas in this document~~ ✅ **done**
3. Scaffold Vite + Vue 3; register `.env` in `.gitignore` (required before the first commit) ← **next**

**Day 2 (7/15)** — Development
4. `scripts/build-index.mjs` — generate the slim POI index
5. Post store (localStorage CRUD + password check + soft-delete filter)
6. Four board screens (list / detail / create-edit / password confirmation modal)
7. Chatbot — retrieval function → context builder → OpenAI call → floating chat UI

**Day 3 (7/16)** — Wrap-up
8. Netlify deploy (repo-linked), verify the live URL, **confirm `.env` is not included**
9. Integration testing and bug fixes
10. 기능명세서 (incl. data source/license list) · WBS · presentation deck

---

## 7. Why do we need a `.env` at all?

With no backend, the `VITE_OPENAI_API_KEY` value is **baked directly into the build output (the JS bundle)**
and is readable by anyone in the browser. **`.env` does not prevent that exposure.** The RFP says so itself
(III-3-가 ※주의).

It is still required, for three reasons.

1. **It blocks repository leakage — this is the real purpose.** Hardcode the key in source and it lives in
   git history forever, and the moment it is pushed to GitHub/GitLab it gets harvested by automated
   credential scanners. Bots scraping public repos are vastly faster than any human digging a key out of a
   deployed bundle. `.gitignore` + `.env` is what stops that.
2. **It is an RFP deliverable requirement.** Source-code submission explicitly requires
   **".env 파일 미포함 확인 필수"** (IV-참고1). Without a `.env`, there is no way to demonstrate compliance.
3. **Per-developer and per-environment keys.** Each teammate uses their own key locally, and Netlify injects
   the key at build time via its environment-variable UI — so no key exists in the repository at all.

**In short: `.env` hides the key from the *repository*, not from the *user*.** User-side exposure is
structurally unavoidable without a backend, so the only real defense is to **cap the damage**: a
usage-limited key with a low billing cap.

Do commit a `.env.example` (key names, empty values) so teammates know what to fill in.
