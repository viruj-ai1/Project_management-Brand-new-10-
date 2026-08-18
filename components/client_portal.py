import streamlit as st
import pandas as pd
import plotly.express as px
from components.styles import render_metric_card

def render_client_portal(current_user: dict, projects: list, tasks: list):
    st.markdown(f"## 🏢 Client Partner Portal — Welcome, {current_user['name']}")
    st.markdown("<p style='color: #94a3b8;'>Live Project Delivery Milestones & Quality Progress Tracking</p>", unsafe_allow_html=True)
    st.markdown("---")

    # Filter projects assigned to client
    client_projects = [p for p in projects if p.get("clientId") == current_user["id"] or p.get("clientName") == current_user["name"] or current_user.get("role") in ["Managing Director", "Vice President (R&D)"]]

    if not client_projects:
        # Show all projects if demo client
        client_projects = projects

    c1, c2, c3 = st.columns(3)
    with c1:
        render_metric_card("Commissioned Projects", len(client_projects))
    with c2:
        active_cnt = len([p for p in client_projects if p.get("status") in ["Active", "Planning", "In Progress"]])
        render_metric_card("Active In-Flight", active_cnt)
    with c3:
        all_proj_ids = [p["id"] for p in client_projects]
        c_tasks = [t for t in tasks if t.get("projectId") in all_proj_ids]
        done_tasks = len([t for t in c_tasks if t.get("status") == "Completed"])
        pct = round((done_tasks / len(c_tasks) * 100), 1) if c_tasks else 0
        render_metric_card("Overall Progress", f"{pct}%")

    st.markdown("### 📊 Project Milestones & Completion Summary")
    
    for p in client_projects:
        p_tasks = [t for t in tasks if t.get("projectId") == p["id"]]
        p_done = len([t for t in p_tasks if t.get("status") == "Completed"])
        progress_val = (p_done / len(p_tasks)) if p_tasks else 0.0

        with st.expander(f"📁 {p['name']} — Status: [{p.get('status', 'Active')}] | Deadline: {p.get('deadline', 'N/A')}", expanded=True):
            st.markdown(f"**Description:** {p.get('description', 'No description provided.')}")
            st.progress(progress_val, text=f"Milestone Progress: {round(progress_val * 100, 1)}%")

            if p_tasks:
                st.markdown("##### Task Breakdown:")
                t_list = []
                for t in p_tasks:
                    t_list.append({
                        "Task": t["title"],
                        "Duration": f"{t.get('finalTotalDays', 1)} Days",
                        "Status": t.get("status", "Pending Start")
                    })
                st.dataframe(pd.DataFrame(t_list), use_container_width=True)
