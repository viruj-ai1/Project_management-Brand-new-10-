import streamlit as st
from ai_adapter import generate_ai_insights, handle_ai_chat
from components.styles import render_metric_card

def render_ai_insights(projects: list, tasks: list):
    st.markdown("## 🤖 Viruj AI Project Intelligence")
    st.markdown("<p style='color: #94a3b8;'>Automated R&D Risk Assessment & Strategic Chat Assistant Powered by Groq LLM</p>", unsafe_allow_html=True)
    st.markdown("---")

    tab_risk, tab_chat = st.tabs(["⚡ Automated Risk & Bottleneck Insights", "💬 AI Assistant Chat"])

    with tab_risk:
        st.markdown("### 🔍 Live Portfolio Risk Analysis")
        st.write("Click below to run a real-time LLM assessment across all projects and task schedules:")
        
        if st.button("🚀 Generate AI Portfolio Assessment", type="primary"):
            with st.spinner("Analyzing project timelines, dependencies, and resource allocations with Groq LLM..."):
                assessment = generate_ai_insights(projects, tasks)
                st.session_state["ai_assessment_result"] = assessment

        if "ai_assessment_result" in st.session_state:
            st.markdown("#### 📄 Executive Risk Summary:")
            st.markdown(st.session_state["ai_assessment_result"])
        else:
            st.info("Click 'Generate AI Portfolio Assessment' to start analysis.")

    with tab_chat:
        st.markdown("### 💬 Ask Viruj PM AI Assistant")
        st.write("Ask questions about task dependencies, project delays, raw material procurement, or resource availability:")

        if "chat_history" not in st.session_state:
            st.session_state["chat_history"] = []

        # Display previous chat messages
        for msg in st.session_state["chat_history"]:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

        user_input = st.chat_input("Ask AI assistant about your projects...")
        if user_input:
            with st.chat_message("user"):
                st.markdown(user_input)

            st.session_state["chat_history"].append({"role": "user", "content": user_input})

            with st.chat_message("assistant"):
                with st.spinner("Thinking..."):
                    ai_reply = handle_ai_chat(user_input, st.session_state["chat_history"], projects, tasks)
                    st.markdown(ai_reply)
                    st.session_state["chat_history"].append({"role": "assistant", "content": ai_reply})
