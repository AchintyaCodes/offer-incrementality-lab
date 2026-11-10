"""
Download and load the Hillstrom MineThatData e-mail analytics dataset.

64,000 customers split into three groups:
  - mens_email  : received men's clothing email
  - womens_email: received women's clothing email
  - no_email    : control group

Outcome variables: visit, conversion, spend (over the 2-week window).
"""

from __future__ import annotations

import io
import os
import zipfile
from pathlib import Path

import pandas as pd
import requests

HILLSTROM_URL = (
    "http://www.minethatdata.com/"
    "Kevin_Hillstrom_MineThatData_E-MailAnalytics_DataMiningChallenge_2008.03.20.csv"
)
LOCAL_PATH = Path(__file__).parent.parent / "data" / "hillstrom.csv"


def download(force: bool = False) -> Path:
    LOCAL_PATH.parent.mkdir(parents=True, exist_ok=True)
    if LOCAL_PATH.exists() and not force:
        return LOCAL_PATH
    print("Downloading Hillstrom dataset …")
    r = requests.get(HILLSTROM_URL, timeout=60)
    r.raise_for_status()
    LOCAL_PATH.write_bytes(r.content)
    print(f"Saved to {LOCAL_PATH}")
    return LOCAL_PATH


def load(path: Path | None = None) -> pd.DataFrame:
    """Return the dataset with clean column names and a group label column."""
    p = path or download()
    df = pd.read_csv(p)
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    # Recode segment into readable labels
    segment_map = {
        "Mens E-Mail": "mens_email",
        "Womens E-Mail": "womens_email",
        "No E-Mail": "no_email",
    }
    df["group"] = df["segment"].map(segment_map).fillna(df["segment"])

    # Binary treatment flag  (1 = received any email)
    df["treated"] = (df["group"] != "no_email").astype(int)

    return df
