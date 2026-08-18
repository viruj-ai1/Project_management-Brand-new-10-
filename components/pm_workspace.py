import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime, date
from components.styles import render_metric_card

@st.dialog("➕ Create New R&D Project")
def render_create_project_dialog(current_user: dict, users: list, create_proj_fn):
    st.write("Fill in the details to initialize a new project:")
    p_name = st.text_input("Project Name *", key="cp_name")
    p_category = st.selectbox("Category", ["R&D", "ARD", "CRD", "DQA", "SCM", "Scale-up"], key="cp_cat")
    p_priority = st.selectbox("Priority", ["High", "Medium", "Low"], key="cp_pri")
    p_deadline = st.date_input("Target Deadline *", value=date(2026, 12, 31), key="cp_dl")
    
    pm_options = [u for u in users if u.get("role") in ["Project Manager", "Managing Director", "Vice President (R&D)", "Department Head"]]
    pm_dict = {f"{u['name']} ({u['id']})": u['id'] for u in pm_options}
    selected_pm_label = st.selectbox("Assign Project Manager", list(pm_dict.keys()), key="cp_pm")
    selected_pm_id = pm_dict[selected_pm_label] if pm_options else current_user["id"]

    p_client_name = st.text_input("Client Name (Optional)", key="cp_client_name")
    p_desc = st.text_area("Project Description", key="cp_desc")

    if st.button("Create Project", type="primary", use_container_width=True):
        if not p_name:
            st.error("Project Name is required.")
        else:
            new_proj = {
                "name": p_name,
                "deadline": str(p_deadline),
                "pmId": selected_pm_id,
                "category": p_category,
                "priority": p_priority,
                "description": p_desc,
                "clientName": p_client_name,
                "clientId": "u11" if p_client_name else None,
                "businessCase": [],
                "rmList": []
            }
            res = create_proj_fn(new_proj)
            if res:
                st.success(f"Project '{p_name}' created successfully!")
                st.rerun()

@st.dialog("➕ Add Task / Milestone")
def render_create_task_dialog(project_id: str, users: list, existing_tasks: list, create_task_fn):
    st.write("Add task details:")
    t_title = st.text_input("Task Title *", key="ct_title")
    t_specs = st.text_area("Task Specifications / Instructions", key="ct_specs")
    
    user_dict = {f"{u['name']} ({u['id']})": u['id'] for u in users}
    selected_user_label = st.selectbox("Assign To", list(user_dict.keys()), key="ct_user")
    assigned_to_id = user_dict[selected_user_label]

    col1, col2 = st.columns(2)
    with col1:
        t_assigned_days = st.number_input("Assigned Days (Working Days)", min_value=1, value=5, key="ct_assigned_days")
    with col2:
        t_buffer_days = st.number_input("Buffer Days", min_value=0, value=2, key="ct_buffer_days")

    t_final_days = t_assigned_days + t_buffer_days

    proj_tasks = [t for t in existing_tasks if t.get("projectId") == project_id]
    pred_dict = {t["title"]: t["id"] for t in proj_tasks}
    selected_preds = st.multiselect("Predecessor Tasks (Dependencies)", list(pred_dict.keys()), key="ct_preds")
    pred_ids = [pred_dict[p] for p in selected_preds]

    st.markdown("##### Subtasks Checklist (Optional)")
    subtasks_raw = st.text_area("Enter subtasks (one per line)", key="ct_subtasks")
    subtasks = []
    if subtasks_raw.strip():
        for idx, line in enumerate(subtasks_raw.strip().split("\n")):
            if line.strip():
                subtasks.append({"id": f"sub_{idx}", "title": line.strip(), "completed": False})

    if st.button("Add Task", type="primary", use_container_width=True):
        if not t_title:
            st.error("Task Title is required.")
        else:
            task_obj = {
                "title": t_title,
                "specs": t_specs,
                "assignedTo": assigned_to_id,
                "projectId": project_id,
                "assignedDays": t_assigned_days,
                "bufferDays": t_buffer_days,
                "finalTotalDays": t_final_days,
                "durationValue": float(t_assigned_days),
                "durationUnit": "days",
                "predecessors": pred_ids,
                "subtasks": subtasks,
                "status": "Pending Start"
            }
            res = create_task_fn(task_obj)
            if res:
                st.success("Task created!")
                st.rerun()

def render_pm_workspace(current_user: dict, projects: list, tasks: list, users: list, create_proj_fn, update_proj_fn, create_task_fn, update_task_fn):
    st.markdown("## 📋 Project Management & Execution Workspace")
    
    col_hdr, col_btn = st.columns([3, 1])
    with col_hdr:
        st.markdown("<p style='color: #94a3b8;'>Manage R&D Projects, Work Breakdown Structure (WBS), Buffer Pools, & Approvals</p>", unsafe_allow_html=True)
    with col_btn:
        if st.button("➕ New Project", type="primary", use_container_width=True):
            render_create_project_dialog(current_user, users, create_proj_fn)

    st.markdown("---")

    pm_projects = projects
    if current_user.get("role") == "Project Manager":
        pm_projects = [p for p in projects if p.get("pmId") == current_user["id"]]

    if not pm_projects:
        st.info("No projects under your management. Click 'New Project' above to create one.")
        return

    # Select Active Project
    proj_map = {f"{p['name']} ({p['id']})": p for p in pm_projects}
    selected_proj_label = st.selectbox("🎯 Select Active Project", list(proj_map.keys()))
    curr_proj = proj_map[selected_proj_label]

    proj_tasks = [t for t in tasks if t.get("projectId") == curr_proj["id"]]

    # Project Overview Cards
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        render_metric_card("Status", curr_proj.get("status", "Active"))
    with c2:
        render_metric_card("Target Deadline", curr_proj.get("deadline", "N/A"))
    with c3:
        render_metric_card("Buffer Pool", f"{curr_proj.get('bufferPool', 0)} Days")
    with c4:
        completed_cnt = len([t for t in proj_tasks if t.get("status") == "Completed"])
        render_metric_card("Tasks Completion", f"{completed_cnt}/{len(proj_tasks)}")

    # Tabs for Project Management Features
    tab_gantt, tab_wbs, tab_approvals, tab_details = st.tabs(["📅 Interactive Timeline (Gantt)", "📝 WBS & Tasks", "🔔 Approval Hub", "⚙️ Project Settings"])

    with tab_gantt:
        st.markdown("### 📊 Interactive Project Gantt Chart")
        if proj_tasks:
            gantt_data = []
            for t in proj_tasks:
                assignee = next((u["name"] for u in users if u["id"] == t.get("assignedTo")), str(t.get("assignedTo")))
                start_dt = t.get("startedAt") or datetime.now().strftime("%Y-%m-%d")
                days = t.get("finalTotalDays") or t.get("assignedDays") or 1
                gantt_data.append({
                    "Task": t["title"],
                    "Assignee": assignee,
                    "Start": start_dt,
                    "DurationDays": days,
                    "Status": t.get("status", "Pending Start")
                })
            
            df_gantt = pd.DataFrame(gantt_data)
            df_gantt["Start"] = pd.to_datetime(df_gantt["Start"])
            df_gantt["Finish"] = df_gantt["Start"] + pd.to_timedelta(df_gantt["DurationDays"], unit='D')

            fig = px.timeline(
                df_gantt, 
                x_start="Start", 
                x_end="Finish", 
                y="Task", 
                color="Status", 
                hover_data=["Assignee", "DurationDays"],
                title=f"Timeline for {curr_proj['name']}"
            )
            fig.update_yaxes(autorange="reversed")
            fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color="#f8fafc")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No tasks created for this project yet.")

    with tab_wbs:
        st.markdown("### 📝 Work Breakdown Structure (Tasks & Milestones)")
        col_wbs_hdr, col_wbs_add = st.columns([3, 1])
        with col_wbs_add:
            if st.button("➕ Add Task", key="btn_add_task_wbs", use_container_width=True):
                render_create_task_dialog(curr_proj["id"], users, tasks, create_task_fn)

        if proj_tasks:
            t_data = []
            for t in proj_tasks:
                assignee = next((u["name"] for u in users if u["id"] == t.get("assignedTo")), str(t.get("assignedTo")))
                t_data.append({
                    "Task ID": t["id"],
                    "Title": t["title"],
                    "Assigned To": assignee,
                    "Assigned Days": t.get("assignedDays", 1),
                    "Buffer Days": t.get("bufferDays", 0),
                    "Total Days": t.get("finalTotalDays", 1),
                    "Status": t.get("status", "Pending Start")
                })
            st.dataframe(pd.DataFrame(t_data), use_container_width=True)
        else:
            st.info("No tasks added yet.")

    with tab_approvals:
        st.markdown("### 🔔 Pending Extension & Delegation Requests")
        
        # Buffer Extension Requests
        ext_tasks = [t for t in proj_tasks if t.get("bufferRequestStatus") == "Pending"]
        st.markdown("#### ⏳ Buffer / Extension Day Requests")
        if ext_tasks:
            for t in ext_tasks:
                assignee = next((u["name"] for u in users if u["id"] == t.get("assignedTo")), str(t.get("assignedTo")))
                with st.expander(f"Task: {t['title']} — Requested by {assignee}"):
                    st.write(f"**Requested Days:** {t.get('bufferRequestDays', 1)} Days")
                    st.write(f"**Justification:** {t.get('delayJustification', 'No justification provided.')}")
                    
                    ac1, ac2 = st.columns(2)
                    with ac1:
                        if st.button(f"Approve Request ({t['id']})", type="primary", key=f"app_ext_{t['id']}"):
                            added_days = t.get('bufferRequestDays', 1)
                            new_buffer = (t.get('bufferDays') or 0) + added_days
                            new_total = (t.get('finalTotalDays') or 1) + added_days
                            update_task_fn(t["id"], {
                                "bufferDays": new_buffer,
                                "finalTotalDays": new_total,
                                "bufferRequestStatus": "Approved"
                            })
                            st.success("Extension approved!")
                            st.rerun()
                    with ac2:
                        if st.button(f"Reject Request ({t['id']})", key=f"rej_ext_{t['id']}"):
                            update_task_fn(t["id"], {"bufferRequestStatus": "Rejected"})
                            st.warning("Extension rejected.")
                            st.rerun()
        else:
            st.info("No pending extension requests.")

        # Delegation Requests
        del_tasks = [t for t in proj_tasks if t.get("delegateRequestStatus") == "Pending"]
        st.markdown("#### 🔄 Task Delegation Requests")
        if del_tasks:
            for t in del_tasks:
                req_user = next((u["name"] for u in users if u["id"] == t.get("delegateRequestedBy")), str(t.get("delegateRequestedBy")))
                target_user = next((u["name"] for u in users if u["id"] == t.get("delegatedTo")), str(t.get("delegatedTo")))
                with st.expander(f"Task: {t['title']} — Delegate from {req_user} to {target_user}"):
                    dc1, dc2 = st.columns(2)
                    with dc1:
                        if st.button(f"Approve Delegation ({t['id']})", type="primary", key=f"app_del_{t['id']}"):
                            update_task_fn(t["id"], {
                                "assignedTo": t.get("delegatedTo"),
                                "delegateRequestStatus": "Approved"
                            })
                            st.success("Task reassigned!")
                            st.rerun()
                    with dc2:
                        if st.button(f"Reject Delegation ({t['id']})", key=f"rej_del_{t['id']}"):
                            update_task_fn(t["id"], {"delegateRequestStatus": "Rejected"})
                            st.warning("Delegation rejected.")
                            st.rerun()
        else:
            st.info("No pending delegation requests.")

    with tab_details:
        st.markdown("### ⚙️ Update Project Settings & Buffer Pool")
        with st.form("form_proj_settings"):
            new_desc = st.text_area("Description", value=curr_proj.get("description", ""))
            new_status = st.selectbox("Project Status", ["Planning", "Active", "On Hold", "Completed"], index=1 if curr_proj.get("status")=="Active" else 0)
            add_buffer = st.number_input("Add to Buffer Pool (Days)", min_value=0, value=0)
            
            if st.form_submit_button("Save Changes"):
                curr_buffer = curr_proj.get("bufferPool", 0)
                update_proj_fn(curr_proj["id"], {
                    "description": new_desc,
                    "status": new_status,
                    "bufferPool": curr_buffer + add_buffer
                })
                st.success("Project updated!")
                st.rerun()
