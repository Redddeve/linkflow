# Product Requirements Document

## Linkbuilding Operations Platform

**Version:** 2.0
**Status:** Draft for Implementation
**Last updated:** 2026-05-04
**Supersedes:** v1.0

---

## 0. Document Purpose

This PRD defines the requirements for a Linkbuilding Operations Platform that replaces ad-hoc spreadsheets, chat threads, and manual coordination with a single role-based system. It is written to be implementation-ready: every requirement is stated in concrete, testable terms suitable for an engineering agent or team to build against without additional discovery.

**Out of scope (v1):** public marketing site, native mobile apps, white-label theming, AI-generated content, automated SEO crawling beyond third-party metric ingestion, payment processing, in-thread comments on drafts.

---

## 1. Glossary

| Term           | Definition                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Linkbuilding   | Acquiring backlinks from third-party websites to a client's target URL.                                                      |
| Order          | One placement on one Site for one Client. **One Site = one Order**; a multi-site purchase produces N Orders.                 |
| Cart           | A client-scoped staging area of selected Sites that becomes Orders on checkout.                                              |
| Cart Item      | A single Site queued in a Cart, with the client's per-site `target_url`, `anchor_text`, `brief`, and chosen `publish_month`. |
| Anchor         | The clickable text of a backlink.                                                                                            |
| Brief          | Instructions a copywriter follows to produce content.                                                                        |
| Sourcer        | Contributor who submits new Sites for commission.                                                                            |
| Catalog        | The set of Sites with status `ACTIVE`, available for clients to add to cart.                                                 |
| Publish Month  | The calendar month in which the client wants the placement published. Drives invoice grouping.                               |
| Change Request | A reviewer's structured rejection of submitted content with required comment.                                                |
| Invoice Period | A calendar month. Each client gets at most one invoice per month, covering Orders that became `PUBLISHED` during that month. |

---

## 2. Goals & Non-Goals

### 2.1 Business Goals (measurable)

- Reduce median time-from-`NEW`-to-`PUBLISHED` to **≤ 14 days** for standard orders.
- Reduce manager hours per Order by **≥ 50%** vs. pre-launch baseline.
- **≥ 95%** of Orders progress without manual intervention beyond defined approval gates.
- **0** active operational spreadsheets within 60 days of launch.
- Throughput per manager **≥ 3×** pre-launch baseline without proportional headcount growth.

### 2.2 Product Principles

1. **Single source of truth** — every Order, Site, content piece, and Invoice has exactly one canonical record.
2. **Status is explicit** — every entity has a defined state machine; only valid transitions are permitted.
3. **Role-based visibility** — users see only what their role permits, enforced server-side.
4. **Append-only audit** — every state-changing action is logged with actor, timestamp, before/after deltas.
5. **Self-service first** — clients, copywriters, and sourcers complete their work without manager touch except at defined gates.

### 2.3 Non-Goals (v1)

- AI-generated content on behalf of copywriters.
- Automated outreach to site owners.
- Live Ahrefs/SEMrush API integration (manual + CSV in v1; live in Phase 2).
- Multi-tenant white-labeling.
- Online payment processing (manual mark-as-paid in v1).
- Inline comments on drafts (single Change Request comment per round in v1).

---

## 3. Personas & Roles

### 3.1 Roles

| Role       | Primary purpose                                              | Pays / Paid                                       |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------- |
| Client     | Buys placements                                              | Pays per monthly Invoice                          |
| Manager    | Coordinates execution                                        | Internal                                          |
| Copywriter | Produces content                                             | Internal                                          |
| Sourcer    | Supplies new Sites; can also create/edit Sites they own      | Commission per published placement on their Sites |
| Admin      | Owns system, reviews Sites, manages users, oversees finances | Internal                                          |

### 3.2 Permission Matrix

`✓` = full action; `own` = only on records the user owns / is assigned to; `✗` = no access.

| Capability                                                                         | Client | Manager                   | Copywriter    | Sourcer                   | Admin |
| ---------------------------------------------------------------------------------- | ------ | ------------------------- | ------------- | ------------------------- | ----- |
| Browse `ACTIVE` Site catalog                                                       | ✓      | ✓                         | ✗             | ✓                         | ✓     |
| View Site list (all statuses)                                                      | ✗      | ✓                         | ✗             | own                       | ✓     |
| Create Site                                                                        | ✗      | ✓                         | ✗             | ✓                         | ✓     |
| Edit Site                                                                          | ✗      | ✓                         | ✗             | own (resets to `PENDING`) | ✓     |
| Change Site status (`PENDING` → `NEEDS_CHANGES` / `ACTIVE`; `ACTIVE` → `ARCHIVED`) | ✗      | ✗                         | ✗             | ✗                         | ✓     |
| Manage Categories                                                                  | ✗      | ✗                         | ✗             | ✗                         | ✓     |
| Manage Cart                                                                        | own    | ✗                         | ✗             | ✗                         | ✗     |
| Create Orders (from Cart)                                                          | own    | ✗                         | ✗             | ✗                         | ✗     |
| View Orders                                                                        | own    | ✓                         | assigned only | ✗                         | ✓     |
| Edit Order (status `NEW`)                                                          | own    | ✓                         | ✗             | ✗                         | ✓     |
| Cancel Order (status `NEW`)                                                        | own    | ✓                         | ✗             | ✗                         | ✓     |
| Assign / Reassign Copywriter                                                       | ✗      | ✓                         | ✗             | ✗                         | ✓     |
| Edit content                                                                       | ✗      | ✗                         | assigned only | ✗                         | ✗     |
| Submit content (→ `CONTENT_SENT`)                                                  | ✗      | ✗                         | assigned only | ✗                         | ✗     |
| Review content (Approve / Needs changes)                                           | own    | ✓ (on behalf of)          | ✗             | ✗                         | ✓     |
| Publish Order (→ `PUBLISHED`)                                                      | ✗      | ✓                         | ✗             | ✗                         | ✓     |
| Invite / Edit / Activate / Deactivate Users                                        | ✗      | ✗                         | ✗             | ✗                         | ✓     |
| Resend invitation                                                                  | ✗      | ✗                         | ✗             | ✗                         | ✓     |
| View Invoices                                                                      | own    | ✓                         | ✗             | ✗                         | ✓     |
| Mark Invoice paid                                                                  | ✗      | ✗                         | ✗             | ✗                         | ✓     |
| View Audit Log                                                                     | ✗      | scoped to assigned Orders | ✗             | ✗                         | ✓     |

**Enforcement:** RBAC is server-side on every request. UI hiding alone is not acceptable.

---

## 4. State Machines

### 4.1 Site

States: `PENDING` → `ACTIVE` | `NEEDS_CHANGES` ; `ACTIVE` → `ARCHIVED` ; `NEEDS_CHANGES` → `PENDING` (after edit)

| From             | To              | Who                       | Trigger / Required fields                            |
| ---------------- | --------------- | ------------------------- | ---------------------------------------------------- |
| (new)            | `PENDING`       | Sourcer / Manager / Admin | Site created (UC-S-3)                                |
| `PENDING`        | `ACTIVE`        | Admin                     | Approve                                              |
| `PENDING`        | `NEEDS_CHANGES` | Admin                     | "Needs changes" → `change_note` ≥ 10 chars required  |
| `NEEDS_CHANGES`  | `PENDING`       | Site owner                | Edit + save (UC-S-4)                                 |
| `ACTIVE`         | `ARCHIVED`      | Admin                     | Archive                                              |
| `ARCHIVED`       | `ACTIVE`        | Admin                     | Unarchive                                            |
| Any (after edit) | `PENDING`       | Site owner                | Edit + save resets to `PENDING` (re-review required) |

**Catalog rule:** Only Sites in status `ACTIVE` are visible to Clients in the catalog and may be added to a Cart at checkout time (see §6.4 / FR-CART-3).

### 4.2 User

States: `PENDING` → `ACTIVE` ; `ACTIVE` → `DISABLED`

| From       | To         | Who     | Trigger                                     |
| ---------- | ---------- | ------- | ------------------------------------------- |
| (new)      | `PENDING`  | Admin   | Invite sent                                 |
| `PENDING`  | `ACTIVE`   | Invitee | First successful login via invitation token |
| `ACTIVE`   | `DISABLED` | Admin   | Disable (rules per UC-U-6)                  |
| `DISABLED` | `ACTIVE`   | Admin   | Activate                                    |

### 4.3 Order

States: `New` → `In Progress` → `Content Sent` → `Content Approved` → `Published` → `Completed` ; with branch `Needs changes` (loops back to `In Progress`) and terminal `Canceled` (from `New` only).

| From               | To                 | Who                      | Trigger / Required fields                                                           |
| ------------------ | ------------------ | ------------------------ | ----------------------------------------------------------------------------------- |
| (new)              | `New`              | System                   | Created on Cart checkout (UC-O-6)                                                   |
| `New`              | `Canceled`         | Client / Manager / Admin | Cancel (UC-O-8). Terminal; no further transitions.                                  |
| `New`              | `In Progress`      | Manager / Admin          | Copywriter assigned (UC-OM-3.1)                                                     |
| `In Progress`      | `Content Sent`     | Copywriter               | Submit (UC-OC-4) — `content_body` required, ≥ 50 chars                              |
| `Content Sent`     | `Content Approved` | Client / Manager / Admin | Approve (UC-O-10.1); sets `approved_at`                                             |
| `Content Sent`     | `Needs changes`    | Client / Manager / Admin | "Needs changes" → Comment created with `text` ≥ 20 chars required (UC-O-10.2)       |
| `Needs changes`    | `Content Sent`     | Copywriter               | Resubmit after editing content                                                      |
| `Content Approved` | `Published`        | Manager / Admin          | Publish → `published_url` required and link-verified (UC-OM-4); sets `published_at` |
| `Published`        | `Completed`        | System                   | Automatic after commission verification window passes (FR-COM-2)                    |

**Notes:**

- `Edit Order` (UC-O-9) is allowed only in status `New` and does not change status.
- Reassigning a copywriter (UC-OM-3.2) does not change status.
- An Order in `Canceled` is excluded from invoicing and commission accrual.

### 4.4 Invoice

States: `Draft` → `Sent` → `Paid`

| From    | To      | Who             | Trigger / Required fields                                           |
| ------- | ------- | --------------- | ------------------------------------------------------------------- |
| (new)   | `Draft` | System          | Created by monthly job; `sent_at` and `sent_by_id` null             |
| `Draft` | `Sent`  | Admin / Manager | Send to client → `sent_at`, `sent_by_id` required                   |
| `Sent`  | `Paid`  | Admin           | Mark as paid → `marked_as_paid_at`, `marked_as_paid_by_id` required |

---

## 5. Data Model

**Conventions:** every table has `id` (UUID PK). `?` denotes nullable. All money in **minor units (cents)**. Strings are UTF-8. Auth identity (email, password) is managed by Supabase Auth; the `User` table stores profile and role data, linked by the Supabase Auth `uid`.

### Enums

#### userStatus

`PENDING` | `ACTIVE` | `DISABLED`

#### userRole

`Client` | `Sourcer` | `Copywriter` | `Manager` | `Admin`

#### siteStatus

`Pending` | `Active` | `Needs changes` | `Archived`

#### linkType

`dofollow` | `nofollow` | `sponsored` | `ugc`

#### Country

`Ukraine` | `Germany` | `USA`
_(extend as needed)_

#### Language

`English` | `German` | `Spanish` | `Portuguese` | `French`

---

### 5.1 User

| Field            | Type            | Notes                                                                         |
| ---------------- | --------------- | ----------------------------------------------------------------------------- |
| id               | UUID PK         | Matches Supabase Auth `uid`                                                   |
| email            | string, unique  | Login identifier; managed by Supabase Auth                                    |
| status           | enum userStatus | `PENDING` on invite; `ACTIVE` on first login; `DISABLED` by Admin             |
| role             | enum userRole   | Assigned at invite time; changeable by Admin                                  |
| firstName        | string          |                                                                               |
| lastName         | string          |                                                                               |
| avatar?          | string (URL)    | Profile picture                                                               |
| manager_id?      | UUID FK → User  | Required when `role = Client`; references the Manager assigned to this client |
| created_by_id?   | UUID FK → User  | Admin who invited this user                                                   |
| invited_at?      | timestamp       | When the invitation was sent / last resent                                    |
| disabled_reason? | text            | Required when transitioning to `DISABLED`                                     |

**Notes:**

- Auth is handled by Supabase Auth (invitation emails, password set, session). The `User` row is created by the system when Admin sends an invite; `status` starts as `PENDING` and moves to `ACTIVE` on first sign-in.
- `manager_id` is required for all Client users and must reference a User with `role = Manager`.

### 5.2 Category

| Field         | Type           | Notes                |
| ------------- | -------------- | -------------------- |
| id            | UUID PK        |                      |
| created_at    | timestamp      |                      |
| created_by_id | UUID FK → User | Admin who created it |
| name          | string, unique | Display name         |

### 5.3 Site

| Field                  | Type               | Notes                                                                                                                  |
| ---------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| id                     | UUID PK            |                                                                                                                        |
| created_at             | timestamp          |                                                                                                                        |
| created_by_id          | UUID FK → User     | Immutable; the user who submitted the site                                                                             |
| sourcer_id?            | UUID FK → User     | Must have `role = Sourcer`. Cleared if sourcer is disabled (UC-U-6.3)                                                  |
| domain                 | string, unique     | Required. URL-format normalized domain, e.g. `"name.com"` (no protocol, no `www`, no trailing slash, lowercase eTLD+1) |
| dr?                    | int                | Domain Rating 0–100                                                                                                    |
| category_id?           | UUID FK → Category |                                                                                                                        |
| top_countries?         | string             | Free-text summary, e.g. "US, UK, DE"                                                                                   |
| countries              | enum Country[]     | Array; default empty                                                                                                   |
| languages              | enum Language[]    | Array; default empty                                                                                                   |
| price_cents            | int                | Client-facing price per placement                                                                                      |
| sourcer_payout_cents   | int                | Commission paid to `sourcer_id` on `PUBLISHED`                                                                         |
| status                 | enum siteStatus    | Default `Pending`                                                                                                      |
| requirements?          | string             | Placement / content requirements                                                                                       |
| description?           | string             | Site description                                                                                                       |
| sourcer_notes?         | string             | Internal notes from sourcer; not visible to clients                                                                    |
| contact_info?          | string             | Site communication info                                                                                                |
| link_type              | enum linkType      | Default `dofollow`                                                                                                     |
| keywords_relevance?    | string             | Niche / topic relevance notes                                                                                          |
| organic_keywords_count | int                | Default `0`                                                                                                            |
| organic_traffic_count  | int                | Default `0`                                                                                                            |
| needs_changes_by_id?   | UUID FK → User     | Required when `status = Needs changes`; the Admin who requested changes                                                |
| needs_changes_at?      | timestamp          | Required when `status = Needs changes`                                                                                 |
| approved_at?           | timestamp          | Required when `status = Active` (set on approval)                                                                      |
| approved_by_id?        | UUID FK → User     | Required when `status = Active`; the Admin who approved                                                                |

**Constraints:**

- `domain` is unique on the normalized value. Duplicate submission → reject with "Duplicate of existing site (status: X)"; sourcer sees the duplicate error but not the owner.
- Editing any field (except `status` itself) by the site owner resets `status = Pending` (re-review required).
- `needs_changes_by_id` and `needs_changes_at` must be set together when status is `Needs changes`.
- `approved_at` and `approved_by_id` must be set together when status transitions to `Active`.

### 5.4 Cart

| Field          | Type           | Notes                                              |
| -------------- | -------------- | -------------------------------------------------- |
| id             | UUID PK        |                                                    |
| created_at     | timestamp      |                                                    |
| created_by_id  | UUID FK → User | The Client who owns this cart; one Cart per Client |
| _(cart items)_ | CartItem[]     | Resolved via CartItem.cart_id                      |

Cart is purely staging; nothing is invoiced from a Cart.

### 5.5 CartItem

| Field         | Type           | Notes                                                                                 |
| ------------- | -------------- | ------------------------------------------------------------------------------------- |
| id            | UUID PK        |                                                                                       |
| created_at    | timestamp      |                                                                                       |
| created_by_id | UUID FK → User | The Client who added this item                                                        |
| cart_id       | UUID FK → Cart | Unique per `(cart_id, site_id)`; same Site can't be in one Cart twice                 |
| site_id       | UUID FK → Site | Required                                                                              |
| publish_date? | date           | Target publish date; optional in cart, required at checkout (must not be in the past) |

All CartItem fields except `site_id` are editable in-cart.

### 5.6 Order

#### orderStatus enum

`New` | `In Progress` | `Content Sent` | `Needs changes` | `Content Approved` | `Published` | `Completed`

| Field                | Type                | Notes                                                                      |
| -------------------- | ------------------- | -------------------------------------------------------------------------- |
| id                   | UUID PK             |                                                                            |
| created_at           | timestamp           |                                                                            |
| created_by_id        | UUID FK → User      | The Client who placed the order                                            |
| status               | enum orderStatus    | Required; default `New`                                                    |
| site_id              | UUID FK → Site      | Required; Site must be `Active` at creation time                           |
| publish_date         | date                | Required; snapshotted from CartItem at order creation                      |
| price_cents          | int                 | Required; snapshot of `Site.price_cents` at creation                       |
| invoice_id?          | UUID FK → Invoice   | Set when this Order is included on an Invoice                              |
| copywriter_id?       | UUID FK → User      | `role = Copywriter`; optional                                              |
| manager_id?          | UUID FK → User      | `role = Manager`; first Manager who acted on it                            |
| content_body?        | text                | Required when `status = Content Sent`; overwritten on each copywriter save |
| sent_at?             | timestamp           | Required when `status = Content Sent`; set when copywriter submits         |
| approved_at?         | timestamp           | Required when `status = Content Approved`                                  |
| published_at?        | timestamp           | Required when `status = Published`; default value for `billing_month`      |
| published_by_id?     | UUID FK → User      | Required when `status = Published`; the Manager/Admin who published        |
| published_url?       | string              | Required when `status = Published`                                         |
| billing_month?       | date (1st of month) | Required when `status = Published`; defaults to month of `published_at`    |
| canceled_at?         | timestamp           |                                                                            |
| cancellation_reason? | text                | Required when `status = Canceled`                                          |
| _(comments)_         | Comment[]           | Resolved via Comment.order_id                                              |

**Snapshotted Site fields (read-only on Order, copied at creation):**

| Field                       | Type               |
| --------------------------- | ------------------ |
| site_domain                 | string             |
| site_dr                     | int                |
| site_category_id            | UUID FK → Category |
| site_top_countries          | string             |
| site_countries              | enum Country[]     |
| site_languages              | enum Language[]    |
| site_requirements           | string             |
| site_description            | string             |
| site_contact_info           | string             |
| site_link_type              | enum linkType      |
| site_keywords_relevance     | string             |
| site_organic_keywords_count | int                |
| site_organic_traffic_count  | int                |

These are snapshotted at Order creation so the Order record is self-contained even if the Site is later edited or archived.

**One Order = one Site = one placement.**

### 5.7 Comment

| Field         | Type            | Notes                                                               |
| ------------- | --------------- | ------------------------------------------------------------------- |
| id            | UUID PK         |                                                                     |
| created_at    | timestamp       |                                                                     |
| created_by_id | UUID FK → User  | Author (Client / Manager / Admin / Copywriter depending on context) |
| order_id      | UUID FK → Order |                                                                     |
| text          | text            | Required; ≥ 20 chars when used as a Change Request                  |

Comments replace the previous `ChangeRequest` entity. Multiple comments per Order are allowed; the Order timeline shows them chronologically. A comment posted when transitioning to `Needs changes` status serves as the change request.

### 5.8 Invoice

#### invoiceStatus enum

`Draft` | `Sent` | `Paid`

| Field                 | Type                | Notes                                                                           |
| --------------------- | ------------------- | ------------------------------------------------------------------------------- |
| id                    | UUID PK             |                                                                                 |
| created_at            | timestamp           |                                                                                 |
| billing_month         | date (1st of month) | The month being billed; unique per `(client_id, billing_month)`                 |
| orders                | Order[]             | Resolved via `Order.invoice_id`; all Orders must share the same `billing_month` |
| client_id             | UUID FK → User      | `role = Client`                                                                 |
| total_price_cents     | int                 | Sum of linked Orders' `price_cents`                                             |
| status                | enum invoiceStatus  | Required; default `Draft`                                                       |
| sent_at?              | timestamp           | Required when `status = Sent`                                                   |
| sent_by_id?           | UUID FK → User      | Required when `status = Sent`; the Admin/Manager who sent it                    |
| marked_as_paid_at?    | timestamp           | Required when `status = Paid`                                                   |
| marked_as_paid_by_id? | UUID FK → User      | Required when `status = Paid`; the Admin who marked it                          |

**Constraint:** unique on `(client_id, billing_month)`.

**Notes:**

- `InvoiceLine` is removed. Orders belong to an Invoice via `Order.invoice_id` directly; `total_price_cents` is the sum of those Orders' `price_cents`.
- Invoice generation groups `Published` Orders by `billing_month` and creates one Invoice per `(client, billing_month)` pair.

### 5.9 Sourcer payout (on Order)

There is no separate Commission entity. Sourcer payouts are tracked directly on the Order:

| Field on Order             | Type      | Notes                                                                                  |
| -------------------------- | --------- | -------------------------------------------------------------------------------------- |
| sourcer_payout_cents?      | int       | Snapshot of `Site.sourcer_payout_cents` at publication, when `Site.sourcer_id` is set. |
| sourcer_paid_at?           | timestamp | Set when Admin records an external payout.                                             |
| sourcer_payout_reference?  | string    | External transfer reference / invoice number.                                          |

### 5.10 AuditLog

| Field       | Type           | Notes                                                      |
| ----------- | -------------- | ---------------------------------------------------------- |
| id          | UUID PK        |                                                            |
| occurred_at | timestamp      |                                                            |
| actor_id?   | UUID FK → User | Null for system/scheduled-job actions                      |
| entity_type | string         | `"site"`, `"order"`, `"user"`, `"invoice"`, `"commission"` |
| entity_id   | UUID           |                                                            |
| action      | string         | `"create"`, `"update"`, `"status_change"`, …               |
| before?     | JSON           | Field deltas before change                                 |
| after?      | JSON           | Field deltas after change                                  |

### 5.11 Notification

| Field        | Type           | Notes                                      |
| ------------ | -------------- | ------------------------------------------ |
| id           | UUID PK        |                                            |
| created_at   | timestamp      |                                            |
| recipient_id | UUID FK → User |                                            |
| type         | string         | e.g., `content_submitted`, `site_approved` |
| payload      | JSON           | Entity refs + human-readable message       |
| read_at?     | timestamp      | Null = unread                              |
| channel      | enum           | `IN_APP`, `EMAIL`, `BOTH`                  |

### 5.12 Relationships summary

- User 0..1→N User (Client has one `manager_id` → Manager)
- User 1→N Site (as `created_by`); User 0..1→N Site (as `sourcer`)
- User 1→1 Cart (via `created_by_id`); Cart 1→N CartItem; CartItem N→1 Site
- User (Client) 1→N Order (via `created_by_id`); Site 1→N Order; User (Copywriter) 0..1→N Order; User (Manager) 0..1→N Order
- Order 1→N Comment; Order 0..1→1 Commission; Order N→1 Invoice (via `Order.invoice_id`)
- Invoice 1→N Order (via `Order.invoice_id`); Invoice N→1 User (Client)

---

## 6. Functional Requirements (Use Cases)

Every UC has acceptance criteria (AC). All ACs must pass for the story to be done. Use case IDs map to the flows you specified.

### 6.1 Authentication & Onboarding

Auth is handled entirely by **Supabase Auth**. The application does not manage passwords, tokens, or sessions directly.

**FR-AUTH-1.** Email/password sign-in with role-based redirect.

- AC1: Successful login reads `User.role` from the DB and routes to the role's home screen under `/dashboard`.
- AC2: Failed login shows a generic error (Supabase Auth handles enumeration protection and rate-limiting natively).

**FR-AUTH-2.** Password reset via Supabase Auth's built-in "forgot password" email flow.

**FR-AUTH-3.** Invitation flow: Admin creates a `User` row (status `PENDING`), then triggers a Supabase Auth invitation email. Clicking the link opens the "Set password" screen; on submit, Supabase activates the account and the app sets `User.status = ACTIVE` and records `invited_at`.

### 6.2 Site Management

**UC-S-1. View Sites**

- 1.1 List all Sites → System displays "All Sites" screen. Visibility per §3.2.
- 1.2 View a Site → User selects a Site; System displays "View Site" screen with metrics, status, history, sourcer (admin/manager only).

**UC-S-2. Filter Sites**

- 2.1 Filters: status, category, DR range, traffic range, price range, free-text domain. Pagination 25/page (max 100).

**UC-S-3. Create a Site**

- 3.1 System displays "Add Site" screen. User fills form. System validates (domain normalization + uniqueness, required fields), creates Site, sets `created_by_id` and `sourcer_id` to creator, sets status `PENDING`, notifies Admins.

**UC-S-4. Edit a Site**

- 4.1 System displays "All Sites" → user selects → clicks "Edit Site" → "Edit Site" screen → user saves. System validates, saves, sets status `PENDING` (re-review required). Edits permitted only by Site owner (Sourcer-created) or Manager/Admin.

**UC-S-5. Change Site status (Admin only)**

- 5.1 Needs changes → "All Sites" → "Needs changes" → "Change status" screen → `change_note` ≥ 10 chars → Confirm. Status → `NEEDS_CHANGES`. Notifies owner.
- 5.2 Activate (from `PENDING` or `NEEDS_CHANGES`) → Click "Activate" → "Change status" → Confirm. Status → `ACTIVE`. Notifies owner.
- 5.3 Archive (from `ACTIVE`) → Click "Archive Site" → "Change status" → Confirm. Status → `ARCHIVED`.
- 5.4 Unarchive (from `ARCHIVED`) → Click "Unarchive Site" → "Change status" → Confirm. Status → `ACTIVE`.

### 6.3 Category Management (Admin)

**UC-C-6. View Categories** → "All Categories" screen.

**UC-C-7. Create Category** → "Create Category" screen → user fills form → System validates uniqueness of `name`/`slug`, creates Category.

**UC-C-8. Edit Category** → "Edit Category" screen → user fills form → System validates and saves. A Category may not be deleted in v1 if any Site references it (soft archive only).

### 6.4 User Management (Admin)

**UC-U-1. View Users**

- 1.1 List → "All Users" screen.
- 1.2 Detail → selecting a user opens "User details".

**UC-U-2. Filter Users** → by role, status, free-text email/name.

**UC-U-3. Invite User**

- 3.1 Click "Invite User" → "Invitation" screen → enter email + role → "Send Invite" → System validates email uniqueness (across all User statuses), creates User with status `PENDING`, generates invitation token (7-day expiry), sends invitation email.

**UC-U-4. Resend Invitation**

- 4.1 Select user with status `PENDING` → "Resend Invite" → "Resent invite" screen → Confirm → System regenerates token (resets 7-day expiry), sends email again.

**UC-U-5. Edit User**

- 5.1 Select user → "Edit" → "Edit User" → fill form → Save. Editable fields: `firstName`, `lastName`, `email`, `role`, `manager_id` (when `role = Client`). (Admin-only; with confirmation if changing role of a user with active Orders/Sites)

**UC-U-6. Change User Status**

- 6.1 Disable Client/Manager/Admin/Copywriter with **no** active Orders → click "Disable" → "Confirm status change" (`disabled_reason` required) → Confirm → status `DISABLED`.
- 6.2 Disable Copywriter **with** active Orders (status in `IN_PROGRESS`, `NEEDS_CHANGES`) → click "Disable" → "Reassign active Orders" screen lists each active Order with a Copywriter picker → Save → System reassigns each Order's `copywriter_id`, then sets the original user to `DISABLED`. AC: cannot proceed until every active Order has a new copywriter selected.
- 6.3 Disable Sourcer → click "Disable" → "Confirm status change" → Confirm → status `DISABLED` and `sourcer_id` cleared on every Site that user owns (existing accrued Commissions are preserved but flagged for Admin review; new Commissions cannot be accrued for this user).
- 6.4 Disable current logged-in user → **Forbidden.** UI hides action; server returns 403.
- 6.5 Activate user (from `DISABLED`) → "Activate" → "Confirm status change" → Confirm → status `ACTIVE`.

### 6.5 Cart & Order Creation (Client)

**UC-O-3. Add to Cart**

- 3.1 First time → Client selects Site on "All Sites" → "Add to cart" → System creates Cart (if none) and CartItem.
- 3.2 Subsequent → System adds CartItem. AC: same Site already in Cart → action disabled; show tooltip "Already in cart".
- AC: Only `ACTIVE` Sites show an "Add to cart" button.

**UC-O-4. Remove from Cart**

- 4.1 From "All Sites" or "Cart" → "Remove from cart" → CartItem deleted.

**UC-O-5. View Cart** → "Cart" screen lists CartItems with editable `publish_date`; shows site info and running total.

**UC-O-6. Create Orders**

- 6.1 All CartItems' Sites are `Active` and all required fields are filled → user sets `publish_date` per CartItem → "Order" button → System creates one Order per CartItem (status `New`), snapshots `price_cents` and all Site fields onto the Order, deletes CartItems. Notifies Managers (group).
- 6.2 If any CartItem's Site is no longer `Active` → System displays Cart with a disclaimer per affected row; checkout is blocked until those rows are removed.
- AC: `publish_date` cannot be in the past.

### 6.6 Order — Client actions

**UC-O-7. View Orders**

- 7.1 List → "All Orders" (own only).
- 7.2 Detail → "View Order" screen with status, timeline, content (when available), Change Requests.

**UC-O-8. Cancel Order**

- 8.1 Status `New` only → "Cancel" button on All Orders → Confirm → status `Canceled`. Order excluded from future invoicing. Other statuses: action hidden / 403.

**UC-O-9. Edit Order**

- 9.1 Status `New` only → "Edit" button on All Orders → "Edit Order" screen → editable fields: `publish_date` → Save. Other statuses: action hidden / 403.

**UC-O-10. Review Order**

- 10.1 Approve (from `Content Sent`) → View Order screen → "Approve" button → status `Content Approved`; sets `approved_at`. Notifies Manager.
- 10.2 Reject (from `Content Sent`) → View Order screen → "Reject" button → "Leave a Comment" screen → `comment` ≥ 20 chars → Send → System creates Comment, sets status `Needs changes`. Notifies Copywriter.

### 6.7 Order — Manager / Admin actions

**UC-OM-1. View Orders**

- 1.1 "All Orders" with kanban + table toggle, grouped by status.
- 1.2 Detail → "View Order".

**UC-OM-2. Filter Orders** → by status, publish date, copywriter (see §8.8 Filters).

**UC-OM-3. Manage Copywriter**

- 3.1 Assign → "Assign a copywriter" button on All Orders (visible when `order.copywriter_id` is empty) → screen → pick Copywriter → Save → status `In Progress`, `copywriter_id` set, `manager_id` set if first action, notify Copywriter.
- 3.2 Reassign → "Reassign a copywriter" button (visible when `order.copywriter_id` is set) → screen → pick new Copywriter → Save → `copywriter_id` updated, status unchanged, notify both Copywriters.

**UC-OM-4. Publish Order**

- 4.1 From `Content Approved` → "Publish" button on All Orders → "Publish Order" screen → enter `published_url` (HTTPS) and confirm `publish_date` (default = `order.publish_date`) → "Publish" → System verifies URL contains an `<a href>` matching `anchor_text` (case-insensitive). Manager may override with a typed reason on verification failure (logged).
- AC: status → `Published`, `published_at` and `published_by_id` set, `billing_month` defaulted to month of `published_at`, Commission accrued if `sourcer_id` present, Client notified.

### 6.8 Order — Copywriter actions

**UC-OC-1. View Orders** → assigned only.

**UC-OC-2. Filter Orders** → assigned only.

**UC-OC-3. Copywriting**

- 3.1 Status `In Progress` or `Needs changes` → All Orders → "Edit" button → "Edit Content" screen → Save → `content_body` updated. Status unchanged. Multiple saves permitted before submit.

**UC-OC-4. Submit**

- 4.1 All Orders → "Submit" button (visible when `order.status = In Progress`) → status → `Content Sent`; sets `sent_at`. AC: blocked if `content_body` is empty or < 50 chars. Notifies Client.

### 6.9 Invoicing (monthly)

**FR-INV-1.** **Monthly invoice generation job.** On day 1 of each calendar month at 00:05 UTC, for each Client:

- Find all Orders with `status = Published` and `billing_month` in the **previous** calendar month, that have no `invoice_id` yet.
- If ≥ 1 such Order exists, create one Invoice (`status = Draft`) for that `(client_id, billing_month)`, set `Order.invoice_id` on each, set `total_price_cents = sum of Orders' price_cents`.
- AC: idempotent — re-running for the same `(client_id, billing_month)` is a no-op.
- AC: an Order's `billing_month` determines which Invoice it belongs to; the default is the month of `published_at` but can be overridden via Edit Invoice Orders (§8.10) while the Invoice is still `Draft`.

**FR-INV-2.** Admin/Manager can view Invoices and download PDF (§8.10 All Invoices / View Invoice).

**FR-INV-3.** Admin/Manager sends Invoice to Client: `Draft → Sent` (records `sent_at`, `sent_by_id`).

**FR-INV-4.** Admin marks Invoice as paid: `Sent → Paid` (records `marked_as_paid_at`, `marked_as_paid_by_id`).

**FR-INV-5.** **Late-publish / billing-month adjustment.** If an Order's `billing_month` is changed via Edit Invoice Orders to a month that already has a `Sent` or `Paid` Invoice, it is placed on a new corrective `Draft` Invoice for that period instead.

### 6.10 Sourcer Earnings

**FR-EARN-1.** When Order → `Published` and the Site has a `sourcer_id`, snapshot `Site.sourcer_payout_cents` onto the Order as `sourcer_payout_cents`. This locks in the payout amount; later edits to the Site never change historical earnings.

**FR-EARN-2.** Admin marks batches of published Orders as paid via `/dashboard/earnings`, recording `sourcer_paid_at` and `sourcer_payout_reference`. Only Orders with a non-null `sourcer_payout_cents` and a null `sourcer_paid_at` are eligible.

**FR-EARN-3.** `/dashboard/earnings` is visible to Sourcer (own earnings only) and Admin (all sourcers, filterable). Manager has no access. It shows monthly totals (Earned / Paid / Unpaid) and a per-Order table with payout status and reference.

**FR-EARN-4.** Sourcers have a read-only Orders view (`/dashboard/orders`) scoped to orders placed on sites where they are the sourcer; client/copywriter/manager identities are hidden, payout column is shown.

### 6.11 Notifications

**FR-NOT-1.** In-app notification center: unread count, mark read, mark all read.

**FR-NOT-2.** Email notifications per-user-configurable; defaults below.

| Event                                           | Recipients                                        | Default channel |
| ----------------------------------------------- | ------------------------------------------------- | --------------- |
| Site submitted                                  | Admins                                            | In-app + email  |
| Site status changed (`ACTIVE`, `NEEDS_CHANGES`) | Site `created_by` (and `sourcer_id` if different) | In-app + email  |
| User invited / re-invited                       | Invitee                                           | Email           |
| Order created                                   | Managers (group)                                  | In-app          |
| Copywriter assigned / reassigned                | Affected copywriter(s)                            | In-app + email  |
| Content submitted (`CONTENT_SENT`)              | Order's Client                                    | In-app + email  |
| Change Request created                          | Assigned Copywriter                               | In-app + email  |
| Content approved                                | Assigned Manager                                  | In-app          |
| Order published                                 | Client                                            | In-app + email  |
| Invoice issued                                  | Client                                            | Email           |
| Invoice overdue                                 | Client + Admin                                    | Email           |
| Sourcer payout marked paid                      | Sourcer                                           | In-app + email  |

### 6.12 Audit Log

**FR-AUD-1.** Every state-changing action records an AuditLog entry.

**FR-AUD-2.** Order detail page shows a human-readable timeline scoped to viewer permissions: status changes, assignments, content submits, ChangeRequests, publish action.

---

## 7. Non-Functional Requirements

### 7.1 Performance

- p95 dashboard load < 1.5s with up to 1,000 records in scope.
- p95 list/search API < 500ms.
- Bulk imports up to 5,000 rows complete within 60s.

### 7.2 Scalability

- Support 10k users, 1M Sites, 100k Orders/year on a single relational DB without sharding.

### 7.3 Security

- HTTPS everywhere.
- Passwords and sessions managed by Supabase Auth (bcrypt internally; not application-managed).
- CSRF protection via Supabase Auth's cookie settings (`SameSite=Lax`, `Secure`, `HttpOnly`).
- RBAC enforced server-side in Next.js API route handlers / Server Actions on every request; Supabase Auth JWT is verified on each call.
- File uploads: type + size validated (≤ 10 MB images; image MIME types only); stored in Supabase Storage.
- PII (`email`, `payout_details`) managed by Supabase (encrypted at rest by default).
- SSRF protection on the publish-link verifier and commission re-check: deny private IP ranges, redirect chain limit, 10s timeout, content-type allowlist.
- Invitation flow delegated to Supabase Auth invite email; no custom tokens in the application layer.

### 7.4 Reliability

- Daily encrypted backups, 30-day retention.
- RPO ≤ 24h, RTO ≤ 4h.
- All critical state transitions and scheduled jobs are idempotent.

### 7.5 Observability

- Structured logs for every state transition.
- Error tracking (Sentry or equivalent).
- Dashboards: Orders by status, average time-in-status per stage, monthly Invoice volume, commission payout volume, Invoice overdue rate, link-verification failure rate.

### 7.6 Accessibility & i18n

- WCAG 2.1 AA on primary flows.
- All user-facing strings externalized; v1 ships English.
- Currency formatting respects locale; storage in cents + ISO currency.

---

## 8. UX / Interface Requirements

### 8.1 Global

- Top nav: logo, role-aware primary links, notifications bell with unread count, profile menu.
- Responsive: desktop primary, tablet supported, mobile read-only acceptable for v1.
- Every list view defines: empty-state copy + primary CTA, loading skeleton, error state with retry.
- Form validation: inline per-field plus summary on submit.

### 8.2 Dashboards (per role)

**Client:** active Orders by status (cards), Orders awaiting review CTA, Cart summary with item count, latest Invoice + outstanding balance, "Browse catalog" CTA.

**Manager:** All Orders list filtered to their active work; counters for Unassigned (`New`), In Progress, Needs Changes, Awaiting Publication (`Content Approved`).

**Copywriter:** assigned Orders with publish date and status; quick filters: In Progress / Needs Changes.

**Sourcer:** my Sites by status, last month's earnings summary (Earned / Paid / Unpaid totals).

**Admin:** Site review queue count, User invitations awaiting acceptance, Draft/Sent Invoice counts, unpaid sourcer payouts total.

---

### 8.3 Authentication Screens

#### Login

| Field          | Type   | Validation | Notes              |
| -------------- | ------ | ---------- | ------------------ |
| Logo           | image  |            | Navigates to index |
| Email          | string | required   |                    |
| Password       | string | required   |                    |
| Login          | button |            |                    |
| Reset password | button |            |                    |

#### Forgot Password

| Field           | Type   | Validation | Notes              |
| --------------- | ------ | ---------- | ------------------ |
| Logo            | image  |            | Navigates to index |
| Email           | string | required   |                    |
| Send reset link | button |            |                    |

#### Reset Password

| Field            | Type   | Validation | Notes              |
| ---------------- | ------ | ---------- | ------------------ |
| Logo             | image  |            | Navigates to index |
| Password         | string | required   |                    |
| Confirm password | string | required   |                    |
| Save             | button |            |                    |

#### Set Password _(invitation acceptance)_

| Field    | Type   | Validation | Notes              |
| -------- | ------ | ---------- | ------------------ |
| Logo     | image  |            | Navigates to index |
| Password | string | required   |                    |
| Save     | button |            |                    |

---

### 8.4 Profile Screens

#### View Profile

| Field           | Type   | Validation | Notes                  |
| --------------- | ------ | ---------- | ---------------------- |
| Avatar          | image  | read only  |                        |
| Name            | string | read only  | First name + Last name |
| Email           | string | read only  |                        |
| Edit            | button |            |                        |
| Change password | button |            |                        |

#### Edit Profile

| Field      | Type   | Validation | Notes |
| ---------- | ------ | ---------- | ----- |
| Avatar     | image  | optional   |       |
| First name | string | required   |       |
| Last name  | string | required   |       |
| Save       | button |            |       |
| Cancel     | button |            |       |

#### Change Credentials

| Field            | Type   | Validation | Notes |
| ---------------- | ------ | ---------- | ----- |
| Email            | string | required   |       |
| Current password | string | required   |       |
| New password     | string | required   |       |
| Confirm password | string | required   |       |
| Save             | button |            |       |
| Cancel           | button |            |       |

---

### 8.5 User Management Screens _(Admin)_

#### All Users

| Field         | Type            | Validation | Notes                         |
| ------------- | --------------- | ---------- | ----------------------------- |
| Avatar        | image           | read only  |                               |
| Name          | string          | read only  | First name + Last name        |
| Email         | string          | read only  |                               |
| Role          | enum userRole   | read only  |                               |
| Status        | enum userStatus | read only  |                               |
| Invite User   | button          |            |                               |
| Resend invite | button          |            | Only when `status = Pending`  |
| Edit          | button          |            |                               |
| Disable       | button          |            |                               |
| Activate      | button          |            | Only when `status = Disabled` |

#### User Details

| Field      | Type            | Validation | Notes                          |
| ---------- | --------------- | ---------- | ------------------------------ |
| Avatar     | image           | read only  |                                |
| Name       | string          | read only  | First name + Last name         |
| Email      | string          | read only  |                                |
| Role       | enum userRole   | read only  |                                |
| Status     | enum userStatus | read only  |                                |
| Invited at | date            | read only  |                                |
| Manager    | User            | read only  | Only when `user.role = Client` |

#### All Users — Filters

| Field  | Type            | Validation | Notes                           |
| ------ | --------------- | ---------- | ------------------------------- |
| Search | string          | optional   | By first name, last name, email |
| Role   | enum userRole   | optional   |                                 |
| Status | enum userStatus | optional   |                                 |

#### Invitation

| Field      | Type          | Validation                              | Notes                                                                           |
| ---------- | ------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| First name | string        | required                                |                                                                                 |
| Last name  | string        | required                                |                                                                                 |
| Email      | string        | required                                |                                                                                 |
| Role       | enum userRole | required                                |                                                                                 |
| Manager    | User          | optional; required when `role = Client` | Hidden when inviting from a Manager account (auto-assigned); visible when Admin |

#### Resend Invite

| Field   | Type          | Validation | Notes                  |
| ------- | ------------- | ---------- | ---------------------- |
| Name    | string        | read only  | First name + Last name |
| Email   | string        | read only  |                        |
| Role    | enum userRole | read only  |                        |
| Confirm | button        |            |                        |
| Cancel  | button        |            |                        |

#### Edit User

| Field      | Type          | Validation                              | Notes              |
| ---------- | ------------- | --------------------------------------- | ------------------ |
| First name | string        | required                                |                    |
| Last name  | string        | required                                |                    |
| Email      | string        | required                                |                    |
| Role       | enum userRole | required                                |                    |
| Manager    | User          | optional; required when `role = Client` | Visible when Admin |
| Save       | button        |                                         |                    |
| Cancel     | button        |                                         |                    |

#### Confirm Status Change _(Disable / Activate)_

| Field      | Type          | Validation | Notes                                                      |
| ---------- | ------------- | ---------- | ---------------------------------------------------------- |
| Disclaimer | string        | read only  | Human-readable description of what the status change means |
| Name       | string        | read only  | First name + Last name                                     |
| Email      | string        | read only  |                                                            |
| Role       | enum userRole | read only  |                                                            |
| Confirm    | button        |            |                                                            |
| Cancel     | button        |            |                                                            |

#### Reassign Active Orders _(shown when disabling a Copywriter with active Orders)_

| Field        | Type    | Validation | Notes                                                              |
| ------------ | ------- | ---------- | ------------------------------------------------------------------ |
| Disclaimer   | string  | read only  |                                                                    |
| Checkbox     | boolean | required   | Confirmation; default `false`                                      |
| Clients info | User[]  | read only  | Clients whose Orders are assigned to the Copywriter being disabled |
| Copywriter   | User    | required   | Replacement copywriter; `role = Copywriter`                        |
| Reassign     | button  |            |                                                                    |
| Cancel       | button  |            |                                                                    |

---

### 8.6 Site Management Screens

#### All Sites

| Field         | Type            | Validation | Notes                                                                                    |
| ------------- | --------------- | ---------- | ---------------------------------------------------------------------------------------- |
| Domain        | string          | read only  |                                                                                          |
| DR            | number          | read only  |                                                                                          |
| Category      | Category        | read only  |                                                                                          |
| Top countries | string          | read only  |                                                                                          |
| Countries     | enum Country[]  | read only  |                                                                                          |
| Languages     | enum Language[] | read only  |                                                                                          |
| Price         | number          | read only  |                                                                                          |
| Status        | enum siteStatus | read only  | Visible when `user.role = Sourcer` or `Admin`                                            |
| Create        | button          |            | Only when `user.role = Sourcer`                                                          |
| Add to Cart   | button          |            | Only when `user.role = Client`                                                           |
| Edit          | button          |            | Admin always; Sourcer only when `site.created_by = user`                                 |
| Change status | button          |            | Only when `user.role = Admin`; actions: Request changes / Activate / Archive / Unarchive |

#### All Sites — Filters

| Field      | Type            | Validation | Notes                                      |
| ---------- | --------------- | ---------- | ------------------------------------------ |
| Search     | string          | optional   | By domain, keywords relevance, description |
| Category   | Category        | optional   |                                            |
| Status     | enum siteStatus | optional   |                                            |
| Countries  | enum Country[]  | optional   |                                            |
| Language   | enum Language   | optional   |                                            |
| Link type  | enum linkType   | optional   |                                            |
| Price from | number          | optional   |                                            |
| Price to   | number          | optional   |                                            |

#### View Site

| Field                  | Type            | Validation | Notes                                                         |
| ---------------------- | --------------- | ---------- | ------------------------------------------------------------- |
| Domain                 | string          | read only  |                                                               |
| DR                     | number          | read only  |                                                               |
| Category               | Category        | read only  |                                                               |
| Top countries          | string          | read only  |                                                               |
| Countries              | enum Country[]  | read only  |                                                               |
| Languages              | enum Language[] | read only  |                                                               |
| Price                  | number          | read only  |                                                               |
| Status                 | enum siteStatus | read only  | Visible when `user.role = Sourcer` or `Admin`                 |
| Needs changes by       | User            | read only  | Required when `status = Needs changes`; visible to Admin only |
| Needs changes at       | date            | read only  | Required when `status = Needs changes`; visible to Admin only |
| Approved at            | date            | read only  | Required when `status = Active`; visible to Admin only        |
| Approved by            | User            | read only  | Required when `status = Active`; visible to Admin only        |
| Requirements           | string          | read only  | Visible to Sourcer, Manager, Admin                            |
| Description            | string          | read only  |                                                               |
| Sourcer notes          | string          | read only  | Visible to Sourcer and Admin only                             |
| Contact info           | string          | read only  | Visible to Sourcer, Manager, Admin                            |
| Link type              | enum linkType   | read only  |                                                               |
| Keywords relevance     | string          | read only  |                                                               |
| Organic keywords count | number          | read only  |                                                               |
| Organic traffic count  | number          | read only  |                                                               |
| Created by             | User            | read only  | Visible to Admin only                                         |
| Is still working?      | boolean         | read only  | Whether the Sourcer is still assigned (not disabled/cleared)  |

#### Create Site / Edit Site

| Field                  | Type            | Validation | Notes              |
| ---------------------- | --------------- | ---------- | ------------------ |
| Domain                 | string          | required   |                    |
| DR                     | number          | required   |                    |
| Category               | Category        | required   |                    |
| Top countries          | string          | required   |                    |
| Countries              | enum Country[]  | required   |                    |
| Languages              | enum Language[] | required   |                    |
| Price                  | number          | required   |                    |
| Requirements           | string          | optional   |                    |
| Description            | string          | optional   |                    |
| Sourcer notes          | string          | optional   |                    |
| Contact info           | string          | optional   |                    |
| Link type              | enum linkType   | required   | Default `dofollow` |
| Keywords relevance     | string          | optional   |                    |
| Organic keywords count | number          | required   | Default `0`        |
| Organic traffic count  | number          | required   | Default `0`        |
| Save                   | button          |            |                    |
| Cancel                 | button          |            |                    |

#### Change Status _(Site — Admin only)_

| Field      | Type   | Validation | Notes                                     |
| ---------- | ------ | ---------- | ----------------------------------------- |
| Disclaimer | string | read only  | Describes the status change being applied |
| Confirm    | button |            |                                           |
| Cancel     | button |            |                                           |

#### All Categories

| Field  | Type   | Validation | Notes |
| ------ | ------ | ---------- | ----- |
| Name   | string | read only  |       |
| Create | button |            |       |
| Edit   | button |            |       |

#### Create Category / Edit Category

| Field  | Type   | Validation | Notes |
| ------ | ------ | ---------- | ----- |
| Name   | string | required   |       |
| Save   | button |            |       |
| Cancel | button |            |       |

---

### 8.7 Order Management — Client Screens

#### All Sites _(Client view — catalog)_

Shows the standard All Sites list (§8.6) plus:

| Field            | Type   | Notes                                   |
| ---------------- | ------ | --------------------------------------- |
| Add to Cart      | button | Adds site to Cart                       |
| Remove from Cart | button | Removes site from Cart if already added |

#### Cart

| Field               | Type   | Validation | Notes                                              |
| ------------------- | ------ | ---------- | -------------------------------------------------- |
| Disclaimer          | string | read only  | Shown per row when `cartItem.site.status ≠ Active` |
| Cart item site info | string | read only  | Domain, DR, price                                  |
| Publish date        | date   | required   | Month and year; must not be in the past            |
| Remove from Cart    | button |            |                                                    |
| Order               | button |            | Creates Orders from all valid CartItems            |

#### All Orders _(Client)_

| Field        | Type             | Validation | Notes                          |
| ------------ | ---------------- | ---------- | ------------------------------ |
| Site domain  | string           | read only  |                                |
| Site DR      | number           | read only  |                                |
| Publish date | date             | read only  | Month and year                 |
| Price        | number           | read only  |                                |
| Status       | enum orderStatus | read only  |                                |
| Invoice      | Invoice          | read only  |                                |
| Cancel       | button           |            | Only when `order.status = New` |
| Edit         | button           |            | Only when `order.status = New` |

#### View Order _(Client)_

| Field                       | Type             | Validation | Notes                                                                 |
| --------------------------- | ---------------- | ---------- | --------------------------------------------------------------------- |
| Publish date                | date             | read only  | Month and year                                                        |
| Price                       | number           | read only  |                                                                       |
| Status                      | enum orderStatus | read only  |                                                                       |
| Invoice                     | Invoice          | read only  |                                                                       |
| Site DR                     | number           | read only  |                                                                       |
| Site domain                 | string           | read only  |                                                                       |
| Site category               | Category         | read only  |                                                                       |
| Site top countries          | string           | read only  |                                                                       |
| Site countries              | enum Country[]   | read only  |                                                                       |
| Site languages              | enum Language[]  | read only  |                                                                       |
| Site description            | string           | read only  |                                                                       |
| Site link type              | enum linkType    | read only  |                                                                       |
| Site keywords relevance     | string           | read only  |                                                                       |
| Site organic keywords count | number           | read only  |                                                                       |
| Site organic traffic count  | number           | read only  |                                                                       |
| Comments                    | Comment[]        | read only  |                                                                       |
| Approve                     | button           |            | Only when `order.status = Content Sent`                               |
| Reject                      | button           |            | Only when `order.status = Content Sent`; opens Leave a Comment screen |

#### Leave a Comment _(Client — Reject flow)_

| Field      | Type   | Validation | Notes                         |
| ---------- | ------ | ---------- | ----------------------------- |
| Order info | string | read only  |                               |
| Comment    | string | required   | ≥ 20 chars                    |
| Send       | button |            | Sets status → `Needs changes` |
| Cancel     | button |            |                               |

---

### 8.8 Order Management — Internal Screens _(Manager / Admin)_

#### All Orders _(Manager / Admin)_

| Field                 | Type             | Validation | Notes                                          |
| --------------------- | ---------------- | ---------- | ---------------------------------------------- |
| Site domain           | string           | read only  |                                                |
| Site DR               | number           | read only  |                                                |
| Publish date          | date             | read only  | Month and year                                 |
| Price                 | number           | read only  |                                                |
| Status                | enum orderStatus | read only  |                                                |
| Invoice               | Invoice          | read only  |                                                |
| Sourcer               | User             | read only  |                                                |
| Client                | User             | read only  |                                                |
| Copywriter            | User             | read only  |                                                |
| Assign a copywriter   | button           |            | Visible when `order.copywriter_id` is empty    |
| Reassign a copywriter | button           |            | Visible when `order.copywriter_id` is set      |
| Publish               | button           |            | Visible when `order.status = Content Approved` |

#### All Orders — Filters _(Manager / Admin)_

| Field        | Type             | Validation | Notes |
| ------------ | ---------------- | ---------- | ----- |
| Status       | enum orderStatus | optional   |       |
| Publish date | date             | optional   |       |
| Copywriter   | User             | optional   |       |

#### View Order _(Manager / Admin)_

| Field                       | Type             | Validation | Notes                                    |
| --------------------------- | ---------------- | ---------- | ---------------------------------------- |
| Publish date                | date             | read only  | Month and year                           |
| Price                       | number           | read only  |                                          |
| Status                      | enum orderStatus | read only  |                                          |
| Approved at                 | date             | read only  | Visible when `status = Content Approved` |
| Published at                | date             | read only  | Visible when `status = Published`        |
| Published by                | User             | read only  | Visible when `status = Published`        |
| Published URL               | string           | read only  | Visible when `status = Published`        |
| Invoice                     | Invoice          | read only  |                                          |
| Sourcer                     | User             | read only  |                                          |
| Client                      | User             | read only  |                                          |
| Copywriter                  | User             | read only  |                                          |
| Created at                  | date             | read only  |                                          |
| Site domain                 | string           | read only  |                                          |
| Site DR                     | number           | read only  |                                          |
| Site category               | Category         | read only  |                                          |
| Site top countries          | string           | read only  |                                          |
| Site countries              | enum Country[]   | read only  |                                          |
| Site languages              | enum Language[]  | read only  |                                          |
| Site requirements           | string           | read only  |                                          |
| Site description            | string           | read only  |                                          |
| Site contact info           | string           | read only  |                                          |
| Site link type              | enum linkType    | read only  |                                          |
| Site keywords relevance     | string           | read only  |                                          |
| Site organic keywords count | number           | read only  |                                          |
| Site organic traffic count  | number           | read only  |                                          |
| Comments                    | Comment[]        | read only  |                                          |

#### Assign a Copywriter / Reassign a Copywriter

| Field      | Type   | Validation | Notes               |
| ---------- | ------ | ---------- | ------------------- |
| Order      | Order  | read only  | Main order info     |
| Copywriter | User   | required   | `role = Copywriter` |
| Save       | button |            |                     |
| Cancel     | button |            |                     |

#### Publish Order

| Field         | Type   | Validation | Notes                                      |
| ------------- | ------ | ---------- | ------------------------------------------ |
| Order         | Order  | read only  | Main order info                            |
| Published URL | string | required   | HTTPS; link-verified against `anchor_text` |
| Publish date  | date   | required   | Default = `order.publish_date`             |
| Publish       | button |            |                                            |
| Cancel        | button |            |                                            |

---

### 8.9 Copywriting Screens

#### All Orders _(Copywriter)_

| Field          | Type             | Validation | Notes                                  |
| -------------- | ---------------- | ---------- | -------------------------------------- |
| Site domain    | string           | read only  |                                        |
| Site DR        | number           | read only  |                                        |
| Publish date   | date             | read only  | Month and year                         |
| Status         | enum orderStatus | read only  |                                        |
| Client         | User             | read only  |                                        |
| Comments count | number           | read only  |                                        |
| Edit           | button           |            | Only when `order.status = In Progress` |
| Submit         | button           |            | Only when `order.status = In Progress` |

#### View Order _(Copywriter)_

| Field                       | Type             | Validation | Notes                                    |
| --------------------------- | ---------------- | ---------- | ---------------------------------------- |
| Publish date                | date             | read only  | Month and year                           |
| Status                      | enum orderStatus | read only  |                                          |
| Approved at                 | date             | read only  | Visible when `status = Content Approved` |
| Client                      | User             | read only  |                                          |
| Created at                  | date             | read only  |                                          |
| Site domain                 | string           | read only  |                                          |
| Site DR                     | number           | read only  |                                          |
| Site category               | Category         | read only  |                                          |
| Site top countries          | string           | read only  |                                          |
| Site countries              | enum Country[]   | read only  |                                          |
| Site languages              | enum Language[]  | read only  |                                          |
| Site description            | string           | read only  |                                          |
| Site link type              | enum linkType    | read only  |                                          |
| Site keywords relevance     | string           | read only  |                                          |
| Site organic keywords count | number           | read only  |                                          |
| Site organic traffic count  | number           | read only  |                                          |
| Comments                    | Comment[]        | read only  |                                          |

#### Edit Content

| Field   | Type   | Validation | Notes                               |
| ------- | ------ | ---------- | ----------------------------------- |
| Order   | Order  | read only  | As shown in View Order              |
| Content | string | required   | ≥ 50 chars before submit            |
| Save    | button |            | Saves draft; does not change status |
| Cancel  | button |            |                                     |

---

### 8.10 Invoicing Screens _(Admin / Manager)_

#### All Invoices

| Field         | Type               | Validation | Notes                              |
| ------------- | ------------------ | ---------- | ---------------------------------- |
| Client        | User               | read only  | First name + Last name             |
| Orders count  | number             | read only  |                                    |
| Total price   | number             | read only  |                                    |
| Billing month | date               | read only  |                                    |
| Status        | enum invoiceStatus | read only  |                                    |
| Edit          | button             |            | Only when `invoice.status = Draft` |
| Send          | button             |            | Only when `invoice.status = Draft` |
| Mark as paid  | button             |            | Only when `invoice.status = Sent`  |
| Download PDF  | button             |            |                                    |

#### View Invoice

| Field             | Type               | Validation | Notes                                  |
| ----------------- | ------------------ | ---------- | -------------------------------------- |
| Client            | User               | read only  | Main user info                         |
| Orders            | Order[]            | read only  | Main order info per line               |
| Total price       | number             | read only  |                                        |
| Billing month     | date               | read only  |                                        |
| Status            | enum invoiceStatus | read only  |                                        |
| Sent at           | date               | read only  | Visible when `status = Sent` or `Paid` |
| Sent by           | User               | read only  | Visible when `status = Sent` or `Paid` |
| Marked as paid at | date               | read only  | Visible when `status = Paid`           |
| Marked as paid by | User               | read only  | Visible when `status = Paid`           |

#### Edit Invoice Orders _(reassign Order billing months within Draft invoice)_

| Field          | Type               | Validation | Notes                                                               |
| -------------- | ------------------ | ---------- | ------------------------------------------------------------------- |
| Client         | User               | read only  | Main user info                                                      |
| Total price    | number             | read only  | Recalculated live                                                   |
| Billing month  | date               | read only  | Current invoice billing month                                       |
| Status         | enum invoiceStatus | read only  |                                                                     |
| Orders         | Order[]            | read only  | List of attached orders                                             |
| Published date | date               | read only  | Per-order                                                           |
| Billing month  | date               | required   | Per-order; editable to reassign order to a different invoice period |
| Save           | button             |            |                                                                     |
| Cancel         | button             |            |                                                                     |

#### Send Invoice

| Field   | Type    | Validation | Notes                                                  |
| ------- | ------- | ---------- | ------------------------------------------------------ |
| Invoice | Invoice | read only  | Main invoice info                                      |
| Send    | button  |            | Sets `status = Sent`, records `sent_at` / `sent_by_id` |
| Cancel  | button  |            |                                                        |

#### Mark as Paid

| Field        | Type    | Validation | Notes                                                                      |
| ------------ | ------- | ---------- | -------------------------------------------------------------------------- |
| Invoice      | Invoice | read only  | Main invoice info                                                          |
| Mark as paid | button  |            | Sets `status = Paid`, records `marked_as_paid_at` / `marked_as_paid_by_id` |
| Cancel       | button  |            |                                                                            |

---

## 9. Integration & API Surface

### 9.1 Internal API

- REST or GraphQL (implementer's choice); document with OpenAPI / SDL.
- All write endpoints validate the actor's permission against §3.2 server-side.
- Idempotency keys on Cart checkout (UC-O-6) to prevent duplicate Order creation on double-submit.

### 9.2 External integrations (v1)

- Email: transactional provider (SendGrid / Postmark / SES) behind a `Mailer` interface.
- File storage: S3-compatible bucket for content images and Invoice PDFs.

### 9.3 External integrations (Phase 2+)

- Stripe for Invoice payment.
- Ahrefs / SEMrush APIs for live Site metrics.
- Outbound webhooks.

---

## 10. Edge Cases & Business Rules

1. **Site goes non-`ACTIVE` after CartItem added but before checkout:** Cart shows disclaimer; checkout blocked until row removed (UC-O-6.2).
2. **Site goes non-`ACTIVE` after Order created:** Order proceeds normally (Site state at Order creation is what counts).
3. **Site edited (any field) by owner:** Site → `PENDING` (UC-S-4). In-flight Orders on that Site are unaffected.
4. **Order `CANCELED`:** excluded from invoicing and from commission accrual.
5. **Order published in same month it was created:** appears on next month's Invoice (job runs day 1).
6. **Order published _very late_ (after its month's Invoice already issued):** see FR-INV-5.
7. **Sourcer disabled (UC-U-6.3):** their Sites stay; `sourcer_id` cleared; existing accrued Commissions flagged for Admin; no new commissions accrue.
8. **Copywriter disabled with active Orders (UC-U-6.2):** mandatory reassignment screen blocks deactivation until all active Orders are reassigned.
9. **Repeated revision rounds:** no hard cap; ≥ 3 ChangeRequests on one Order flags it on Manager dashboard.
10. **Concurrent edits:** last-write-wins on non-status fields; status transitions guarded by current-status check (optimistic concurrency).
11. **Anchor verification false negative** (e.g., JS-rendered links): manager override path with logged reason satisfies this.
12. **Client tries to add same Site twice to Cart:** action disabled; one Cart cannot contain duplicate Sites.
13. **Two Clients order the same Site for the same `publish_month`:** allowed; they are independent Orders.
14. **Email used for an existing User (any status, including `DISABLED`):** invitation rejected as duplicate.
15. **Currency mismatch on Site creation / bulk import:** rejected at validation; v1 is single-currency.

---

## 11. Success Metrics

| Metric                               | Target                                           | Measured by           |
| ------------------------------------ | ------------------------------------------------ | --------------------- |
| Median time `NEW` → `PUBLISHED`      | ≤ 14 days                                        | Order timestamps      |
| Manager actions per Order (avg)      | ≤ 1                                              | AuditLog              |
| Active operational spreadsheets      | 0 by day 60 post-launch                          | Manual audit          |
| Order throughput per manager / month | ≥ 3× pre-launch baseline                         | DB                    |
| Sourcer dedup rejection rate         | ≥ 99% of duplicate submissions blocked at submit | DB + audit            |
| Invoice overdue rate                 | < 10% of issued Invoices                         | DB                    |
| Content first-pass approval rate     | ≥ 60% of submissions approved on first review    | ChangeRequest data    |
| Invoice generation accuracy          | 100% of `PUBLISHED` Orders billed exactly once   | Reconciliation report |

---

## 12. Constraints, Risks & Assumptions

### 12.1 Constraints

- v1 single-currency (deploy-time configurable).
- v1 single-organization.
- Content stored as sanitized HTML/text; document attachments (Word/PDF) out of scope for drafts in v1.
- One active Cart per Client.
- One Site per Order (no multi-site Orders).

### 12.2 Risks & Mitigations

| Risk                                                          | Impact                              | Mitigation                                                           |
| ------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Duplicate Sites slip through normalization                    | Polluted catalog, sourcer disputes  | Strict normalization + admin dedup tooling                           |
| Manager bottleneck remains because publication is manual      | Throughput goal missed              | Phase 2 publisher CMS integration; v1 metrics expose it              |
| External metrics (DR/traffic) go stale                        | Catalog quality issues              | Surface `metrics_updated_at`; CSV refresh tooling                    |
| Commission reversal disputes                                  | Sourcer trust erosion               | Verification window + auditable retry log + admin escalation queue   |
| Content disputes (client claims off-brief)                    | Stuck Orders                        | Manager intervention path + structured ChangeRequest comment minimum |
| Off-platform communication recurs                             | Defeats single-source-of-truth goal | First-class notifications; Phase 2 in-thread comments                |
| Late-published Orders break monthly invoicing assumptions     | Invoice errors                      | FR-INV-5 explicit policy + reconciliation report                     |
| Link-verifier SSRF / abuse                                    | Security                            | Deny private ranges, redirect cap, timeouts, content-type allowlist  |
| Sourcer/Copywriter cannot be deleted with active dependencies | UX friction                         | UC-U-6.2 forced reassignment; UC-U-6.3 sourcer-clear policy          |

### 12.3 Assumptions

- Clients use the platform for content review (not email/chat).
- Sourcers accept a verification window before commission becomes payable.
- One Order = one Client = one Site = one placement.
- Anchor and target URL are decided per-placement.
- Sourcer payout is a fixed cents amount per Site, not a percentage.
- `publish_month` is a client-stated target, not a contractual SLA.

---

## 13. Phasing

### 13.1 MVP (v1) — must ship

- Auth + RBAC + invitation flow.
- Site submission, dedup, admin review, all status transitions.
- Category management.
- User management with all UC-U-6 disable rules.
- Catalog browse + filters.
- Cart + monthly Order creation flow (UC-O-3 through UC-O-9).
- Manager assignment + reassignment, copywriter content edit + submit, client review (Approve / ChangeRequest).
- Manual publication recording with link verification + override.
- Monthly Invoice generation (FR-INV-1) + manual mark-as-paid + overdue automation.
- Commission accrual, scheduled promotion to payable, manual payout.
- In-app + email notifications.
- Audit log.

### 13.2 Phase 2

- Stripe payment integration.
- Live Ahrefs/SEMrush metrics.
- Inline comments on drafts.
- Bulk operations (bulk Site import UI, bulk reassignment).
- Per-client custom pricing.

### 13.3 Phase 3

- Multi-currency.
- Multi-tenant / agency white-label.
- AI-assisted brief generation and draft QA.
- Public API + webhooks.

---

## 14. Open Questions

1. **Sourcer payout structure:** fixed cents per Site (assumed) or % of Site price?
2. **Manager pre-review of content:** content currently goes Copywriter → Client directly. Should there be a Manager QA step in between?
3. **Late-publish invoice policy (FR-INV-5):** add to next monthly Invoice (simple) vs. corrective Invoice for the original period (accountant-friendly)? Spec assumes the latter when the original period's Invoice is no longer `PENDING`.
4. **Tax handling on Invoices:** VAT/GST in v1 or Phase 2?
5. **Client-specific pricing:** single catalog price for all Clients (assumed) or negotiated rates per Client?
6. **Publish-month enforcement:** is `publish_month` a soft target (assumed) or is missing it a contractual breach with consequences?
7. **Content IP ownership:** affects whether removed placements can be re-sold elsewhere.
8. **Invoice modification after issuance:** allowed for `PENDING` Invoices only (assumed) or never?

---

## 15. Definition of Done (per release)

A release is done when:

- All in-scope FRs / UCs have passing acceptance tests.
- All four state machines (Site, User, Order, Invoice) have unit tests covering valid + invalid transitions.
- Permission matrix (§3.2) is enforced server-side and verified by tests for every endpoint.
- AuditLog entries exist for every state-changing test path.
- Monthly Invoice generation job has tests for: no-eligible-orders, single-eligible-order, multiple-eligible-orders, idempotency, late-publish (FR-INV-5).
- Commission promotion job has tests for: happy path, link-still-live failure + retry + escalation.
- p95 perf targets met on staging at 50% of scalability targets.
- Security checklist (auth, RBAC, file upload, encryption, SSRF, invitation tokens) reviewed and signed off.
- Runbooks documented for: monthly invoicing job, overdue-invoice job, commission promotion job, link re-verification job.

---

_End of document._
