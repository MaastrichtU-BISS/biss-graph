# BISS graph

Interactive "who works on what" graph for the touch screen at the BISS office.

## Running the screen

```sh
pnpm install
pnpm dev
```

Open the printed URL in Chrome, go full screen and refresh. After 45 seconds without a touch the screen returns
to its idle spotlight loop; `?idle=60` in the URL changes that timeout (in seconds).

## Data

The graph mirrors [biss-institute.com](https://www.biss-institute.com):

- **Team:** names, titles and roles come from `/en/about`.
- **Projects:** projects and their team members come from the post cards on the homepage.
- **Photos:** the photos in `src/assets/images/team/` are used where present (named after the person's slug);
  anyone else gets their profile photo from the website.

The app syncs **in the browser**, on startup and every 6 hours. The website allows cross-origin requests, so
this works the same on the big screen (`pnpm dev`) and as a static site (`pnpm build`, then host `dist/` anywhere).
New data is cached in the browser and applied by reloading the next time nobody is using the screen. Until the
first sync, and whenever the website can't be reached, the app shows the last cached data or the snapshot in
`graph-elements.json`. Add `?sync=0` to the URL to turn syncing off.

To refresh the committed snapshot (and download photos of new people into the repo):

```sh
pnpm sync             # update graph-elements.json and download missing photos
pnpm sync --dry-run   # only report what would change
```

Notes:

- **Exclusions:** people or projects that should stay off the screen are listed in `sync.config.json` (by the
  slug in their website URL). Both the app and `pnpm sync` respect it.
- **People without projects:** only people linked to at least one project on the website are shown.
- **Replacing a photo:** to use a better crop, replace the file in `src/assets/images/team/` (any of `.jpg`,
  `.png`, `.webp`); `pnpm sync` never overwrites existing photos unless run with `--refresh-photos`.
- **Parsing:** the website has no API, so `src/data/website.js` reads its pages. If the site's markup changes
  and the result looks empty, the sync is skipped and the current data stays.
