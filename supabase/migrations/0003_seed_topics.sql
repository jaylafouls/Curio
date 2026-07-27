-- 0003 — Seed topics (13 rows: 10 Core active + 3 Extended inactive).
-- Labels FR from the chantier brief. badge_color reuses the EXACT hex from
-- tailwind.config.ts `theme.extend.colors.badge.*` (Design system chantier) —
-- single source of truth for the badge palette, mirrored here as a DB column.
-- Extended topics have no badge in the tailwind palette → badge_color NULL.
--
-- `icon` values are lucide-react icon names (project already depends on
-- lucide-react). Icon choice is a display detail, not a schema/product rule;
-- these are reasonable defaults, adjustable later without migration risk.
--
-- Idempotent: upsert on id so re-running refreshes labels/colors/order.

insert into public.topics (id, label_en, label_fr, icon, display_order, is_core, is_active, badge_color) values
  -- 10 Core (is_core=true, is_active=true) — order per brief listing
  ('travel',      'Travel',      'Voyages',    'plane',       1,  true,  true,  '#D9C6A6'),
  ('style',       'Style',       'Style',      'shirt',       2,  true,  true,  '#4A4550'),
  ('beauty',      'Beauty',      'Beauté',     'sparkles',    3,  true,  true,  '#D9AFAE'),
  ('wellness',    'Wellness',    'Bien-être',  'heart-pulse', 4,  true,  true,  '#93AFA8'),
  ('food',        'Food',        'Food',       'utensils',    5,  true,  true,  '#C1694F'),
  ('books',       'Books',       'Livres',     'book-open',   6,  true,  true,  '#8B6F47'),
  ('ideas',       'Ideas',       'Idées',      'lightbulb',   7,  true,  true,  '#D4A63A'),
  ('culture',     'Culture',     'Culture',    'landmark',    8,  true,  true,  '#C98A4B'),
  ('design',      'Design',      'Design',     'pen-tool',    9,  true,  true,  '#6A7B7A'),
  ('photography', 'Photography', 'Photo',      'camera',      10, true,  true,  '#5B7088'),
  -- 3 Extended (is_core=false, is_active=false) — not displayed in V1, FR label = EN for now
  ('tech',        'Tech',        'Tech',       'cpu',         11, false, false, null),
  ('business',    'Business',    'Business',   'briefcase',   12, false, false, null),
  ('science',     'Science',     'Science',    'flask-conical',13,false, false, null)
on conflict (id) do update set
  label_en      = excluded.label_en,
  label_fr      = excluded.label_fr,
  icon          = excluded.icon,
  display_order = excluded.display_order,
  is_core       = excluded.is_core,
  is_active     = excluded.is_active,
  badge_color   = excluded.badge_color;
