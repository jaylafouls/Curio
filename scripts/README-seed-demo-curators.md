# Demo curators — seed & purge

`scripts/seed-demo-curators.mjs` injects **3 clearly-labelled fictional Founding
Curators** into the live Supabase project so the site can be exercised in real
conditions beyond the owner's own test account.

> ⚠️ There is **one** Supabase project (no separate staging) — it also serves the
> real "prod". These accounts are intentionally easy to spot and purge before any
> real public launch.

## The 3 demo accounts

| Spec   | Email                     | Username              |
|--------|---------------------------|-----------------------|
| Travel | `demo-travel@curio.test`  | `@curio_demo_travel`  |
| Style  | `demo-style@curio.test`   | `@curio_demo_style`   |
| Design | `demo-design@curio.test`  | `@curio_demo_design`  |

Identifiers chosen for easy purge:

- **email** prefix `demo-…@curio.test` (the `.test` TLD never resolves, RFC 6761),
- **username** prefix `curio_demo_…`,
- every profile **bio ends with** the marker `[compte démo Curio]`.

Each curator has `is_founding_curator = true` (so they surface on `/curators`),
1–2 Projects, 2–3 **public** Collections (≥1 with a real Storage cover, the rest
exercising the Topic colour+icon fallback card), and 7–11 categorised Links —
Travel links use the real Travel sub-categories (Hébergement / Restaurant / Lieu à
voir / Activité / Transport).

## Commands

```bash
npm run seed:demo          # create/refresh the demo curators (idempotent)
npm run seed:demo:verify   # read-only: report what exists, exit 1 if incomplete
npm run seed:demo:purge    # delete all demo curators + their content
```

`seed:demo` is **idempotent**: accounts are looked up by email, canonical links
upserted on `url_normalized`, projects/collections matched on `(owner_id, name)`,
saves on their natural unique tuple. Re-running never duplicates.

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` (already present — the same keys `db:migrate` uses).

## Purge before a real launch

**Preferred — run the inverse script:**

```bash
npm run seed:demo:purge
```

It, for each demo account:

1. removes the account's cover objects from the `collection-covers` bucket
   (path prefix `<owner_id>/…`),
2. deletes the `public.users` row **first** — this cascades Projects,
   Collections and saves via `on delete cascade` FKs,
3. then calls `auth.admin.deleteUser`.

> The order (public.users **before** `auth.admin.deleteUser`) matters: GoTrue's
> hard-delete has been observed to 500 on accounts that still own rows, so the
> profile row is removed first. This mirrors the app's own `deleteAccount` fix.

**Manual fallback — SQL (service-role / SQL editor):**

```sql
-- Deleting the auth account cascades everything below it (public.users FK is
-- ON DELETE CASCADE, and projects/collections/user_links cascade from users).
-- Storage covers must be removed separately (see the script).
delete from auth.users
where email in (
  'demo-travel@curio.test',
  'demo-style@curio.test',
  'demo-design@curio.test'
);
```

After purge, confirm nothing remains:

```bash
npm run seed:demo:verify   # expect: FAIL (no auth user) for all three
```

Or by query — `select count(*) from public.users where username like 'curio_demo_%';`
should return `0`.
