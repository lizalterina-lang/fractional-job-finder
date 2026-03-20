const COUNTRY_FLAGS = { AUS: "🇦🇺", SG: "🇸🇬", UK: "🇬🇧", NZ: "🇳🇿", NL: "🇳🇱", UAE: "🇦🇪" };
const KNOWN_REGIONS = new Set(Object.keys(COUNTRY_FLAGS));

const LS_COMPANIES_ADDED   = "fj_companies_added";
const LS_COMPANIES_REMOVED = "fj_companies_removed";
const LS_BOARDS_ADDED      = "fj_boards_added";
const LS_KW_ADDED          = "fj_kw_added";
const LS_KW_REMOVED        = "fj_kw_removed";
const LS_EX_ADDED          = "fj_ex_added";
const LS_EX_REMOVED        = "fj_ex_removed";

const showToast = (msg, ms = 2500) => {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), ms);
};

const TACTICS = [
  {
    number: "01",
    title: "LinkedIn холодный аутрич",
    text: 'Ищи "Head of Marketing" или "VP Marketing" в компаниях 20–150 человек. Предлагай fractional PMM/GTM на 4-6ч/день. Отправляй 10-15 сообщений в день.',
  },
  {
    number: "02",
    title: "Wellfound / AngelList Talent",
    text: 'Фильтр: "contract" + "remote" + нужный регион. Многие стартапы ищут part-time специалистов именно здесь.',
  },
  {
    number: "03",
    title: "Slack-комьюнити",
    text: "Вступай в: Demand Gen Visionaries, Product Marketing Alliance, GTM Alliance. В каналах #jobs и #gtm часто появляются fractional-роли.",
  },
  {
    number: "04",
    title: "Product Marketing Alliance",
    text: "Job board productmarketingalliance.com специализируется на PMM. Fractional и contract роли выделены отдельно.",
  },
  {
    number: "05",
    title: "Apollo.io / Hunter.io",
    text: "Найди email Head of Growth или VP Marketing в нужных компаниях. Отправляй персонализированный питч с конкретным предложением ценности.",
  },
  {
    number: "06",
    title: "Fractional-платформы",
    text: "Зарегистрируйся на Toptal, Contra, Marketer Hire. Они сами матчат тебя с подходящими клиентами.",
  },
];

let activeTab = "companies";
let activeRegions = new Set();
let activeTags = new Set();
let activeFormats = new Set();
let searchQuery = "";

const getFilteredCompanies = () => {
  return COMPANIES.filter((company) => {
    const matchesRegion = activeRegions.size === 0 || activeRegions.has(company.country);
    const matchesTag = activeTags.size === 0 || company.tags.some((t) => activeTags.has(t));
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      company.name.toLowerCase().includes(query) ||
      company.niche.toLowerCase().includes(query) ||
      company.description.toLowerCase().includes(query) ||
      company.countryLabel.toLowerCase().includes(query);
    return matchesRegion && matchesTag && matchesSearch;
  });
};

const getFilteredPlatforms = () => {
  return PLATFORMS.filter((platform) => {
    const matchesRegion =
      activeRegions.size === 0 || platform.regions.some((r) => activeRegions.has(r));
    const matchesTag = activeTags.size === 0 || platform.tags.some((t) => activeTags.has(t));
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      platform.name.toLowerCase().includes(query) ||
      platform.description.toLowerCase().includes(query) ||
      platform.type.toLowerCase().includes(query);
    return matchesRegion && matchesTag && matchesSearch;
  });
};

const renderCompanyCard = (company) => {
  const tagsHtml = company.tags
    .map((tag) => `<span class="tag tag-${tag.toLowerCase()}">${tag}</span>`)
    .join("");

  return `
    <div class="card" data-country="${company.country}" role="article" aria-label="${company.name}">
      <div class="card-header">
        <div class="card-title-group">
          <div class="card-name">${company.name}</div>
          <div class="card-niche">${company.niche}</div>
        </div>
        <span class="country-badge" data-country="${company.country}">
          ${COUNTRY_FLAGS[company.country]} ${company.country}
        </span>
      </div>
      <p class="card-description">${company.description}</p>
      <div class="card-footer">
        <div class="card-tags">${tagsHtml}</div>
        <span class="stage-badge">${company.stage}</span>
      </div>
      <div class="card-links">
        <a href="${company.jobs}" target="_blank" rel="noopener noreferrer"
           class="btn-link btn-link-primary" aria-label="Вакансии ${company.name}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h6"/>
            <path d="M21 3l-9 9M15 3h6v6"/>
          </svg>
          Вакансии
        </a>
        <a href="${company.website}" target="_blank" rel="noopener noreferrer"
           class="btn-link btn-link-secondary" aria-label="Сайт ${company.name}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
          </svg>
        </a>
      </div>
    </div>
  `;
};

const renderPlatformCard = (platform) => {
  const regionsHtml = platform.regions
    .map(
      (r) =>
        `<span class="region-dot" data-region="${r}">${COUNTRY_FLAGS[r]} ${r}</span>`
    )
    .join("");

  return `
    <div class="platform-card" role="article" aria-label="${platform.name}">
      <div class="platform-header">
        <div class="platform-icon">${platform.icon}</div>
        <div>
          <div class="platform-name">${platform.name}</div>
          <div class="platform-type">${platform.type}</div>
        </div>
      </div>
      <p class="platform-description">${platform.description}</p>
      <div class="platform-regions">${regionsHtml}</div>
      <a href="${platform.url}" target="_blank" rel="noopener noreferrer"
         class="btn-link btn-link-primary" aria-label="Открыть ${platform.name}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h6"/>
          <path d="M21 3l-9 9M15 3h6v6"/>
        </svg>
        Открыть платформу
      </a>
    </div>
  `;
};

const renderLiveJobCard = (job) => {
  const regionColors = { AUS: "aus", SG: "sg", UK: "uk" };
  const regionColor = regionColors[job.region] || null;

  const region = job.region || "Remote";
  const regionBadge = KNOWN_REGIONS.has(region)
    ? `<span class="country-badge" data-country="${region}">${COUNTRY_FLAGS[region]} ${region}</span>`
    : `<span class="location-badge">🌍 ${region}</span>`;

  const tagsHtml = (job.tags || [])
    .slice(0, 4)
    .map((t) => `<span class="tag" style="background:rgba(124,108,245,0.12);color:var(--color-accent-light)">${t}</span>`)
    .join("");

  const formatBadge = job.format === "part-time"
    ? `<span class="format-badge format-parttime">⏱ Part-time</span>`
    : `<span class="format-badge format-fulltime">💼 Full-time</span>`;

  const dateStr = job.date
    ? new Date(job.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    : "";

  return `
    <div class="card" data-country="${job.region}" role="article" aria-label="${job.title} at ${job.company}">
      <div class="card-header">
        <div class="card-title-group">
          <div class="card-name">${job.title}</div>
          <div class="card-niche">${job.company} · <span style="color:var(--color-text-faint);font-size:11px">${dateStr}</span></div>
        </div>
        ${regionBadge}
      </div>
      ${job.description ? `<p class="card-description">${job.description.slice(0, 180)}${job.description.length > 180 ? "…" : ""}</p>` : ""}
      <div class="card-footer">
        <div class="card-tags">${tagsHtml}</div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
          ${formatBadge}
          ${job.salary ? `<span class="stage-badge">${job.salary}</span>` : ""}
        </div>
      </div>
      <div class="card-links">
        <a href="${job.url}" target="_blank" rel="noopener noreferrer"
           class="btn-link btn-link-primary" aria-label="Открыть вакансию ${job.title}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h6"/>
            <path d="M21 3l-9 9M15 3h6v6"/>
          </svg>
          Открыть вакансию
        </a>
        <span class="btn-link btn-link-secondary" style="cursor:default">${job.source}</span>
      </div>
    </div>
  `;
};

const renderTacticCard = (tactic) => `
  <div class="tactic-card" role="article">
    <div class="tactic-number">${tactic.number}</div>
    <div class="tactic-title">${tactic.title}</div>
    <p class="tactic-text">${tactic.text}</p>
  </div>
`;

const renderContent = () => {
  const content = document.getElementById("content");
  const resultsCount = document.getElementById("results-count");

  if (activeTab === "companies") {
    const filtered = getFilteredCompanies();
    resultsCount.textContent = `${filtered.length} компаний`;

    if (filtered.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <div class="empty-title">Ничего не найдено</div>
          <p class="empty-text">Попробуй изменить фильтры или поисковый запрос</p>
        </div>
      `;
      return;
    }

    content.innerHTML = `<div class="grid">${filtered.map(renderCompanyCard).join("")}</div>`;
  }

  if (activeTab === "platforms") {
    const filtered = getFilteredPlatforms();
    resultsCount.textContent = `${filtered.length} платформ`;

    if (filtered.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <div class="empty-title">Ничего не найдено</div>
          <p class="empty-text">Попробуй изменить фильтры</p>
        </div>
      `;
      return;
    }

    content.innerHTML = `<div class="platform-grid">${filtered.map(renderPlatformCard).join("")}</div>`;
  }

  if (activeTab === "tactics") {
    resultsCount.textContent = `${TACTICS.length} тактик`;
    content.innerHTML = `<div class="tactics-grid">${TACTICS.map(renderTacticCard).join("")}</div>`;
  }

  if (activeTab === "settings") {
    resultsCount.textContent = "";
    content.innerHTML = renderSettingsTab();
    bindSettingsEvents();
    return;
  }

  if (activeTab === "live") {
    const jobs = typeof LIVE_JOBS !== "undefined" ? LIVE_JOBS : [];
    const lastUpdated = typeof LAST_UPDATED !== "undefined" ? LAST_UPDATED : null;

    if (jobs.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🤖</span>
          <div class="empty-title">Живые вакансии ещё не загружены</div>
          <p class="empty-text">
            Запусти скрипт в терминале:<br><br>
            <code style="background:var(--color-surface-2);padding:8px 16px;border-radius:8px;border:1px solid var(--color-border);display:inline-block;margin-top:8px;font-size:13px">node scraper.js</code><br><br>
            После этого обнови страницу — вакансии появятся здесь.
          </p>
        </div>
      `;
      resultsCount.textContent = "0 вакансий";
      return;
    }

    const filtered = jobs.filter((job) => {
      const matchesRegion = activeRegions.size === 0 || activeRegions.has(job.region);
      const matchesFormat = activeFormats.size === 0 || activeFormats.has(job.format);
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        (job.description || "").toLowerCase().includes(query);
      return matchesRegion && matchesFormat && matchesSearch;
    });

    resultsCount.textContent = `${filtered.length} вакансий`;

    const refreshBar = `
      <div class="refresh-bar">
        <span class="refresh-hint">
          ${lastUpdated ? `Обновлено: <b>${lastUpdated}</b> ·` : ""}
          Чтобы получить свежие вакансии: <code>python3 scraper.py</code>
        </span>
        <button class="btn-refresh" onclick="location.reload()" aria-label="Обновить страницу">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M3 12a9 9 0 009 9 9.75 9.75 0 006.74-2.74L21 16"/>
            <path d="M21 21v-5h-5"/>
            <path d="M21 12a9 9 0 00-9-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Обновить
        </button>
      </div>`;

    const updatedHtml = refreshBar;

    if (filtered.length === 0) {
      content.innerHTML = `${updatedHtml}<div class="empty-state">
        <span class="empty-icon">🔍</span>
        <div class="empty-title">Ничего не найдено</div>
        <p class="empty-text">Попробуй изменить фильтры или поисковый запрос</p>
      </div>`;
      return;
    }

    content.innerHTML = `${updatedHtml}<div class="grid">${filtered.map(renderLiveJobCard).join("")}</div>`;
  }
};

const handleTabClick = (tab) => {
  activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  const showFilters = tab !== "tactics" && tab !== "settings";
  document.getElementById("filter-controls").style.display = showFilters ? "flex" : "none";

  // Фильтр по роли — только на вкладках компаний и платформ
  const filterTags = document.getElementById("filter-tags");
  if (filterTags) filterTags.style.display = tab === "live" ? "none" : "";

  // Фильтр по формату — только на вкладке живых вакансий
  const filterFormat = document.getElementById("filter-format");
  if (filterFormat) filterFormat.style.display = tab === "live" ? "flex" : "none";

  renderContent();
};

const handleRegionFilter = (region) => {
  if (activeRegions.has(region)) {
    activeRegions.delete(region);
  } else {
    activeRegions.add(region);
  }

  document.querySelectorAll(".filter-btn[data-region]").forEach((btn) => {
    btn.classList.toggle("active", activeRegions.has(btn.dataset.region));
  });

  renderContent();
};

const handleTagFilter = (tag) => {
  if (activeTags.has(tag)) {
    activeTags.delete(tag);
  } else {
    activeTags.add(tag);
  }

  document.querySelectorAll(".filter-btn[data-tag]").forEach((btn) => {
    btn.classList.toggle("active", activeTags.has(btn.dataset.tag));
  });

  renderContent();
};

const handleFormatFilter = (format) => {
  if (activeFormats.has(format)) {
    activeFormats.delete(format);
  } else {
    activeFormats.add(format);
  }
  document.querySelectorAll(".filter-btn[data-format]").forEach((btn) => {
    btn.classList.toggle("active", activeFormats.has(btn.dataset.format));
    btn.setAttribute("aria-pressed", activeFormats.has(btn.dataset.format));
  });
  renderContent();
};

const handleSearch = (e) => {
  searchQuery = e.target.value;
  renderContent();
};

// ===== SETTINGS TAB =====

const getCompanies = () => {
  const base = typeof WATCH_COMPANIES_DEFAULT !== "undefined" ? WATCH_COMPANIES_DEFAULT : [];
  const added = JSON.parse(localStorage.getItem(LS_COMPANIES_ADDED) || "[]");
  const removed = new Set(JSON.parse(localStorage.getItem(LS_COMPANIES_REMOVED) || "[]"));
  return [
    ...base.filter((c) => !removed.has(c)),
    ...added.filter((c) => !removed.has(c)),
  ];
};

const getKeywords = (type) => {
  const cfg = typeof KEYWORDS_CONFIG !== "undefined" ? KEYWORDS_CONFIG : { include: [], exclude: [] };
  const base = type === "include" ? cfg.include : cfg.exclude;
  const lsAdd = type === "include" ? LS_KW_ADDED : LS_EX_ADDED;
  const lsRm  = type === "include" ? LS_KW_REMOVED : LS_EX_REMOVED;
  const added   = JSON.parse(localStorage.getItem(lsAdd) || "[]");
  const removed = new Set(JSON.parse(localStorage.getItem(lsRm) || "[]"));
  return [...base.filter((k) => !removed.has(k)), ...added.filter((k) => !removed.has(k))];
};

const getBoards = () => {
  const base = typeof JOB_BOARDS_CONFIG !== "undefined" ? JOB_BOARDS_CONFIG : [];
  const added = JSON.parse(localStorage.getItem(LS_BOARDS_ADDED) || "[]");
  return [...base, ...added];
};

const statusLabel = (status) => {
  const map = {
    working:     { cls: "status-working",     text: "✅ Работает" },
    partial:     { cls: "status-partial",     text: "⚠️ Частично" },
    low:         { cls: "status-low",         text: "🔸 Мало данных" },
    unavailable: { cls: "status-unavailable", text: "❌ Недоступен" },
  };
  return map[status] || map.unavailable;
};

const renderSettingsTab = () => {
  const companies = getCompanies();
  const boards = getBoards();
  const added = new Set(JSON.parse(localStorage.getItem(LS_COMPANIES_ADDED) || "[]"));

  const chipsHtml = companies
    .map((c) => `
      <span class="chip ${added.has(c) ? "chip-new" : ""}" data-company="${c}">
        ${c}
        <button class="chip-remove" data-remove="${c}" aria-label="Удалить ${c}" title="Удалить">✕</button>
      </span>`)
    .join("");

  const boardsHtml = boards.map((b) => {
    const st = statusLabel(b.status);
    return `
      <div class="board-card">
        <div class="board-icon">${b.icon || "📋"}</div>
        <div class="board-info">
          <div class="board-name">${b.name}</div>
          <div class="board-note">${b.note || ""}</div>
          ${b.url ? `<div class="board-url">${b.url}</div>` : ""}
        </div>
        <div class="board-meta">
          <span class="board-method">${b.method || ""}</span>
          <span class="status-badge ${st.cls}">${st.text}</span>
          ${b.custom ? `<button class="chip-remove" data-remove-board="${b.id}" title="Удалить">✕</button>` : ""}
        </div>
      </div>`;
  }).join("");

  const exportList = `WATCH_COMPANIES = [\n${companies.map(c => `    "${c}",`).join("\n")}\n]`;

  const kwInclude = getKeywords("include");
  const kwExclude = getKeywords("exclude");
  const kwAddedInclude = new Set(JSON.parse(localStorage.getItem(LS_KW_ADDED) || "[]"));
  const kwAddedExclude = new Set(JSON.parse(localStorage.getItem(LS_EX_ADDED) || "[]"));

  const renderKwChips = (list, addedSet, prefix) => list
    .map((k) => `
      <span class="chip kw-chip ${addedSet.has(k) ? "chip-new" : ""}" data-kw="${k}">
        ${k}
        <button class="chip-remove" data-remove-kw="${k}" data-kw-type="${prefix}" title="Удалить">✕</button>
      </span>`).join("");

  const kwExportStr = [
    `KEYWORDS_TITLE = [\n${kwInclude.map(k => `    "${k}",`).join("\n")}\n]`,
    `\nEXCLUDE_TITLE = [\n${kwExclude.map(k => `    "${k}",`).join("\n")}\n]`,
  ].join("\n");

  return `
    <!-- Компании -->
    <div class="settings-section">
      <div class="settings-header">
        <div>
          <div class="settings-title">🏢 Компании для мониторинга</div>
          <div class="settings-subtitle">Вакансии от этих компаний помечаются ⭐ в дайджесте</div>
        </div>
        <span class="settings-count">${companies.length} компаний</span>
      </div>

      <div class="chips-grid" id="chips-grid">${chipsHtml}</div>

      <div class="add-form">
        <input class="add-input" id="company-input" type="text"
          placeholder="Название компании..." autocomplete="off" />
        <button class="btn-add" id="company-add-btn">Добавить</button>
        <button class="btn-secondary" id="company-export-btn">Экспорт</button>
      </div>

      <div class="export-box" id="company-export-box">
        <textarea readonly id="company-export-text">${exportList}</textarea>
        <div class="export-hint">Вставь этот список в <code>scraper.py</code> → переменную <code>WATCH_COMPANIES</code></div>
      </div>
    </div>

    <!-- Ключевые слова -->
    <div class="settings-section">
      <div class="settings-header">
        <div>
          <div class="settings-title">🔍 Ключевые слова для поиска</div>
          <div class="settings-subtitle">Вакансия включается если заголовок содержит хотя бы одно из этих слов</div>
        </div>
        <span class="settings-count">${kwInclude.length} слов</span>
      </div>
      <div class="chips-grid" id="kw-include-grid" style="max-height:180px;overflow-y:auto">
        ${renderKwChips(kwInclude, kwAddedInclude, "include")}
      </div>
      <div class="add-form" style="margin-top:8px">
        <input class="add-input" id="kw-include-input" type="text"
          placeholder="product marketing lead..." autocomplete="off" />
        <button class="btn-add" id="kw-include-add-btn">Добавить</button>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-header">
        <div>
          <div class="settings-title">🚫 Исключения (стоп-слова)</div>
          <div class="settings-subtitle">Вакансия исключается если заголовок содержит любое из этих слов</div>
        </div>
        <span class="settings-count">${kwExclude.length} слов</span>
      </div>
      <div class="chips-grid" id="kw-exclude-grid" style="max-height:180px;overflow-y:auto">
        ${renderKwChips(kwExclude, kwAddedExclude, "exclude")}
      </div>
      <div class="add-form" style="margin-top:8px">
        <input class="add-input" id="kw-exclude-input" type="text"
          placeholder="sales engineer..." autocomplete="off" />
        <button class="btn-add" id="kw-exclude-add-btn">Добавить</button>
        <button class="btn-secondary" id="kw-export-btn">Экспорт</button>
      </div>
      <div class="export-box" id="kw-export-box">
        <textarea readonly id="kw-export-text">${kwExportStr}</textarea>
        <div class="export-hint">Вставь в <code>scraper.py</code> → переменные <code>KEYWORDS_TITLE</code> и <code>EXCLUDE_TITLE</code></div>
      </div>
    </div>

    <!-- Борды -->
    <div class="settings-section">
      <div class="settings-header">
        <div>
          <div class="settings-title">📡 Job boards</div>
          <div class="settings-subtitle">Источники, которые парсит scraper.py</div>
        </div>
        <span class="settings-count">${boards.length} источников</span>
      </div>

      <div class="boards-list">${boardsHtml}</div>

      <div class="add-form">
        <input class="add-input" id="board-name-input" type="text"
          placeholder="Название борда..." style="max-width:180px" autocomplete="off" />
        <input class="add-input" id="board-url-input" type="url"
          placeholder="https://..." autocomplete="off" />
        <button class="btn-add" id="board-add-btn">Добавить</button>
      </div>
    </div>
  `;
};

const bindSettingsEvents = () => {
  // Удаление компании
  document.querySelectorAll(".chip-remove[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.remove;
      const removed = JSON.parse(localStorage.getItem(LS_COMPANIES_REMOVED) || "[]");
      if (!removed.includes(name)) removed.push(name);
      localStorage.setItem(LS_COMPANIES_REMOVED, JSON.stringify(removed));
      // Убрать из added тоже
      const added = JSON.parse(localStorage.getItem(LS_COMPANIES_ADDED) || "[]");
      localStorage.setItem(LS_COMPANIES_ADDED, JSON.stringify(added.filter((c) => c !== name)));
      document.getElementById("chips-grid").innerHTML = getCompanies()
        .map((c) => {
          const isNew = new Set(JSON.parse(localStorage.getItem(LS_COMPANIES_ADDED) || "[]")).has(c);
          return `<span class="chip ${isNew ? "chip-new" : ""}" data-company="${c}">${c}
            <button class="chip-remove" data-remove="${c}" aria-label="Удалить ${c}" title="Удалить">✕</button></span>`;
        }).join("");
      bindSettingsEvents();
      showToast(`«${name}» удалена из списка`);
    });
  });

  // Добавление компании
  const companyInput = document.getElementById("company-input");
  const companyAddBtn = document.getElementById("company-add-btn");
  const handleAddCompany = () => {
    const val = companyInput.value.trim();
    if (!val) return;
    const added = JSON.parse(localStorage.getItem(LS_COMPANIES_ADDED) || "[]");
    const all = getCompanies();
    if (all.some((c) => c.toLowerCase() === val.toLowerCase())) {
      showToast("Компания уже есть в списке"); return;
    }
    added.push(val);
    localStorage.setItem(LS_COMPANIES_ADDED, JSON.stringify(added));
    // Убрать из removed если была
    const removed = JSON.parse(localStorage.getItem(LS_COMPANIES_REMOVED) || "[]");
    localStorage.setItem(LS_COMPANIES_REMOVED, JSON.stringify(removed.filter((c) => c !== val)));
    companyInput.value = "";
    renderContent();
    showToast(`«${val}» добавлена ⭐`);
  };
  companyAddBtn.addEventListener("click", handleAddCompany);
  companyInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleAddCompany(); });

  // Экспорт
  document.getElementById("company-export-btn").addEventListener("click", () => {
    const box = document.getElementById("company-export-box");
    box.classList.toggle("open");
    if (box.classList.contains("open")) {
      const list = `WATCH_COMPANIES = [\n${getCompanies().map(c => `    "${c}",`).join("\n")}\n]`;
      document.getElementById("company-export-text").value = list;
      document.getElementById("company-export-text").select();
    }
  });

  // Удаление ключевого слова
  document.querySelectorAll(".chip-remove[data-remove-kw]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const kw = btn.dataset.removeKw;
      const type = btn.dataset.kwType;
      const lsRm  = type === "include" ? LS_KW_REMOVED : LS_EX_REMOVED;
      const lsAdd = type === "include" ? LS_KW_ADDED   : LS_EX_ADDED;
      const removed = JSON.parse(localStorage.getItem(lsRm) || "[]");
      if (!removed.includes(kw)) removed.push(kw);
      localStorage.setItem(lsRm, JSON.stringify(removed));
      const added = JSON.parse(localStorage.getItem(lsAdd) || "[]");
      localStorage.setItem(lsAdd, JSON.stringify(added.filter((k) => k !== kw)));
      renderContent();
      showToast(`«${kw}» удалено`);
    });
  });

  // Добавление ключевого слова (include)
  const kwIncInput = document.getElementById("kw-include-input");
  const kwIncBtn   = document.getElementById("kw-include-add-btn");
  const handleAddKwInclude = () => {
    const val = kwIncInput.value.trim().toLowerCase();
    if (!val) return;
    const added = JSON.parse(localStorage.getItem(LS_KW_ADDED) || "[]");
    if (getKeywords("include").includes(val)) { showToast("Уже есть"); return; }
    added.push(val);
    localStorage.setItem(LS_KW_ADDED, JSON.stringify(added));
    const removed = JSON.parse(localStorage.getItem(LS_KW_REMOVED) || "[]");
    localStorage.setItem(LS_KW_REMOVED, JSON.stringify(removed.filter((k) => k !== val)));
    kwIncInput.value = "";
    renderContent();
    showToast(`«${val}» добавлено в поиск`);
  };
  kwIncBtn.addEventListener("click", handleAddKwInclude);
  kwIncInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleAddKwInclude(); });

  // Добавление ключевого слова (exclude)
  const kwExcInput = document.getElementById("kw-exclude-input");
  const kwExcBtn   = document.getElementById("kw-exclude-add-btn");
  const handleAddKwExclude = () => {
    const val = kwExcInput.value.trim().toLowerCase();
    if (!val) return;
    const added = JSON.parse(localStorage.getItem(LS_EX_ADDED) || "[]");
    if (getKeywords("exclude").includes(val)) { showToast("Уже есть"); return; }
    added.push(val);
    localStorage.setItem(LS_EX_ADDED, JSON.stringify(added));
    const removed = JSON.parse(localStorage.getItem(LS_EX_REMOVED) || "[]");
    localStorage.setItem(LS_EX_REMOVED, JSON.stringify(removed.filter((k) => k !== val)));
    kwExcInput.value = "";
    renderContent();
    showToast(`«${val}» добавлено в исключения`);
  };
  kwExcBtn.addEventListener("click", handleAddKwExclude);
  kwExcInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleAddKwExclude(); });

  // Экспорт ключевых слов
  document.getElementById("kw-export-btn").addEventListener("click", () => {
    const box = document.getElementById("kw-export-box");
    box.classList.toggle("open");
    if (box.classList.contains("open")) {
      const str = [
        `KEYWORDS_TITLE = [\n${getKeywords("include").map(k => `    "${k}",`).join("\n")}\n]`,
        `\nEXCLUDE_TITLE = [\n${getKeywords("exclude").map(k => `    "${k}",`).join("\n")}\n]`,
      ].join("\n");
      document.getElementById("kw-export-text").value = str;
      document.getElementById("kw-export-text").select();
    }
  });

  // Удаление борда (только кастомные)
  document.querySelectorAll(".chip-remove[data-remove-board]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.removeBoard;
      const boards = JSON.parse(localStorage.getItem(LS_BOARDS_ADDED) || "[]");
      localStorage.setItem(LS_BOARDS_ADDED, JSON.stringify(boards.filter((b) => b.id !== id)));
      renderContent();
      showToast("Борд удалён");
    });
  });

  // Добавление борда
  const boardNameInput = document.getElementById("board-name-input");
  const boardUrlInput = document.getElementById("board-url-input");
  const boardAddBtn = document.getElementById("board-add-btn");
  const handleAddBoard = () => {
    const name = boardNameInput.value.trim();
    const url = boardUrlInput.value.trim();
    if (!name) { showToast("Введи название борда"); return; }
    const boards = JSON.parse(localStorage.getItem(LS_BOARDS_ADDED) || "[]");
    const id = `custom-${Date.now()}`;
    boards.push({ id, name, url, status: "unknown", method: "—", icon: "📋", note: "Добавлен вручную", custom: true });
    localStorage.setItem(LS_BOARDS_ADDED, JSON.stringify(boards));
    boardNameInput.value = "";
    boardUrlInput.value = "";
    renderContent();
    showToast(`«${name}» добавлен`);
  };
  boardAddBtn.addEventListener("click", handleAddBoard);
  boardNameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleAddBoard(); });
};

const init = () => {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleTabClick(btn.dataset.tab));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") handleTabClick(btn.dataset.tab);
    });
  });

  document.querySelectorAll(".filter-btn[data-region]").forEach((btn) => {
    btn.addEventListener("click", () => handleRegionFilter(btn.dataset.region));
  });

  document.querySelectorAll(".filter-btn[data-tag]").forEach((btn) => {
    btn.addEventListener("click", () => handleTagFilter(btn.dataset.tag));
  });

  document.querySelectorAll(".filter-btn[data-format]").forEach((btn) => {
    btn.addEventListener("click", () => handleFormatFilter(btn.dataset.format));
  });

  document.getElementById("search-input").addEventListener("input", handleSearch);

  renderContent();
};

document.addEventListener("DOMContentLoaded", init);
