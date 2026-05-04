#!/usr/bin/env python3
"""Query workout entries from the past year and export a monthly bar chart."""

import os
import sys
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2-binary...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.ticker as ticker
except ImportError:
    print("Installing matplotlib...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "matplotlib"])
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.ticker as ticker

try:
    from dotenv import load_dotenv
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "python-dotenv"])
    from dotenv import load_dotenv


def load_database_url():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: DATABASE_URL not found in .env or environment.", file=sys.stderr)
        sys.exit(1)
    return url


def query_monthly_workouts(database_url: str) -> dict[str, int]:
    # Strip channel_binding param — psycopg2 doesn't understand it
    parsed = urlparse(database_url)
    params = parse_qs(parsed.query)
    params.pop("channel_binding", None)
    from urllib.parse import urlencode, urlunparse
    clean_query = urlencode({k: v[0] for k, v in params.items()})
    clean_url = urlunparse(parsed._replace(query=clean_query))

    conn = psycopg2.connect(clean_url)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    TO_CHAR(DATE_TRUNC('month', logged_at), 'YYYY-MM') AS month,
                    COUNT(*) AS workout_count
                FROM workouts
                WHERE logged_at >= NOW() - INTERVAL '1 year'
                GROUP BY month
                ORDER BY month
            """)
            return {row[0]: int(row[1]) for row in cur.fetchall()}
    finally:
        conn.close()


def fill_missing_months(data: dict[str, int]) -> tuple[list[str], list[int]]:
    """Ensure all 12 months in the range are represented, even if zero."""
    from datetime import date
    import calendar

    today = date.today()
    months = []
    for i in range(11, -1, -1):
        month_offset = (today.month - 1 - i) % 12 + 1
        year_offset = today.year - ((i - (today.month - 1)) // 12 + (1 if i >= today.month else 0))
        d = date(year_offset, month_offset, 1)
        months.append(d.strftime("%Y-%m"))

    labels = [datetime.strptime(m, "%Y-%m").strftime("%b %Y") for m in months]
    counts = [data.get(m, 0) for m in months]
    return labels, counts


def plot_chart(labels: list[str], counts: list[int], output_path: str):
    fig, ax = plt.subplots(figsize=(12, 6))

    bars = ax.bar(labels, counts, color="#4F86C6", edgecolor="white", linewidth=0.5)

    # Value labels on top of each bar
    for bar, count in zip(bars, counts):
        if count > 0:
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.15,
                str(count),
                ha="center", va="bottom",
                fontsize=9, color="#333333"
            )

    ax.set_xlabel("Month", fontsize=12, labelpad=10)
    ax.set_ylabel("Number of Workouts", fontsize=12, labelpad=10)
    ax.set_title("Workouts per Month (Past Year)", fontsize=14, fontweight="bold", pad=15)
    ax.yaxis.set_major_locator(ticker.MaxNLocator(integer=True))
    ax.set_ylim(bottom=0)
    plt.xticks(rotation=30, ha="right", fontsize=9)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", linestyle="--", alpha=0.4)

    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    print(f"Chart saved to: {output_path}")


def main():
    output_path = sys.argv[1] if len(sys.argv) > 1 else "workout_chart.png"

    database_url = load_database_url()
    print("Querying workout data...")
    monthly_data = query_monthly_workouts(database_url)

    if not monthly_data:
        print("No workout entries found in the past year.")

    labels, counts = fill_missing_months(monthly_data)
    plot_chart(labels, counts, output_path)


if __name__ == "__main__":
    main()
