import os

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st


st.set_page_config(
    page_title="LifeFS Insurance Intelligence Platform",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    .stApp { background-color: #0e1117; color: #e2e8f0; }
    [data-testid="stMetric"] {
        background-color: #1a1c24;
        border-left: 5px solid #3182ce;
        padding: 1.1rem !important;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    }
    [data-testid="stMetricLabel"] > div { color: #a0aec0 !important; font-size: 0.88rem !important; }
    [data-testid="stMetricValue"] > div { color: #63b3ed !important; font-size: 1.55rem !important; font-weight: 700 !important; }
    .main-header {
        color: #ffffff;
        font-weight: 800;
        font-size: 2.15rem;
        margin-bottom: 0.2rem;
        background: linear-gradient(90deg, #3182ce, #63b3ed);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .sub-header {
        color: #a0aec0;
        font-weight: 400;
        font-size: 1rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid #2d3748;
        padding-bottom: 1rem;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 4px;
        background-color: #1a1c24;
        padding: 8px 8px 0 8px;
        border-radius: 8px 8px 0 0;
    }
    .stTabs [data-baseweb="tab"] {
        color: #a0aec0;
        padding: 8px 14px;
        font-weight: 500;
        border-radius: 4px 4px 0 0;
    }
    .stTabs [aria-selected="true"] { color: #ffffff !important; background-color: #3182ce !important; }
    .stDataFrame { border-radius: 8px; overflow: hidden; }
    </style>
    """,
    unsafe_allow_html=True,
)


COMPANY_MAPPING = {
    "THAI LIFE": "TLI",
    "BANGKOK LIFE": "BLA",
    "FWD": "FWD",
    "KRUNGTHAI AXA": "KTAL",
    "ALLIANZ AYUDHYA": "AZAY",
    "TOKIO MARINE": "TMLTH",
    "CHUBB LIFE": "CHUBB",
    "BUI LIFE": "BUILIFE",
    "SOUTHEAST LIFE": "SELIFE",
    "THAIRE LIFE": "THAIRE",
}


@st.cache_data
def load_and_standardize_data():
    base_path = os.path.dirname(__file__)
    try:
        df_base = pd.read_csv(os.path.join(base_path, "dashboard_data.csv"))
        df_adv = pd.read_csv(os.path.join(base_path, "advanced_financials.csv"))
        df_act = pd.read_csv(os.path.join(base_path, "actuarial_metrics.csv"))
        df_tech = pd.read_csv(os.path.join(base_path, "ifrs17_technical_detail.csv"))
    except Exception as exc:
        st.error(f"Critical data load error: {exc}")
        st.stop()

    def normalize(df):
        df = df.copy()
        df["company_name"] = df["company_name"].str.strip().str.upper().replace(COMPANY_MAPPING)
        return df

    df_base = normalize(df_base)
    df_adv = normalize(df_adv)
    df_act = normalize(df_act)
    df_tech = normalize(df_tech)

    m = pd.merge(df_base, df_adv, on="company_name", how="left")
    m = pd.merge(m, df_act, on="company_name", how="left")
    m = pd.merge(m, df_tech, on="company_name", how="left")

    numeric_cols = m.select_dtypes(include=["float64", "int64"]).columns
    m[numeric_cols] = m[numeric_cols].apply(pd.to_numeric, errors="coerce")

    premium_thb = m["MTD_total_premium"] * 1e6
    equity = m["total_equity_2025_thb"].fillna(m["FS_total_equity_thb"])

    m["underwriting_margin"] = (m["insurance_service_result_thb"] / m["insurance_revenue_2025_thb"]) * 100
    m["revenue_growth"] = ((m["insurance_revenue_2025_thb"] - m["insurance_revenue_2024_thb"]) / m["insurance_revenue_2024_thb"]) * 100
    m["roe"] = (m["FS_net_profit_loss_thb"] / equity) * 100
    m["net_uw_margin"] = ((m["insurance_service_result_thb"].fillna(0) + m["net_reinsurance_thb"].fillna(0)) / m["insurance_revenue_2025_thb"]) * 100

    m["claims_ratio"] = (m["incurred_claims_exp_thb"] / m["insurance_revenue_2025_thb"]) * 100
    m["acq_cost_ratio"] = (m["iacf_amort_thb"] / m["insurance_revenue_2025_thb"]) * 100
    m["opex_ratio"] = ((m["admin_expenses_thb"].fillna(0) + m["marketing_expenses_thb"].fillna(0)) / m["insurance_revenue_2025_thb"]) * 100
    m["combined_ratio"] = m["claims_ratio"] + m["acq_cost_ratio"] + m["opex_ratio"]
    m["reinsurance_cost_ratio"] = (m["net_reinsurance_thb"] / m["insurance_revenue_2025_thb"]) * 100

    m["csm_rev_pct"] = (m["csm_released_thb"] / m["insurance_revenue_2025_thb"]) * 100
    m["ra_rev_pct"] = (m["ra_released_thb"] / m["insurance_revenue_2025_thb"]) * 100
    m["csm_velocity"] = (m["csm_new_business_thb"] / m["csm_released_thb"]) * 100
    m["csm_equity_ratio"] = (m["csm_closing_thb"] / equity) * 100
    m["onerous_intensity"] = (m["onerous_losses_thb"] / m["insurance_revenue_2025_thb"]) * 100
    m["new_business_csm_margin"] = (m["csm_new_business_thb"] / premium_thb) * 100
    m["adjusted_value_base_thb"] = equity + m["csm_closing_thb"].fillna(0)
    m["csm_value_share"] = (m["csm_closing_thb"] / m["adjusted_value_base_thb"]) * 100
    m["future_profit_cover_years"] = m["csm_closing_thb"] / m["insurance_service_result_thb"].replace(0, np.nan)

    m["equity_ratio"] = (equity / m["FS_total_assets_thb"]) * 100
    m["liability_to_equity"] = m["FS_total_liabilities_thb"] / equity
    m["investment_assets_thb"] = m[["debt_assets_thb", "equity_assets_thb", "real_estate_assets_thb"]].sum(axis=1, min_count=1)
    m["investment_yield_proxy"] = (m["net_investment_income_2025_thb"] / m["investment_assets_thb"]) * 100
    m["asset_risk_intensity"] = ((m["equity_assets_thb"].fillna(0) + m["real_estate_assets_thb"].fillna(0)) / m["investment_assets_thb"]) * 100
    m["investment_income_reliance"] = (m["net_investment_income_2025_thb"] / m["insurance_revenue_2025_thb"]) * 100

    channel_cols = ["agent_premium", "broker_premium", "bancassurance_premium", "tele_marketing_premium", "digital_premium"]
    m["channel_total_premium"] = m[channel_cols].sum(axis=1, min_count=1)
    for col in channel_cols:
        m[col.replace("_premium", "_mix")] = (m[col] / m["channel_total_premium"]) * 100
    mix_cols = [col.replace("_premium", "_mix") for col in channel_cols]
    m["channel_concentration"] = m[mix_cols].fillna(0).div(100).pow(2).sum(axis=1) * 100
    m["banca_dependency"] = m["bancassurance_mix"]
    m["digital_adoption"] = m["digital_mix"]

    m = m.replace([np.inf, -np.inf], np.nan)
    for col in ["MTD_market_share", "MTD_total_premium", "onerous_intensity", "csm_new_business_thb"]:
        if col in m.columns:
            m[col] = m[col].fillna(0.1).clip(lower=0.1)
    return m


def metric_delta(row, avg, metric):
    if metric not in row.index or metric not in avg.index or pd.isna(row[metric]) or pd.isna(avg[metric]):
        return np.nan
    return row[metric] - avg[metric]


def format_pct(value, digits=1):
    if pd.isna(value):
        return "n/a"
    return f"{value:.{digits}f}%"


def format_x(value, digits=1):
    if pd.isna(value):
        return "n/a"
    return f"{value:.{digits}f}x"


def format_b(value, digits=1):
    if pd.isna(value):
        return "n/a"
    return f"{value / 1e9:.{digits}f}B"


def benchmark_table(data, subject, metrics):
    rows = []
    for label, metric, higher_is_better, fmt in metrics:
        clean = data[["company_name", metric]].dropna().copy()
        if clean.empty or subject not in set(clean["company_name"]):
            continue
        clean["rank"] = clean[metric].rank(ascending=not higher_is_better, method="min")
        subject_row = clean[clean["company_name"] == subject].iloc[0]
        value = subject_row[metric]
        industry = clean[metric].mean()
        percentile = clean[metric].rank(pct=True).loc[clean["company_name"] == subject].iloc[0] * 100
        if not higher_is_better:
            percentile = 100 - percentile + (100 / len(clean))
        rows.append(
            {
                "Metric": label,
                "Company": fmt(value),
                "Industry avg": fmt(industry),
                "Gap": fmt(value - industry),
                "Rank": f"{int(subject_row['rank'])} / {len(clean)}",
                "Percentile": f"{percentile:.0f}",
            }
        )
    return pd.DataFrame(rows)


df = load_and_standardize_data()

st.sidebar.title("LifeFS Intel v7.0")
st.sidebar.markdown("*Life insurance benchmarking mode*")

subject_company = st.sidebar.selectbox("Target insurer", sorted(df["company_name"].unique()), index=0)
sel_year = st.sidebar.selectbox("Valuation year", sorted(df["year"].unique(), reverse=True))
available_months = sorted(df[df["year"] == sel_year]["month"].unique(), reverse=True)
sel_month = st.sidebar.selectbox("Reporting month", available_months)

f_df = df[(df["year"] == sel_year) & (df["month"] == sel_month)].copy()
if f_df.empty:
    st.error("Selected period contains no data. Please adjust filters.")
    st.stop()

subj_row = f_df[f_df["company_name"] == subject_company]
if subj_row.empty:
    st.warning(f"No specific data for {subject_company} in this period.")
    subj_row = f_df.mean(numeric_only=True)
else:
    subj_row = subj_row.iloc[0]

industry_avg = f_df.mean(numeric_only=True)

st.markdown('<div class="main-header">Life Insurance Intelligence Platform</div>', unsafe_allow_html=True)
st.markdown(
    f'<div class="sub-header">Strategic benchmarking: {subject_company} vs. industry peers | Period ending {sel_month}/{sel_year}</div>',
    unsafe_allow_html=True,
)

k1, k2, k3, k4 = st.columns(4)
k1.metric("Market Share", format_pct(subj_row["MTD_market_share"]), format_pct(metric_delta(subj_row, industry_avg, "MTD_market_share")))
k2.metric("Net Insurance Margin", format_pct(subj_row["net_uw_margin"]), format_pct(metric_delta(subj_row, industry_avg, "net_uw_margin")))
k3.metric("Combined Ratio", format_pct(subj_row["combined_ratio"]), format_pct(metric_delta(subj_row, industry_avg, "combined_ratio")), delta_color="inverse")
k4.metric("CSM Replacement", format_pct(subj_row["csm_velocity"]), format_pct(metric_delta(subj_row, industry_avg, "csm_velocity")))

tabs = st.tabs(
    [
        "Executive Scorecard",
        "Market Growth",
        "Performance Bridge",
        "IFRS 17 Earnings",
        "Future Profit",
        "Capital & Investment",
        "Channel Strategy",
        "Audit Ledger",
    ]
)

with tabs[0]:
    col_l, col_r = st.columns([1, 1.35])
    with col_l:
        st.subheader("Relative Performance Radar")
        radar_metrics = ["net_uw_margin", "roe", "revenue_growth", "csm_velocity", "equity_ratio"]
        radar_labels = ["Net Margin", "ROE", "Growth", "CSM Replacement", "Capital Buffer"]
        subj_vals = []
        for metric in radar_metrics:
            avg = industry_avg.get(metric, np.nan)
            val = subj_row.get(metric, np.nan)
            subj_vals.append(0 if pd.isna(avg) or pd.isna(val) or abs(avg) < 0.1 else np.clip(val / avg, 0, 2))
        fig_radar = go.Figure()
        fig_radar.add_trace(go.Scatterpolar(r=subj_vals, theta=radar_labels, fill="toself", name=subject_company, line_color="#3182ce"))
        fig_radar.add_trace(go.Scatterpolar(r=[1] * 5, theta=radar_labels, fill="none", name="Industry Avg", line_dash="dot", line_color="#718096"))
        fig_radar.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 2])), template="plotly_dark", height=430, margin=dict(t=30, b=30))
        st.plotly_chart(fig_radar, width="stretch")

    with col_r:
        st.subheader("Client Narrative")
        st.markdown(
            f"""
            **Market position:** {subject_company} holds **{format_pct(subj_row.get('MTD_market_share'))}** MTD market share, with insurance revenue growth of **{format_pct(subj_row.get('revenue_growth'))}**.

            **Profitability:** Net insurance margin is **{format_pct(subj_row.get('net_uw_margin'))}**, a gap of **{format_pct(metric_delta(subj_row, industry_avg, 'net_uw_margin'))}** versus the peer average.

            **Efficiency:** Combined ratio is **{format_pct(subj_row.get('combined_ratio'))}**, a gap of **{format_pct(metric_delta(subj_row, industry_avg, 'combined_ratio'))}** versus industry. Lower is better.

            **Future earnings:** CSM replacement is **{format_pct(subj_row.get('csm_velocity'))}**, a gap of **{format_pct(metric_delta(subj_row, industry_avg, 'csm_velocity'))}** versus industry.
            """
        )
        score_metrics = [
            ("Market share", "MTD_market_share", True, format_pct),
            ("Revenue growth", "revenue_growth", True, format_pct),
            ("Net insurance margin", "net_uw_margin", True, format_pct),
            ("Combined ratio", "combined_ratio", False, format_pct),
            ("ROE", "roe", True, format_pct),
            ("CSM replacement", "csm_velocity", True, format_pct),
            ("Onerous intensity", "onerous_intensity", False, format_pct),
        ]
        st.dataframe(benchmark_table(f_df, subject_company, score_metrics), width="stretch", hide_index=True)

with tabs[1]:
    st.subheader("Market Position and Growth Momentum")
    c1, c2 = st.columns(2)
    with c1:
        fig_rank = px.bar(
            f_df.sort_values("MTD_market_share", ascending=True),
            x="MTD_market_share",
            y="company_name",
            orientation="h",
            color="MTD_market_share",
            color_continuous_scale="Blues",
            template="plotly_dark",
            labels={"MTD_market_share": "MTD market share (%)", "company_name": "Company"},
        )
        fig_rank.add_vline(x=industry_avg["MTD_market_share"], line_dash="dot", annotation_text="Industry avg")
        st.plotly_chart(fig_rank, width="stretch")
    with c2:
        fig_matrix = px.scatter(
            f_df.dropna(subset=["net_uw_margin", "revenue_growth"]),
            x="revenue_growth",
            y="net_uw_margin",
            size="MTD_market_share",
            color="company_name",
            text="company_name",
            labels={"revenue_growth": "Insurance revenue growth (%)", "net_uw_margin": "Net insurance margin (%)"},
            template="plotly_dark",
            height=520,
        )
        fig_matrix.add_hline(y=industry_avg["net_uw_margin"], line_dash="dot", annotation_text="Avg margin")
        fig_matrix.add_vline(x=industry_avg["revenue_growth"], line_dash="dot", annotation_text="Avg growth")
        st.plotly_chart(fig_matrix, width="stretch")

with tabs[2]:
    st.subheader("Profitability and Cost Drivers")
    c1, c2 = st.columns(2)
    with c1:
        reins_ratio = subj_row.get("reinsurance_cost_ratio", np.nan)
        fig_bridge = go.Figure(
            go.Waterfall(
                name=subject_company,
                orientation="v",
                measure=["absolute", "relative", "relative", "relative", "relative", "total"],
                x=["Insurance revenue", "Claims", "Acquisition", "OPEX", "Net reinsurance", "Net margin"],
                y=[
                    100,
                    -subj_row.get("claims_ratio", 0),
                    -subj_row.get("acq_cost_ratio", 0),
                    -subj_row.get("opex_ratio", 0),
                    reins_ratio if not pd.isna(reins_ratio) else 0,
                    subj_row.get("net_uw_margin", 0),
                ],
                connector={"line": {"color": "#718096"}},
                increasing={"marker": {"color": "#38a169"}},
                decreasing={"marker": {"color": "#e53e3e"}},
                totals={"marker": {"color": "#3182ce"}},
            )
        )
        fig_bridge.update_layout(template="plotly_dark", yaxis_title="% of insurance revenue", height=500)
        st.plotly_chart(fig_bridge, width="stretch")
    with c2:
        fig_comb = go.Figure()
        fig_comb.add_trace(go.Bar(name="Claims", x=f_df["company_name"], y=f_df["claims_ratio"], marker_color="#e53e3e"))
        fig_comb.add_trace(go.Bar(name="Acquisition", x=f_df["company_name"], y=f_df["acq_cost_ratio"], marker_color="#3182ce"))
        fig_comb.add_trace(go.Bar(name="OPEX", x=f_df["company_name"], y=f_df["opex_ratio"], marker_color="#718096"))
        fig_comb.update_layout(barmode="stack", template="plotly_dark", yaxis_title="Ratio (%)", height=500)
        st.plotly_chart(fig_comb, width="stretch")

with tabs[3]:
    st.subheader("IFRS 17 Earnings Quality")
    c1, c2 = st.columns(2)
    with c1:
        fig_quality = px.bar(
            f_df.dropna(subset=["csm_rev_pct"]).sort_values("csm_rev_pct"),
            x="csm_rev_pct",
            y="company_name",
            orientation="h",
            color="csm_rev_pct",
            color_continuous_scale="Viridis",
            template="plotly_dark",
            labels={"csm_rev_pct": "CSM release / insurance revenue (%)"},
        )
        st.plotly_chart(fig_quality, width="stretch")
    with c2:
        fig_onerous = px.scatter(
            f_df.dropna(subset=["onerous_intensity", "net_uw_margin"]),
            x="onerous_intensity",
            y="net_uw_margin",
            size="insurance_revenue_2025_thb",
            color="company_name",
            text="company_name",
            template="plotly_dark",
            labels={"onerous_intensity": "Onerous intensity (%)", "net_uw_margin": "Net insurance margin (%)"},
        )
        fig_onerous.add_vline(x=industry_avg["onerous_intensity"], line_dash="dot", annotation_text="Avg onerous")
        fig_onerous.add_hline(y=industry_avg["net_uw_margin"], line_dash="dot", annotation_text="Avg margin")
        st.plotly_chart(fig_onerous, width="stretch")
    component_cols = ["company_name", "csm_rev_pct", "ra_rev_pct", "claims_ratio", "acq_cost_ratio", "opex_ratio", "onerous_intensity"]
    st.dataframe(f_df[component_cols].sort_values("csm_rev_pct", ascending=False), width="stretch", hide_index=True)

with tabs[4]:
    st.subheader("Future Profit and New Business Value Proxy")
    kf1, kf2, kf3, kf4 = st.columns(4)
    kf1.metric("Closing CSM", format_b(subj_row.get("csm_closing_thb")))
    kf2.metric("CSM / Equity", format_pct(subj_row.get("csm_equity_ratio")), format_pct(metric_delta(subj_row, industry_avg, "csm_equity_ratio")))
    kf3.metric("CSM Replacement", format_pct(subj_row.get("csm_velocity")), format_pct(metric_delta(subj_row, industry_avg, "csm_velocity")))
    kf4.metric("CSM Value Share", format_pct(subj_row.get("csm_value_share")), format_pct(metric_delta(subj_row, industry_avg, "csm_value_share")))

    c1, c2 = st.columns(2)
    with c1:
        fig_csm = px.scatter(
            f_df.dropna(subset=["csm_velocity", "csm_equity_ratio"]),
            x="csm_velocity",
            y="csm_equity_ratio",
            size="csm_closing_thb",
            color="company_name",
            text="company_name",
            template="plotly_dark",
            labels={"csm_velocity": "CSM replacement (%)", "csm_equity_ratio": "CSM / equity (%)"},
        )
        fig_csm.add_vline(x=100, line_dash="dot", annotation_text="Full replacement")
        st.plotly_chart(fig_csm, width="stretch")
    with c2:
        csm_stack = f_df[["company_name", "csm_new_business_thb", "csm_released_thb"]].melt(id_vars="company_name", var_name="CSM item", value_name="THB")
        fig_csm_stack = px.bar(csm_stack, x="company_name", y="THB", color="CSM item", barmode="group", template="plotly_dark")
        fig_csm_stack.update_layout(yaxis_title="THB")
        st.plotly_chart(fig_csm_stack, width="stretch")

with tabs[5]:
    st.subheader("Capital Strength and Investment Reliance")
    kc1, kc2, kc3, kc4 = st.columns(4)
    kc1.metric("Equity Ratio", format_pct(subj_row.get("equity_ratio")), format_pct(metric_delta(subj_row, industry_avg, "equity_ratio")))
    kc2.metric("Liability / Equity", format_x(subj_row.get("liability_to_equity")), format_x(metric_delta(subj_row, industry_avg, "liability_to_equity")))
    kc3.metric("Investment Yield Proxy", format_pct(subj_row.get("investment_yield_proxy")), format_pct(metric_delta(subj_row, industry_avg, "investment_yield_proxy")))
    kc4.metric("Asset Risk Intensity", format_pct(subj_row.get("asset_risk_intensity")), format_pct(metric_delta(subj_row, industry_avg, "asset_risk_intensity")))

    c1, c2 = st.columns(2)
    with c1:
        fig_assets = go.Figure()
        fig_assets.add_trace(go.Bar(name="Debt", x=f_df["company_name"], y=f_df["debt_assets_thb"] / 1e9))
        fig_assets.add_trace(go.Bar(name="Equity", x=f_df["company_name"], y=f_df["equity_assets_thb"] / 1e9))
        fig_assets.add_trace(go.Bar(name="Real estate", x=f_df["company_name"], y=f_df["real_estate_assets_thb"] / 1e9))
        fig_assets.update_layout(barmode="stack", template="plotly_dark", yaxis_title="Billion THB")
        st.plotly_chart(fig_assets, width="stretch")
    with c2:
        fig_cap = px.scatter(
            f_df.dropna(subset=["equity_ratio", "roe"]),
            x="equity_ratio",
            y="roe",
            size="FS_total_assets_thb",
            color="company_name",
            text="company_name",
            template="plotly_dark",
            labels={"equity_ratio": "Equity / assets (%)", "roe": "ROE (%)"},
        )
        fig_cap.add_hline(y=industry_avg["roe"], line_dash="dot", annotation_text="Avg ROE")
        fig_cap.add_vline(x=industry_avg["equity_ratio"], line_dash="dot", annotation_text="Avg equity ratio")
        st.plotly_chart(fig_cap, width="stretch")

with tabs[6]:
    st.subheader("Distribution Strategy Benchmark")
    channel_mix_cols = ["agent_mix", "broker_mix", "bancassurance_mix", "tele_marketing_mix", "digital_mix"]
    channel_long = f_df[["company_name"] + channel_mix_cols].melt(id_vars="company_name", var_name="Channel", value_name="Mix")
    channel_long["Channel"] = channel_long["Channel"].str.replace("_mix", "").str.replace("_", " ").str.title()

    c1, c2 = st.columns(2)
    with c1:
        fig_channel = px.bar(channel_long, x="company_name", y="Mix", color="Channel", template="plotly_dark")
        fig_channel.update_layout(barmode="stack", yaxis_title="Channel mix (%)")
        st.plotly_chart(fig_channel, width="stretch")
    with c2:
        fig_ch = px.scatter(
            f_df,
            x="channel_concentration",
            y="MTD_market_share",
            size="MTD_total_premium",
            color="company_name",
            hover_name="company_name",
            text="company_name",
            labels={"channel_concentration": "Channel concentration index", "MTD_market_share": "Market share (%)"},
            template="plotly_dark",
            height=520,
        )
        st.plotly_chart(fig_ch, width="stretch")

    st.dataframe(
        f_df[["company_name", "agent_mix", "bancassurance_mix", "broker_mix", "tele_marketing_mix", "digital_mix", "channel_concentration"]].sort_values(
            "channel_concentration", ascending=False
        ),
        width="stretch",
        hide_index=True,
    )

with tabs[7]:
    st.subheader("Technical Performance Ledger")
    audit_cols = [
        "company_name",
        "MTD_total_premium",
        "MTD_market_share",
        "revenue_growth",
        "net_uw_margin",
        "combined_ratio",
        "roe",
        "csm_velocity",
        "csm_equity_ratio",
        "onerous_intensity",
        "equity_ratio",
        "investment_yield_proxy",
        "channel_concentration",
    ]
    st.dataframe(f_df[audit_cols].sort_values("MTD_market_share", ascending=False), width="stretch", hide_index=True)
    st.info("Audit status: public financial statements, note disclosures and TLAA data are integrated for peer benchmarking. Validate manually extracted IFRS 17 note fields before client distribution.")

st.divider()
st.caption("LifeFS Insurance Intelligence Platform | Life insurance benchmarking dashboard | Production Release v7.0")
