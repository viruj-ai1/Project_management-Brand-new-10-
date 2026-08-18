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

# 3. Start Backend FastAPI server in background thread if not running
def start_fastapi_backend():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    
    try:
        import uvicorn
        from main import app
        uvicorn.run(app, host="127.0.0.1", port=5000, log_level="error")
    except Exception as e:
        print(f"Backend thread error or already running: {e}")

if "backend_started" not in st.session_state:
    st.session_state["backend_started"] = True
    t = threading.Thread(target=start_fastapi_backend, daemon=True)
    t.start()
    time.sleep(1)

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
    components.html(html_content, height=1000, scrolling=True)
else:
    st.error("Frontend build bundle not found. Please run 'npm run build' in the frontend directory.")
