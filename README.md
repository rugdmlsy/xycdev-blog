# xycdev journal

Static source for `https://blog.xycdev.com`.

## Local preview

```sh
npm run dev
```

Open `http://localhost:4321`.

## Validation

```sh
npm run check
```

## Content

The deployed site intentionally contains one placeholder article at `posts/placeholder.html`. Replace its metadata and body when publishing the first real post, then add a matching row to `index.html` with `data-category` and `data-year`; the Archive counts and filters are generated automatically.

Comments use Giscus backed by GitHub Discussions in this repository.

## Deploy

```sh
npx wrangler pages deploy . --project-name xycdev-journal
```
