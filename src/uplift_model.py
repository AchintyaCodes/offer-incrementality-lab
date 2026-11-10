"""
T-Learner uplift model using XGBoost.

Trains one model per treatment arm to estimate the Conditional Average
Treatment Effect (CATE): E[Y(1) - Y(0) | X].
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

try:
    from xgboost import XGBClassifier
    _XGB_AVAILABLE = True
except ImportError:
    _XGB_AVAILABLE = False

FEATURES = ["recency", "history", "mens", "womens", "newbie", "channel", "zip_code"]
TARGET = "conversion"


def _encode_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for col in ["channel", "zip_code"]:
        if col in out.columns:
            out[col] = LabelEncoder().fit_transform(out[col].astype(str))
    return out


def fit_t_learner(
    df: pd.DataFrame,
    treatment: str = "mens_email",
    control: str = "no_email",
    test_size: float = 0.2,
    seed: int = 42,
) -> dict:
    subset = df[df["group"].isin([treatment, control])].copy()
    subset = _encode_categoricals(subset)

    features_avail = [f for f in FEATURES if f in subset.columns]
    X = subset[features_avail]
    y = subset[TARGET]
    t = (subset["group"] == treatment).astype(int)

    X_train, X_test, y_train, y_test, t_train, t_test = train_test_split(
        X, y, t, test_size=test_size, random_state=seed, stratify=t
    )

    if _XGB_AVAILABLE:
        model_cls = XGBClassifier(
            n_estimators=300,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="logloss",
            random_state=seed,
            verbosity=0,
        )
    else:
        from sklearn.linear_model import LogisticRegression
        model_cls = LogisticRegression(max_iter=1000, random_state=seed)

    idx_t = t_train == 1
    m1 = type(model_cls)(**model_cls.get_params()) if _XGB_AVAILABLE else type(model_cls)(max_iter=1000)
    m1.fit(X_train[idx_t], y_train[idx_t])

    idx_c = t_train == 0
    m0 = type(model_cls)(**model_cls.get_params()) if _XGB_AVAILABLE else type(model_cls)(max_iter=1000)
    m0.fit(X_train[idx_c], y_train[idx_c])

    p1 = m1.predict_proba(X_test)[:, 1]
    p0 = m0.predict_proba(X_test)[:, 1]
    cate = p1 - p0

    test_df = X_test.copy()
    test_df["y"] = y_test.values
    test_df["treatment"] = t_test.values
    test_df["cate"] = cate
    test_df["p1"] = p1
    test_df["p0"] = p0

    return {
        "model_treated": m1,
        "model_control": m0,
        "test_df": test_df,
        "feature_names": features_avail,
    }


def qini_curve(test_df: pd.DataFrame, n_bins: int = 20) -> pd.DataFrame:
    df = test_df.sort_values("cate", ascending=False).reset_index(drop=True)
    df["bin"] = pd.qcut(df.index, n_bins, labels=False)

    rows = []
    for b in range(n_bins + 1):
        sub = df[df["bin"] < b] if b > 0 else pd.DataFrame()
        if sub.empty:
            rows.append(dict(pct_targeted=0, qini=0, random_qini=0))
            continue
        n_t = (sub["treatment"] == 1).sum()
        n_c = (sub["treatment"] == 0).sum()
        conv_t = sub.loc[sub["treatment"] == 1, "y"].sum()
        conv_c = sub.loc[sub["treatment"] == 0, "y"].sum()

        n_t_total = (df["treatment"] == 1).sum()
        qini_val = conv_t - conv_c * (n_t / n_c) if n_c > 0 else conv_t
        rows.append(dict(
            pct_targeted=len(sub) / len(df) * 100,
            qini=qini_val,
            random_qini=qini_val * len(sub) / len(df),
        ))

    return pd.DataFrame(rows)


def top_n_gain(test_df: pd.DataFrame, top_pct: float = 0.20) -> dict:
    df = test_df.sort_values("cate", ascending=False).reset_index(drop=True)
    n_top = max(1, int(len(df) * top_pct))
    top = df.iloc[:n_top]
    all_ = df

    def _auc(sub: pd.DataFrame) -> float:
        t = sub[sub["treatment"] == 1]
        c = sub[sub["treatment"] == 0]
        if len(t) == 0 or len(c) == 0:
            return float("nan")
        return t["y"].mean() - c["y"].mean()

    lift_top = _auc(top)
    lift_all = _auc(all_)

    return {
        "top_pct": top_pct,
        "n_targeted": n_top,
        "lift_targeted": round(lift_top, 4) if not np.isnan(lift_top) else None,
        "lift_blanket": round(lift_all, 4) if not np.isnan(lift_all) else None,
        "gain_vs_blanket_pct": (
            round((lift_top - lift_all) / lift_all * 100, 1)
            if (not np.isnan(lift_top) and not np.isnan(lift_all) and lift_all != 0)
            else None
        ),
    }
