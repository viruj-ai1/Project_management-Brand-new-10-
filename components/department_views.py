import streamlit as st
import pandas as pd
from components.styles import render_metric_card

def render_department_views(current_user: dict, projects: list, tasks: list, users: list):
    st.markdown("## 🔬 R&D Departmental Execution View")
    st.markdown("<p style='color: #94a3b8;'>Departmental Task Tracking & Analytical/Chemical R&D Workload Distribution</p>", unsafe_allow_html=True)
    st.markdown("---")

    selected_dept = st.selectbox("Select Department", ["ARD (Analytical R&D)", "CRD (Chemical R&D)", "DQA (Quality Assurance)", "TTR (Tech Transfer)", "SCM (Supply Chain)"])
    dept_code = selected_dept.split()[0]

    dept_projects = [p for p in projects if p.get("category") == dept_code or dept_code in p.get("name", "")]
    dept_users = [u for u in users if dept_code in u.get("name", "") or dept_code in u.get("role", "") or dept_code in (u.get("department") or "")]

    d1, d2, d3 = st.columns(3)
    with d1:
        render_metric_card("Department Members", len(dept_users))
    with d2:
        render_metric_card("Active Department Projects", len(dept_projects))
    with d3:
        dept_user_ids = [u["id"] for u in dept_users]
        dept_tasks = [t for t in tasks if t.get("assignedTo") in dept_user_ids]
        render_metric_card("Department Tasks", len(dept_tasks))

    st.markdown(f"### 📋 {selected_dept} Tasks Overview")
    if dept_tasks:
        t_data = []
        for t in dept_tasks:
            assignee = next((u["name"] for u in users if u["id"] == t.get("assignedTo")), str(t.get("assignedTo")))
            proj = next((p["name"] for p in projects if p["id"] == t.get("projectId")), "N/A")
            t_data.append({
                "Task Title": t["title"],
                "Project": proj,
                "Assigned Analyst": assignee,
                "Allocated Days": t.get("finalTotalDays", 1),
                "Status": t.get("status", "Pending Start")
            })
        st.dataframe(pd.DataFrame(t_data), use_container_width=True)
    else:
        st.info(f"No specific active tasks registered under {selected_dept}.")
