# travel-schdule: a trip planner page framework

[中文](README.md) | English

A multi-person trip planner that runs as a claude.ai artifact. This repo holds only the **framework**: the page, the docs and one example content file. A trip's own content (dates, people, plans, the split table…) is not in the repo. It lives in a "content file" that can be imported into the framework at any time.

The interface is in Traditional Chinese; this document gives each label in Chinese with its English meaning.

| File | What it is |
|---|---|
| `trip.html` | The page (one file: HTML + CSS + JS) |
| `examples/example-content.json` | Example content file showing the format |
| `README.md`, `README.en.md` | This document (Chinese / English): tabs, features, logic and usage |
| `index.html`, `manifest.webmanifest`, `sw.js`, `icon-*.png` | Files for the offline version (add to home screen), see 1.1 |

---

## 1. Getting started

1. Ask Claude to publish `trip.html` as a claude.ai artifact, declaring the capabilities in section 8.
2. Open the page. With no settings stored it shows the built-in example (「我的旅行（範例）」 "My trip (example)", 3 days, 4 travellers).
3. Fill in your own trip, either way:
   - Tap 「設定你自己的旅行」 "Set up your own trip" above the plan, or the gear at the top right (「行程設定」 trip settings). Enter the name, start date, number of days, regions, travellers and groups, then add each day's plans with 「＋ 加入行程」 "+ Add plan".
   - If you already have a content file: at the bottom of the 「花費」 (Costs) tab, under 「匯入／匯出內容」 (Import / export content), tap 「匯入內容檔」 (Import content file), choose the file, then tap 「確定匯入」 (Confirm import).
4. Map: if the trip has a `mapdata.json`, ask Claude to publish it as an artifact file alongside the page (the page reads `mapdata.json` from the same folder). Without one, the map section hides itself.
5. Sharing: invite your fellow travellers from the artifact's Share menu. To write notes and use a packing list they need the "Editor" role.

### 1.1 Offline version (personal use, like an app)

Opened anywhere other than claude.ai, the same `trip.html` becomes the **offline version**: data is kept on that device (the browser's IndexedDB), no sign-in is needed, and it can be viewed and edited without a connection.

**Hosting (once per repo)**: make the repo public → Settings → Pages → Source "Deploy from a branch", Branch `main`, folder `/ (root)` → Save. A few minutes later the site is at `https://<account>.github.io/<repo name>/`. Anyone who copies this template with "Use this template" does the same in their own repo.

**Installing on a phone** (the first time needs a connection; do not use private / incognito browsing):

iPhone (Safari)
1. Open the address in **Safari** and wait for the page to load fully (the top right shows 「存在這台裝置」 "Stored on this device").
2. Tap the **Share** button in the bottom toolbar (a square with an up arrow). On newer iOS, if the toolbar only shows "⋯", tap "⋯" and then "Share".
3. Scroll down and tap **Add to Home Screen**.
4. Change the name if you like. If there is an "Open as Web App" switch, leave it on. Tap **Add** at the top right.
5. From then on, open it from the home screen icon.

Android (Chrome)
1. Open the address in **Chrome** and wait for the page to load fully.
2. Tap **⋮** at the top right and choose **Install app** (some versions say "Add to Home screen", then "Install"). If an "Install" prompt appears at the bottom of the screen, you can tap that instead.
3. Confirm **Install**. The icon appears on the home screen or in the app drawer.
4. Samsung Internet: tap **≡** at the bottom → **Add page to** → **Home screen**.

Notes
- The home screen app and a browser tab keep **separate data**: what you enter in a Safari / Chrome tab does not appear in the home screen app. After installing, always use the icon. If you already entered data in a tab, export a backup there first, then import it in the app.
- After installing, open it once with a connection: the PDF tools, the map library and the fonts are stored on the phone, so they work offline afterwards.
- When there is a connection, opening it fetches the latest version automatically.

**How it differs from the claude.ai version**:

| | claude.ai version | Offline version |
|---|---|---|
| Data | claude.ai database, shared | Only on this device |
| Roles | Owner / Editor / Viewer | Just you; you can change everything |
| Photos, receipts | Uploaded to the artifact | Stored on this device |
| Export | Content file (no notes, packing list or photos) | Backup file (everything, photos included) |
| Showing it to others | Share the link | Export a PDF or the backup file and send it |

- **Back up**: changing phones, deleting the app or clearing browser data loses the data. Go to 「花費」 (Costs) → 「匯入／匯出內容」 (Import / export content), tap 「匯出備份檔」 (Export backup file), and restore on the new device with 「匯入內容檔」 (Import content file).
- A content file exported from the claude.ai version can be imported into the offline version, and the other way round (the notes and photos in an offline backup are ignored there).
- `/_blob/…` images in the content (route sketches, PDF pages) only work in the artifact they came from; the offline version cannot show them.
- For sharing with several people, use the claude.ai version.

---

## 2. Roles and permissions

| Role | Corresponds to | Can do |
|---|---|---|
| Owner | Whoever created the artifact | Everything: edit plans, costs, the split table, to-dos, info, import/export, switch plans |
| Editor | "Editor" in the Share menu | View the plan; write their own notes (and edit the ones they wrote); their own packing list |
| Viewer | Viewer / Commenter | View the plan and notes |

- Only the owner sees the Costs and Info tabs; everyone else sees three buttons at the bottom: Plan, Notes, To-do.
- The owner has 「檢視者畫面」 (Viewer view) at the top right to preview what the family sees (nothing is written while previewing).

---

## 3. Tabs and features

### 3.0 Trip settings (owner)
- Opened from the gear at the top right; while the example is showing, there is also an entry above the plan.
- Editable: trip name, start date, number of days, regions (name and colour), each day's theme and region, groups, travellers (including 「我」 "me" = default payer), exchange rate, the label for the NT$ total, a note for the costs page, and the default packing list.
- Saved to `meta/config` in one go; the tips (`tips`) and the private settings (info, cash) keep their stored values. Groups with no members are dropped on save. When the number of days goes down, plans on the days removed are only hidden, not deleted.

### 3.1 Plan (everyone)
- **Day strip**: one button per day, the dot underneath shows the region; it shrinks and sticks to the top when scrolling. Jumps to "today" by Japan time.
- **Map**: Leaflet draws the day's numbered stops and driving / train routes; the leg being travelled right now pulses (by Japan time). It can be expanded and can open Google Maps for navigation.
- **Card timeline**: each card has a time, category, note, address, an info table (recommendation, hours, closed days, payment, parking, reservation, smoking, phone), a link preview, a route sketch and a PDF; between cards it shows how to get there and any free time.
- **Auto-done**: cards whose time has passed are ticked automatically (unticking one by hand sticks).
- **Plan A / B**: two cards at the same time marked `plan: "A"` / `"B"` are alternatives, with 「或」 "or" between them. The owner switches with 「改選這個方案」 "Choose this plan instead"; the plan not chosen is dimmed and left out of costs, the "now" marker and the live leg; if `mapdata.json` has `plans` for that day, the map route switches too.
- **Route sketch / PDF**: a card can carry an image (tap to enlarge) and a PDF (shown in the page as page images, tap to enlarge).
- The owner can add, edit and delete cards; only the owner sees amounts.

### 3.2 Costs (owner)
- **Split table**: one card per bill, in 「待填」 (to fill) / 「已填完」 (filled) sections, each sorted by date.
  - Top right: who advanced the money and how much; tap to change the person (including 「無墊付」 "nobody advanced it"), the currency and the amount.
  - One tile per person, in rows by group: white = still owed, yellow = settled, dashed = not recorded, faded = not sharing. Tap a tile to enter the amount, currency, owed / settled.
  - Above: each group's spend and what it still owes; 「結清」 (Settle), tapped twice, turns that group's white tiles yellow at once.
  - Each card can carry receipt photos.
  - 「＋ 新增分攤項目」 (+ Add bill) adds a card; tapping a card's title (✎) edits the date, name, payment method, budget hint, default currency and who shares it, or deletes it (two taps; its receipts go too).
- **Misc costs** (「零星花費」): spending outside the split table (parking, tickets…), with receipts.
- **Cash section**: HTML from the private settings (for example who carries how much cash).
- **Totals**: group total (in NT$), per person, yen, NT$, by category, by day.
- **Export PDF**: the whole trip as one A4 PDF, in two versions:
  - Family version (「家人版」): overview, tips and every day's cards (time, transport, notes, address, trains, info table, route sketch), no amounts.
  - Full version (「完整版」): adds card amounts, totals, cash, the split table, misc costs, info and the pre-trip to-dos.
  - How: a light layout is built off screen, drawn into images section by section with html2canvas, cut into pages between cards, and assembled with jsPDF. Both libraries load from cdnjs only when the button is tapped.
- **Import / export content**: see section 6.

### 3.3 Notes (everyone can read, Editors and up can write)
- Many notes, each with any date (before, during or after the trip, or none) and photos; newest date first; shows the author; people can only edit their own (the owner can edit all).

### 3.4 To-do
- **Tips** (the `tips` setting): collapsible sections; `alert: true` makes the title red.
- **My packing list**: one per person, visible only to that person; the defaults are added on first open; tick, add, delete.
- **Pre-trip to-dos**: owner only.

### 3.5 Info (owner)
- `infoHtml` from the private settings (flights, hotels, car rental…).

---

## 4. Settings (config)

The page holds no trip content; everything comes from two settings documents in the database, and with neither stored it shows the built-in example. Most fields can be changed in the trip settings screen; `tips`, `pack.ownerOverrides` and the private settings are set by importing a content file (or by asking Claude to write them).

### 4.1 `meta/config` (everyone reads, owner writes)
```jsonc
{
  "version": 1,
  "title": "My trip",                  // page header and browser title
  "start": "2027-04-01",              // day 1 (Japan time)
  "regions": { "a": { "name": "City A", "tone": 1 } },    // tone 1–6: region dot colour
  "days": [ { "region": "a", "theme": "Arrival, walk around town" } ], // number of days = array length
  "people": [ { "key": "p1", "name": "Me" } ],
  "groups": [ { "id": "A", "name": "Group A", "members": ["p1"] } ], // split table groups
  "owner": "p1",                      // default payer (usually the owner)
  "rate": 0.2,                        // yen → NT$ rate
  "costNote": "Personal shopping not included.", // extra line on the costs page
  "twdLabel": "NT$ part",             // label for the NT$ total
  "tips": [ { "title": "Flight notes", "alert": true, "html": "<ol class=\"tips\">…</ol>" } ],
  "pack": { "items": ["Passport"], "ownerOverrides": { "0": "Owner's version of item 1" } }
}
```

### 4.2 `private/config` (owner only)
```jsonc
{ "version": 1, "infoTitle": "Flights and hotels", "infoHtml": "<div class=\"box\">…</div>", "cashHtml": "<div class=\"box\">…</div>" }
```

`tips[].html`, `infoHtml` and `cashHtml` render as HTML. Available classes: `box`, `list`, `li`, `fine`, `tips` (numbered list), `hl` (bold yellow), `adv-tot` (total row).

---

## 5. Data model (database collections)

| Path | Read / write | Content |
|---|---|---|
| `items/{id}` | everyone / owner | Plan cards |
| `split/{id}` | owner | Split table |
| `misc/{id}` | owner | Misc costs |
| `todos/{id}` | owner | Pre-trip to-dos |
| `meta/config`, `meta/maps`, `meta/plans` | everyone / owner | Settings, each day's Google Maps link and fallback route image, each day's chosen plan |
| `private/config` | owner | Private settings |
| `notes/{uid}/items/{id}` | everyone / the author (owner can edit all) | Notes |
| `data/users/{uid}/{id}` | that person only | Packing list |

### Plan cards `items`
| Field | Meaning |
|---|---|
| `day`, `time`, `end` | Day number, start and end time (`HH:MM`) |
| `cat` | `transport` `food` `sight` `stay` `activity` `shop` |
| `title`, `note` | Title, note |
| `addr`, `addrQuery`, `geo` | Address, map search text, coordinates `[lat, lng]` (only cards with coordinates go on the map) |
| `yen`, `ntd`, `perPerson` | Group amount; `perPerson: false` hides the per-person share |
| `move` | `{ mode: car/walk/train/taxi/plane/rest, text }`, how to get to the next stop |
| `info` | `rec` `hours` `closed` `pay` `parking` `reserve` `smoke` `tel` `src` |
| `url`, `preview` | Link and its preview (`site` `title` `desc` `img`) |
| `plan` | `"A"` or `"B"`, see Plan A / B |
| `guide` | Route sketch (`/_blob/…`) |
| `pdf` | `{ name, url, pages: ["/_blob/…"] }` |
| `trains` | Train times |
| `done`, `autoDone` | Done, and whether it was ticked automatically |

### Split table `split`
| Field | Meaning |
|---|---|
| `label` | Starting with `M/D` files it under that date, otherwise under 「整趟」 (whole trip) |
| `pay`, `hint`, `time`, `order` | Payment method, budget hint, sort order |
| `cur` | Default currency `JPY` / `TWD` |
| `na` | People not sharing this bill (`people[].key`) |
| `cells`, `cellState`, `cellCur`, `cellHints` | Each person's amount, `owed` / `paid`, currency, estimate hint |
| `payer`, `paidAmt`, `payCur` | Who advanced it (`none` = nobody), total advanced and its currency |
| `receipts` | Receipt image ids |

---

## 6. Content file (import / export)

The owner uses 「花費」 (Costs) → 「匯入／匯出內容」 (Import / export content).

- **Export**: saves the settings, the private settings and `items`, `split`, `misc`, `todos`, `meta/maps`, `meta/plans` as `trip-content-YYYY-MM-DD.json`. In the offline version it is a backup, `trip-backup-YYYY-MM-DD.json`, which also holds notes, packing lists and photos.
- **Import**: after choosing a file a summary shows; tap 「確定匯入」 (Confirm import). Documents not in the file are deleted, so it replaces everything.
- **Not included** (claude.ai version): each person's packing list and notes (private data). Images and PDFs are stored only as `/_blob/…` links, which work only in the artifact they came from; in a new artifact they have to be uploaded again.
- Format:
```jsonc
{
  "format": "trip-content", "version": 1, "exportedAt": "…",
  "config": { … }, "private": { … },
  "data": { "items": { "id": { … } }, "split": { … }, "misc": { … }, "todos": { … },
            "meta": { "maps": { … }, "plans": { "3": "A" } } }
}
```

---

## 7. Map data `mapdata.json`

A static file published with the page: `water`, `major`, `minor` (base map), `places` (place names), `days` (each day's route legs `{ k: "road"|"rail", c: [[lat,lng],…] }`) and `plans` (`{ "day": { "A": [...], "B": [...] } }`, per-plan routes). Leg end points match neighbouring cards that have coordinates, which is how the page tells which leg is being travelled. Routes can be computed with OSRM.

---

## 8. Permissions and capabilities (declared when publishing)

```json
{
  "assets": {}, "downloads": true, "user": { "scopes": ["profile"] },
  "db": { "rules": [
    { "path": "", "read": "view", "write": "owner" },
    { "path": "split", "read": "owner", "write": "owner" },
    { "path": "misc", "read": "owner", "write": "owner" },
    { "path": "todos", "read": "owner", "write": "owner" },
    { "path": "private", "read": "owner", "write": "owner" },
    { "path": "notes", "read": "view", "write": "owner" },
    { "path": "notes/{self}", "write": "admin" },
    { "path": "data/users/{self}", "write": "admin" }
  ] }
}
```

---

## 9. Implementation notes

- One IIFE; `applyConfig()` derives `START`, `DAYS`, `REGIONS`, `PEOPLE`, `BILL_GROUPS` and so on from the settings, and the whole page redraws when they change.
- Time is always Japan time (`Asia/Tokyo`) for today, the card in progress and the live leg.
- iPhone: number fields save on focusout / Enter (not relying on the change event); the keyboard only appears if focus happens in the tap itself; PDFs show as page images in the page (opening a new tab is blocked inside the app).
- Currencies are fixed to yen / NT$.
- Offline version: a short script at the top of `trip.html` steps in when there is no `window.claude` and the page is not on a claude.ai domain. It supplies the four capabilities `db`, `user`, `assets` and `downloads` itself (data and photos in IndexedDB; downloads use the share sheet on phones and a plain download on computers), so the rest of the code is unchanged. It also adds the manifest and the service worker (`sw.js`: the page itself is network-first, libraries and fonts cache-first). When you change the cache list in `sw.js`, bump its `VERSION`.

---

## License

MIT, see [LICENSE](LICENSE). Free to use, modify and redistribute as long as the copyright notice is kept; the software comes with no warranty.
