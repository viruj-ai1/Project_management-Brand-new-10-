import os
import streamlit as st
from typing import List, Dict, Any

def get_groq_api_key():
    try:
        if "GROQ_API_KEY" in st.secrets:
            return st.secrets["GROQ_API_KEY"]
    except Exception:
        pass
    return os.environ.get("GROQ_API_KEY", "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")

def generate_ai_insights(projects: List[Dict[str, Any]], tasks: List[Dict[str, Any]]) -> str:
    api_key = get_groq_api_key()
    if not api_key:
        return "⚠️ Groq API key not configured. Please set GROQ_API_KEY in secrets or environment variables."

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        
        prompt = f"""
        You are an Expert Project Management AI Advisor for a Pharmaceutical & Specialty Chemical R&D Organization.
        Analyze the following active portfolio data and generate an executive risk assessment.

        Projects Data:
        {projects}

        Tasks Data:
        {tasks}

        Please structure your response into 3 sections:
        1. 🚨 Critical Bottlenecks & At-Risk Projects
        2. ⚡ Resource Allocation & Capacity Warnings
        3. 🛡️ Recommended Mitigation Strategies
        Use clear, bulleted markdown with emojis.
        """

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a senior PMO AI consultant specializing in R&D and chemical project management."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=1000
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"Error connecting to Groq AI service: {str(e)}"

def handle_ai_chat(user_query: str, chat_history: List[Dict[str, str]], projects: List[Dict[str, Any]], tasks: List[Dict[str, Any]]) -> str:
    api_key = get_groq_api_key()
    if not api_key:
        return "⚠️ Groq API Key is missing."

    try:
        from groq import Groq
        client = Groq(api_key=api_key)

        messages = [
            {
                "role": "system", 
                "content": f"You are Viruj PM AI Assistant. Provide helpful, concise advice on project management, R&D timelines, raw materials, and task assignments based on this live context: Projects: {projects}, Tasks: {tasks}."
            }
        ]

        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        messages.append({"role": "user", "content": user_query})

        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.4,
            max_tokens=600
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"Error in AI response: {str(e)}"
