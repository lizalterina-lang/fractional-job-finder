#!/usr/bin/env python3
"""
Telegram Digest Sender
Читает data/live-jobs.js и отправляет ежедневный дайджест в Telegram канал
Запуск: python3 send_telegram.py
"""

import urllib.request
import urllib.parse
import json
import os
import re
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LIVE_JOBS_FILE = os.path.join(BASE_DIR, "data", "live-jobs.js")
ENV_FILE = os.path.join(BASE_DIR, ".env")

TG_MAX_LENGTH = 4000  # Telegram лимит ~4096, оставляем запас


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
    for key in ("TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"):
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
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def format_region(region):
    flags = {"AUS": "🇦🇺", "SG": "🇸🇬", "UK": "🇬🇧", "NZ": "🇳🇿"}
    if region in flags:
        return f"{flags[region]} {region}"
    return f"🌍 {region}" if region else "🌍 Remote"


def format_format(fmt):
    if fmt == "part-time":
        return "⏱ Part-time"
    return "💼 Full-time"


def format_source(source):
    icons = {
        "Remote OK": "🌐",
        "LinkedIn": "💼",
        "WorkingNomads": "✈️",
        "Wellfound": "🌟",
        "MeetFrank": "🤝",
    }
    return f"{icons.get(source, '📋')} {source}"


def format_job(job, index):
    watch = "⭐ " if job.get("watch_company") else ""
    title = job.get("title", "")
    company = job.get("company", "")
    region = format_region(job.get("region", "Remote"))
    fmt = format_format(job.get("format", "full-time"))
    source = format_source(job.get("source", ""))
    url = job.get("url", "")
    salary = job.get("salary", "")

    lines = [
        f"{index}. {watch}<b>{title}</b>",
        f"   🏢 {company} · {region} · {fmt}",
    ]
    if salary:
        lines.append(f"   💰 {salary}")
    lines.append(f"   {source}")
    if url:
        lines.append(f"   🔗 <a href='{url}'>Открыть вакансию</a>")

    return "\n".join(lines)


def build_messages(jobs):
    today = datetime.now().strftime("%d %B %Y")
    total = len(jobs)
    watch_count = sum(1 for j in jobs if j.get("watch_company"))
    pt_count = sum(1 for j in jobs if j.get("format") == "part-time")
    ft_count = total - pt_count

    sources = {}
    for j in jobs:
        s = j.get("source", "?")
        sources[s] = sources.get(s, 0) + 1

    sources_str = " | ".join(f"{s}: {c}" for s, c in sorted(sources.items(), key=lambda x: -x[1]))

    header = (
        f"🎯 <b>Jobs Radar — {today}</b>\n\n"
        f"📊 Найдено вакансий: <b>{total}</b>\n"
        f"⭐ Watchlist компании: <b>{watch_count}</b>\n"
        f"⏱ Part-time: <b>{pt_count}</b> · 💼 Full-time: <b>{ft_count}</b>\n"
        f"📡 {sources_str}\n"
        f"{'─'*35}\n\n"
    )

    messages = []
    current = header

    for i, job in enumerate(jobs, 1):
        block = format_job(job, i) + "\n\n"
        if len(current) + len(block) > TG_MAX_LENGTH:
            messages.append(current)
            current = block
        else:
            current += block

    if current.strip():
        messages.append(current)

    if not jobs:
        messages = [f"🎯 <b>Jobs Radar — {today}</b>\n\n📭 Сегодня новых вакансий не найдено."]

    return messages


def main():
    env = load_env()
    bot_token = env.get("TELEGRAM_BOT_TOKEN", "")
    chat_id = env.get("TELEGRAM_CHAT_ID", "")

    if not bot_token or not chat_id:
        print("❌ TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы в .env")
        return False

    jobs = load_jobs()
    print(f"📋 Загружено {len(jobs)} вакансий из live-jobs.js")

    if not jobs:
        print("⚠️  Нет вакансий для отправки. Сначала запусти: python3 scraper.py")
        return False

    messages = build_messages(jobs)
    print(f"📨 Отправляю {len(messages)} сообщений в Telegram...")

    success_count = 0
    for i, msg in enumerate(messages, 1):
        try:
            send_message(bot_token, chat_id, msg)
            print(f"   ✓ Сообщение {i}/{len(messages)} отправлено")
            success_count += 1
            # Небольшая пауза между сообщениями
            import time
            time.sleep(1)
        except Exception as e:
            print(f"   ✗ Ошибка отправки сообщения {i}: {e}")

    if success_count == len(messages):
        print(f"\n✅ Дайджест успешно отправлен в Telegram!")
        return True
    else:
        print(f"\n⚠️  Отправлено {success_count}/{len(messages)} сообщений")
        return False


if __name__ == "__main__":
    main()
