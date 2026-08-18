import streamlit as st
from typing import Any

def inject_custom_css():
    st.markdown("""
    <style>
    /* Main Background & Font Styling */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    /* Modern Glassmorphism Cards */
    .metric-card {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
        margin-bottom: 15px;
        transition: transform 0.2s ease, border-color 0.2s ease;
    }
    
    .metric-card:hover {
        border-color: rgba(59, 130, 246, 0.5);
        transform: translateY(-2px);
    }
    
    .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: #f8fafc;
        line-height: 1.2;
    }
    
    .metric-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: 4px;
    }
    
    /* Status Pills & Badges */
    .status-pill {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    
    .status-active, .status-in-progress {
        background-color: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.3);
    }
    
    .status-completed {
        background-color: rgba(34, 197, 94, 0.2);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.3);
    }
    
    .status-pending {
        background-color: rgba(234, 179, 8, 0.2);
        color: #facc15;
        border: 1px solid rgba(234, 179, 8, 0.3);
    }

    .status-at-risk, .status-delayed {
        background-color: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    /* Custom Sidebar Header */
    .sidebar-header {
        padding: 15px 0;
        text-align: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 20px;
    }
    
    .sidebar-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #3b82f6;
        letter-spacing: 0.025em;
    }
    
    /* Top Bar Header */
    .top-bar {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
    }

    .top-bar-user {
        font-weight: 600;
        color: #f8fafc;
    }

    .top-bar-role {
        font-size: 0.8rem;
        color: #94a3b8;
        background: #0f172a;
        padding: 2px 8px;
        border-radius: 6px;
        margin-left: 8px;
    }

    /* Form Card Container */
    .form-card {
        background: #1e293b;
        padding: 24px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 20px;
    }
    
    /* Hide default Streamlit branding footer */
    footer {visibility: hidden;}
    </style>
    """, unsafe_allow_html=True)

def render_metric_card(label: str, value: Any, delta: str = "", subtext: str = ""):
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-value">{value}</div>
        <div class="metric-label">{label}</div>
        {f'<div style="color: #4ade80; font-size: 0.8rem; margin-top: 4px;">{delta}</div>' if delta else ''}
        {f'<div style="color: #94a3b8; font-size: 0.8rem; margin-top: 4px;">{subtext}</div>' if subtext else ''}
    </div>
    """, unsafe_allow_html=True)
