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
    'common.skip': '跳到正文',
    'common.homeAria': 'xycdev journal 首页',
    'common.primaryNav': '主要导航',
    'common.readMore': '阅读全文',
    'common.backTop': '回到顶部 ↑',
    'common.back': '返回',
    'common.backList': '返回文章列表',
    'nav.writing': '文章',
    'nav.about': '关于',
    'nav.mainSite': '主站 ↗',
    'theme.toggleAria': '切换深浅色主题',
    'theme.dark': '深色',
    'theme.light': '浅色',
    'category.tech': '技术',
    'category.personal': '个人',
    'filter.all': '全部',
    'meta.read9': '9 分钟阅读',
    'tag.researchNotes': '研究笔记',
    'tag.engineeringLog': '工程记录',
    'tag.researchLife': '科研',
    'tag.design': '设计',
    'tag.travel': '旅居',
    'tag.paperNotes': '论文阅读',
    'tag.experimentNotes': '实验笔记',
    'home.kicker': '技术笔记与生活记录',
    'home.title': '记录正在研究、构建和理解的事情。',
    'home.intro': '这里主要写软件系统、AI Agent、开发工具，也保留一部分与科研、旅居和日常兴趣有关的记录。',
    'home.featured': '置顶文章',
    'home.latest': '最近文章',
    'home.filterAria': '文章分类筛选',
    'home.empty': '该分类暂时没有文章。',
    'home.sidebarAria': '博客信息',
    'home.aboutTitle': '关于这个博客',
    'home.aboutText': '用于整理长期值得保留的技术记录与个人思考。文章可能从实验报告、开发日志或每周笔记逐步演化而来。',
    'home.nowResearch': '研究',
    'home.nowResearchText': '可靠、可回滚的 AI Agent 系统',
    'home.nowBuilding': '构建',
    'home.nowBuildingText': 'Local MCP Host 与实验基础设施',
    'home.nowOther': '其他',
    'home.nowOtherText': '电吉他、独立游戏与旅居计划',
    'home.updated': '更新于 2026 年 8 月',
    'home.archive': '归档',
    'footer.categories': '技术与个人',
    'post.rollback.title': '为什么 Coding Agent 很少主动选择 Rollback',
    'post.rollback.summary': '在 SWE-bench 与 Terminal-Bench 的实验中，即使工具已经提供 rollback 接口，agent 仍然几乎不会主动调用。本文整理目前的实验观察、可能原因，以及下一步更合理的触发设计。',
    'post.sweReplay.title': '从 SWE-Replay 看 Coding Agent 的测试时扩展',
    'post.sweReplay.summary': '重复执行并不只是增加采样次数，更重要的是如何保存、比较和复用失败轨迹。',
    'post.mcpHost.title': '把 Local Shell MCP 拆成 Host 与实例之后',
    'post.mcpHost.summary': '一次围绕 MCP 网关、OAuth、远程 worker 和具体工具实例边界的重构记录。',
    'post.advisorMeeting.title': '每周和导师开会，我应该讲什么',
    'post.advisorMeeting.summary': '相比逐条汇报完成事项，更有效的结构是：结论、证据、尚未解决的问题和下一步选择。',
    'post.rollbackMemory.title': 'Rollback 后，Agent 应该记住什么',
    'post.rollbackMemory.summary': '完整保留 discarded history、只保留结构化总结，还是重新验证旧结论，各自会引入什么问题。',
    'post.slowTravel.title': '在一个陌生城市住两个月，除了工作还能做什么',
    'post.slowTravel.summary': '给长期旅居设置一些弱目标：固定路线、地方活动、持续练习和低压力的社交入口。',
    'post.deltaBox.title': 'DeltaBox 对 Agent Rollback 有什么启示',
    'post.deltaBox.summary': '恢复环境状态只是第一步；真正困难的是恢复后如何处理依赖旧状态形成的推理和记忆。',
    'article.deck': '提供 rollback 工具并不意味着 agent 会使用它。真正缺少的可能不是能力，而是触发信号、决策成本模型和对失败轨迹的理解。',
    'article.tocAria': '文章目录',
    'article.toc': '目录',
    'article.observationTitle': '实验观察',
    'article.whyTitle': '为什么不回滚',
    'article.failureTitle': '失败并不等于错误路径',
    'article.nextTitle': '下一步设计',
    'article.p1': '在最近一轮 SWE-bench 和 Terminal-Bench 实验里，我们把 rollback 接口直接提供给 coding agent，并在 guided 模式下明确鼓励它在错误路径上回退。结果仍然很极端：数百次 action 中，agent 几乎没有主动调用 rollback。',
    'article.quote': 'rollback 作为一个可用工具，与 rollback 作为 agent 决策过程中的自然动作，是两件不同的事。',
    'article.observationP1': '最初的直觉是，测试失败、运行时错误或明显不符合预期的输出会自然构成 rollback trigger。但在实际轨迹中，agent 往往把这些信号解释为“继续修改”的理由，而不是“撤销此前路径”的证据。',
    'article.observationP2': '即使一次修改引入了新的失败，agent 通常也会直接打开相关文件、追加补丁并再次运行测试。对它而言，当前工作区仍然是一份可以继续修理的状态；回滚反而意味着放弃已经获得的上下文和局部进展。',
    'article.whyIntro': '目前可以把原因暂时拆成三类：',
    'article.reason1': '缺少明确的不可恢复判断。 测试失败只说明当前状态不通过，不能证明此前某个 transaction 整体无效。',
    'article.reason2': '继续修复的局部成本更低。 agent 已经看过文件并形成了计划，追加一次 edit 比重新选择 checkpoint 更直接。',
    'article.reason3': 'rollback 的收益不可见。 工具可以恢复文件，但 agent 不一定知道哪些错误假设、缓存结论或后续 action 会一起失效。',
    'article.code': '测试失败\n  ├─ 局部缺陷 → 原地修补\n  ├─ 实现未完成 → 继续执行\n  └─ 路径无效 → 回滚候选',
    'article.semanticP': '问题在于，环境通常只能可靠地观察到第一层信号，例如 exit code、diff 和运行时错误；而“invalid approach”属于更高层的语义判断。',
    'article.failureP1': '如果把每次 test failure 都作为自动 rollback trigger，会丢掉大量正常的迭代过程。coding task 中，失败测试本来就是开发反馈的一部分。更合理的触发条件应当结合重复失败、影响范围扩大、关键假设被否定，以及 agent 自己声明的实验边界。',
    'article.failureP2': '这也意味着 transaction 不应只由 shell command 的时间顺序推断。若 agent 在执行前声明“这一组修改用于验证某个假设”，系统才有机会在假设失败时把整组 action 识别为可丢弃分支。',
    'article.nextP1': '下一阶段不应只是继续加强提示词，而应把 rollback 变成一种有明确证据的决策。一个可能的实现是：让 agent 在实验性修改前声明目标和依赖资源；系统记录测试结果、文件影响和错误传播；当观察结果否定声明目标时，再向 agent 提供具体的 rollback candidate。',
    'article.nextP2': '需要评估的重点也会从“agent 调用了多少次 rollback”，转向“系统提出的候选是否准确”“回滚后是否减少无效 action”，以及“保留的失败总结是否真正帮助了后续求解”。',
    'article.demoNote': '这是一篇用于展示博客文章排版的前端示例，内容之后可以替换为完整实验报告。',
    'engagement.kicker': '读者反馈',
    'engagement.title': '评论与点赞',
    'engagement.like': '点赞',
    'engagement.leaveComment': '留下评论',
    'engagement.localNote': '本地原型中的评论仅保存在当前浏览器。',
    'engagement.name': '昵称',
    'engagement.namePlaceholder': '你的昵称',
    'engagement.comment': '评论',
    'engagement.commentPlaceholder': '写下你的想法……',
    'engagement.submit': '发表评论',
    'engagement.comments': '评论',
    'engagement.empty': '还没有评论。',
    'engagement.delete': '删除',
    'engagement.justNow': '刚刚'
  },
  en: {
    'common.skip': 'Skip to content',
    'common.homeAria': 'xycdev journal home',
    'common.primaryNav': 'Primary navigation',
    'common.readMore': 'Read article',
    'common.backTop': 'Back to top ↑',
    'common.back': 'Back',
    'common.backList': 'Back to all writing',
    'nav.writing': 'Writing',
    'nav.about': 'About',
    'nav.mainSite': 'Main site ↗',
    'theme.toggleAria': 'Switch color theme',
    'theme.dark': 'Dark',
    'theme.light': 'Light',
    'category.tech': 'Technology',
    'category.personal': 'Personal',
    'filter.all': 'All',
    'meta.read9': '9 min read',
    'tag.researchNotes': 'Research notes',
    'tag.engineeringLog': 'Engineering log',
    'tag.researchLife': 'Research life',
    'tag.design': 'Design',
    'tag.travel': 'Travel',
    'tag.paperNotes': 'Paper notes',
    'tag.experimentNotes': 'Experiment notes',
    'home.kicker': 'Technical notes and personal records',
    'home.title': 'Notes on what I am researching, building, and trying to understand.',
    'home.intro': 'Most entries cover software systems, AI agents, and developer tools, with occasional notes on research life, slow travel, and other interests.',
    'home.featured': 'Featured',
    'home.latest': 'Recent writing',
    'home.filterAria': 'Filter posts by category',
    'home.empty': 'There are no posts in this category yet.',
    'home.sidebarAria': 'Blog information',
    'home.aboutTitle': 'About this journal',
    'home.aboutText': 'A place to retain technical records and personal reflections that remain useful over time. Posts may grow out of experiment reports, engineering logs, or weekly notes.',
    'home.nowResearch': 'Researching',
    'home.nowResearchText': 'Reliable and revisable AI agent systems',
    'home.nowBuilding': 'Building',
    'home.nowBuildingText': 'Local MCP Host and experiment infrastructure',
    'home.nowOther': 'Elsewhere',
    'home.nowOtherText': 'Electric guitar, independent games, and slow-travel plans',
    'home.updated': 'Updated August 2026',
    'home.archive': 'Archive',
    'footer.categories': 'Technology and Personal',
    'post.rollback.title': 'Why Coding Agents Rarely Choose to Roll Back',
    'post.rollback.summary': 'In SWE-bench and Terminal-Bench experiments, agents almost never invoke rollback voluntarily, even when the tool is available. This note reviews the observations, likely causes, and a more useful trigger design.',
    'post.sweReplay.title': 'What SWE-Replay Suggests About Test-Time Scaling for Coding Agents',
    'post.sweReplay.summary': 'Repeated execution is not only about drawing more samples. The harder problem is how to preserve, compare, and reuse failed trajectories.',
    'post.mcpHost.title': 'After Splitting Local Shell MCP into a Host and Instances',
    'post.mcpHost.summary': 'Notes from restructuring the boundaries between the MCP gateway, OAuth, remote workers, and concrete tool instances.',
    'post.advisorMeeting.title': 'What Should I Present in a Weekly Advisor Meeting?',
    'post.advisorMeeting.summary': 'A more useful structure than listing completed tasks: conclusions, evidence, unresolved questions, and the next decision.',
    'post.rollbackMemory.title': 'What Should an Agent Remember After Rollback?',
    'post.rollbackMemory.summary': 'Keeping the full discarded history, retaining only a structured summary, and revalidating old conclusions each create different problems.',
    'post.slowTravel.title': 'Living in an Unfamiliar City for Two Months Beyond Just Working',
    'post.slowTravel.summary': 'A few low-pressure goals for slow travel: fixed routes, local activities, sustained practice, and gentle ways to meet people.',
    'post.deltaBox.title': 'What DeltaBox Suggests for Agent Rollback',
    'post.deltaBox.summary': 'Restoring environment state is only the first step. The harder problem is handling reasoning and memory derived from the discarded state.',
    'article.deck': 'Providing a rollback tool does not mean an agent will use it. The missing pieces may be trigger signals, a decision-cost model, and an understanding of failed trajectories.',
    'article.tocAria': 'Article contents',
    'article.toc': 'Contents',
    'article.observationTitle': 'Experimental observations',
    'article.whyTitle': 'Why agents do not roll back',
    'article.failureTitle': 'Failure is not the same as a wrong path',
    'article.nextTitle': 'Next design',
    'article.p1': 'In a recent round of SWE-bench and Terminal-Bench experiments, we exposed the rollback interface directly to coding agents and explicitly encouraged them in guided mode to retreat from mistaken paths. The result was still extreme: across hundreds of actions, agents almost never invoked rollback voluntarily.',
    'article.quote': 'Rollback as an available tool and rollback as a natural action in an agent’s decision process are two different things.',
    'article.observationP1': 'The initial intuition was that failed tests, runtime errors, or clearly unexpected output would naturally become rollback triggers. In actual trajectories, agents usually interpreted those signals as reasons to keep editing rather than evidence that an earlier path should be discarded.',
    'article.observationP2': 'Even when an edit introduced a new failure, an agent would usually reopen the relevant files, add another patch, and run the tests again. The current workspace still looked repairable; rolling back would instead discard context and partial progress already acquired.',
    'article.whyIntro': 'The current explanation can be divided into three parts:',
    'article.reason1': 'No clear irrecoverability judgment. A failed test only shows that the current state does not pass; it does not prove that an earlier transaction is invalid as a whole.',
    'article.reason2': 'Local repair appears cheaper. The agent has already inspected the files and formed a plan, so adding another edit is more direct than selecting a checkpoint again.',
    'article.reason3': 'The benefit of rollback is invisible. A tool may restore files, but the agent may not know which assumptions, cached conclusions, or later actions should also become invalid.',
    'article.code': 'test failure\n  ├─ local defect → patch in place\n  ├─ incomplete implementation → continue\n  └─ invalid approach → rollback candidate',
    'article.semanticP': 'The environment can usually observe only first-order signals reliably, such as exit codes, diffs, and runtime errors. An “invalid approach” is a higher-level semantic judgment.',
    'article.failureP1': 'Treating every test failure as an automatic rollback trigger would erase a large amount of normal iteration. In coding tasks, failing tests are part of the development feedback loop. Better triggers should combine repeated failure, expanding impact, invalidated assumptions, and experiment boundaries declared by the agent.',
    'article.failureP2': 'This also means that transactions should not be inferred only from the temporal order of shell commands. When an agent declares that a group of edits tests a particular hypothesis, the system can identify the whole group as a disposable branch if the hypothesis fails.',
    'article.nextP1': 'The next stage should not simply strengthen the prompt. Rollback should become a decision supported by explicit evidence. One possible design is to have the agent declare its goal and dependent resources before an experimental edit; the system records test results, file impact, and error propagation; when observations refute the declared goal, it offers a concrete rollback candidate.',
    'article.nextP2': 'Evaluation should then move beyond counting rollback calls. The more useful questions are whether the proposed candidates are accurate, whether rollback removes wasted actions, and whether the retained failure summary actually helps subsequent problem solving.',
    'article.demoNote': 'This article is sample content for testing the blog layout. It can later be replaced with a complete experiment report.',
    'engagement.kicker': 'Reader feedback',
    'engagement.title': 'Comments and likes',
    'engagement.like': 'Like',
    'engagement.leaveComment': 'Leave a comment',
    'engagement.localNote': 'Comments in this local prototype are stored only in this browser.',
    'engagement.name': 'Name',
    'engagement.namePlaceholder': 'Your name',
    'engagement.comment': 'Comment',
    'engagement.commentPlaceholder': 'Share your thoughts…',
    'engagement.submit': 'Post comment',
    'engagement.comments': 'Comments',
    'engagement.empty': 'No comments yet.',
    'engagement.delete': 'Delete',
    'engagement.justNow': 'Just now'
  }
};

let activeLanguage = localStorage.getItem('xycdev-blog-language') || 'zh';
if (!translations[activeLanguage]) activeLanguage = 'zh';

function translate(key) {
  return translations[activeLanguage][key] ?? translations.zh[key] ?? key;
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  if (themeLabel) {
    themeLabel.textContent = theme === 'dark' ? translate('theme.light') : translate('theme.dark');
  }
  if (themeColor) {
    const lightThemeColor = '#f4ecd9';
    const darkThemeColor = '#1d1d1a';
    themeColor.setAttribute('content', theme === 'dark' ? darkThemeColor : lightThemeColor);
  }
}

function updateDocumentMetadata() {
  if (page === 'article') {
    document.title = `${translate('post.rollback.title')} — xycdev journal`;
    description?.setAttribute('content', translate('article.deck'));
  } else {
    document.title = 'xycdev journal';
    description?.setAttribute('content', activeLanguage === 'zh' ? 'xycdev 的技术与个人博客。' : 'The technology and personal journal of xycdev.');
  }
}

function applyLanguage(language) {
  activeLanguage = translations[language] ? language : 'zh';
  root.dataset.language = activeLanguage;
  root.lang = activeLanguage === 'zh' ? 'zh-CN' : 'en';

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = translate(element.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    element.setAttribute('aria-label', translate(element.dataset.i18nAria));
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.setAttribute('placeholder', translate(element.dataset.i18nPlaceholder));
  });

  if (languageLabel && languageToggle) {
    languageLabel.textContent = activeLanguage === 'zh' ? 'EN' : '中文';
    languageToggle.setAttribute('aria-label', activeLanguage === 'zh' ? 'Switch to English' : '切换为中文');
  }

  applyTheme(root.dataset.theme || 'light');
  updateDocumentMetadata();
}

const storedTheme = localStorage.getItem('xycdev-blog-theme');
const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
applyTheme(storedTheme || preferredTheme);
applyLanguage(activeLanguage);

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
const postRows = [...document.querySelectorAll('.post-row[data-category]')];
const emptyState = document.querySelector('.empty-state');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    let visibleCount = 0;

    filterButtons.forEach((item) => item.classList.toggle('is-active', item === button));

    postRows.forEach((row) => {
      const visible = filter === 'all' || row.dataset.category === filter;
      row.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (emptyState) emptyState.hidden = visibleCount !== 0;
  });
});

const readingProgress = document.querySelector('.reading-progress span');
const articleContent = document.querySelector('.article-paper');

if (readingProgress) {
  let renderedProgress = -1;

  function updateReadingProgress() {
    const scrollingElement = document.scrollingElement || document.documentElement;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const scrollTop = Math.max(scrollingElement.scrollTop, window.scrollY || 0);
    const pageEnd = Math.max(scrollingElement.scrollHeight - viewportHeight, 0);
    const articleEnd = articleContent
      ? articleContent.getBoundingClientRect().bottom + scrollTop - viewportHeight
      : pageEnd;
    const progressEnd = Math.max(Math.min(articleEnd, pageEnd), 1);
    const progress = Math.min(Math.max(scrollTop / progressEnd, 0), 1);

    if (Math.abs(progress - renderedProgress) > 0.0001) {
      readingProgress.style.width = `${progress * 100}%`;
      renderedProgress = progress;
    }

    window.requestAnimationFrame(updateReadingProgress);
  }

  window.requestAnimationFrame(updateReadingProgress);
}


const engagement = document.querySelector('.engagement[data-post-id]');

if (engagement) {
  const postId = engagement.dataset.postId;
  const likeButton = engagement.querySelector('.like-button');
  const likeIcon = engagement.querySelector('.like-icon');
  const likeCount = engagement.querySelector('.like-count');
  const commentForm = engagement.querySelector('.comment-form');
  const nameInput = engagement.querySelector('.comment-name');
  const commentInput = engagement.querySelector('.comment-text');
  const commentCounter = engagement.querySelector('.comment-counter');
  const commentList = engagement.querySelector('.comment-list');
  const commentsCount = engagement.querySelector('.comments-count');
  const commentsEmpty = engagement.querySelector('.comments-empty');
  const likeStorageKey = `xycdev-blog-like:${postId}`;
  const commentsStorageKey = `xycdev-blog-comments:${postId}`;
  const authorStorageKey = 'xycdev-blog-comment-author';
  const baseLikeCount = 18;

  function readComments() {
    try {
      const value = JSON.parse(localStorage.getItem(commentsStorageKey) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function formatCommentTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return translate('engagement.justNow');
    return new Intl.DateTimeFormat(activeLanguage === 'zh' ? 'zh-CN' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function renderLike() {
    const liked = localStorage.getItem(likeStorageKey) === '1';
    likeButton?.setAttribute('aria-pressed', String(liked));
    likeButton?.classList.toggle('is-liked', liked);
    if (likeIcon) likeIcon.textContent = liked ? '♥' : '♡';
    if (likeCount) likeCount.textContent = String(baseLikeCount + Number(liked));
  }

  function renderComments() {
    if (!commentList || !commentsCount || !commentsEmpty) return;
    const comments = readComments();
    commentList.replaceChildren();

    comments.forEach((comment) => {
      const item = document.createElement('li');
      item.className = 'comment-item';

      const header = document.createElement('div');
      header.className = 'comment-item-header';

      const author = document.createElement('strong');
      author.textContent = comment.name;

      const time = document.createElement('time');
      time.dateTime = comment.createdAt;
      time.textContent = formatCommentTime(comment.createdAt);

      const body = document.createElement('p');
      body.textContent = comment.text;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'comment-delete';
      remove.textContent = translate('engagement.delete');
      remove.addEventListener('click', () => {
        const nextComments = readComments().filter((entry) => entry.id !== comment.id);
        localStorage.setItem(commentsStorageKey, JSON.stringify(nextComments));
        renderComments();
      });

      header.append(author, time, remove);
      item.append(header, body);
      commentList.append(item);
    });

    commentsCount.textContent = String(comments.length);
    commentsEmpty.hidden = comments.length !== 0;
  }

  likeButton?.addEventListener('click', () => {
    const liked = localStorage.getItem(likeStorageKey) === '1';
    localStorage.setItem(likeStorageKey, liked ? '0' : '1');
    renderLike();
  });

  if (nameInput) nameInput.value = localStorage.getItem(authorStorageKey) || '';

  commentInput?.addEventListener('input', () => {
    if (commentCounter) commentCounter.textContent = `${commentInput.value.length} / 1000`;
  });

  commentForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput?.value.trim() || '';
    const text = commentInput?.value.trim() || '';
    if (!name || !text) return;

    const comments = readComments();
    comments.push({
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      name,
      text,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(commentsStorageKey, JSON.stringify(comments));
    localStorage.setItem(authorStorageKey, name);
    commentInput.value = '';
    if (commentCounter) commentCounter.textContent = '0 / 1000';
    renderComments();
  });

  const originalApplyLanguage = applyLanguage;
  applyLanguage = function applyLanguageWithEngagement(language) {
    originalApplyLanguage(language);
    renderComments();
  };

  renderLike();
  renderComments();
}
