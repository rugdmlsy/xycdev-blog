# xycdev journal

Static source for `https://blog.xycdev.com`.

## Local preview

```sh
npm run build
npm run dev
```

Open `http://localhost:4321`.

## Validation

```sh
npm run build
npm run check
```

## Content

The deployed site currently contains one placeholder article at `posts/placeholder.html`. Articles are plain HTML.

### Timeline

`/timeline.html` merges two content sources in reverse chronological order:

1. Every HTML file under `posts/` is discovered automatically and appears with the `blog` tag.
2. Timeline-only short entries live in `content/timeline.json` and never appear in the article list or RSS feed.

Optional article metadata:

```html
<meta name="timeline-tags" content="tech,research">
<meta name="timeline-title-en" content="English timeline title">
<meta name="timeline-summary-en" content="English timeline summary">
<meta name="timeline" content="false"> <!-- opt out -->
```

Useful short-entry tags: `idea`, `news`, `thought`, `musing`, `note`, `update`, `link`, `observation`. Use `thought` for a quick spontaneous thought; `musing` is better for a more reflective/rambling one.

Add a short entry without editing JSON by hand:

```sh
npm run timeline:add -- --tag thought --text "突然想到……"
npm run build
```

Multiple tags and an English version are supported:

```sh
npm run timeline:add -- --tag idea --tag research --text "中文" --text-en "English"
```

To add the entry and deploy it immediately:

```sh
npm run timeline:publish -- --tag thought --text "突然想到……"
```

## Comments

Comments use Giscus backed by GitHub Discussions in this repository. The iframe loads the hosted `giscus-light.css` or `giscus-dark.css` palette so its colors follow the journal theme.

## Deploy

Use the wrapper so the timeline is regenerated, validated, copied into a minimal `.pages-dist/` bundle, and then uploaded:

```sh
npm run deploy
```
