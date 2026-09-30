# SCULPT Dashboard Specification

Status: build brief for a **new repository**.  
Source of evidence: the SCULPT Expo app and the migrations in this repository.  
This file does not authorize changes to the mobile app, migrations, the Supabase project, or Cloudinary.

The dashboard is a separate website. It signs into the **existing** Supabase project and does only two jobs:

1. **Read the studio.** Show every active garment, one garment’s detail, home stats, the studio profile, and the Spec catalog.
2. **Add taxonomy the phone can use.** Create a Spec with `create_parameter`, then add an option on that Spec with `upsert_parameter_option`.

A Spec or option saved here must appear in the phone’s Add Garment flow, because both clients read `parameter_catalog` on the same database.

---

## 1. What to build

Create a new git repository beside this one, for example `/home/er/Desktop/sculpt-dashboard`. Do not put the website inside the mobile app, and do not change this repository except by adding this file.

Suggested stack, matching the existing web handover style:

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript `strict` |
| UI | Desktop-first layout. Usable at 1280px and at 390px. |
| Server data | Direct `fetch` to PostgREST and GoTrue. No second database. |
| Forms | One form for a new Spec, one form for a new option. |

Do not copy the mobile Add Garment wizard, camera flow, Cloudinary uploads, print, share, or soft-retire.

---

## 2. Out of scope

Do not implement any of the following:

- `create_garment`, `delete_garment`, `update_parameter`, `delete_parameter`, `delete_parameter_option`, `reset_parameter_defaults`, `upsert_garment_parameter_media`
- Edge Functions (`sign-upload`, `destroy-media`, `delete-garment`)
- A second Supabase project, new migrations, or new RPCs
- Option reference images (those need Cloudinary)
- Editing an existing Spec or option (`option_id` on the upsert RPC is an update; this dashboard only creates)
- Self-service registration, OTP, or password reset
- Hardcoded garment or catalog fixtures in the UI

The fuller mobile parity plan lives in `docs/SCULPT_WEB_REPLICATION_SPEC.md`. This dashboard is the smaller cut.

---

## 3. Sign-in

Studio accounts already exist in Supabase Auth. The site proves one of them, then every data call sends that user’s access token.

| Action | Request |
|---|---|
| Sign in | `POST {origin}/auth/v1/token?grant_type=password` |
| Refresh | `POST {origin}/auth/v1/token?grant_type=refresh_token` |
| Sign out | `POST {origin}/auth/v1/logout?scope=local` (best effort), then clear the stored session |

Headers on Auth and REST:

- `apikey`: the publishable anon key
- `Authorization: Bearer <access token>` on every call after sign-in
- `Accept: application/json` and `Content-Type: application/json`

The anon key alone cannot read views or run RPCs. A missing or expired user JWT is a failure. On HTTP 401, refresh once and retry. If refresh fails, clear the session and return to sign-in. Keep only one refresh in flight.

Login identifier (must match the mobile app that shares this project):

- Default `email_alias`: `{ "email": "91XXXXXXXXXX@phone.sculpt.studio", "password": "..." }`
- `phone` mode: `{ "phone": "+91XXXXXXXXXX", "password": "..." }`

Mobile field: strip non-digits; `91` plus 10 digits drops the country code; a leading `0` plus 10 digits drops the zero; keep at most 10 digits. Valid when it matches `^[6-9]\d{9}$`. Password is non-empty. Wrong password stays on the form. There is no registration screen.

Store `accessToken`, `refreshToken`, `expiresAt`, and `user` in `sessionStorage`. Clear them on sign-out. Do not put the session in the query string. Do not log tokens or passwords.

Environment:

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Origin only, no trailing slash. Same project as `EXPO_PUBLIC_SUPABASE_URL`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Publishable anon key. Same value as `EXPO_PUBLIC_SUPABASE_ANON_KEY`. |
| `NEXT_PUBLIC_AUTH_LOGIN_MODE` | No | `email_alias` (default) or `phone`. |
| `NEXT_PUBLIC_AUTH_ALIAS_EMAIL_DOMAIN` | No | Default `phone.sculpt.studio`. |

The service-role key must not appear in the browser, in `NEXT_PUBLIC_*`, or in git.

---

## 4. Read the studio

Base URL: `{NEXT_PUBLIC_SUPABASE_URL}/rest/v1`.

All four reads require the signed-in user. Show loading, empty, and error states. Surface a short message, never the raw error body.

### 4.1 Home stats

`POST /rpc/home_dashboard` with body `{}`.

```json
{
  "stats": {
    "total_garments": 0,
    "unique_seasons": 0,
    "unique_genders": 0,
    "unique_garment_types": 0
  },
  "recent": [],
  "studio_label": "",
  "date_label": ""
}
```

Show the four stats, `studio_label`, `date_label`, and the `recent` garments (the view already limits this list). Each recent card links to garment detail.

### 4.2 Every active garment

`GET /garment_list?order=created_at.desc`

`garment_list` already omits retired garments. Do not filter `is_active` on the client, and do not add pagination parameters.

Each row:

| Field | Use |
|---|---|
| `id` | Detail route |
| `human_id` | Garment ID |
| `style_number` | Style number when present |
| `title`, `description` | Card text |
| `short_badge` | Compact label |
| `season_label`, `gender_label`, `wear_system_label`, `garment_type_label`, `silhouette_label`, `fabric_label` | Taxonomy line |
| `ornamentation_codes` | Codes, may be empty |
| `hero_image_url` | Card image when present |
| `has_video` | Small video marker |
| `created_at` | Sort is already newest first |

A client-side search box over title, human id, and style number is enough. Do not invent server search.

### 4.3 Garment detail

`POST /rpc/garment_detail` with body `{ "id": "<uuid>" }`.

Response shape: `{ "garment": { ...list fields, gallery_urls, video_urls, components, parameter_media, custom_selections } }`.

Render:

- Hero (`hero_image_url`), title, description, human id, style number
- Season, gender, wear system, garment type, silhouette, fabric, ornamentation codes
- `custom_selections`: label plus `labels` (codes as secondary text)
- Gallery URLs and video URLs as links or images
- Components: `human_id`, `type_label`, `description`
- Spec photos from `parameter_media` (`parameter_label`, `image_url`)

A missing or retired id fails the RPC (`garment not found`). Show a not-found state for HTTP 404 and for HTTP 400 whose message contains that text. Detail is read-only.

### 4.4 Studio profile

`GET /studio_profile`

The response is an array. Use the first row. If the array is empty, show an error.

| Field | Label |
|---|---|
| `display_name` | Name |
| `role` | Role |
| `email` | Email |
| `studio_name` | Studio |
| `location` | Location |
| `avatar_url` | Avatar when present |
| `garments_logged` | Garments logged |
| `seasons_active` | Seasons active |

Header initials come from `display_name` once loaded. There is no profile edit and no password change.

### 4.5 Spec catalog

`GET /parameter_catalog?order=sort_order.asc`

Each row:

| Field | Meaning |
|---|---|
| `id`, `key`, `label`, `description` | The Spec |
| `selection` | `single` or `multi` |
| `required` | Whether Add Garment must answer it |
| `sort_order` | Catalog order |
| `coding_slot` | `style`, `class`, `look`, `element`, `build`, `finish`, or null |
| `options[]` | `id`, `code`, `label`, `description`, `colour`, `image_url`, `public_id`, `sort_order` |

Group Specs by `coding_slot` for display. Core keys that must not be recreated: `season`, `gender`, `wearSystem`, `garmentType`, `silhouette`, `fabric`, `ornamentation`.

After either write below, refetch this catalog.

---

## 5. Add a Spec

Screen: a form opened from the catalog. It calls one RPC.

`POST /rpc/create_parameter`

```json
{
  "payload": {
    "key": "motif",
    "label": "Motif",
    "description": "",
    "selection": "single",
    "required": true,
    "coding_slot": "element"
  }
}
```

`sort_order` is optional. Omit it and the database assigns the next value.

Client checks before submit:

| Field | Rule |
|---|---|
| `key` | Required. `^[a-z][a-zA-Z0-9_]*$`. Not one of the seven core keys. |
| `label` | Required after trim. |
| `description` | Optional string. Send `""` when blank. |
| `selection` | `single` or `multi`. |
| `required` | Boolean. Default `true`. |
| `coding_slot` | Required. One of `style`, `class`, `look`, `element`, `build`, `finish`. |

Success returns `{ "parameter": <catalog row>, "reactivated": false }`. `reactivated: true` means an inactive key with the same name was turned back on. Show the returned Spec and its id; the option form needs `parameter.id`.

Map database errors to short copy:

- key already exists
- key and label are required
- coding slot missing or not in the allowed list
- protected core key

Disable the submit button while the request is in flight.

---

## 6. Add an option on that Spec

The option form is available only after a Spec exists in the catalog (including one just created). It creates; it does not send `option_id`.

`POST /rpc/upsert_parameter_option`

```json
{
  "payload": {
    "parameter_id": "<uuid from the catalog>",
    "code": "FLORAL",
    "label": "Floral",
    "description": "",
    "colour": null
  }
}
```

Do not send `image_url`, `public_id`, `clear_image`, `file_name`, `mime_type`, or `file_size`. Reference images stay on the phone.

Client checks before submit:

| Field | Rule |
|---|---|
| `parameter_id` | Required UUID of an active Spec. |
| `code` | Required after trim. |
| `label` | Required after trim. |
| `description` | Optional. Send `""` when blank. |
| `colour` | Optional. Empty sends `null`. If set, `#` plus six hex digits. |

Success returns `{ "parameter": <catalog row including options>, "reactivated": false, "previous_public_id": null }`. Replace that Spec in the catalog with `parameter`. `reactivated: true` means an inactive option with the same code was turned back on.

Map database errors to short copy:

- code and label are required
- option code already exists for this Spec
- Spec not found or inactive

The phone’s Add Garment step for that Spec lists active options from `parameter_catalog`. After this call, a refresh on the phone must show the new option. No garment is created here.

---

## 7. Screens

| Route | Who | Content |
|---|---|---|
| `/sign-in` | Signed out | Mobile + password |
| `/` | Signed in | Home stats, recent garments, link to the full list |
| `/garments` | Signed in | Every `garment_list` row |
| `/garments/[id]` | Signed in | `garment_detail` |
| `/studio` | Signed in | `studio_profile` and sign-out |
| `/specs` | Signed in | `parameter_catalog`, “Add Spec”, “Add option” on each Spec |

Signed-out visits to the studio routes go to `/sign-in`. A valid stored session skips sign-in.

Visual tone follows the mobile studio: ink `#1A1A1A`, gold `#D4A853`, background `#FDF8F3`, card `#FFFFFF`, muted `#8C827A`, outline `#E8E2DA`, error `#C62828`. Headlines in a serif, body in a sans, IDs in a mono face. Copy stays short and calm.

---

## 8. Definition of done

- [ ] The website lives in its own repository. This mobile repository is unchanged apart from this file.
- [ ] Sign-in, session restore, one-shot 401 refresh, and sign-out work against the existing project.
- [ ] Home shows the four stats and recent garments from `home_dashboard`.
- [ ] `/garments` lists every active row from `garment_list`, newest first.
- [ ] Opening a card shows `garment_detail`. A retired id shows not-found.
- [ ] Studio shows the `studio_profile` row.
- [ ] Specs shows `parameter_catalog`, grouped by coding slot.
- [ ] Adding a Spec calls only `create_parameter`. The new Spec is visible in this catalog.
- [ ] Adding an option calls only `upsert_parameter_option` without `option_id` and without image fields. The option appears under that Spec.
- [ ] On the phone, Add Garment shows that Spec and option after a catalog refresh.
- [ ] The site never calls `create_garment` and never ships the Add Garment wizard.
- [ ] No service-role key, no new database, no new RPC, no migration.
- [ ] Loading, empty, and error states exist on every data screen.
