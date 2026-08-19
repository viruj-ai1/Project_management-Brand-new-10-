import streamlit as st
import streamlit.components.v1 as components
import os
import sys
import threading
import time

# 1. Page Configuration
st.set_page_config(
    page_title="Viruj Chematrix",
    page_icon="🧪",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# 2. Inject CSS to hide default Streamlit header & padding for a seamless full-screen web app experience
st.markdown("""
<style>
    /* Hide Streamlit header, footer, and sidebar padding for full viewport application */
    header {visibility: hidden;}
    footer {visibility: hidden;}
    #MainMenu {visibility: hidden;}
    .block-container {
        padding: 0rem !important;
        margin: 0rem !important;
        max-width: 100% !important;
    }
    iframe {
        width: 100% !important;
        border: none !important;
        min-height: 100vh !important;
    }
</style>
""", unsafe_allow_html=True)

# 3. Start Backend FastAPI server in background process if not running
def start_fastapi_backend():
    import socket
    import subprocess
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
        
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    is_open = (sock.connect_ex(('127.0.0.1', 8000)) == 0)
    sock.close()
    
    if not is_open:
        print("Starting FastAPI backend server process on port 8000...")
        subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
            cwd=backend_dir
        )
        time.sleep(2)

if "backend_started" not in st.session_state:
    st.session_state["backend_started"] = True
    start_fastapi_backend()

# 4. Ensure bundle.html is built
bundle_path = os.path.join(os.path.dirname(__file__), "frontend", "dist", "bundle.html")
if not os.path.exists(bundle_path):
    try:
        from build_bundle import build_standalone_bundle
        build_standalone_bundle()
    except Exception as e:
        print(f"Build bundle error: {e}")

# 5. Serve & Render the EXACT Original React Frontend Application
if os.path.exists(bundle_path):
    with open(bundle_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    render_backend = "https://project-management-brand-new-10-1.onrender.com"
    try:
        if "BACKEND_URL" in st.secrets:
            render_backend = st.secrets["BACKEND_URL"].rstrip("/api").rstrip("/")
    except Exception:
        pass

    # Dynamically map local backend URLs in bundle HTML to the live Render backend
    html_content = html_content.replace('http://127.0.0.1:8000', render_backend)
    html_content = html_content.replace('http://127.0.0.1:5000', render_backend)
    html_content = html_content.replace('http://localhost:8000', render_backend)
    html_content = html_content.replace('http://localhost:5000', render_backend)

    components.html(html_content, height=1000, scrolling=True)
else:
    st.error("Frontend build bundle not found. Please run 'npm run build' in the frontend directory.")

