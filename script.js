const root = document.documentElement;
const page = document.body.dataset.page || 'home';
const themeToggle = document.querySelector('.theme-toggle');
const themeLabel = document.querySelector('.theme-toggle-label');
const languageToggle = document.querySelector('.language-toggle');
const languageLabel = document.querySelector('.language-toggle-label');
const themeColor = document.querySelector('meta[name="theme-color"]');
const description = document.querySelector('meta[name="description"]');

const translations = {
  zh: {
    'common.skip': '跳到正文', 'common.homeAria': 'xycdev journal 首页', 'common.primaryNav': '主要导航',
    'common.readMore': '阅读全文', 'common.backTop': '回到顶部 ↑', 'common.back': '返回', 'common.backList': '返回文章列表',
    'nav.writing': '文章', 'nav.about': '关于', 'nav.mainSite': '主站 ↗',
    'theme.toggleAria': '切换深浅色主题', 'theme.dark': '深色', 'theme.light': '浅色',
    'category.tech': '技术', 'category.personal': '个人', 'filter.all': '全部', 'meta.read3': '3 分钟阅读', 'tag.placeholder': '占位内容',
    'home.kicker': '栏目说明占位文字', 'home.title': '博客主页标题占位文字。',
    'home.intro': '这里是博客副标题与简介的占位内容，正式发布前可替换为对博客主题、作者和内容范围的简短说明。',
    'home.featured': '置顶文章', 'home.latest': '最近文章', 'home.filterAria': '文章分类筛选', 'home.empty': '当前筛选条件下没有文章。',
    'home.sidebarAria': '博客信息', 'home.aboutTitle': '关于这个博客', 'home.aboutText': '这里是 About 区域的占位文字，可用于介绍作者、博客定位与主要内容。',
    'home.nowFocus': '当前重点', 'home.nowFocusText': 'Now 内容占位文字', 'home.nowBuilding': '正在构建', 'home.nowBuildingText': '项目状态占位文字',
    'home.nowElsewhere': '其他动态', 'home.nowElsewhereText': '个人动态占位文字', 'home.updated': '更新于',
    'home.archive': '归档', 'home.archiveAria': '按年份筛选文章', 'home.clearArchive': '清除年份筛选',
    'footer.categories': '技术与个人',
    'post.placeholder.title': '占位文章标题', 'post.placeholder.summary': '这是一篇用于确认博客排版、导航、归档与评论功能的占位文章，之后可直接替换为正式内容。',
    'article.deck': '这是文章摘要的占位文字，用于确认标题、摘要、正文和目录在不同设备上的排版效果。',
    'article.tocAria': '文章目录', 'article.toc': '目录', 'article.sectionOne': '第一节标题', 'article.sectionTwo': '第二节标题',
    'article.p1': '这是正文开头的占位段落。正式发布文章时，可以替换标题、摘要、元信息、目录与以下正文内容。',
    'article.quote': '这里是一段引用文字，用于展示引用块的视觉样式。',
    'article.p2': '这里是第一节的占位内容。可以加入普通段落、链接、列表、代码和其他文章元素。',
    'article.itemOne': '列表项目一', 'article.itemTwo': '列表项目二',
    'article.p3': '这里是第二节的占位内容。页面顶部的阅读进度条会在正文阅读完成时达到百分之百。', 'article.end': '占位文章到此结束。',
    'engagement.kicker': '读者反馈', 'engagement.title': '评论', 'engagement.giscusNote': '评论由 GitHub Discussions 与 Giscus 提供。发表评论需要登录 GitHub。'
  },
  en: {
    'common.skip': 'Skip to content', 'common.homeAria': 'xycdev journal home', 'common.primaryNav': 'Primary navigation',
    'common.readMore': 'Read article', 'common.backTop': 'Back to top ↑', 'common.back': 'Back', 'common.backList': 'Back to all writing',
    'nav.writing': 'Writing', 'nav.about': 'About', 'nav.mainSite': 'Main site ↗',
    'theme.toggleAria': 'Switch color theme', 'theme.dark': 'Dark', 'theme.light': 'Light',
    'category.tech': 'Technology', 'category.personal': 'Personal', 'filter.all': 'All', 'meta.read3': '3 min read', 'tag.placeholder': 'Placeholder',
    'home.kicker': 'Section description placeholder', 'home.title': 'Homepage title placeholder.',
    'home.intro': 'This is placeholder copy for the homepage subtitle and introduction. Replace it with a short description of the journal before publishing real content.',
    'home.featured': 'Featured', 'home.latest': 'Recent writing', 'home.filterAria': 'Filter posts by category', 'home.empty': 'No posts match the current filters.',
    'home.sidebarAria': 'Blog information', 'home.aboutTitle': 'About this journal', 'home.aboutText': 'Placeholder copy for an author bio, journal purpose, and the topics covered here.',
    'home.nowFocus': 'Current focus', 'home.nowFocusText': 'Now-section placeholder', 'home.nowBuilding': 'Building', 'home.nowBuildingText': 'Project-status placeholder',
    'home.nowElsewhere': 'Elsewhere', 'home.nowElsewhereText': 'Personal-update placeholder', 'home.updated': 'Updated',
    'home.archive': 'Archive', 'home.archiveAria': 'Filter posts by year', 'home.clearArchive': 'Clear year filter',
    'footer.categories': 'Technology and Personal',
    'post.placeholder.title': 'Placeholder Article Title', 'post.placeholder.summary': 'A placeholder article for testing typography, navigation, archives, and comments before real posts are published.',
    'article.deck': 'Placeholder summary copy for testing the article title, deck, body, and table of contents across screen sizes.',
    'article.tocAria': 'Article contents', 'article.toc': 'Contents', 'article.sectionOne': 'First Section', 'article.sectionTwo': 'Second Section',
    'article.p1': 'This is the opening placeholder paragraph. Replace the title, summary, metadata, contents, and body when publishing a real article.',
    'article.quote': 'This is placeholder quotation copy for previewing the blockquote style.',
    'article.p2': 'Placeholder copy for the first section. A real article can contain paragraphs, links, lists, code, and other elements.',
    'article.itemOne': 'First list item', 'article.itemTwo': 'Second list item',
    'article.p3': 'Placeholder copy for the second section. The reading progress bar reaches one hundred percent when the article body has been read.', 'article.end': 'End of placeholder article.',
    'engagement.kicker': 'Reader feedback', 'engagement.title': 'Comments', 'engagement.giscusNote': 'Comments are provided by GitHub Discussions and Giscus. A GitHub login is required to post.'
  }
};

let activeLanguage = localStorage.getItem('xycdev-blog-language') || 'zh';
if (!translations[activeLanguage]) activeLanguage = 'zh';
const translate = (key) => translations[activeLanguage][key] ?? translations.zh[key] ?? key;

const GISCUS_THEME_VERSION = '20260802-4';
function giscusTheme() {
  const filename = root.dataset.theme === 'dark' ? 'giscus-dark.css' : 'giscus-light.css';
  return `https://blog.xycdev.com/${filename}?v=${GISCUS_THEME_VERSION}`;
}
function giscusLanguage() { return activeLanguage === 'zh' ? 'zh-CN' : 'en'; }

function updateGiscus() {
  const iframe = document.querySelector('iframe.giscus-frame');
  if (!iframe) return;
  iframe.contentWindow?.postMessage({ giscus: { setConfig: { theme: giscusTheme(), lang: giscusLanguage() } } }, 'https://giscus.app');
}

function loadGiscus() {
  const mount = document.querySelector('.giscus');
  if (!mount || mount.dataset.loaded) return;
  mount.dataset.loaded = 'true';
  const script = document.createElement('script');
  Object.assign(script, { src: 'https://giscus.app/client.js', async: true, crossOrigin: 'anonymous' });
  const config = {
    repo: 'rugdmlsy/xycdev-blog', 'repo-id': 'R_kgDOTqxEFA', category: 'General', 'category-id': 'DIC_kwDOTqxEFM4DCf0F',
    mapping: 'pathname', strict: '1', 'reactions-enabled': '1', 'emit-metadata': '0', 'input-position': 'top',
    theme: giscusTheme(), lang: giscusLanguage(), loading: 'lazy'
  };
  Object.entries(config).forEach(([key, value]) => script.setAttribute(`data-${key}`, value));
  mount.append(script);
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  if (themeLabel) themeLabel.textContent = theme === 'dark' ? translate('theme.light') : translate('theme.dark');
  themeColor?.setAttribute('content', theme === 'dark' ? '#1d1d1a' : '#f4ecd9');
  updateGiscus();
}

function updateDocumentMetadata() {
  if (page === 'article') {
    document.title = `${translate('post.placeholder.title')} — xycdev journal`;
    description?.setAttribute('content', translate('article.deck'));
  } else {
    document.title = 'xycdev journal';
    description?.setAttribute('content', activeLanguage === 'zh' ? '博客描述占位文字。' : 'Blog description placeholder.');
  }
}

function updateNowDate() {
  const node = document.querySelector('.now-updated');
  if (!node) return;
  const date = new Date(`${node.dateTime}T00:00:00`);
  node.textContent = new Intl.DateTimeFormat(activeLanguage === 'zh' ? 'zh-CN' : 'en', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function applyLanguage(language) {
  activeLanguage = translations[language] ? language : 'zh';
  root.dataset.language = activeLanguage;
  root.lang = activeLanguage === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = translate(element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => { element.setAttribute('aria-label', translate(element.dataset.i18nAria)); });
  if (languageLabel && languageToggle) {
    languageLabel.textContent = activeLanguage === 'zh' ? 'EN' : '中文';
    languageToggle.setAttribute('aria-label', activeLanguage === 'zh' ? 'Switch to English' : '切换为中文');
  }
  applyTheme(root.dataset.theme || 'light');
  updateNowDate();
  updateDocumentMetadata();
  updateGiscus();
}

const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
applyTheme(localStorage.getItem('xycdev-blog-theme') || preferredTheme);
applyLanguage(activeLanguage);
loadGiscus();

themeToggle?.addEventListener('click', () => {
  const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  localStorage.setItem('xycdev-blog-theme', nextTheme);
});
languageToggle?.addEventListener('click', () => {
  const nextLanguage = activeLanguage === 'zh' ? 'en' : 'zh';
  applyLanguage(nextLanguage);
  localStorage.setItem('xycdev-blog-language', nextLanguage);
});

const filterButtons = [...document.querySelectorAll('[data-filter]')];
const postRows = [...document.querySelectorAll('.post-row[data-category][data-year]')];
const emptyState = document.querySelector('.empty-state');
const archiveList = document.querySelector('.archive-list');
const archiveReset = document.querySelector('.archive-reset');
let categoryFilter = 'all';
let yearFilter = 'all';

function applyPostFilters() {
  let visibleCount = 0;
  postRows.forEach((row) => {
    const visible = (categoryFilter === 'all' || row.dataset.category === categoryFilter) && (yearFilter === 'all' || row.dataset.year === yearFilter);
    row.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  if (emptyState) emptyState.hidden = visibleCount !== 0;
  filterButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.filter === categoryFilter));
  document.querySelectorAll('[data-archive-year]').forEach((button) => button.classList.toggle('is-active', button.dataset.archiveYear === yearFilter));
  if (archiveReset) archiveReset.hidden = yearFilter === 'all';
}

filterButtons.forEach((button) => button.addEventListener('click', () => { categoryFilter = button.dataset.filter; applyPostFilters(); }));

if (archiveList) {
  const counts = postRows.reduce((acc, row) => { acc[row.dataset.year] = (acc[row.dataset.year] || 0) + 1; return acc; }, {});
  Object.entries(counts).sort(([a], [b]) => Number(b) - Number(a)).forEach(([year, count]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.archiveYear = year;
    button.innerHTML = `<span>${year}</span><span>${count}</span>`;
    button.addEventListener('click', () => { yearFilter = yearFilter === year ? 'all' : year; applyPostFilters(); });
    archiveList.append(button);
  });
}
archiveReset?.addEventListener('click', () => { yearFilter = 'all'; applyPostFilters(); });
applyPostFilters();

const readingProgress = document.querySelector('.reading-progress span');
const articleContent = document.querySelector('.article-paper');
if (readingProgress && articleContent) {
  let renderedProgress = -1;
  function updateReadingProgress() {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const scrollTop = (document.scrollingElement || document.documentElement).scrollTop || window.scrollY || 0;
    const articleEnd = scrollTop + articleContent.getBoundingClientRect().bottom;
    const progressEnd = Math.max(articleEnd - viewportHeight, 1);
    const progress = Math.min(Math.max(scrollTop / progressEnd, 0), 1);
    if (Math.abs(progress - renderedProgress) > 0.0001) {
      readingProgress.style.width = `${progress * 100}%`;
      renderedProgress = progress;
    }
    window.requestAnimationFrame(updateReadingProgress);
  }
  window.requestAnimationFrame(updateReadingProgress);
}
