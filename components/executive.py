import streamlit as st
import pandas as pd
import plotly.express as px
from components.styles import render_metric_card

def render_executive_dashboard(projects: list, tasks: list, users: list):
    st.markdown("## 📊 Executive Portfolio Dashboard")
    st.markdown("<p style='color: #94a3b8;'>Strategic Overview & R&D Project Performance Metrics</p>", unsafe_allow_html=True)
    st.markdown("---")

    total_projects = len(projects)
    active_projects = len([p for p in projects if p.get("status") in ["Active", "Planning", "In Progress"]])
    completed_projects = len([p for p in projects if p.get("status") == "Completed"])
    
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.get("status") == "Completed"])
    task_completion_pct = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

    # Top KPI Metrics Row
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        render_metric_card("Total Projects", total_projects, subtext=f"{active_projects} Active")
    with m2:
        render_metric_card("Active R&D Pipelines", active_projects)
    with m3:
        render_metric_card("Completed Projects", completed_projects)
    with m4:
        render_metric_card("Overall Task Completion", f"{task_completion_pct}%", subtext=f"{completed_tasks}/{total_tasks} Tasks Done")

    st.markdown("### 📈 Project Status & Category Breakdown")
    c1, c2 = st.columns(2)

    with c1:
        if projects:
            df_p = pd.DataFrame(projects)
            status_counts = df_p['status'].value_counts().reset_index()
            status_counts.columns = ['Status', 'Count']
            fig_status = px.pie(
                status_counts, 
                values='Count', 
                names='Status', 
                hole=0.4,
                title="Projects by Status",
                color_discrete_sequence=px.colors.qualitative.Pastel
            )
            fig_status.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color="#f8fafc")
            st.plotly_chart(fig_status, use_container_width=True)
        else:
            st.info("No project data available.")

    with c2:
        if projects:
            df_cat = pd.DataFrame(projects)
            cat_counts = df_cat['category'].value_counts().reset_index()
            cat_counts.columns = ['Category', 'Count']
            fig_cat = px.bar(
                cat_counts, 
                x='Category', 
                y='Count', 
                title="Projects by Category",
                color='Category',
                color_discrete_sequence=px.colors.qualitative.Set2
            )
            fig_cat.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color="#f8fafc")
            st.plotly_chart(fig_cat, use_container_width=True)
        else:
            st.info("No category data available.")

    st.markdown("### 📁 Project Portfolio Summary")
    if projects:
        proj_display = []
        for p in projects:
            p_tasks = [t for t in tasks if t.get("projectId") == p["id"]]
            p_done = len([t for t in p_tasks if t.get("status") == "Completed"])
            p_pct = round((p_done / len(p_tasks) * 100), 1) if p_tasks else 0
            pm_user = next((u["name"] for u in users if u["id"] == p.get("pmId")), p.get("pmId"))
            proj_display.append({
                "Project ID": p["id"],
                "Project Name": p["name"],
                "Category": p.get("category", "General"),
                "Priority": p.get("priority", "Medium"),
                "Project Manager": pm_user,
                "Deadline": p.get("deadline", "N/A"),
                "Status": p.get("status", "Active"),
                "Completion %": f"{p_pct}%"
            })
        st.dataframe(pd.DataFrame(proj_display), use_container_width=True)
    else:
        st.info("No projects registered in the portal.")
