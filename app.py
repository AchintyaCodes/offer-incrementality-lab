"""
Offer Incrementality Lab — Streamlit dashboard.

Run:  streamlit run app.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

sys.path.insert(0, str(Path(__file__).parent))
from src.data_loader import download, load
from src.experiment_analysis import (
    achieved_power,
    check_balance,
    conversion_lift,
    minimum_detectable_effect,
    revenue_lift_bootstrap,
    roi_analysis,
)
from src.uplift_model import fit_t_learner, qini_curve, top_n_gain

st.set_page_config(
    page_title="Offer Incrementality Lab",
    page_icon="🧪",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
        .metric-box {
            background: #f0f4ff;
            border-radius: 10px;
            padding: 18px 24px;
            margin-bottom: 10px;
        }
        .sig-badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        .sig-yes { background:#d4edda; color:#155724; }
        .sig-no  { background:#f8d7da; color:#721c24; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.sidebar.title("⚙️ Settings")
cost_per_email = st.sidebar.slider("Cost per email (USD)", 0.01, 1.00, 0.10, 0.01)
margin = st.sidebar.slider("Revenue margin", 0.10, 0.80, 0.40, 0.05)
alpha = st.sidebar.selectbox("Significance level (α)", [0.05, 0.01, 0.10], index=0)
top_pct = st.sidebar.slider("Uplift targeting: top %", 5, 50, 20, 5) / 100

st.sidebar.markdown("---")
st.sidebar.markdown(
    "**Dataset:** Hillstrom MineThatData (2008)  \n"
    "64,000 customers · 3 groups · 2-week window  \n"
    "[Source](http://www.minethatdata.com/)"
)


@st.cache_data(show_spinner="Downloading Hillstrom dataset …")
def get_data() -> pd.DataFrame:
    try:
        download()
    except Exception:
        pass
    return load()


df = get_data()

st.title("🧪 Offer Incrementality Lab")
st.caption(
    "Randomised e-mail experiment analysis · Hillstrom MineThatData (2008) · "
    "64,000 customers across men's email, women's email and no-email control"
)

tabs = st.tabs([
    "📊 Overview",
    "⚖️ Balance Check",
    "📈 Lift Analysis",
    "💰 ROI",
    "🎯 Uplift Targeting",
    "📄 Recommendation",
])

with tabs[0]:
    st.subheader("Experiment at a Glance")
    grp = df.groupby("group").agg(
        customers=("conversion", "count"),
        conversions=("conversion", "sum"),
        total_spend=("spend", "sum"),
        visitors=("visit", "sum"),
    )
    grp["conv_rate"] = (grp["conversions"] / grp["customers"] * 100).round(2)
    grp["avg_spend"] = (grp["total_spend"] / grp["customers"]).round(2)
    grp = grp.reset_index()

    c1, c2, c3 = st.columns(3)
    for i, row in grp.iterrows():
        col = [c1, c2, c3][i % 3]
        with col:
            label = {"mens_email": "Men's Email", "womens_email": "Women's Email", "no_email": "No Email (control)"}[row["group"]]
            st.metric(f"**{label}**", f"{row['customers']:,} customers")
            st.metric("Conversion rate", f"{row['conv_rate']}%")
            st.metric("Avg spend / customer", f"${row['avg_spend']:.2f}")

    fig = px.bar(
        grp, x="group", y="conv_rate",
        color="group",
        color_discrete_map={"mens_email": "#4361ee", "womens_email": "#f72585", "no_email": "#adb5bd"},
        labels={"conv_rate": "Conversion rate (%)", "group": "Group"},
        title="Conversion Rate by Arm",
        text_auto=".2f",
    )
    st.plotly_chart(fig, use_container_width=True)

with tabs[1]:
    st.subheader("Randomisation Quality — Covariate Balance")
    balance = check_balance(df)
    bal_disp = balance.copy()
    bal_disp["result"] = bal_disp["balanced"].map({True: "✅ Balanced", False: "❌ Imbalanced"})
    st.dataframe(bal_disp[["feature", "test", "stat", "p_value", "result"]], use_container_width=True)

with tabs[2]:
    st.subheader("Conversion & Revenue Lift")
    results_conv = []
    results_rev = []
    for t in ["mens_email", "womens_email"]:
        results_conv.append(conversion_lift(df, t, alpha=alpha))
        results_rev.append(revenue_lift_bootstrap(df, t, alpha=alpha))

    n_arm = min(df["group"].value_counts())
    baseline = df[df["group"] == "no_email"]["conversion"].mean()
    mde = minimum_detectable_effect(n_arm, baseline, alpha=alpha)
    col1, col2, col3 = st.columns(3)
    col1.metric("Customers per arm (min)", f"{n_arm:,}")
    col2.metric("MDE (absolute lift)", f"{mde*100:.3f} pp")
    col3.metric("Baseline conversion", f"{baseline*100:.2f}%")

    for r in results_conv:
        label = r.treatment.replace("_", " ").title()
        power = achieved_power(df[df["group"] == r.treatment].shape[0], r.control_rate, r.absolute_lift, alpha=alpha)
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Control conv. rate", f"{r.control_rate*100:.2f}%")
        c2.metric("Treatment conv. rate", f"{r.treatment_rate*100:.2f}%")
        c3.metric("Absolute lift", f"{r.absolute_lift*100:+.2f} pp")
        c4.metric("p-value", f"{r.p_value:.4f}")
        st.markdown("---")

with tabs[3]:
    st.subheader("Campaign ROI")
    for t in ["mens_email", "womens_email"]:
        roi = roi_analysis(df, t, cost_per_email=cost_per_email, revenue_margin=margin)
        label = t.replace("_", " ").title()
        st.markdown(f"#### {label} — {'✅ Profitable' if roi['profitable'] else '❌ Loss-making'}")
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Emails sent", f"{roi['n_treated']:,}")
        c2.metric("Incremental revenue", f"${roi['incremental_revenue_usd']:,.0f}")
        c3.metric("Net profit", f"${roi['net_profit_usd']:,.0f}")
        c4.metric("ROI", f"{roi['roi_pct']:+.1f}%")
        st.markdown("---")

with tabs[4]:
    st.subheader("Uplift Targeting with T-Learner")
    treatment_choice = st.selectbox("Treatment arm", ["mens_email", "womens_email"])
    with st.spinner("Training T-Learner …"):
        result = fit_t_learner(df, treatment=treatment_choice)
    test_df = result["test_df"]
    gain = top_n_gain(test_df, top_pct=top_pct)
    qini = qini_curve(test_df)
    c1, c2, c3 = st.columns(3)
    c1.metric(f"Top {top_pct*100:.0f}% targeted (n)", f"{gain['n_targeted']:,}")
    c2.metric("Lift — targeted only", f"{gain['lift_targeted']*100:.2f} pp" if gain["lift_targeted"] else "N/A")
    c3.metric("Gain vs. blanket send", f"{gain['gain_vs_blanket_pct']:+.1f}%" if gain["gain_vs_blanket_pct"] else "N/A")
    fig = px.line(qini, x="pct_targeted", y="qini", title="Qini Curve")
    st.plotly_chart(fig, use_container_width=True)

with tabs[5]:
    st.subheader("📄 One-Page Marketing Recommendation")
    mens_conv = conversion_lift(df, "mens_email", alpha=alpha)
    womens_conv = conversion_lift(df, "womens_email", alpha=alpha)
    mens_roi = roi_analysis(df, "mens_email", cost_per_email=cost_per_email, revenue_margin=margin)
    womens_roi = roi_analysis(df, "womens_email", cost_per_email=cost_per_email, revenue_margin=margin)
    st.markdown(f"""
## E-mail Campaign Recommendation

### Men's Email Campaign
- Conversion lift: **{mens_conv.absolute_lift*100:+.2f} pp** (p={mens_conv.p_value:.4f}, {'significant' if mens_conv.significant else 'not significant'})
- ROI at ${cost_per_email:.2f}/email: **{mens_roi['roi_pct']:+.1f}%** → {'Profitable ✅' if mens_roi['profitable'] else 'Loss-making ❌'}

### Women's Email Campaign
- Conversion lift: **{womens_conv.absolute_lift*100:+.2f} pp** (p={womens_conv.p_value:.4f}, {'significant' if womens_conv.significant else 'not significant'})
- ROI at ${cost_per_email:.2f}/email: **{womens_roi['roi_pct']:+.1f}%** → {'Profitable ✅' if womens_roi['profitable'] else 'Loss-making ❌'}
""")
