import { access, readFile } from 'node:fs/promises';
import { codeLanguageLabel, estimateReadingTime, markdownToHtml } from './content-lib.mjs';

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
const zh500 = estimateReadingTime('字'.repeat(500));
const zh501 = estimateReadingTime('字'.repeat(501));
const en238 = estimateReadingTime(Array(238).fill('word').join(' '));
const en239 = estimateReadingTime(Array(239).fill('word').join(' '));
const withImage = estimateReadingTime(`${Array(238).fill('word').join(' ')}\n\n![diagram](/assets/example.png)`);
const imageHtml = markdownToHtml('![diagram](/assets/example.png)');
const codeHtml = markdownToHtml('```python\nprint("hello")\n```');
const unknownCodeHtml = markdownToHtml('```my-lang\nvalue\n```');
const assertions = [
  [Array.isArray(parsedPosts.posts) && parsedPosts.posts.length >= 1, 'Structured post source is missing'],
  [parsedPosts.posts.some((post) => post.slug === 'placeholder'), 'Migrated placeholder post source is missing'],
  [parsedPosts.posts.every((post) => post.readMinutes === undefined), 'Reading time must not be manually stored in post source'],
  [zh500.minutes === 1 && zh501.minutes === 2 && en238.minutes === 1 && en239.minutes === 2, 'Automatic text reading-time estimator is incorrect'],
  [withImage.minutes === 2 && withImage.images === 1, 'Image reading-time penalty is incorrect'],
  [imageHtml.includes('<img src="/assets/example.png"') && imageHtml.includes('loading="lazy"'), 'Markdown image rendering is missing'],
  [codeLanguageLabel('py') === 'Python' && codeLanguageLabel('java') === 'Java' && codeLanguageLabel('c++') === 'C++', 'Code language labels are incorrect'],
  [codeHtml.includes('class="code-block"') && codeHtml.includes('class="code-language">Python</span>') && codeHtml.includes('data-code-copy') && codeHtml.includes('class="language-python"'), 'Code block language/copy rendering is missing'],
  [unknownCodeHtml.includes('class="code-language">My Lang</span>'), 'Unknown code language fallback label is incorrect'],
  [Array.isArray(parsedTimeline.entries), 'Manual timeline data must contain an entries array'],
  [home.includes('<!-- FEATURED:START -->') && home.includes('<!-- POSTS:START -->'), 'Home content generator markers are missing'],
  [home.includes('/posts/placeholder.html') && home.includes('data-language-copy="en"'), 'Generated bilingual home post content is missing'],
  [article.includes('data-post-slug="placeholder"') && article.includes('data-language-copy="zh"') && article.includes('class="article-paper"'), 'Generated article structure is missing'],
  [article.includes('分钟阅读') && article.includes('min read') && !article.includes('[object Object]'), 'Generated automatic reading time is missing'],
  [timeline.includes('data-page="timeline"') && timeline.includes('<!-- TIMELINE:START -->') && timeline.includes('data-timeline-filter="blog"'), 'Timeline generation is missing'],
  [contentBuilder.includes('readPostsData') && contentBuilder.includes('markdownToHtml') && contentBuilder.includes('feed.xml'), 'Post/home/RSS content generator is incomplete'],
  [timelineBuilder.includes("['blog', ...extraTags]") && timelineBuilder.includes('walkHtml(POSTS_DIR)'), 'Automatic timeline blog-post discovery is missing'],
  [script.includes('articleTitle') && script.includes('data-language-copy') && script.includes('applyTimelineFilter'), 'Generic bilingual runtime behavior is missing'],
  [script.includes('copyTextToClipboard') && script.includes('data-code-copy') && script.includes("'code.copied': '已复制'"), 'Public code copy runtime is missing'],
  [notFound.includes('<meta name="robots" content="noindex">') && notFound.includes('页面不存在'), 'Dedicated 404 page is missing'],
  [article.includes('class="giscus"') && script.includes("repo: 'rugdmlsy/xycdev-blog'") && script.includes("'repo-id': 'R_kgDOTqxEFA'") && script.includes("'category-id': 'DIC_kwDOTqxEFM4DCf0F'"), 'Giscus configuration is missing'],
  [script.includes('updateGiscus') && script.includes('giscus-dark.css') && script.includes('giscus-light.css'), 'Custom Giscus theme synchronization is missing'],
  [giscusLight.includes('--color-canvas-default: #f3efe6') && giscusDark.includes('--color-canvas-default: #1b1b19'), 'Giscus palettes are missing'],
  [styles.includes('overflow-x: clip;') && styles.includes('touch-action: pan-y;') && !styles.includes('linear-gradient'), 'Core blog viewport/theme styling regressed'],
  [home.includes('/styles.css?v=20260825-2') && article.includes('/script.js?v=20260825-2') && timeline.includes('/script.js?v=20260825-2'), 'Versioned production assets are missing'],
  [contentLib.includes('normalizePost') && contentLib.includes('normalizeSlug') && contentLib.includes('markdownToHtml'), 'Content validation helpers are missing'],
  [adminServer.includes("const HOST = '127.0.0.1'") && adminServer.includes("'x-blog-admin'") && adminServer.includes('/api/publish') && adminServer.includes('/api/posts'), 'Local-only admin API protections/routes are missing'],
  [adminHtml.includes('id="post-editor"') && adminHtml.includes('id="timeline-editor"') && adminHtml.includes('id="publish-site"'), 'Visual admin workflows are missing'],
  [adminHtml.includes('id="post-reading-time"') && !adminHtml.includes('id="post-read-minutes"') && adminApp.includes('estimateReadingTime') && adminApp.includes('updateReadingTimeEstimate'), 'Automatic editor reading-time UI is missing'],
  [adminHtml.includes('id="theme-toggle"') && adminApp.includes('xycdev-editor-theme') && adminApp.includes('setTheme') && adminStyles.includes(':root[data-theme="dark"]'), 'Admin light/dark theme toggle is missing'],
  [adminApp.includes('savePost') && adminApp.includes('saveTimeline') && adminApp.includes('publishSite') && adminApp.includes('updateMarkdownPreviews'), 'Admin client workflows are incomplete'],
  [adminApp.includes('renderPreviewCodeBlock') && adminApp.includes('setCodeCopyState') && adminApp.includes('data-code-copy'), 'Editor code language/copy preview is missing'],
  [styles.includes('.code-block-bar') && styles.includes('.code-copy') && adminStyles.includes('.code-block-bar') && adminStyles.includes('.code-copy'), 'Code block styles are missing'],
  [adminStyles.includes('.split-layout') && adminStyles.includes('.markdown-preview') && adminStyles.includes('@media(max-width:820px)'), 'Responsive admin styling is missing'],
  [pkg.scripts?.admin === 'node scripts/admin-server.mjs' && pkg.scripts?.build?.includes('build-content.mjs'), 'npm admin/build scripts are not wired'],
  [home.includes('href="/timeline.html"') && article.includes('href="/timeline.html"'), 'Timeline navigation is missing from site pages'],
];
for (const [condition, message] of assertions) if (!condition) throw new Error(message);
console.log(`Checked ${files.length} files: OK`);
