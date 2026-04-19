import streamlit as st
import pandas as pd
import plotly.express as px
import numpy as np
import google.generativeai as genai

# กำหนดการแสดงผลของหน้าเว็บ
st.set_page_config(page_title="Audit Fees Dashboard", layout="wide", page_icon="📊")

# CSS สำหรับปรับปรุงความสวยงามของ Dashboard (Rich Aesthetics & Premium Design)
st.markdown("""
<style>
    /* ปรับแต่งฟอนต์ให้ทันสมัย */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    /* สไตล์ของกล่อง Metric */
    div[data-testid="metric-container"] {
        background: linear-gradient(135deg, #1f1c2c 0%, #928DAB 100%);
        border-radius: 12px;
        padding: 20px;
        color: white;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    }
    div[data-testid="metric-container"]:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2);
    }
    div[data-testid="metric-container"] > div {
        color: white;
    }
    
    /* หัวข้อหลัก */
    h1 {
        background: -webkit-linear-gradient(45deg, #FF512F, #DD2476);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 800;
        text-align: center;
        padding-bottom: 20px;
    }
    
    /* หัวข้อรอง */
    h3 {
        color: #2c3e50;
        font-weight: 600;
        margin-top: 2rem;
        margin-bottom: 1rem;
        border-left: 4px solid #DD2476;
        padding-left: 10px;
    }
</style>
""", unsafe_allow_html=True)

st.title("📊 แดชบอร์ดวิเคราะห์ค่าสอบบัญชี (Audit Fees Analytics)")
st.markdown("<p style='text-align: center; font-size: 1.2rem; color: #7f8c8d; margin-bottom: 2rem;'>วิเคราะห์เปรียบเทียบค่าสอบบัญชีกับข้อมูลทางการเงิน (สินทรัพย์และรายได้) ของบริษัทจดทะเบียนในตลาดหลักทรัพย์</p>", unsafe_allow_html=True)

# โหลดข้อมูล
@st.cache_data
def load_data():
    # โหลดข้อมูลค่าสอบบัญชีและข้อมูลทางการเงินที่รวมกันมาแล้ว
    import os
    file_path = os.path.join(os.path.dirname(__file__), "SET - Clean.csv")
    merged = pd.read_csv(file_path)
    merged.columns = merged.columns.str.strip()
    
    # แปลงตัวเลข
    def clean_num(x):
        if pd.isna(x):
            return 0
        if isinstance(x, str):
            x = x.replace(',', '').replace(' ', '')
        try:
            return float(x)
        except:
            return 0
            
    merged['Audit_Fee_Num'] = merged['Totat_audit_fee'].apply(clean_num)
    merged['Other_Fee_Num'] = merged['Totat_other_fee'].apply(clean_num)
    
    # จัดการกับข้อมูล Null
    if 'รายได้จากการดำเนินงาน' in merged.columns:
        merged['รายได้จากการดำเนินงาน'] = pd.to_numeric(merged['รายได้จากการดำเนินงาน'].apply(clean_num), errors='coerce').fillna(0)
    else:
        merged['รายได้จากการดำเนินงาน'] = 0
        
    if 'รวมสินทรัพย์' in merged.columns:
        merged['รวมสินทรัพย์'] = pd.to_numeric(merged['รวมสินทรัพย์'].apply(clean_num), errors='coerce').fillna(0)
    else:
        merged['รวมสินทรัพย์'] = 0
    
    # คำนวณ % ค่าสอบบัญชีต่อสินทรัพย์และรายได้
    merged['% Fee to Asset'] = np.where(merged['รวมสินทรัพย์'] > 0, (merged['Audit_Fee_Num'] / merged['รวมสินทรัพย์']) * 100, 0)
    merged['% Fee to Revenue'] = np.where(merged['รายได้จากการดำเนินงาน'] > 0, (merged['Audit_Fee_Num'] / merged['รายได้จากการดำเนินงาน']) * 100, 0)

    return merged

df = load_data()

# ส่วนตัวกรองข้อมูลด้านซ้าย (Sidebar)
st.sidebar.markdown("## 🔍 ตัวกรองข้อมูล (Filters)")
st.sidebar.markdown("---")

# ค้นหาชื่อหุ้น
search_stock = st.sidebar.text_input("ค้นหาชื่อหุ้น (Symbol):", "")

# กรองตามผู้สอบบัญชี
auditors = sorted([str(x) for x in df["Auditor"].unique() if pd.notna(x)])
selected_auditors = st.sidebar.multiselect("สำนักงานสอบบัญชี (Auditor):", options=auditors, default=[])

# กรองตามตลาด
markets = sorted([str(x) for x in df["Market"].unique() if pd.notna(x)])
selected_markets = st.sidebar.multiselect("ตลาดหลักทรัพย์ (Market):", options=markets, default=[])

# กรองตามอุตสาหกรรม
industries = sorted([str(x) for x in df["Industry"].unique() if pd.notna(x)])
selected_industries = st.sidebar.multiselect("อุตสาหกรรม (Industry):", options=industries, default=[])

# กรองตามหมวดธุรกิจ (Sector)
sectors = sorted([str(x) for x in df["Sector"].unique() if pd.notna(x)])
selected_sectors = st.sidebar.multiselect("หมวดธุรกิจ (Sector):", options=sectors, default=[])

# ประมวลผลการกรอง
df_filtered = df.copy()

if search_stock:
    df_filtered = df_filtered[df_filtered["Symbol"].str.contains(search_stock.upper(), na=False)]

if selected_auditors:
    df_filtered = df_filtered[df_filtered["Auditor"].isin(selected_auditors)]
    
if selected_markets:
    df_filtered = df_filtered[df_filtered["Market"].isin(selected_markets)]

if selected_industries:
    df_filtered = df_filtered[df_filtered["Industry"].isin(selected_industries)]

if selected_sectors:
    df_filtered = df_filtered[df_filtered["Sector"].isin(selected_sectors)]

if df_filtered.empty:
    st.warning("⚠️ ไม่พบข้อมูลที่ตรงกับเงื่อนไขการกรอง กรุณาปรับเปลี่ยนตัวกรองใหม่")
    st.stop()

# แสดงตัวเลขสรุป (Key Metrics)
st.markdown("### 📈 สรุปข้อมูล (Key Metrics)")
col1, col2, col3, col4 = st.columns(4)

total_companies = len(df_filtered)
avg_audit_fee = df_filtered["Audit_Fee_Num"].mean()
median_audit_fee = df_filtered["Audit_Fee_Num"].median()
total_assets_mn = df_filtered["รวมสินทรัพย์"].sum()

col1.metric("🏢 จำนวนบริษัท (Companies)", f"{total_companies} แห่ง")
col2.metric("💸 ค่าสอบเฉลี่ย (Avg Audit Fee)", f"฿ {avg_audit_fee:,.0f}")
col3.metric("📊 ค่าสอบมัธยฐาน (Median Fee)", f"฿ {median_audit_fee:,.0f}")
col4.metric("🏦 รวมสินทรัพย์ (Total Assets)", f"฿ {total_assets_mn:,.0f} ลบ.")

st.divider()

# กำหนดสีประจำบริษัท Big 4
big4_colors = {
    "EY OFFICE LIMITED": "#FFE600", # EY Yellow
    "KPMG PHOOMCHAI AUDIT LIMITED": "#00338D", # KPMG Blue
    "PRICEWATERHOUSE COOPERS ABAS LIMITED": "#E0301E", # PwC Red/Orange
    "DELOITTE TOUCHE TOHMATSU JAIYOS AUDIT CO., LTD.": "#86BC25" # Deloitte Green
}

# กราฟ
col1, col2 = st.columns([1, 1])

with col1:
    st.markdown("### 💰 ค่าสอบบัญชีสูงสุด 10 อันดับ (Top 10)")
    top10_audit = df_filtered.nlargest(10, "Audit_Fee_Num")
    fig_audit = px.bar(
        top10_audit, 
        x="Symbol", 
        y="Audit_Fee_Num",
        color="Auditor",
        hover_data=["Company", "Market", "Industry", "Totat_audit_fee"],
        labels={"Symbol": "ชื่อหุ้น (Stock)", "Audit_Fee_Num": "ค่าสอบบัญชี (บาท)"},
        text_auto='.2s',
        color_discrete_map=big4_colors,
        color_discrete_sequence=px.colors.qualitative.Pastel
    )
    fig_audit.update_layout(plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)')
    st.plotly_chart(fig_audit, width='stretch')

with col2:
    st.markdown("### 🎯 ความสัมพันธ์: ค่าสอบบัญชี vs ขนาดธุรกิจ")
    
    # ให้ผู้ใช้เลือกแกน X
    x_axis_choice = st.radio(
        "เลือกตัวแปรอ้างอิง (X-Axis):",
        options=["รวมสินทรัพย์", "รายได้จากการดำเนินงาน"],
        horizontal=True
    )
    
    # ตัด Outliers ถ้าค่านั้นเป็น 0 ออกเพื่อให้กราฟสวยงาม (Log scale ไม่รับค่า 0)
    df_scatter = df_filtered[df_filtered[x_axis_choice] > 0]
    
    if not df_scatter.empty:
        fig_scatter = px.scatter(
            df_scatter,
            x=x_axis_choice,
            y="Audit_Fee_Num",
            color="Market",
            hover_name="Symbol",
            hover_data=["Company", "Auditor", "รวมสินทรัพย์", "รายได้จากการดำเนินงาน"],
            labels={
                "รวมสินทรัพย์": "รวมสินทรัพย์ (ล้านบาท)",
                "รายได้จากการดำเนินงาน": "รายได้จากการดำเนินงาน (ล้านบาท)",
                "Audit_Fee_Num": "ค่าสอบบัญชี (บาท)"
            },
            log_x=True, # ใช้ Log scale เพราะข้อมูลมีความต่างกันมาก
            log_y=True,
            size="Audit_Fee_Num",
            size_max=30,
            opacity=0.7,
            color_discrete_sequence=px.colors.qualitative.Set1
        )
        fig_scatter.update_layout(plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)')
        st.plotly_chart(fig_scatter, width='stretch')
    else:
        st.info(f"ไม่พบข้อมูล {x_axis_choice} สำหรับนำมาแสดงกราฟ")

st.markdown("<br>", unsafe_allow_html=True)

st.markdown("### 📊 ค่าสอบบัญชีเฉลี่ยแยกตามอุตสาหกรรม (Avg Fee by Industry)")
industry_avg = df_filtered.groupby("Industry")["Audit_Fee_Num"].mean().reset_index().sort_values("Audit_Fee_Num", ascending=True)
fig_ind = px.bar(
    industry_avg,
    x="Audit_Fee_Num",
    y="Industry",
    orientation='h',
    labels={"Audit_Fee_Num": "ค่าสอบบัญชีเฉลี่ย (บาท)", "Industry": "อุตสาหกรรม"},
    text_auto='.2s',
    color="Audit_Fee_Num",
    color_continuous_scale="Sunset"
)
fig_ind.update_layout(plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)', showlegend=False)
st.plotly_chart(fig_ind, width='stretch')

st.markdown("<br>", unsafe_allow_html=True)

# กราฟเพิ่มเติมเพื่อการวิเคราะห์
col3, col4 = st.columns([1, 1])

with col3:
    st.markdown("### 📦 การกระจายตัวของค่าสอบบัญชีตามผู้สอบ (Fee Distribution)")
    # หา Top Auditors ที่มีลูกค้าเยอะที่สุด 10 อันดับ เพื่อไม่ให้กราฟรกเกินไป
    top_auditors = df_filtered["Auditor"].value_counts().nlargest(10).index
    df_box = df_filtered[df_filtered["Auditor"].isin(top_auditors)]
    
    fig_box = px.box(
        df_box,
        x="Auditor",
        y="Audit_Fee_Num",
        color="Auditor",
        labels={"Auditor": "สำนักงานสอบบัญชี", "Audit_Fee_Num": "ค่าสอบบัญชี (บาท)"},
        points="all", # แสดงจุดทั้งหมดด้วย
        color_discrete_map=big4_colors,
        color_discrete_sequence=px.colors.qualitative.Pastel
    )
    fig_box.update_layout(plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)', showlegend=False, xaxis={'categoryorder':'total descending'})
    st.plotly_chart(fig_box, width='stretch')

with col4:
    st.markdown("### 🥧 ส่วนแบ่งตลาดของผู้สอบบัญชี (Market Share by Total Fee)")
    market_share = df_filtered.groupby("Auditor")["Audit_Fee_Num"].sum().reset_index()
    # จัดกลุ่ม Auditor อื่นๆ ที่ไม่ใช่ Top 10 ให้เป็น "Others"
    top_10_market = market_share.nlargest(10, "Audit_Fee_Num")
    others_sum = market_share[~market_share["Auditor"].isin(top_10_market["Auditor"])]["Audit_Fee_Num"].sum()
    
    if others_sum > 0:
        others_df = pd.DataFrame({"Auditor": ["Others"], "Audit_Fee_Num": [others_sum]})
        market_share_plot = pd.concat([top_10_market, others_df])
    else:
        market_share_plot = top_10_market
        
    fig_pie = px.pie(
        market_share_plot,
        names="Auditor",
        values="Audit_Fee_Num",
        color="Auditor",
        hole=0.4,
        color_discrete_map=big4_colors,
        color_discrete_sequence=px.colors.qualitative.Pastel
    )
    fig_pie.update_layout(plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)')
    st.plotly_chart(fig_pie, width='stretch')

st.markdown("<br>", unsafe_allow_html=True)

# แสดงตารางข้อมูลดิบ
st.markdown("### 📋 ข้อมูลรายละเอียด (Tabular Detail)")

display_cols = [
    "Symbol", "Company", "Market", "Industry", "Sector", "Auditor", 
    "Audit_fee", "Audit_fee(Sub)", "Totat_audit_fee", 
    "Other_fee", "Other_fee(Sub)", "Totat_other_fee", 
    "รวมสินทรัพย์", "รายได้จากการดำเนินงาน", "% Fee to Asset", "% Fee to Revenue"
]
available_cols = [c for c in display_cols if c in df_filtered.columns]

# Style the dataframe
styled_df = df_filtered.sort_values("Audit_Fee_Num", ascending=False)[available_cols].style.format({
    "รวมสินทรัพย์": "{:,.2f}",
    "รายได้จากการดำเนินงาน": "{:,.2f}",
    "% Fee to Asset": "{:.6f}%",
    "% Fee to Revenue": "{:.6f}%"
}).background_gradient(subset=['% Fee to Asset', '% Fee to Revenue'], cmap='YlOrRd')

st.dataframe(styled_df, width='stretch')

st.divider()

# ============================================================
# AI CHATBOT
# ============================================================
st.markdown("### 🤖 ถามผู้ช่วย AI (Powered by Gemini)")
st.markdown("<p style='color:#7f8c8d; font-size:0.9rem;'>ถามข้อมูลค่าสอบบัญชีในชุดข้อมูลที่กรองไว้ได้เลยครับ เช่น 'Big 4 มีส่วนแบ่งตลาดรวมเท่าไหร่?' หรือ 'อุตสาหกรรมไหนมีค่าสอบสูงสุด?'</p>", unsafe_allow_html=True)

# โหลด API Key จาก Streamlit Secrets
try:
    api_key = st.secrets["GEMINI_API_KEY"]
    genai.configure(api_key=api_key)
    gemini_model = genai.GenerativeModel("gemini-2.5-flash")
    chatbot_ready = True
except Exception:
    chatbot_ready = False
    st.info("💡 ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Streamlit Secrets - กรุณาเพิ่ม Key เพื่อใช้ฟีเจอร์ Chatbot")

if chatbot_ready:
    # สร้าง Context สรุปข้อมูลที่กรองไว้ให้ AI รู้จัก
    top_auditors = df_filtered.groupby('Auditor')['Audit_Fee_Num'].sum().nlargest(5).reset_index()
    top_auditors_str = top_auditors.to_string(index=False)
    top_industry = df_filtered.groupby('Industry')['Audit_Fee_Num'].mean().nlargest(5).reset_index()
    top_industry_str = top_industry.to_string(index=False)
    
    data_context = f"""
    ข้อมูลค่าสอบบัญชี SET ที่กรองไว้อยู่ในขณะนี้:
    - จำนวนบริษัท: {len(df_filtered)} บริษัท
    - ค่าสอบบัญชีเฉลี่ย: {df_filtered['Audit_Fee_Num'].mean():,.0f} บาท
    - ค่าสอบบัญชีมัธยฐาน: {df_filtered['Audit_Fee_Num'].median():,.0f} บาท
    - ค่าสอบบัญชีสูงสุด: {df_filtered['Audit_Fee_Num'].max():,.0f} บาท (บริษัท {df_filtered.loc[df_filtered['Audit_Fee_Num'].idxmax(), 'Symbol']})
    - รวมค่าสอบบัญชีทั้งหมด: {df_filtered['Audit_Fee_Num'].sum():,.0f} บาท
    - ตลาดที่มี: {', '.join(df_filtered['Market'].unique())}
    
    Top 5 สำนักงานสอบบัญชีตามค่าสอบรวม:
    {top_auditors_str}
    
    Top 5 อุตสาหกรรมตามค่าสอบเฉลี่ย:
    {top_industry_str}
    """
    
    SYSTEM_PROMPT = f"""
    คุณคือผู้ช่วย AI ผู้เชี่ยวชาญด้านค่าสอบบัญชี (Audit Fee) สำหรับบริษัทจดทะเบียนในตลาดหลักทรัพย์ไทย (SET)
    ตอบคำถามเป็นภาษาไทยเสมอ กระชับ ชัดเจน และอ้างอิงตัวเลขจากข้อมูลที่มีให้
    
    {data_context}
    """
    
    # เก็บประวัติการสนทนาใน Session State
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []
    
    # แสดงประวัติการสนทนา
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.write(msg["content"])
    
    # รับคำถามจาก User
    if user_input := st.chat_input("พิมพ์คำถามของคุณที่นี่..."):
        # แสดงคำถาม User
        with st.chat_message("user"):
            st.write(user_input)
        st.session_state.chat_history.append({"role": "user", "content": user_input})
        
        # สร้าง Prompt รวม System + ประวัติ + คำถามใหม่
        full_prompt = SYSTEM_PROMPT + "\n\n" + "\n".join(
            [f"{m['role'].upper()}: {m['content']}" for m in st.session_state.chat_history]
        )
        
        with st.chat_message("assistant"):
            with st.spinner("กำลังคิด..."):
                try:
                    response = gemini_model.generate_content(full_prompt)
                    answer = response.text
                except Exception as e:
                    answer = f"เกิดข้อผิดพลาด: {str(e)}"
            st.write(answer)
        
        st.session_state.chat_history.append({"role": "assistant", "content": answer})
    
    # ปุ่ม Clear ประวัติการสนทนา
    if st.session_state.chat_history:
        if st.button("🗑️ ล้างประวัติการสนทนา"):
            st.session_state.chat_history = []
            st.rerun()
