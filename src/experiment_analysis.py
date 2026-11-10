"""
Core A/B test analysis functions.

Covers:
  1. Balance check (chi-square on categorical features, t-test on numerics)
  2. Conversion-rate lift with Wilson CI
  3. Revenue lift with bootstrap CI
  4. Minimum detectable effect & retrospective power
  5. ROI analysis at an assumed cost per email
"""

from __future__ import annotations

from typing import NamedTuple

import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import chi2_contingency, norm


def check_balance(df: pd.DataFrame, treatment_col: str = "group") -> pd.DataFrame:
    rows = []
    covariates_cat = ["history_segment", "zip_code", "channel"]
    covariates_num = ["history", "mens", "womens", "newbie"]

    for feat in covariates_cat:
        if feat not in df.columns:
            continue
        ct = pd.crosstab(df[feat], df[treatment_col])
        chi2, p, *_ = chi2_contingency(ct)
        rows.append(dict(feature=feat, test="chi2", stat=round(chi2, 3), p_value=round(p, 4)))

    for feat in covariates_num:
        if feat not in df.columns:
            continue
        groups = [g[feat].dropna().values for _, g in df.groupby(treatment_col)]
        stat, p = stats.kruskal(*groups)
        rows.append(dict(feature=feat, test="kruskal", stat=round(stat, 3), p_value=round(p, 4)))

    result = pd.DataFrame(rows)
    result["balanced"] = result["p_value"] > 0.05
    return result


class LiftResult(NamedTuple):
    treatment: str
    control: str
    metric: str
    treatment_rate: float
    control_rate: float
    absolute_lift: float
    relative_lift_pct: float
    ci_lower: float
    ci_upper: float
    p_value: float
    significant: bool


def _wilson_ci(successes: int, n: int, z: float = 1.96) -> tuple[float, float]:
    p_hat = successes / n
    denom = 1 + z**2 / n
    centre = (p_hat + z**2 / (2 * n)) / denom
    margin = z * np.sqrt(p_hat * (1 - p_hat) / n + z**2 / (4 * n**2)) / denom
    return max(0.0, centre - margin), min(1.0, centre + margin)


def conversion_lift(
    df: pd.DataFrame,
    treatment: str,
    control: str = "no_email",
    metric: str = "conversion",
    alpha: float = 0.05,
) -> LiftResult:
    t_df = df[df["group"] == treatment]
    c_df = df[df["group"] == control]

    t_conv = int(t_df[metric].sum())
    c_conv = int(c_df[metric].sum())
    t_n = len(t_df)
    c_n = len(c_df)

    t_rate = t_conv / t_n
    c_rate = c_conv / c_n
    abs_lift = t_rate - c_rate
    rel_lift = abs_lift / c_rate * 100 if c_rate > 0 else np.nan

    pooled_p = (t_conv + c_conv) / (t_n + c_n)
    se = np.sqrt(pooled_p * (1 - pooled_p) * (1 / t_n + 1 / c_n))
    z_stat = abs_lift / se if se > 0 else 0.0
    p_val = 2 * (1 - norm.cdf(abs(z_stat)))

    z_crit = norm.ppf(1 - alpha / 2)
    se_diff = np.sqrt(t_rate * (1 - t_rate) / t_n + c_rate * (1 - c_rate) / c_n)
    ci_lo = abs_lift - z_crit * se_diff
    ci_hi = abs_lift + z_crit * se_diff

    return LiftResult(
        treatment=treatment,
        control=control,
        metric=metric,
        treatment_rate=round(t_rate, 4),
        control_rate=round(c_rate, 4),
        absolute_lift=round(abs_lift, 4),
        relative_lift_pct=round(rel_lift, 2),
        ci_lower=round(ci_lo, 4),
        ci_upper=round(ci_hi, 4),
        p_value=round(p_val, 4),
        significant=p_val < alpha,
    )


def revenue_lift_bootstrap(
    df: pd.DataFrame,
    treatment: str,
    control: str = "no_email",
    metric: str = "spend",
    n_bootstrap: int = 2000,
    alpha: float = 0.05,
    seed: int = 42,
) -> dict:
    rng = np.random.default_rng(seed)
    t_vals = df.loc[df["group"] == treatment, metric].values
    c_vals = df.loc[df["group"] == control, metric].values

    obs_lift = t_vals.mean() - c_vals.mean()

    boot_lifts = np.array([
        rng.choice(t_vals, len(t_vals), replace=True).mean()
        - rng.choice(c_vals, len(c_vals), replace=True).mean()
        for _ in range(n_bootstrap)
    ])

    ci_lo, ci_hi = np.percentile(boot_lifts, [alpha / 2 * 100, (1 - alpha / 2) * 100])
    p_val = float(np.mean(boot_lifts <= 0)) * 2

    return {
        "treatment": treatment,
        "control": control,
        "metric": metric,
        "treatment_mean": round(float(t_vals.mean()), 4),
        "control_mean": round(float(c_vals.mean()), 4),
        "absolute_lift": round(float(obs_lift), 4),
        "relative_lift_pct": round(float(obs_lift / c_vals.mean() * 100), 2) if c_vals.mean() != 0 else None,
        "ci_lower": round(float(ci_lo), 4),
        "ci_upper": round(float(ci_hi), 4),
        "p_value_approx": round(float(min(p_val, 1.0)), 4),
    }


def minimum_detectable_effect(
    n_per_arm: int,
    baseline_rate: float,
    alpha: float = 0.05,
    power: float = 0.80,
) -> float:
    z_alpha = norm.ppf(1 - alpha / 2)
    z_beta = norm.ppf(power)
    se = np.sqrt(2 * baseline_rate * (1 - baseline_rate) / n_per_arm)
    return (z_alpha + z_beta) * se


def achieved_power(
    n_per_arm: int,
    baseline_rate: float,
    true_lift: float,
    alpha: float = 0.05,
) -> float:
    z_alpha = norm.ppf(1 - alpha / 2)
    se = np.sqrt(2 * baseline_rate * (1 - baseline_rate) / n_per_arm)
    return float(norm.cdf(abs(true_lift) / se - z_alpha))


def roi_analysis(
    df: pd.DataFrame,
    treatment: str,
    control: str = "no_email",
    cost_per_email: float = 0.10,
    revenue_margin: float = 0.40,
) -> dict:
    t_df = df[df["group"] == treatment]
    c_df = df[df["group"] == control]

    t_mean = t_df["spend"].mean()
    c_mean = c_df["spend"].mean()
    n_treated = len(t_df)

    lift_per_customer = t_mean - c_mean
    incremental_revenue = lift_per_customer * n_treated
    incremental_profit = incremental_revenue * revenue_margin
    campaign_cost = cost_per_email * n_treated
    net_profit = incremental_profit - campaign_cost
    roi_pct = net_profit / campaign_cost * 100 if campaign_cost > 0 else np.nan

    return {
        "treatment": treatment,
        "n_treated": n_treated,
        "lift_per_customer_usd": round(lift_per_customer, 4),
        "incremental_revenue_usd": round(incremental_revenue, 2),
        "incremental_profit_usd": round(incremental_profit, 2),
        "campaign_cost_usd": round(campaign_cost, 2),
        "net_profit_usd": round(net_profit, 2),
        "roi_pct": round(roi_pct, 1),
        "profitable": net_profit > 0,
    }
