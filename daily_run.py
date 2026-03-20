#!/usr/bin/env python3
"""
Daily Job Radar — Ежедневный запуск
1. Парсит вакансии (scraper.py)
2. Обновляет data/live-jobs.js
3. Отправляет дайджест в Telegram канал

Запуск вручную:  python3 daily_run.py
Автозапуск (cron): см. инструкцию ниже

Как настроить автозапуск каждый день в 9:00:
  crontab -e
  добавить строку:
  0 9 * * * cd /Users/lizaterina/Liza_Coursor_Lesson1/projects/fractional-job-finder && /usr/bin/python3 daily_run.py >> logs/daily.log 2>&1
"""

import os
import sys
import subprocess
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)


def run_step(label, script):
    print(f"\n{'='*50}")
    print(f"▶ {label}")
    print(f"{'='*50}")
    result = subprocess.run(
        [sys.executable, os.path.join(BASE_DIR, script)],
        cwd=BASE_DIR,
    )
    return result.returncode == 0


def main():
    start = datetime.now()
    print(f"🚀 Jobs Radar — ежедневный запуск")
    print(f"   {start.strftime('%d.%m.%Y %H:%M')}")

    # Шаг 1: Парсинг
    ok = run_step("Парсинг вакансий (scraper.py)", "scraper.py")
    if not ok:
        print("\n❌ Парсинг завершился с ошибкой. Дайджест не отправляем.")
        sys.exit(1)

    # Шаг 2: Отправка в Telegram
    ok = run_step("Отправка дайджеста в Telegram (send_telegram.py)", "send_telegram.py")
    if not ok:
        print("\n⚠️  Дайджест не отправлен. Проверь TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env")
        sys.exit(1)

    elapsed = (datetime.now() - start).seconds
    print(f"\n{'='*50}")
    print(f"✅ Готово за {elapsed} сек.")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
