# Follow-ups

Tracked, non-blocking follow-up work recorded from code reviews. Each entry is a
deferred improvement that shouldn't gate its originating PR but is worth doing.

---

## FU-1 — Orphaned Storage objects on cover upload cancel

**Area:** `components/app/project-modal.tsx`, `components/app/collection-modal.tsx`
**Source:** code review of `feat/universe-nudge-and-stats` (My Universe review, finding #2)
**Severity:** low — no user-facing bug, no security impact; pure Storage hygiene.

### Problem

Both modals upload the cover image to Supabase Storage **immediately** when the
user picks a file, before the form is submitted. The resulting public URL is only
persisted to the row on save. So if the user:

- uploads a cover, then cancels the modal, or
- uploads a cover, then removes it and uploads a different one, or
- uploads a cover, then closes without saving,

the earlier object stays in the bucket forever — never referenced by any row,
never garbage-collected. This is pre-existing behavior in `CollectionModal`;
`ProjectModal` mirrors it faithfully, so the pattern (and the leak) now exists in
two places.

### Fix direction

Add bucket cleanup for orphaned objects. Options, roughly in order of effort:

1. **Client-side best-effort delete** — track uploaded-but-unsaved paths in the
   modal; on cancel/replace/unmount, `supabase.storage.from(bucket).remove([...])`
   the ones that were never committed. Simple, but misses hard closes (tab kill).
2. **Server-side sweep** — a scheduled job (or on-save reconciliation) that
   deletes bucket objects under `<uid>/` with no referencing row. Robust, catches
   every orphan, but needs a job runner + service-role access.

Whichever direction is chosen, **do both modals together** — they share the exact
same upload pattern (same path prefix `<userId>/`, same RLS, same lifecycle), so a
fix should cover `project-covers` and the collection cover bucket in one pass.

### Acceptance

- Uploading a cover then cancelling leaves no object behind in the bucket (or a
  sweep reclaims it).
- Verified for both `ProjectModal` and `CollectionModal`.
