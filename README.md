# Offer Incrementality Lab

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat&logo=python&logoColor=white)
![Streamlit](https://img.shields.io/badge/Streamlit-1.35-FF4B4B?style=flat&logo=streamlit&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-2.0-189AB4?style=flat)
![SciPy](https://img.shields.io/badge/SciPy-1.11-8CAAE6?style=flat&logo=scipy&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3-F7931E?style=flat&logo=scikit-learn&logoColor=white)

> **Portfolio project** — end-to-end A/B test analysis on the [Hillstrom MineThatData](http://www.minethatdata.com/) e-mail experiment.  
> All results characterise this **public, anonymised dataset** only. Not attributable to any real business.

---

## What this is

A complete experiment analysis pipeline covering every step a data scientist would run on a real marketing campaign: randomisation validation, statistical significance testing, confidence intervals, power analysis, ROI modelling, and uplift targeting — packaged as an interactive Streamlit dashboard with a downloadable one-page recommendation.

Maps directly to **MAF SHARE loyalty / experimentation** use cases: campaign incrementality measurement, targeting optimisation, and marketing ROI.

---

## Live results (measured on the Hillstrom dataset)

| Metric | Men's Email | Women's Email |
|---|---|---|
| Customers | 21,307 | 21,387 |
| Baseline conversion rate | 0.57% | 0.57% |
| **Conversion lift** | **+0.68 pp** | **+0.31 pp** |
| 95% CI | [+0.50, +0.86] pp | [+0.15, +0.47] pp |
| p-value | < 0.0001 ✅ | 0.0002 ✅ |
| **Revenue lift / customer** | **+$0.77** | **+$0.42** |
| Revenue 95% CI (bootstrap) | [$0.48, $1.05] | [$0.15, $0.69] |
| **ROI at $0.10/email** | **+208%** | **+70%** |
| All 7 covariates balanced | ✅ | ✅ |

**Uplift targeting (T-Learner, top-40% by CATE): +67.5% gain in conversion lift vs. blanket send at 60% lower send volume.**

---

## Architecture

```mermaid
graph TD
    A[Hillstrom CSV<br/>64,000 customers] --> B[data_loader.py<br/>Download + normalise]
    B --> C{3 Arms}
    C --> D[Men's Email<br/>n=21,307]
    C --> E[Women's Email<br/>n=21,387]
    C --> F[Control / No Email<br/>n=21,306]

    D & E & F --> G[experiment_analysis.py]
    G --> G1[Balance Check<br/>χ² + Kruskal-Wallis]
    G --> G2[Conversion Lift<br/>Two-proportion z-test]
    G --> G3[Revenue Lift<br/>Bootstrap 2,000 draws]
    G --> G4[Power Analysis<br/>MDE + achieved power]
    G --> G5[ROI Analysis<br/>Incremental revenue × margin − cost]

    D & E & F --> H[uplift_model.py<br/>T-Learner XGBoost]
    H --> H1[Model on treated arm]
    H --> H2[Model on control arm]
    H1 & H2 --> H3[CATE = P1 − P0<br/>per customer]
    H3 --> H4[Qini curve]
    H3 --> H5[Top-N targeting gain]

    G1 & G2 & G3 & G4 & G5 & H4 & H5 --> I[Streamlit Dashboard<br/>6 tabs]
    I --> J[One-page Recommendation<br/>Downloadable Markdown]
```

---

## Analysis pipeline

```mermaid
flowchart LR
    subgraph DATA["① Data"]
        A1[Download CSV] --> A2[Normalise columns]
        A2 --> A3[Recode segment labels]
    end

    subgraph VALIDATE["② Validate randomisation"]
        B1[χ² on categorical<br/>covariates] --> B2{All p > 0.05?}
        B3[Kruskal-Wallis on<br/>numeric covariates] --> B2
        B2 -->|Yes| B4[✅ Clean experiment]
        B2 -->|No| B5[⚠️ Interpret with caution]
    end

    subgraph MEASURE["③ Measure lift"]
        C1[Conversion rate lift<br/>z-test + Newcombe CI]
        C2[Revenue lift<br/>Bootstrap CI]
        C3[Power analysis<br/>MDE at 80% power]
    end

    subgraph ROI["④ Business value"]
        D1[Incremental revenue<br/>= lift × n_treated]
        D2[Net profit<br/>= inc_rev × margin − cost]
        D3[ROI sensitivity<br/>over cost range]
    end

    subgraph TARGETING["⑤ Optimise targeting"]
        E1[T-Learner: fit XGBoost<br/>on treated + control]
        E2[CATE per customer]
        E3[Rank by CATE]
        E4[Qini curve + top-N gain]
    end

    DATA --> VALIDATE --> MEASURE --> ROI --> TARGETING
```

---

## Project structure

```
offer-incrementality-lab/
│
├── app.py                          # Streamlit dashboard (6 tabs)
│   ├── Tab 1: Overview             # Group sizes, conversion rates, spend
│   ├── Tab 2: Balance Check        # Covariate balance table + result
│   ├── Tab 3: Lift Analysis        # Conversion + revenue lift with CI charts
│   ├── Tab 4: ROI                  # Campaign profitability + sensitivity slider
│   ├── Tab 5: Uplift Targeting     # T-Learner Qini curve + CATE histogram
│   └── Tab 6: Recommendation       # Downloadable one-page marketing memo
│
├── src/
│   ├── data_loader.py              # Download + normalise Hillstrom CSV
│   ├── experiment_analysis.py      # Balance, lift, power, ROI functions
│   └── uplift_model.py             # T-Learner, Qini curve, top-N gain
│
├── data/
│   └── hillstrom.csv               # Auto-downloaded on first run (~2 MB)
│
└── requirements.txt
```

---

## Tech stack

| Layer | Library | Why |
|---|---|---|
| Statistical testing | `scipy.stats` | Two-proportion z-test, Kruskal-Wallis, Newcombe CI |
| Revenue CI | `numpy` bootstrap | 2,000-draw bootstrap for non-normal spend distribution |
| Uplift model | `xgboost`, `scikit-learn` | T-Learner CATE estimation |
| Dashboard | `streamlit`, `plotly` | Interactive 6-tab analysis app |
| Data | `pandas` | Group aggregations, feature engineering |

---

## Run locally

```bash
git clone https://github.com/AchintyaCodes/offer-incrementality-lab
cd offer-incrementality-lab
pip install -r requirements.txt
streamlit run app.py
# Dataset downloads automatically (~2 MB)
```

---

## Resume bullet

> Analysed a 64,000-customer randomised email experiment (Hillstrom dataset): men's email conversion lift **+0.68 pp** (95% CI [+0.50, +0.86], p < 0.0001) and revenue lift **+$0.77/customer**. T-Learner uplift targeting of the top 40% of customers by CATE raised campaign ROI by **+68%** vs. blanket sending at 60% lower send volume — packaged as a one-page recommendation for marketing.

---

## Skills demonstrated

`A/B testing` · `power analysis` · `bootstrap confidence intervals` · `two-proportion z-test` · `uplift modelling` · `T-Learner` · `Qini curve` · `XGBoost` · `scikit-learn` · `Streamlit` · `Plotly` · `statistical analysis` · `experimentation` · `marketing analytics`

---

*Built by [Achintya Gupta](https://github.com/AchintyaCodes) · Data Science & Engineering, MIT Manipal*
