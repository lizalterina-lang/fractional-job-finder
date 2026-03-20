#!/usr/bin/env python3
"""
Fractional Job Scraper
Парсит вакансии из RemoteOK, RapidAPI (LinkedIn), WorkingNomads
и сохраняет результаты в data/live-jobs.js
Запуск: python3 scraper.py
"""

import urllib.request
import urllib.parse
import urllib.error
import json
import os
import re
import xml.etree.ElementTree as ET
import time
from datetime import datetime

# ===== КОНФИГ =====

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BASE_DIR, "data", "live-jobs.js")
ENV_FILE = os.path.join(BASE_DIR, ".env")


def load_env():
    # Сначала читаем из .env, потом перекрываем переменными окружения (GitHub Actions Secrets)
    env = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    env[key.strip()] = val.strip()
    # os.environ имеет приоритет (GitHub Secrets)
    for key in ("TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "RAPIDAPI_KEY",
                "REMOTEROCKETSHIP_API_KEY", "REMOTEROCKETSHIP_EMAIL"):
        if os.environ.get(key):
            env[key] = os.environ[key]
    return env


ENV = load_env()
RAPIDAPI_KEY = ENV.get("RAPIDAPI_KEY", "")

# ===== КОМПАНИИ ДЛЯ МОНИТОРИНГА (из старого проекта) =====

WATCH_COMPANIES = [
    "SafetyCulture", "Culture Amp", "Airwallex", "Employment Hero",
    "SiteMinder", "Linktree", "Deputy", "Endowus", "PatSnap",
    "ShopBack", "Aspire", "Carousell", "Qwilr", "Enboarder",
    "Vervoe", "Go1", "OpenLearning", "Edrolo", "GitLab",
    "Automattic", "Buffer", "Hotjar", "Doist", "Volopay",
    "Syfe", "StashAway", "Funding Societies", "Bolttech",
    "Canva", "Deputy", "Paddle", "Synthesia", "Multiverse",
    "Thought Machine", "Tractable", "Legl", "Modulr", "Huma",
    "Nium", "Xendit", "Brighte", "Bugcrowd",
]

# ===== ИСТОЧНИКИ =====

REMOTEOK_SOURCES = [
    {"name": "Remote OK — marketing", "url": "https://remoteok.com/api?tag=marketing"},
    {"name": "Remote OK — growth",    "url": "https://remoteok.com/api?tag=growth"},
]

WORKINGNOMADS_SOURCES = [
    {"name": "WorkingNomads — marketing", "url": "https://www.workingnomads.com/api/exposed_jobs/?category=marketing"},
]

JOBICY_SOURCES = [
    {"name": "Jobicy — marketing", "url": "https://jobicy.com/api/v2/remote-jobs?industry=marketing&count=50"},
]

# WeWorkRemotely общий RSS (marketing-specific даёт 301)
WWR_RSS_URL = "https://weworkremotely.com/remote-jobs.rss"

# RapidAPI — LinkedIn Jobs
RAPIDAPI_SEARCHES = [
    {"title": "Product Marketing Manager", "location": "Australia"},
    {"title": "Growth Marketing Manager",  "location": "Australia"},
    {"title": "GTM Manager",               "location": "Australia"},
    {"title": "Head of Marketing",         "location": "Australia"},
    {"title": "Product Marketing Manager", "location": "Singapore"},
    {"title": "Growth Manager",            "location": "Singapore"},
    {"title": "Head of Marketing",         "location": "United Kingdom"},
    {"title": "Product Marketing Manager", "location": "United Kingdom"},
    {"title": "Fractional CMO",            "location": ""},
    {"title": "Fractional PMM",            "location": ""},
]

# ===== ФИЛЬТРЫ =====

EXCLUDE_TITLE = [
    "sales operations", "sales strategy", "sales planning",
    "account executive", "account manager", "sales manager",
    "support specialist", "customer support", "customer success",
    "data analyst", "data engineer", "data scientist",
    "software engineer", "developer", "devops", "qa ", "qa engineer",
    "legal ", "finance", "accounting", "design intern",
    "recruiter", "talent acquisition", "hr manager",
]

KEYWORDS_TITLE = [
    "product marketing manager", "product marketing strategist",
    "product marketer", "product marketing advisor",
    "product marketing consultant", "pmm",
    "go-to-market", "gtm manager", "gtm strategist",
    "gtm advisor", "gtm consultant", "gtm marketer",
    "growth manager", "growth marketer", "growth strategist",
    "growth advisor", "growth consultant", "growth hacker",
    "growth marketing manager", "growth marketing strategist",
    "marketing strategy", "marketing strategist",
    "marketing strategy advisor", "marketing strategy consultant",
    "fractional cmo", "fractional pmm", "fractional gtm",
    "fractional growth", "fractional marketing",
    "marketing advisor", "marketing consultant",
    "vp marketing", "head of marketing", "cmo", "chief marketing",
    "b2b marketing", "saas marketing",
]

KEYWORDS_DESC_ROLE = [
    "product marketing manager", "product marketer", "pmm",
    "go-to-market", "gtm strategist", "gtm manager",
    "growth manager", "growth marketer", "growth strategist",
    "fractional marketing", "fractional cmo", "fractional pmm",
    "marketing strategist", "marketing strategy",
]

FORMAT_PARTTIME_KEYWORDS = [
    "part-time", "part time", "parttime", "fractional",
    "freelance", "contract", "20 hours", "20h", "4 hours",
    "6 hours", "8 hours", "10 hours", "15 hours", "consultant",
    "interim", "hourly",
]

REGIONS_MAP = {
    "australia": "AUS", "sydney": "AUS", "melbourne": "AUS",
    "brisbane": "AUS", "perth": "AUS", "adelaide": "AUS",
    "singapore": "SG",
    "united kingdom": "UK", "london": "UK", "england": "UK",
    "manchester": "UK", "edinburgh": "UK", " uk": "UK",
    "new zealand": "NZ", "auckland": "NZ", "wellington": "NZ",
    "christchurch": "NZ",
}

# ===== УТИЛИТЫ =====

def strip_html(text):
    return re.sub(r"<[^>]+>", "", text or "").strip()


def get_region(location):
    if not location:
        return "Remote"
    loc = location.lower()
    for keyword, region in REGIONS_MAP.items():
        if keyword in loc:
            return region
    return location


def detect_format(title, description):
    combined = f"{title} {description}".lower()
    if any(k in combined for k in FORMAT_PARTTIME_KEYWORDS):
        return "part-time"
    return "full-time"


def is_relevant(job):
    title = (job.get("title") or "").lower()
    tags = " ".join(job.get("tags") or []).lower()
    desc = (job.get("description") or "").lower()
    combined = f"{title} {tags}"

    if any(k in title for k in EXCLUDE_TITLE):
        return False

    if any(k in combined for k in KEYWORDS_TITLE):
        return True

    # Для watchlist-компаний достаточно слова «marketing» в заголовке
    if job.get("watch_company") and "marketing" in title:
        return True

    return any(k in desc for k in KEYWORDS_DESC_ROLE)


def is_watch_company(company_name):
    if not company_name:
        return False
    lower = company_name.lower().strip()
    for w in WATCH_COMPANIES:
        wl = w.lower()
        # Точное совпадение или watchlist-название как отдельное слово
        if lower == wl or re.search(r'\b' + re.escape(wl) + r'\b', lower):
            return True
    return False


def fetch_json(url, headers=None):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; FractionalJobFinder/1.0)",
            "Accept": "application/json",
            **(headers or {}),
        }
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def make_job(source, title, company, location, url, description="", tags=None, date="", salary=""):
    desc_clean = strip_html(description)[:400]
    return {
        "id": f"{source}-{re.sub(r'[^a-z0-9]', '-', (company + title).lower())[:50]}",
        "source": source,
        "title": title,
        "company": company,
        "location": location or "Remote",
        "region": get_region(location),
        "format": detect_format(title, desc_clean),
        "url": url,
        "tags": (tags or [])[:6],
        "description": desc_clean,
        "date": date,
        "salary": salary,
        "watch_company": is_watch_company(company),
    }


# ===== ПАРСЕРЫ =====

def parse_remoteok(data):
    if not isinstance(data, list):
        return []
    jobs = []
    for j in data:
        if not isinstance(j, dict) or not j.get("position"):
            continue
        title = j.get("position", "")
        description = strip_html(j.get("description", ""))
        jobs.append(make_job(
            source="Remote OK",
            title=title,
            company=j.get("company", ""),
            location=j.get("location", "") or "Remote",
            url=j.get("url") or f"https://remoteok.com/remote-jobs/{j.get('slug', '')}",
            description=description,
            tags=j.get("tags") or [],
            date=j.get("date", ""),
            salary=j.get("salary", ""),
        ))
    return jobs


def parse_workingnomads(data):
    if not isinstance(data, list):
        data = data.get("jobs", []) if isinstance(data, dict) else []
    jobs = []
    for j in data:
        if not isinstance(j, dict):
            continue
        jobs.append(make_job(
            source="WorkingNomads",
            title=j.get("title", ""),
            company=j.get("company", {}).get("name", j.get("company", "")) if isinstance(j.get("company"), dict) else j.get("company", ""),
            location=j.get("region", j.get("location", "Remote")),
            url=j.get("url", j.get("job_url", "")),
            description=j.get("description", ""),
            date=j.get("pub_date", j.get("published_at", "")),
        ))
    return jobs


def parse_rapidapi_linkedin(data, region):
    jobs = []
    job_list = data if isinstance(data, list) else data.get("data", data.get("jobs", data.get("results", [])))
    for j in job_list:
        if not isinstance(j, dict):
            continue
        title = j.get("title", j.get("job_title", ""))
        company = j.get("company", j.get("company_name", "Unknown"))
        if not title:
            continue
        location = j.get("location", j.get("job_location", region))
        link = j.get("job_url", j.get("url", j.get("link", "")))
        if link and not link.startswith("http"):
            link = f"https://www.linkedin.com{link}"
        jobs.append(make_job(
            source="LinkedIn",
            title=title,
            company=company,
            location=location,
            url=link,
            description=j.get("description", j.get("job_description", "")),
            date=j.get("posted_date", j.get("date_posted", "")),
            salary=j.get("salary", ""),
        ))
    return jobs


# ===== ПАРСЕРЫ НОВЫХ ИСТОЧНИКОВ =====

def parse_jobicy(data):
    jobs_raw = data.get("jobs", []) if isinstance(data, dict) else []
    jobs = []
    for j in jobs_raw:
        if not isinstance(j, dict) or not j.get("jobTitle"):
            continue
        jobs.append(make_job(
            source="Jobicy",
            title=j.get("jobTitle", ""),
            company=j.get("companyName", ""),
            location=j.get("jobGeo", "Remote"),
            url=j.get("url", ""),
            description=j.get("jobExcerpt", "") + " " + j.get("jobDescription", ""),
            date=j.get("pubDate", ""),
        ))
    return jobs


def parse_weworkremotely_rss(xml_data):
    jobs = []
    try:
        root = ET.fromstring(xml_data)
        for item in root.findall(".//item"):
            title_raw = item.findtext("title") or ""
            # Формат: "Company Name: Job Title"
            if ": " in title_raw:
                company, _, title = title_raw.partition(": ")
            else:
                title, company = title_raw, ""

            link = item.findtext("link") or ""
            description = re.sub(r"<[^>]+>", "", item.findtext("description") or "")
            pub_date = item.findtext("pubDate") or ""
            region_tag = item.findtext("{https://weworkremotely.com}}region") or ""

            jobs.append(make_job(
                source="WeWorkRemotely",
                title=title.strip(),
                company=company.strip(),
                location=region_tag or "Remote",
                url=link,
                description=description,
                date=pub_date,
            ))
    except Exception as e:
        print(f"  RSS parse error: {e}")
    return jobs


# ===== ОСНОВНЫЕ ФУНКЦИИ =====

def scrape_remoteok():
    all_jobs = []
    seen = set()
    for source in REMOTEOK_SOURCES:
        try:
            print(f"  Загрузка {source['name']}... ", end="", flush=True)
            data = fetch_json(source["url"])
            parsed = parse_remoteok(data)
            relevant = [j for j in parsed if is_relevant(j)]
            added = 0
            for job in relevant:
                if job["id"] not in seen:
                    seen.add(job["id"])
                    all_jobs.append(job)
                    added += 1
            print(f"✓ {len(parsed)} → {added} релевантных")
        except Exception as e:
            print(f"✗ {e}")
    return all_jobs, seen


def scrape_workingnomads(seen):
    all_jobs = []
    for source in WORKINGNOMADS_SOURCES:
        try:
            print(f"  Загрузка {source['name']}... ", end="", flush=True)
            data = fetch_json(source["url"])
            parsed = parse_workingnomads(data)
            relevant = [j for j in parsed if is_relevant(j)]
            added = 0
            for job in relevant:
                if job["id"] not in seen:
                    seen.add(job["id"])
                    all_jobs.append(job)
                    added += 1
            print(f"✓ {len(parsed)} → {added} релевантных")
        except Exception as e:
            print(f"✗ {e}")
    return all_jobs


def scrape_jobicy(seen):
    all_jobs = []
    for source in JOBICY_SOURCES:
        try:
            print(f"  Загрузка {source['name']}... ", end="", flush=True)
            data = fetch_json(source["url"])
            parsed = parse_jobicy(data)
            relevant = [j for j in parsed if is_relevant(j)]
            added = 0
            for job in relevant:
                if job["id"] not in seen:
                    seen.add(job["id"])
                    all_jobs.append(job)
                    added += 1
            print(f"✓ {len(parsed)} → {added} релевантных")
        except Exception as e:
            print(f"✗ {e}")
        time.sleep(1)
    return all_jobs


def scrape_weworkremotely(seen):
    all_jobs = []
    try:
        print(f"  Загрузка WeWorkRemotely RSS... ", end="", flush=True)
        req = urllib.request.Request(
            WWR_RSS_URL,
            headers={"User-Agent": "Mozilla/5.0 (compatible; FractionalJobFinder/1.0)"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            xml_data = resp.read()
        parsed = parse_weworkremotely_rss(xml_data)
        relevant = [j for j in parsed if is_relevant(j)]
        added = 0
        for job in relevant:
            if job["id"] not in seen:
                seen.add(job["id"])
                all_jobs.append(job)
                added += 1
        print(f"✓ {len(parsed)} → {added} релевантных")
    except Exception as e:
        print(f"✗ {e}")
    return all_jobs


def scrape_linkedin_rapidapi(seen):
    if not RAPIDAPI_KEY:
        print("  ⚠️  RAPIDAPI_KEY не задан в .env — пропускаем LinkedIn")
        return []

    all_jobs = []
    base_url = "https://linkedin-job-search-api.p.rapidapi.com/search"
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "linkedin-job-search-api.p.rapidapi.com",
    }

    done_queries = set()
    for search in RAPIDAPI_SEARCHES:
        query_key = f"{search['title']}-{search['location']}"
        if query_key in done_queries:
            continue
        done_queries.add(query_key)

        params = {
            "title_filter": search["title"],
            "remote": "true",
            "type_filter": "FULL_TIME,PART_TIME,CONTRACT",
            "description_type": "text",
            "limit": "25",
        }
        if search["location"]:
            params["location_filter"] = search["location"]

        label = f"LinkedIn: {search['title']}" + (f" / {search['location']}" if search["location"] else "")
        try:
            print(f"  {label}... ", end="", flush=True)
            url = f"{base_url}?{urllib.parse.urlencode(params)}"
            data = fetch_json(url, headers=headers)
            region = search.get("location", "Remote")
            parsed = parse_rapidapi_linkedin(data, region)
            relevant = [j for j in parsed if is_relevant(j)]
            added = 0
            for job in relevant:
                if job["id"] not in seen:
                    seen.add(job["id"])
                    all_jobs.append(job)
                    added += 1
            print(f"✓ {len(parsed)} → {added} релевантных")
        except Exception as e:
            print(f"✗ {e}")

    return all_jobs


def main():
    print("🔍 Парсинг вакансий...\n")

    all_jobs = []

    print("📡 Remote OK:")
    remoteok_jobs, seen = scrape_remoteok()
    all_jobs.extend(remoteok_jobs)

    print("\n📡 WorkingNomads:")
    wn_jobs = scrape_workingnomads(seen)
    all_jobs.extend(wn_jobs)

    print("\n📡 WeWorkRemotely:")
    wwr_jobs = scrape_weworkremotely(seen)
    all_jobs.extend(wwr_jobs)

    print("\n📡 Jobicy:")
    jobicy_jobs = scrape_jobicy(seen)
    all_jobs.extend(jobicy_jobs)

    print("\n📡 LinkedIn (RapidAPI):")
    li_jobs = scrape_linkedin_rapidapi(seen)
    all_jobs.extend(li_jobs)

    # Сортировка: сначала компании из watchlist, потом по дате
    all_jobs.sort(key=lambda j: (not j.get("watch_company"), j.get("date") or ""), reverse=False)
    all_jobs.sort(key=lambda j: j.get("date") or "", reverse=True)

    now_str = datetime.now().strftime("%d.%m.%Y %H:%M")
    js_content = f"""// Автоматически сгенерировано: {now_str}
// Запусти 'python3 scraper.py' для обновления

const LIVE_JOBS = {json.dumps(all_jobs, ensure_ascii=False, indent=2)};

const LAST_UPDATED = "{now_str}";
"""

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(js_content)

    # Статистика по источникам
    sources_count = {}
    for j in all_jobs:
        sources_count[j["source"]] = sources_count.get(j["source"], 0) + 1

    watch_count = sum(1 for j in all_jobs if j.get("watch_company"))

    print(f"\n{'='*50}")
    print(f"✅ Готово! Найдено {len(all_jobs)} релевантных вакансий")
    print(f"   из которых {watch_count} — от компаний из watchlist ⭐")
    print(f"\nПо источникам:")
    for src, cnt in sorted(sources_count.items(), key=lambda x: -x[1]):
        print(f"   {src}: {cnt}")

    print(f"\nТоп вакансии:\n")
    for i, job in enumerate(all_jobs[:10], 1):
        region = f" [{job['region']}]" if job["region"] in ("AUS", "SG", "UK", "NZ") else ""
        watch = " ⭐" if job.get("watch_company") else ""
        fmt = f" [{job['format']}]"
        print(f"  {i:2}. {job['company']} — {job['title']}{region}{fmt}{watch}")

    print(f"\n📁 Сохранено: {OUTPUT_FILE}")
    print(f"🌐 Открой index.html → вкладка '🔴 Живые вакансии'")
    print(f"📬 Для отправки в Telegram: python3 send_telegram.py")

    return all_jobs


if __name__ == "__main__":
    main()
