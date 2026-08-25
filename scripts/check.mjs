import { access, readFile } from 'node:fs/promises';

const files = [
  'index.html','timeline.html','styles.css','script.js','posts/placeholder.html','404.html','giscus-light.css','giscus-dark.css',
  'content/posts.json','content/timeline.json','scripts/content-lib.mjs','scripts/build-content.mjs','scripts/build-timeline.mjs','scripts/admin-server.mjs',
  'admin/index.html','admin/styles.css','admin/app.js','package.json'
];
const values = await Promise.all(files.map((file) => readFile(file, 'utf8')));
const [home,timeline,styles,script,article,notFound,giscusLight,giscusDark,postsData,timelineData,contentLib,contentBuilder,timelineBuilder,adminServer,adminHtml,adminStyles,adminApp,packageJson] = values;
await access('assets/parchment-surface.webp');

const parsedPosts = JSON.parse(postsData);
const parsedTimeline = JSON.parse(timelineData);
const pkg = JSON.parse(packageJson);
const assertions = [
  [Array.isArray(parsedPosts.posts) && parsedPosts.posts.length >= 1, 'Structured post source is missing'],
  [parsedPosts.posts.some((post) => post.slug === 'placeholder'), 'Migrated placeholder post source is missing'],
  [Array.isArray(parsedTimeline.entries), 'Manual timeline data must contain an entries array'],
  [home.includes('<!-- FEATURED:START -->') && home.includes('<!-- POSTS:START -->'), 'Home content generator markers are missing'],
  [home.includes('/posts/placeholder.html') && home.includes('data-language-copy="en"'), 'Generated bilingual home post content is missing'],
  [article.includes('data-post-slug="placeholder"') && article.includes('data-language-copy="zh"') && article.includes('class="article-paper"'), 'Generated article structure is missing'],
  [timeline.includes('data-page="timeline"') && timeline.includes('<!-- TIMELINE:START -->') && timeline.includes('data-timeline-filter="blog"'), 'Timeline generation is missing'],
  [contentBuilder.includes('readPostsData') && contentBuilder.includes('markdownToHtml') && contentBuilder.includes('feed.xml'), 'Post/home/RSS content generator is incomplete'],
  [timelineBuilder.includes("['blog', ...extraTags]") && timelineBuilder.includes('walkHtml(POSTS_DIR)'), 'Automatic timeline blog-post discovery is missing'],
  [script.includes('articleTitle') && script.includes('data-language-copy') && script.includes('applyTimelineFilter'), 'Generic bilingual runtime behavior is missing'],
  [notFound.includes('<meta name="robots" content="noindex">') && notFound.includes('页面不存在'), 'Dedicated 404 page is missing'],
  [article.includes('class="giscus"') && script.includes("repo: 'rugdmlsy/xycdev-blog'") && script.includes("'repo-id': 'R_kgDOTqxEFA'") && script.includes("'category-id': 'DIC_kwDOTqxEFM4DCf0F'"), 'Giscus configuration is missing'],
  [script.includes('updateGiscus') && script.includes('giscus-dark.css') && script.includes('giscus-light.css'), 'Custom Giscus theme synchronization is missing'],
  [giscusLight.includes('--color-canvas-default: #f3efe6') && giscusDark.includes('--color-canvas-default: #1b1b19'), 'Giscus palettes are missing'],
  [styles.includes('overflow-x: clip;') && styles.includes('touch-action: pan-y;') && !styles.includes('linear-gradient'), 'Core blog viewport/theme styling regressed'],
  [home.includes('/styles.css?v=20260825-1') && article.includes('/script.js?v=20260825-1') && timeline.includes('/script.js?v=20260825-1'), 'Versioned production assets are missing'],
  [contentLib.includes('normalizePost') && contentLib.includes('normalizeSlug') && contentLib.includes('markdownToHtml'), 'Content validation helpers are missing'],
  [adminServer.includes("const HOST = '127.0.0.1'") && adminServer.includes("'x-blog-admin'") && adminServer.includes('/api/publish') && adminServer.includes('/api/posts'), 'Local-only admin API protections/routes are missing'],
  [adminHtml.includes('id="post-editor"') && adminHtml.includes('id="timeline-editor"') && adminHtml.includes('id="publish-site"'), 'Visual admin workflows are missing'],
  [adminHtml.includes('id="theme-toggle"') && adminApp.includes('xycdev-editor-theme') && adminApp.includes('setTheme') && adminStyles.includes(':root[data-theme="dark"]'), 'Admin light/dark theme toggle is missing'],
  [adminApp.includes('savePost') && adminApp.includes('saveTimeline') && adminApp.includes('publishSite') && adminApp.includes('updateMarkdownPreviews'), 'Admin client workflows are incomplete'],
  [adminStyles.includes('.split-layout') && adminStyles.includes('.markdown-preview') && adminStyles.includes('@media(max-width:820px)'), 'Responsive admin styling is missing'],
  [pkg.scripts?.admin === 'node scripts/admin-server.mjs' && pkg.scripts?.build?.includes('build-content.mjs'), 'npm admin/build scripts are not wired'],
  [home.includes('href="/timeline.html"') && article.includes('href="/timeline.html"'), 'Timeline navigation is missing from site pages'],
];
for (const [condition, message] of assertions) if (!condition) throw new Error(message);
console.log(`Checked ${files.length} files: OK`);
