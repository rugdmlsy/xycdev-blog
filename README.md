# xycdev journal

Static source for `https://blog.xycdev.com`.

## Local visual editor

The preferred authoring workflow is the localhost-only WebUI:

```sh
npm run admin
```

Open `http://127.0.0.1:4322/admin/`.

The editor can:

- create, edit, delete, and preview bilingual blog posts;
- edit Markdown with a live preview;
- control slug, date, category, tags, timeline tags, read time, and featured status;
- create/edit/delete timeline-only short entries (`thought`, `idea`, `news`, etc.);
- regenerate and validate the static site;
- publish with one action: build → check → Git commit/push → Cloudflare Pages deploy.

The admin server binds only to `127.0.0.1`. Mutating API calls require the local editor header and reject non-local browser origins.

## Content model

Authoring data is stored in two JSON files:

- `content/posts.json` — blog posts, including bilingual Markdown body and metadata;
- `content/timeline.json` — timeline-only short entries.

`npm run build` treats those files as source data and generates:

- `posts/*.html`;
- the featured/recent-post sections in `index.html`;
- `feed.xml`;
- the combined `/timeline.html`.

Every generated post automatically appears in the timeline with the `blog` tag plus its configured `timelineTags`.

Useful short-entry tags: `idea`, `news`, `thought`, `musing`, `note`, `update`, `link`, `observation`. Use `thought` for a quick spontaneous thought; `musing` is better for a more reflective/rambling one.

## CLI workflow

Local static preview without the editor:

```sh
npm run build
npm run dev
```

Open `http://localhost:4321`.

Validation:

```sh
npm run build
npm run check
```

A timeline-only entry can still be added from the CLI:

```sh
npm run timeline:add -- --tag thought --text "突然想到……"
npm run build
```

Multiple tags and an English version are supported:

```sh
npm run timeline:add -- --tag idea --tag research --text "中文" --text-en "English"
```

## Automatic model-release news

`npm run news:models` checks official sources from major model providers and adds only new-model/model-version announcements to `content/timeline.json`. Automatic entries use the tags `news` and `model-release`, so they remain editable/deletable in the normal timeline editor.

The filter is intentionally conservative: an item must identify a model and look like the provider's actual launch announcement. Pricing changes, partnerships, integrations, availability on third-party platforms, safety/system-card posts, benchmarks, tutorials, incidents, and other general company news are rejected. Current provider coverage includes OpenAI, Anthropic, Google DeepMind, Meta, xAI, Mistral AI, DeepSeek, Qwen, Z.ai, ByteDance Seed, and Moonshot AI/Kimi.

Useful commands:

```sh
npm run news:models:test   # classifier self-test
npm run news:models        # one manual scan
bash scripts/install-model-news-bot.sh
```

The installer creates a dedicated clean Git worktree and a macOS LaunchAgent (`com.xycdev.blog-model-release-news`) that scans hourly. It never operates in the authoring worktree. When there is no new release it makes no commit and performs no deployment. When a release is accepted, it regenerates and validates the timeline, commits only `content/timeline.json` and `timeline.html`, pushes `main`, and deploys the existing Cloudflare Pages Direct Upload project. OpenAI and Qwen use persistent official-URL baselines so edits to old pages cannot be mistaken for new releases.

Runtime state and logs are kept under `~/Library/Caches/xycdev-blog-model-news/` rather than in the repository.

## Comments

Comments use Giscus backed by GitHub Discussions in this repository. The iframe loads the hosted `giscus-light.css` or `giscus-dark.css` palette so its colors follow the journal theme.

## Deploy

The deployment wrapper regenerates the site, validates it, copies only production files into `.pages-dist/`, and uploads that small bundle:

```sh
npm run deploy
```
