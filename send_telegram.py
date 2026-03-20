#!/usr/bin/env python3
"""
Telegram Digest Sender
Читает data/live-jobs.js и отправляет ежедневный дайджест в Telegram канал
Запуск: python3 send_telegram.py
"""

import urllib.request
import json
import os
import re
import time
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LIVE_JOBS_FILE = os.path.join(BASE_DIR, "data", "live-jobs.js")
ENV_FILE = os.path.join(BASE_DIR, ".env")
TG_MAX_LENGTH = 4000


def load_env():
    env = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    env[key.strip()] = val.strip()
    for key in ("TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "DASHBOARD_URL"):
        if os.environ.get(key):
            env[key] = os.environ[key]
    return env


def load_jobs():
    if not os.path.exists(LIVE_JOBS_FILE):
        return []
    with open(LIVE_JOBS_FILE, encoding="utf-8") as f:
        raw = f.read()
    match = re.search(r"const LIVE_JOBS = (\[.*?\]);", raw, re.DOTALL)
    if not match:
        return []
    return json.loads(match.group(1))


def send_message(bot_token, chat_id, text):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


COUNTRY_FLAGS = {
    "AUS": "🇦🇺", "SG": "🇸🇬", "UK": "🇬🇧",
    "NZ": "🇳🇿", "NL": "🇳🇱", "UAE": "🇦🇪",
}

WEEKDAYS_RU = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"]
MONTHS_RU   = ["января", "февраля", "марта", "апреля", "мая", "июня",
                "июля", "августа", "сентября", "октября", "ноября", "декабря"]


def friendly_date():
    now = datetime.now()
    wd  = WEEKDAYS_RU[now.weekday()].capitalize()
    mon = MONTHS_RU[now.month - 1]
    return f"{wd}, {now.day} {mon}"


def format_source(source):
    icons = {
        "Remote OK":       "🌐",
        "LinkedIn":        "💼",
        "WorkingNomads":   "✈️",
        "WeWorkRemotely":  "🏠",
        "Jobicy":          "💡",
    }
    return f"{icons.get(source, '📋')} {source}"


def format_job_line(job, index):
    title   = job.get("title", "")
    company = job.get("company", "")
    region  = job.get("region", "")
    fmt     = job.get("format", "")
    url     = job.get("url", "")
    watch   = "⭐ " if job.get("watch_company") else ""

    flag = COUNTRY_FLAGS.get(region, "🌍")
    fmt_icon = "⏱" if fmt == "part-time" else "💼"

    line = f"{index}. {watch}<a href='{url}'>{title}</a>\n"
    line += f"   🏢 {company}  {flag} {region}  {fmt_icon} {fmt}"
    return line


def build_messages(jobs, dashboard_url=""):
    total    = len(jobs)
    pt_count = sum(1 for j in jobs if j.get("format") == "part-time")
    ft_count = total - pt_count
    watch_count = sum(1 for j in jobs if j.get("watch_company"))

    # Счётчик по странам
    regions = {}
    for j in jobs:
        r = j.get("region", "Remote")
        regions[r] = regions.get(r, 0) + 1

    # Счётчик по источникам
    sources = {}
    for j in jobs:
        s = j.get("source", "?")
        sources[s] = sources.get(s, 0) + 1

    def regions_str():
        parts = []
        for r, cnt in sorted(regions.items(), key=lambda x: -x[1]):
            flag = COUNTRY_FLAGS.get(r, "🌍")
            parts.append(f"{flag} {r}: {cnt}")
        return "  ·  ".join(parts)

    def sources_str():
        return "  ·  ".join(
            f"{format_source(s)}: {c}"
            for s, c in sorted(sources.items(), key=lambda x: -x[1])
        )

    dash_line = f'\n\n🔗 <a href="{dashboard_url}">Открыть дашборд →</a>' if dashboard_url else ""

    header = (
        f"🎯 <b>Jobs Radar — {friendly_date()}</b>\n\n"
        f"Нашла <b>{total}</b> свежих вакансий! 🎉\n\n"
        f"<b>По формату:</b>\n"
        f"  ⏱ Part-time / Fractional: <b>{pt_count}</b>\n"
        f"  💼 Full-time: <b>{ft_count}</b>\n"
        + (f"  ⭐ Watchlist компании: <b>{watch_count}</b>\n" if watch_count else "")
        + f"\n<b>По странам:</b>\n  {regions_str()}\n"
        f"\n<b>По источникам:</b>\n  {sources_str()}"
        f"{dash_line}\n"
        f"\n{'─'*35}\n\n"
    )

    messages = []
    current  = header

    for i, job in enumerate(jobs, 1):
        block = format_job_line(job, i) + "\n\n"
        if len(current) + len(block) > TG_MAX_LENGTH:
            messages.append(current)
            current = block
        else:
            current += block

    if current.strip():
        messages.append(current)

    return messages


def build_empty_message():
    return (
        f"🎯 <b>Jobs Radar — {friendly_date()}</b>\n\n"
        "📭 Сегодня новых вакансий не нашла.\n"
        "Попробую снова завтра! 👋"
    )


def main():
    env = load_env()
    bot_token     = env.get("TELEGRAM_BOT_TOKEN", "")
    chat_id       = env.get("TELEGRAM_CHAT_ID", "")
    dashboard_url = env.get("DASHBOARD_URL", "")

    if not bot_token or not chat_id:
        print("❌ TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы в .env")
        return False

    jobs = load_jobs()
    print(f"📋 Загружено {len(jobs)} вакансий из live-jobs.js")

    if not jobs:
        print("⚠️  Нет вакансий. Отправляю заглушку...")
        send_message(bot_token, chat_id, build_empty_message())
        return True

    messages = build_messages(jobs, dashboard_url)
    print(f"📨 Отправляю {len(messages)} сообщений в Telegram...")

    ok = 0
    for i, msg in enumerate(messages, 1):
        try:
            send_message(bot_token, chat_id, msg)
            print(f"   ✓ Сообщение {i}/{len(messages)}")
            ok += 1
            if i < len(messages):
                time.sleep(1)
        except Exception as e:
            print(f"   ✗ Ошибка {i}: {e}")

    if ok == len(messages):
        print("\n✅ Дайджест отправлен!")
        return True
    else:
        print(f"\n⚠️  Отправлено {ok}/{len(messages)}")
        return False


if __name__ == "__main__":
    main()
