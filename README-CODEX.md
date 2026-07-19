# Reproducible local workflow

The canonical static source directory is `site/`. A build creates the canonical deploy directory, `dist/`. Root-level copies of pages are legacy source material and are not part of the build or deploy input.

## Requirements

- Node.js 20 or newer
- npm (use the version bundled with Node.js)

Install exactly the dependency graph recorded in `package-lock.json`:

```sh
npm ci
```

Wrangler is pinned to `4.112.0`; use the npm scripts so a global Wrangler installation cannot change the result.

## Commands

```sh
npm run dev
npm run check
npm run build
npm test
```

- `dev` first rebuilds, then serves `dist/` locally with Cloudflare Pages and its local bindings.
- `check` validates local HTML/CSS links and referenced assets entirely offline.
- `build` deterministically replaces `dist/` with a copy of `site/`, excluding `_worker.js`, `functions/`, `.functions/`, and `node_modules/`, then validates the artifact. It never deploys.
- `test` runs the repository's Node.js test suite.

Cloudflare Pages Functions live in the repository-level `functions/` directory and are discovered separately by Wrangler/the deployment workflow; the legacy `site/functions/` tree is deliberately excluded from `dist/`.

The checker ignores external URLs and fragments, does not make network requests, and never prints page contents, URLs, query strings, or file paths. Invalid references are reported as short SHA-256 finding IDs so CI output does not expose personal data or secrets.

No secrets are required for the static validation. Put optional local-only values in `.env` or `.dev.vars`; both are ignored by Git. Never place production credentials in `.env.example`.
