import streamlit as st

def render_login_screen(verify_login_fn, get_users_fn):
    st.markdown("<h1 style='text-align: center; color: #3b82f6;'>Viruj Group PM Portal</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #94a3b8;'>Pharmaceutical & Specialty Chemical R&D Execution Platform</p>", unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])

    with col2:
        with st.container():
            st.markdown("### 🔐 User Login")
            
            # Quick Login Demo Buttons
            st.markdown("##### Quick Demo Credentials:")
            qcol1, qcol2, qcol3 = st.columns(3)
            
            with qcol1:
                if st.button("👑 Managing Director", key="btn_md", use_container_width=True):
                    st.session_state["login_user"] = "u1"
                    st.session_state["login_pass"] = "MD@Virujgroup"
                if st.button("🧪 Senior Chemist", key="btn_chm", use_container_width=True):
                    st.session_state["login_user"] = "u10"
                    st.session_state["login_pass"] = "CHM@Virujgroup"

            with qcol2:
                if st.button("🔬 VP R&D", key="btn_vp", use_container_width=True):
                    st.session_state["login_user"] = "u2"
                    st.session_state["login_pass"] = "VP@Virujgroup"
                if st.button("🏢 External Client", key="btn_client", use_container_width=True):
                    st.session_state["login_user"] = "u11"
                    st.session_state["login_pass"] = "Client@Virujgroup"

            with qcol3:
                if st.button("📋 Project Manager A", key="btn_pma", use_container_width=True):
                    st.session_state["login_user"] = "u3"
                    st.session_state["login_pass"] = "PMA@Virujgroup"
                if st.button("⚙️ SCM Head", key="btn_scm", use_container_width=True):
                    st.session_state["login_user"] = "u8"
                    st.session_state["login_pass"] = "SCM@Virujgroup"

            st.markdown("---")

            user_input = st.text_input(
                "User ID or Full Name", 
                value=st.session_state.get("login_user", ""),
                key="input_user_id"
            )
            pass_input = st.text_input(
                "Password", 
                value=st.session_state.get("login_pass", ""),
                type="password",
                key="input_user_pass"
            )

            if st.button("Sign In", type="primary", use_container_width=True):
                if not user_input or not pass_input:
                    st.error("Please enter both User ID/Name and Password.")
                else:
                    user = verify_login_fn(user_input, pass_input)
                    if user:
                        st.session_state["current_user"] = user
                        st.success(f"Welcome back, {user['name']}!")
                        st.rerun()
                    else:
                        st.error("Invalid credentials. Please check your User ID and Password.")

@st.dialog("🔑 Change Password")
def render_change_password_dialog(user_id: str, change_pw_fn):
    st.write("Update your account password below:")
    old_pw = st.text_input("Current Password", type="password", key="dlg_old_pw")
    new_pw = st.text_input("New Password", type="password", key="dlg_new_pw")
    confirm_pw = st.text_input("Confirm New Password", type="password", key="dlg_confirm_pw")

    if st.button("Update Password", type="primary"):
        if not old_pw or not new_pw:
            st.error("All fields are required.")
        elif new_pw != confirm_pw:
            st.error("New passwords do not match.")
        else:
            success = change_pw_fn(user_id, old_pw, new_pw)
            if success:
                st.success("Password changed successfully!")
                st.rerun()
            else:
                st.error("Incorrect current password.")

@st.dialog("🛡️ Reset User Password")
def render_admin_reset_password_dialog(target_user: dict, admin_reset_pw_fn):
    st.write(f"Reset password for **{target_user['name']}** ({target_user['id']}):")
    new_pw = st.text_input("New Password", type="password", key="admin_dlg_new_pw")
    confirm_pw = st.text_input("Confirm New Password", type="password", key="admin_dlg_confirm_pw")

    if st.button("Reset Password", type="primary"):
        if not new_pw:
            st.error("Please enter a new password.")
        elif new_pw != confirm_pw:
            st.error("Passwords do not match.")
        else:
            success = admin_reset_pw_fn(target_user['id'], new_pw)
            if success:
                st.success(f"Password reset for {target_user['name']}!")
                st.rerun()
            else:
                st.error("Failed to reset password.")
