import subprocess
import webbrowser
import time
import sys
import os

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")

    print("Starting FastAPI backend...")
    # Use python -m uvicorn to ensure it works if uvicorn is not in PATH
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--port", "5000", "--reload"],
        cwd=backend_dir
    )

    print("Starting Vite frontend...")
    # Using npm.cmd on Windows
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir
    )

    # Wait for servers to start
    time.sleep(3)
    
    # Open frontend in browser
    # Vite default port is usually 5173
    url = "http://localhost:5173"
    print(f"Opening browser at {url}...")
    webbrowser.open(url)

    try:
        # Keep the script running
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("Shutting down processes...")
        backend_process.terminate()
        frontend_process.terminate()

if __name__ == "__main__":
    main()
