import streamlit as st
import pandas as pd
from components.auth import render_admin_reset_password_dialog
from components.styles import render_metric_card

@st.dialog("➕ Add New Team Member")
def render_create_user_dialog(users: list, create_user_fn):
    st.write("Enter new user details:")
    u_id = st.text_input("Login User ID (e.g. u12, chemist_01) *", key="cu_id")
    u_name = st.text_input("Full Name *", key="cu_name")
    u_role = st.selectbox("Role *", [
        "Managing Director",
        "Vice President (R&D)",
        "Project Manager",
        "Department Head",
        "Analysts/Chemists",
        "SCM",
        "Client"
    ], key="cu_role")

    mgr_options = [u for u in users if u.get("role") in ["Managing Director", "Vice President (R&D)", "Project Manager", "Department Head"]]
    mgr_dict = {f"{u['name']} ({u['role']})": u['id'] for u in mgr_options}
    mgr_dict["None (Top Executive / Client)"] = None

    sel_mgr_label = st.selectbox("Reporting Manager", list(mgr_dict.keys()), key="cu_mgr")
    mgr_id = mgr_dict[sel_mgr_label]

    u_password = st.text_input("Initial Password (Optional — auto-generated if blank)", type="password", key="cu_pass")

    if st.button("Create Team Member", type="primary", use_container_width=True):
        if not u_name:
            st.error("Full Name is required.")
        else:
            user_data = {
                "id": u_id if u_id.strip() else None,
                "name": u_name.strip(),
                "role": u_role,
                "managerId": mgr_id,
                "password": u_password.strip() if u_password.strip() else None
            }
            res = create_user_fn(user_data)
            if res:
                st.success(f"User '{u_name}' created successfully with Login ID '{res['id']}'!")
                st.rerun()

def render_team_management(current_user: dict, users: list, create_user_fn, admin_reset_pw_fn):
    st.markdown("## 👥 Organization & Team Management")
    st.markdown("<p style='color: #94a3b8;'>Manage R&D Personnel, Roles, Reporting Lines, & Account Credentials</p>", unsafe_allow_html=True)
    st.markdown("---")

    col_hdr, col_btn = st.columns([3, 1])
    with col_hdr:
        st.markdown(f"**Total Personnel:** {len(users)} registered users across R&D, Management, & Operations.")
    with col_btn:
        if st.button("➕ Add Team Member", type="primary", use_container_width=True):
            render_create_user_dialog(users, create_user_fn)

    st.markdown("<br>", unsafe_allow_html=True)

    # Filter Users by Role
    roles_list = ["All Roles"] + list(set(u.get("role", "") for u in users if u.get("role")))
    selected_role = st.selectbox("Filter Directory by Role", roles_list)

    display_users = users
    if selected_role != "All Roles":
        display_users = [u for u in users if u.get("role") == selected_role]

    u_data = []
    for u in display_users:
        mgr = next((m["name"] for m in users if m["id"] == u.get("managerId")), "None")
        u_data.append({
            "User ID": u["id"],
            "Full Name": u["name"],
            "Role": u.get("role", "N/A"),
            "Reporting Manager": mgr
        })

    st.dataframe(pd.DataFrame(u_data), use_container_width=True)

    # Admin Password Reset Section
    st.markdown("---")
    st.markdown("### 🔑 Admin Credentials Reset")
    st.markdown("Reset passwords for team members (No old password required):")
    
    target_user_dict = {f"{u['name']} ({u['id']} - {u['role']})": u for u in users}
    sel_target_label = st.selectbox("Select User to Reset Password", list(target_user_dict.keys()))
    target_u = target_user_dict[sel_target_label]

    if st.button("Reset Password for Selected User", key="btn_admin_reset_pw"):
        render_admin_reset_password_dialog(target_u, admin_reset_pw_fn)
