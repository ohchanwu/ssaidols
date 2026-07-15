# Frontend Integration Plan

**Written:** 2026-07-14 · **Target:** `chatbot` ← `origin/feature/frontend-work`

> Korean version: [`fe-integration-plan.ko.md`](./fe-integration-plan.ko.md) — both versions are kept in sync.

## ⚠️ v6 re-integration (final — this section takes precedence)

The FE teammate pushed **v3–v6 after v2** (`cfb56d2`) — effectively a **full redesign**. The sections
below are the original v2-based integration record; **the final state follows this section.**

**What changed in v6:**
- **Complete re-theme to hanji (traditional Korean paper)** — the old purple/gold is gone; now paper beige
  (`#F4F1EA`), ink charcoal, 단청 teal (`#2B5B53`), square corners, stamp-style shadows.
- **Desktop layout** — `max-width: 800px`, a 3×2 tab grid.
- The teammate **added their own board and chatbot UIs, but both were non-functional shells**
  (board = in-memory, no password/persistence; chatbot = static message, does nothing).

**Settled re-integration approach (user decision):**
1. **v6 (`cfb56d2`) design is authoritative.** Adopt the hanji theme and layout as-is.
2. **Board: "their look, my function"** — keep the v6 hanji board styling, back it with localStorage CRUD +
   password + soft delete so it meets RFP III-2.
3. **Chatbot: "their look, my core"** — keep the v6 hanji chat UI, wire it to the retrieval + OpenAI core.
4. **Keep the `snake_case` post schema** (chatbot posts.js integration contract).
5. **Remove Tailwind** — v6 was designed without it, in scoped CSS. Preflight's global reset risks disturbing
   the hanji theme, so it's dropped.

**Final component structure:**
```
src/App.vue                    ← v6 hanji shell (tabs→slim index, mounts BoardSection·ChatPanel)
src/components/BoardSection.vue ← inline hanji board + localStorage CRUD
src/components/ChatPanel.vue    ← hanji chat UI + createChatbot() core
src/components/PasswordModal.vue← hanji password confirm (shared by edit·delete)
src/chatbot/                    ← core (framework-free, unchanged)
```
Retired: `BoardView.vue`·`ChatWidget.vue` (the initial indigo/Tailwind versions, superseded),
`board_demo.html`, Tailwind config.

> Because the repo structures diverged sharply (theirs = nested projects, ours = consolidated root), we
> integrated by **bringing the v6 App.vue design into our structure rather than re-merging.** The commit
> message credits the v6 source.

---

## Settled decisions (v2-based — original record below)

1. **The frontend on `origin/feature/frontend-work` (`ssafy-teamPJT`) is the authoritative shell.**
2. **`board_demo.html` will be ported to Vue components.** (Not discarded, not rewritten — translated.)
3. **The post schema is `snake_case`** (contract in plan §2). Field names are corrected during the port.
4. **Toolchain follows the authoritative FE — Vite 8 / `@vitejs/plugin-vue` 6 / Vue 3.5.**

> ℹ️ There is no "Vue 8." Vue is at 3.x, and the RFP requires **Vue.js 3**. The 8 refers to **Vite**, the
> build tool. Decision 4 reflects that.

---

## 1. Current state (measured)

### 1-1. `chatbot` branch

- **Root Vite + Vue app** — `src/chatbot/` (core), `src/components/ChatWidget.vue`, `src/dev/` (harness),
  `scripts/build-index.mjs`, `public/index/` (generated slim index)
- **`board_demo.html`** — 936 lines, single HTML file. **A working board.** This is what we port.

### 1-2. `origin/feature/frontend-work` (authoritative FE)

**It forked from `73a9161 updated skeleton` — which predates my chatbot work.**
So the mass "deletions" shown by `git diff` are **not intentional deletions** — those files simply do not
exist on that branch yet. A normal merge will not remove my work. (CLAUDE.md is unchanged since the base →
no conflict.)

- Top-level folder **`JSON 데이터 지연 로드/`** (Korean characters + spaces) holding two Vue projects:
  - **`ssafy-teamPJT/`** — **authoritative.** The `v2: 보라색` commit touched only this. 312-line App.vue.
  - `localhub/` — abandoned v1 experiment. Delete.
- Each project duplicates the 6 tourism JSON files into its own `public/data/`.

### 1-3. What the authoritative shell does

- Header + tab nav + card grid + two floating buttons (write / chat)
- `fetchData()` fetches `/data/{filename}.json` — the **raw TourAPI schema** (`data.items`,
  `item.contentid`, `item.firstimage`, `item.addr1`). Not our slim index.
- Only **two tabs** (관광지, 문화시설) — the other four categories unused.
- **`openChatbot()` → `alert(...)`** / **`openPostModal()` → `alert(...)`**
  → these two alerts are the **integration sockets**, deliberately left open by the FE teammate.

---

## 2. Port analysis for `board_demo.html` (measured)

| Item | Measured | Implication |
|------|----------|-------------|
| Total | 936 lines | |
| Vue loaded via | `unpkg.com/vue@3/dist/vue.global.js` (**CDN**) | Must remove |
| Styling | `cdn.tailwindcss.com` (**CDN**) | Must remove |
| Tailwind utility classes | **147** | Hand-converting to CSS is not realistic |
| Own `<style>` block | 19 lines | Negligible |
| Script | Composition API (`ref`/`computed`/`watch`) | **SFC port is mostly mechanical** |

### 2-1. Remove the Vue CDN — mandatory

Leaving `vue.global.js` in place means **two Vue instances** alongside the bundled one. Remove it and use
the bundled Vue.

### 2-2. Tailwind — drop the CDN, **install it properly**

`cdn.tailwindcss.com` is a **development-only** script that JIT-compiles in the browser. It must not ship in
a production bundle.

With 147 utility classes in the markup, **hand-converting to scoped CSS is not realistic** (typo risk +
time). → **Install Tailwind as a real dependency**, and the 147 classes port over untouched.

**Version choice: Tailwind v3.4 (PostCSS setup) recommended.**
`cdn.tailwindcss.com` renders v3 semantics. v4 renamed and changed several utilities
(`shadow-sm`→`shadow-xs`, etc.), which risks **subtle visual breakage** across all 147 classes. That is not
a risk worth taking two days before delivery. v4 can be a follow-up if time allows.

> `ChatWidget.vue` uses scoped CSS. It coexists with Tailwind without issue.

### 2-3. Component split

Do not drop 936 lines into a single file. Split minimally:

- `BoardView.vue` — list + detail + create/edit form (container)
- `PasswordModal.vue` — password confirmation modal (**shared** by edit and delete, so it must be its own
  component)

Do not over-decompose. The deadline comes first.

### 2-4. Must fix during the port — field names

`board_demo.html` matched the key (`localhub:posts:v1`) and the envelope (`{schemaVersion, posts}`) but
**the field names differ** — and it mixes camelCase and snake_case internally.

| Contract (§3) | board_demo.html | Action |
|---|---|---|
| `post_id` | `id` | rename |
| `created_at` | `createdAt` | rename |
| `updated_at` | `updatedAt` | rename |
| `deleted_at` | `deletedAt` | rename |
| `view_count` / `like_count` / `dislike_count` | same | keep |

**Why it matters:** `src/chatbot/posts.js` filters deleted posts with `!p.deleted_at`. If the board writes
`deletedAt`, then `deleted_at` is `undefined` and `!undefined === true` — so **the deleted post passes the
filter and lands in the chatbot's context.** It fails silently: no error, no warning. The chatbot quotes a
post the user deleted. Fatal if it surfaces during the demo.

**Safety net:** add a dev-mode warning to `posts.js` that logs loudly when it sees camelCase fields like
`deletedAt` or `createdAt` in stored posts. **Turn a silent failure into a noisy one.**

---

## 3. Post schema — `snake_case`, settled

```jsonc
{ schemaVersion: 1, posts: Post[] }        // localStorage["localhub:posts:v1"]

Post {
  post_id        string    // crypto.randomUUID()
  category       string
  title          string    // 1–100 chars
  content        string    // 1–5000 chars
  password       string    // plaintext, min 4 chars — RFP III-2-나 intentional design
  created_at     string    // ISO 8601
  updated_at     string    // ISO 8601
  deleted_at     string    // ISO 8601 | null — soft delete
  view_count     number
  like_count     number
  dislike_count  number
}
```

`src/chatbot/posts.js` is already written against this schema — **no change needed** (beyond the §2-4
warning).

Keep the soft-delete filter (`deleted_at === null`) in **exactly one place**. Do not re-implement it per view.

---

## 4. Target structure

```
/                        ← one Vue app. This is what Netlify deploys.
  index.html
  package.json           ← Vite 8 / plugin-vue 6 / Vue 3.5 / Tailwind 3.4
  vite.config.js
  tailwind.config.js     ← new
  postcss.config.js      ← new
  scripts/build-index.mjs
  서울_data/              ← originals (공공누리 Type 3, no modification). Single source of truth.
  public/index/          ← generated slim index (gitignored)
  src/
    main.js
    style.css            ← @tailwind directives
    App.vue              ← authoritative FE shell (moved from ssafy-teamPJT/src/App.vue)
    components/
      ChatWidget.vue     ← existing, unchanged
      BoardView.vue      ← ported from board_demo.html
      PasswordModal.vue  ← ported from board_demo.html
    chatbot/             ← existing core (framework-free, untouched)
```

**Delete:** all of `JSON 데이터 지연 로드/` (duplicate data and `localhub/` included), `board_demo.html`
(after the port), `src/dev/`

> ⚠️ The folder name `JSON 데이터 지연 로드/` contains **Korean characters and spaces**. Even in this session,
> `glob`, `find`, and PowerShell broke on Korean paths. This directory must not survive.

---

## 5. Work order

### Phase 1 — Merge safely

1. `git merge origin/feature/frontend-work` — expect no conflicts (their base predates my work).
2. **After merging, verify `src/chatbot/`, `ChatWidget.vue`, and `board_demo.html` all still exist.**
3. Restructure in a **separate commit**. Never mix a merge with a reorganization — you lose the ability to
   revert either one.

### Phase 2 — Restructure & unify the toolchain

4. Move `ssafy-teamPJT/src/App.vue` → `src/App.vue`; write `src/main.js` and `src/style.css`.
5. Delete all of `JSON 데이터 지연 로드/`. Delete `src/dev/`. (`board_demo.html` goes after Phase 3.)
6. Collapse to a single root `package.json` — **Vite 8 / plugin-vue 6 / Vue 3.5**.
   Their `engines` wants Node `>=24.12` → we are on v24.18 ✓
7. **Install Tailwind 3.4** + `tailwind.config.js` / `postcss.config.js` / `style.css`.
8. Add `.vite/` to `.gitignore`.

### Phase 3 — Port the board

9. `board_demo.html` → `BoardView.vue` + `PasswordModal.vue` (§2-3).
10. **Remove the Vue CDN** — use the bundled Vue (§2-1).
11. **Remove the Tailwind CDN `<script>`** — the 147 classes stay as they are (§2-2).
12. **Rename fields to snake_case** (§2-4).
13. Add the camelCase detection warning to `posts.js`.
14. Delete `board_demo.html` once the port is verified.

### Phase 4 — Wiring

15. Switch `App.vue`'s `fetchData()` to the **slim index (`/index/{type}.json`)**. The slim schema is
    `id/name/addr/img`, so the card template's `item.title` / `item.addr1` / `item.firstimage` change too.
16. Expand the tabs to **all 6 categories** (currently only 2).
17. Remove the `openChatbot()` alert → mount `<ChatWidget />`.
18. Remove the `openPostModal()` alert → wire up `<BoardView />`.

### Phase 5 — Verify & deploy

19. `npm run build` passes. Eyeball that Tailwind renders the same as it did on the CDN.
20. **Regression test: delete a post, then ask the chatbot about it — it must not appear.** (§2-4)
21. Connect Netlify; **confirm `.env` is not included**.

---

## 6. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema casing drift | **Deleted posts surface in chatbot answers** (silent failure) | Rename in Phase 3-12 + `posts.js` warning + Phase 5-20 regression test |
| Tailwind CDN → install causes visual breakage | Layout collapse | Use **v3.4** (same semantics as the CDN). v4 is a follow-up |
| Vue CDN left in | Two Vue instances → baffling bugs | Remove in Phase 3-10 |
| 3 apps / 3 data copies | Netlify cannot deploy; bloated repo | Collapse to one app in Phase 2 |
| Korean + spaces in folder name | Breaks tooling and CI | Delete the directory |
| Merge *looks* like it deletes my work | Risk of a panicked force-overwrite | **Their base is simply older.** Never `--ours` or force |
