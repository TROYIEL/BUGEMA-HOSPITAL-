# Bugema University Hospital

Next.js App Router, TypeScript and Tailwind CSS application. Appwrite provides authentication, DocumentsDB and storage. The same source also runs on the Sites Vinext adapter for private Cloudflare deployment; standard Next.js scripts are provided for Vercel or Node hosting.

## Delivery status

The application has real Appwrite REST operations, not simulated CRUD. Without Appwrite configuration, public pages show supplied contact information and useful empty states. Staff sign-in and submissions fail closed. No Appwrite project, API key or Turnstile credentials were supplied during implementation; live integration verification must be completed after setup. The photograph is illustrative, not a representation of the hospital. No clinicians, accreditations, testimonials or medical claims are invented.

## Install and run

Use Node.js 22.13+ and pnpm. `pnpm install --frozen-lockfile`. Copy `.env.example` to `.env.local`, fill values, and run `pnpm dev:next`. Standard Next.js uses port 3000. Build with `pnpm build:next`, then `pnpm start:next`. The `dev`, `build`, `start` scripts instead use the provided Sites adapter. Do not publish `.env.local`, keys or administrator passwords.

## Appwrite configuration

1. Create an Appwrite project in your chosen region and record its HTTPS `/v1` endpoint and project ID. Use a **dedicated hospital project**, not a database holding clinical records. Add your development and production hostnames as Web platforms.
2. Temporarily create a provisioning key with database, collection, attribute, index and bucket read/write scopes, document read/write scopes, user read/write scopes. Set the server-only `APPWRITE_API_KEY` in `.env.local`.
3. Set `APPWRITE_DATABASE_ID=hospital`, `APPWRITE_PUBLIC_BUCKET_ID=hospital_public`, and `APPWRITE_PRIVATE_BUCKET_ID=hospital_private`. Set matching non-secret `NEXT_PUBLIC_APPWRITE_*` values.
4. Run `pnpm appwrite:setup`. This creates collections and attributes, waits for provisioned attributes, then creates indexes and public/private buckets. The script is repeatable: existing resources are preserved. Verify index creation finishes in Appwrite Console before seeding.
5. Run `pnpm appwrite:seed`. This publishes supplied contact details, seeds editorial drafts, and does not overwrite existing documents. Review the contact number before designating it as the emergency line. Review/replace the illustrative photo and confirm opening/visiting hours.
6. Set `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` (at least 12 characters), and optionally `INITIAL_ADMIN_NAME`. Run `pnpm appwrite:admin` once. Remove the initial password and revoke the provisioning key. If an account already exists, use Appwrite Console to add the `hospital-admin` label instead of creating it again.
7. Create a runtime key with only `documents.read`, `documents.write`, `files.read`, `files.write`, `users.read`, `users.write`, and `sessions.write` scopes. The access-management endpoint requires `users.write`. Store this key only in the server's secret environment. Do not grant runtime schema-write or bucket-write scopes.
8. Configure Cloudflare Turnstile for the exact deployment hostname (and localhost for development), set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and server-only `TURNSTILE_SECRET_KEY`. Set `SITE_URL` to the exact origin, without trailing path. POST, PATCH and DELETE require a matching Origin header. Public forms and login validate Turnstile success and hostname.
9. Sign in at `/admin`. Approve and publish About, Patient information and Privacy pages; publish verified departments/services/doctors/articles/FAQs. Keep clinical facts as drafts until confirmed. Set real homepage content and approved photographs.

For Appwrite self-hosting, use a release supporting DocumentsDB REST APIs and session secrets. Permissions and REST response contracts should be verified against that server version. Official references: https://appwrite.io/docs/products/auth/server-side-rendering and https://appwrite.io/docs/products/databases/documentsdb/documents.

## Data model and permissions

Each CMS collection uses `title` (180), unique `slug` (100), `status` (30), integer `order` (0–10000), boolean `featured`, JSON-string `payload` (60000). Appwrite provides `$createdAt`/`$updatedAt`. Indexes cover unique slug, status+order, featured+status and order. `payload` contains safely rendered text, descriptions, image URL/alt, SEO fields, hours and type-specific fields. Forms are server-validated with Zod. HTML is never interpreted. Text is escaped by React; media/navigation URLs must be HTTPS or safe local routes.

Collections: `settings`, `pages`, `sections`, `departments`, `services`, `doctors`, `articles`, `categories`, `faqs`, `patient_information`, `appointments`, `enquiries`, `audit_logs`, plus private `rate_limits` cooldown markers. Doctor/service `payload.department` references the Appwrite department document ID and is validated on write. Articles reference category names from the category selector. Relationships are application-level references, not Appwrite relationship attributes; check references before deleting departments/categories.

All collections have `documentSecurity=true` and **empty collection permissions**. All client writes are denied. Published content documents receive only `read("any")`; drafts, archived records, requests and logs receive `[]`. Server endpoints use a privileged key and independently enforce staff labels on every request. Public queries additionally filter `status=published`. Pages fetch Appwrite with `cache: no-store` and `force-dynamic`, so saving/publishing updates subsequent page loads without stale cached content.

| Role | Content and public uploads | Patient requests and notes | Access administration / audit | Permanent content deletion |
| --- | --- | --- | --- | --- |
| `hospital-editor` | Yes | No | No | No (archive instead) |
| `hospital-requests` | No | Yes | No | No |
| `hospital-admin` | Yes | Yes | Yes | Yes |

Staff accounts are created in Appwrite Console. Administrators assign/remove labels in the dashboard. Self-role changes are blocked. Removing a role applies to existing sessions on the next server request because current labels are loaded from Appwrite Users every time. Staff login uses Appwrite email/password sessions and an HTTP-only, SameSite=Lax cookie capped at eight hours; production requires HTTPS. Logout deletes the Appwrite session and clears the cookie. Turnstile plus Appwrite-backed atomic 30-second per-email cooldown protects sign-in. Public forms have a ten-minute per-contact cooldown, required consent and a honeypot. Tokens are verified server-side and never stored.

Media bucket permissions are empty with file-level security. Only validated approved public uploads receive `read("any")`. Private bucket has no public grants; it is reserved and not exposed in the public media dashboard. JPG/PNG/WebP/PDF only, 5 MB, MIME and signature checks; Appwrite enforces extension/size/encryption/antivirus settings as supported by the plan. Public PDF uploads must be approved documents; this app does not store patient records. Deleting referenced media breaks those images/downloads, so replace links first.

Audit entries record the actor, target and attempted content/access operation with Appwrite timestamps. They are append-only through the application. An operation can fail after recording its intent; the log is not a transaction-backed proof of success. Appwrite administrators/API-key holders remain privileged. Restrict console and key access.

## Dashboard workflows

- Overview counts real Appwrite records: New appointment requests, enquiries with `unread=true`, published articles and published doctor profiles. Visibility follows staff roles.
- All content types have create/edit/publish/unpublish/archive and display-order/featured fields. Set `draft` to unpublish. Preview is private within the authenticated editor.
- Body text supports a safe Markdown subset: paragraphs, line breaks, headings, bold, bullet lists and validated links. The system deliberately does not accept raw HTML. Metadata fields are exposed for public content.
- Homepage hero/contact/branding/navigation/footer are in Settings; create one record with slug `hospital`. Additional homepage sections use Sections. Links are JSON arrays of `[label, path]` pairs; malformed and unsafe links are rejected. Core navigation is retained as a fallback.
- Department and doctor directories support search and filtering. Public profiles show only published content. Empty directories are useful, not fabricated data.
- Requests show contact details, preference, message and private notes. Status workflow: New → Contacted → Confirmed → Completed, or Cancelled. There is no availability calendar or automatic booking/confirmation. Staff must contact the patient.
- Search/filter applies to the current page; tables page through Appwrite records in batches of 100. Media and access lists currently show Appwrite's default first page / first 100 staff respectively; larger installations should add pagination to those views.

## Deployment

### Vercel / Node

Import the GitHub repository, choose Next.js, install with pnpm and use `pnpm build:next`; Node hosting uses `pnpm start:next`. Supply all server environment values and non-secret browser values before building. Add the production hostname in Appwrite and Turnstile, set exact `SITE_URL`, and use HTTPS. `NEXT_PUBLIC_` values are compiled at build time, so rebuild after changing them. Security headers are configured in `next.config.ts` for native Next.js hosting.

### Private Sites deployment

The included Vite/Vinext configuration and `.openai/hosting.json` retain the Sites deployment identity. Sites uses the adapter's build, not `next build`. Set server secrets through the hosting environment controls and rebuild with public values supplied. The initial private deployment does not have Appwrite or Turnstile secrets. Access through Sites adds an owner-private gate; Appwrite remains the staff authentication layer. Verify native Next.js security headers are applied by the adapter/host, or configure equivalent host headers.

## Validation

Run `pnpm typecheck`, `pnpm test`, `pnpm build:next`, and `pnpm build` when targeting Sites. Unit tests cover role isolation and unsafe links. `pnpm test:integration` runs a temporary native Next.js server against an isolated Appwrite HTTP stand-in to verify CRUD/publication permissions, role isolation, upload signatures, request review, origin checks and fail-closed submissions. This does not verify the live Appwrite or Turnstile service. No live Appwrite or browser/mobile session was available in the build environment; do not treat these checks as a live backend security audit.

Before enabling forms, execute `docs/ACCEPTANCE.md` against a staging Appwrite project. Confirm content publishing/unpublishing, editor/request separation, uploads, session/logout, all request statuses, spam limits and mobile keyboard flows. Verify no private data is returned through Appwrite's anonymous API, not just through dashboard controls.

## Maintenance and operational limits

Approve a patient-request retention policy with hospital management. This application does not choose a legal retention period or send automatic email/SMS. Schedule `node --env-file=.env.local scripts/cleanup-rate-limits.mjs` daily to remove old hashed cooldown markers. Back up Appwrite, rotate keys and patch dependencies. Establish staff account recovery/MFA in Appwrite Console before production use. There is no patient portal, medical record storage, payment system or live scheduling.
