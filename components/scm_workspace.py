import streamlit as st
import pandas as pd
from components.styles import render_metric_card

def render_scm_workspace(projects: list, update_proj_fn):
    st.markdown("## 📦 Supply Chain & Raw Material Inventory")
    st.markdown("<p style='color: #94a3b8;'>Raw Material Procurement, Vendor Fulfillment, & Batch Material Readiness</p>", unsafe_allow_html=True)
    st.markdown("---")

    all_rms = []
    for p in projects:
        rm_list = p.get("rmList") or []
        for rm in rm_list:
            all_rms.append({
                "Project ID": p["id"],
                "Project Name": p["name"],
                "Material Name": rm.get("name", "N/A"),
                "Required Quantity": rm.get("quantity", "N/A"),
                "Procurement Status": rm.get("status", "Pending")
            })

    s1, s2, s3 = st.columns(3)
    with s1:
        render_metric_card("Total Materials Tracked", len(all_rms))
    with s2:
        procured = len([rm for rm in all_rms if rm["Procurement Status"] == "Procured"])
        render_metric_card("Procured & Stocked", procured)
    with s3:
        pending = len([rm for rm in all_rms if rm["Procurement Status"] != "Procured"])
        render_metric_card("Procurement Pending", pending)

    st.markdown("### 🔍 Raw Material Procurement Status")
    if all_rms:
        st.dataframe(pd.DataFrame(all_rms), use_container_width=True)
    else:
        st.info("No raw material items listed across active projects.")

    st.markdown("---")
    st.markdown("### ➕ Add Raw Material Item to Project")
    if projects:
        proj_map = {f"{p['name']} ({p['id']})": p for p in projects}
        sel_proj_label = st.selectbox("Select Project for Material Requirement", list(proj_map.keys()))
        target_p = proj_map[sel_proj_label]

        with st.form("form_add_rm"):
            rm_name = st.text_input("Material Name (e.g. Active Pharmaceutical Ingredient / Solvent)")
            rm_qty = st.text_input("Quantity Required (e.g. 50 kg / 100 L)")
            rm_status = st.selectbox("Procurement Status", ["Requested", "In Transit", "Procured", "Customs Clearance"])

            if st.form_submit_button("Add Material Requirement", type="primary"):
                if not rm_name or not rm_qty:
                    st.error("Material Name and Quantity are required.")
                else:
                    curr_rms = target_p.get("rmList") or []
                    curr_rms.append({"name": rm_name, "quantity": rm_qty, "status": rm_status})
                    update_proj_fn(target_p["id"], {"rmList": curr_rms})
                    st.success(f"Added '{rm_name}' to {target_p['name']}!")
                    st.rerun()
