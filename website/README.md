# Reef Watch

## Run locally

Requires Node.js 20.19 or newer and npm.

```sh
npm install
npm run dev
```

Open <http://localhost:3000>. The Overview works without a database connection.
To load live observations, set `WEBSITE_DATABASE_URL` to a PostgreSQL connection
string for a read-only website role. The server also accepts `DATABASE_URL` for
local compatibility. Put the value in this directory's `.env`, the repository
root `.env`, or the host's environment settings. Never expose it through a
`VITE_` variable or commit it.

The Explore page reads only `status = 'analyzed'` rows from `snapshots`. Reef
suggestions use the named points in `regions.py`; the default search radius is
10 km and can be adjusted. Researchers can also enter latitude/longitude
directly. Suggestions include a recent analyzed coral photo when one is stored.
In-water `temp_c` appears when that column exists and contains data.

The **Generate in-depth analysis** action is optional. Configure
`GEMINI_API_KEY` as a server-side secret to enable it; the default model is
`gemini-3.8-flash`, or set `GEMINI_MODEL` to another supported model. Only
per-location and per-coral-type aggregates are sent for interpretation, not
photos, record IDs, exact coordinates, or free-text notes. The result is not
saved to the database, and analysis requests are limited to five per hour per
IP address.

## Build and deploy

```sh
npm run build
npm start
```

Deploy this directory as a Node.js web service with `npm run build` as the build
command and `npm start` as the start command. The server listens on the
platform-provided `PORT` (or port 3000 locally). Configure
`WEBSITE_DATABASE_URL` as a host secret using a database role that can only
`SELECT` from the website's required tables. Do not deploy with a shared admin
credential; the separate database roles described in the project architecture
must be configured before public use. Add `GEMINI_API_KEY` as a platform secret
only if you want to enable the optional AI analysis action.
