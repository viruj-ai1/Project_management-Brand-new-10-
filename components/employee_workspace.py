import streamlit as st
import pandas as pd
from datetime import datetime
from components.styles import render_metric_card

@st.dialog("⏱️ Request Buffer Extension")
def render_request_extension_dialog(task: dict, update_task_fn):
    st.write(f"Request additional working days for task: **{task['title']}**")
    req_days = st.number_input("Additional Working Days Required", min_value=1, value=2, key="req_ext_days")
    justification = st.text_area("Reason / Justification for Delay *", key="req_ext_reason")

    if st.button("Submit Request", type="primary", use_container_width=True):
        if not justification.strip():
            st.error("Justification is required for buffer extension requests.")
        else:
            update_task_fn(task["id"], {
                "bufferRequestDays": req_days,
                "delayJustification": justification.strip(),
                "bufferRequestStatus": "Pending"
            })
            st.success("Buffer request submitted to Project Manager!")
            st.rerun()

@st.dialog("🔄 Request Task Delegation")
def render_request_delegation_dialog(task: dict, users: list, current_user: dict, update_task_fn):
    st.write(f"Reassign task **{task['title']}** to a colleague:")
    
    colleagues = [u for u in users if u["id"] != current_user["id"] and u.get("role") in ["Analysts/Chemists", "Department Head"]]
    col_dict = {f"{u['name']} ({u['role']})": u['id'] for u in colleagues}
    
    if not col_dict:
        st.warning("No eligible team members found for delegation.")
        return

    selected_label = st.selectbox("Delegate To", list(col_dict.keys()), key="req_del_user")
    target_id = col_dict[selected_label]
    del_reason = st.text_area("Reason for Delegation", key="req_del_reason")

    if st.button("Submit Delegation Request", type="primary", use_container_width=True):
        update_task_fn(task["id"], {
            "delegatedTo": target_id,
            "delegateRequestedBy": current_user["id"],
            "delegateRequestStatus": "Pending"
        })
        st.success("Delegation request submitted!")
        st.rerun()

def render_employee_workspace(current_user: dict, tasks: list, projects: list, users: list, update_task_fn):
    st.markdown(f"## 🧪 My Work Desk — {current_user['name']}")
    st.markdown("<p style='color: #94a3b8;'>Assigned R&D Tasks, Subtasks Checklist, Progress Logging, & Extension Requests</p>", unsafe_allow_html=True)
    st.markdown("---")

    my_tasks = [t for t in tasks if t.get("assignedTo") == current_user["id"]]

    t_active = [t for t in my_tasks if t.get("status") in ["In Progress", "Work in Progress", "Approved (Work in Progress)"]]
    t_pending = [t for t in my_tasks if t.get("status") in ["Pending Start", "Pending Estimate"]]
    t_completed = [t for t in my_tasks if t.get("status") == "Completed"]

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        render_metric_card("Assigned Tasks", len(my_tasks))
    with c2:
        render_metric_card("In Progress", len(t_active))
    with c3:
        render_metric_card("Pending Start", len(t_pending))
    with c4:
        render_metric_card("Completed Tasks", len(t_completed))

    st.markdown("### 📌 Active Tasks Execution")
    
    filter_status = st.radio("Filter Tasks", ["All Assigned", "In Progress", "Pending Start", "Completed"], horizontal=True)
    
    filtered_tasks = my_tasks
    if filter_status == "In Progress":
        filtered_tasks = t_active
    elif filter_status == "Pending Start":
        filtered_tasks = t_pending
    elif filter_status == "Completed":
        filtered_tasks = t_completed

    if not filtered_tasks:
        st.info("No tasks matching the selected filter.")
        return

    for t in filtered_tasks:
        proj = next((p for p in projects if p["id"] == t.get("projectId")), None)
        proj_name = proj["name"] if proj else "Unassigned Project"

        with st.expander(f"📌 {t['title']} — [{t.get('status', 'Pending Start')}] ({proj_name})", expanded=t.get("status") in ["In Progress", "Approved (Work in Progress)"]):
            st.markdown(f"**Specifications / Instructions:** {t.get('specs', 'None')}")
            st.markdown(f"**Assigned Days:** {t.get('assignedDays', 1)} | **Buffer Days:** {t.get('bufferDays', 0)} | **Total Allocated:** {t.get('finalTotalDays', 1)} Days")
            
            if t.get("startedAt"):
                st.markdown(f"**Started At:** `{t['startedAt']}`")
            if t.get("completedAt"):
                st.markdown(f"**Completed At:** `{t['completedAt']}`")

            # Action Buttons: Start Task, Request Extension, Delegate Task, Complete Task
            btn_c1, btn_c2, btn_c3, btn_c4 = st.columns(4)

            with btn_c1:
                if t.get("status") in ["Pending Start", "Pending Estimate"]:
                    if st.button("▶️ Start Task", key=f"start_{t['id']}", type="primary", use_container_width=True):
                        update_task_fn(t["id"], {
                            "status": "In Progress",
                            "startedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        })
                        st.success("Task started!")
                        st.rerun()

            with btn_c2:
                if t.get("status") != "Completed":
                    if st.button("⏱️ Request Buffer", key=f"ext_{t['id']}", use_container_width=True):
                        render_request_extension_dialog(t, update_task_fn)

            with btn_c3:
                if t.get("status") != "Completed":
                    if st.button("🔄 Request Delegate", key=f"del_{t['id']}", use_container_width=True):
                        render_request_delegation_dialog(t, users, current_user, update_task_fn)

            with btn_c4:
                if t.get("status") != "Completed":
                    if st.button("✅ Complete Task", key=f"comp_{t['id']}", type="primary", use_container_width=True):
                        update_task_fn(t["id"], {
                            "status": "Completed",
                            "completedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        })
                        st.success("Task marked as completed!")
                        st.rerun()

            st.markdown("---")
            # Subtasks Checklist
            subtasks = t.get("subtasks") or []
            if subtasks:
                st.markdown("##### 📋 Subtasks Checklist")
                updated_subtasks = []
                changed = False
                for idx, st_item in enumerate(subtasks):
                    is_done = st.checkbox(
                        st_item["title"], 
                        value=st_item.get("completed", False), 
                        key=f"sub_chk_{t['id']}_{idx}"
                    )
                    if is_done != st_item.get("completed", False):
                        changed = True
                    updated_subtasks.append({"id": st_item["id"], "title": st_item["title"], "completed": is_done})
                
                if changed:
                    update_task_fn(t["id"], {"subtasks": updated_subtasks})
                    st.rerun()

            # Prerequisites Checklist
            prereqs = t.get("prerequisitesChecklist") or []
            if prereqs:
                st.markdown("##### 🔑 Prerequisites Checklist")
                for pr in prereqs:
                    status_icon = "✅" if pr.get("completed") else "⏳"
                    st.write(f"{status_icon} {pr['title']}")
