const COUNTRY_FLAGS = { AUS: "🇦🇺", SG: "🇸🇬", UK: "🇬🇧", NZ: "🇳🇿" };

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

  const regionBadge = ["AUS", "SG", "UK"].includes(job.region)
    ? `<span class="country-badge" data-country="${job.region}">${COUNTRY_FLAGS[job.region] || ""} ${job.region}</span>`
    : `<span class="stage-badge">${job.region}</span>`;

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

    const updatedHtml = lastUpdated
      ? `<p style="font-size:12px;color:var(--color-text-faint);margin-bottom:16px">Обновлено: ${lastUpdated} · <code style="font-size:11px">node scraper.js</code> для обновления</p>`
      : "";

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

  const showFilters = tab !== "tactics";
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
