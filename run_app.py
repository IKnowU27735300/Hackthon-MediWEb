import subprocess
import sys
import os
import threading
import time

def run_command(command, cwd, name):
    print(f"[{name}] Starting...")
    # On Windows, we need shell=True for npm and other aliases
    process = subprocess.Popen(
        command, 
        cwd=cwd, 
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )
    
    for line in iter(process.stdout.readline, ""):
        print(f"[{name}] {line.strip()}")
    
    process.stdout.close()
    return_code = process.wait()
    if return_code != 0:
        print(f"[{name}] Process exited with code {return_code}")

def run_app():
    root_path = os.path.dirname(os.path.abspath(__file__))
    backend_path = os.path.join(root_path, "backend")
    frontend_path = os.path.join(root_path, "frontend")

    print("Starting MediWeb Backend and Frontend...")
    # Command for backend (FastAPI via Uvicorn) on port 8001
    backend_cmd = f"{sys.executable} -m uvicorn main:app --host 0.0.0.0 --port 8001"

    # Command for frontend (Next.js)
    # Inside Docker (standalone build), we run: node server.js
    # Locally (dev mode), we run: npm run dev
    standalone_path = os.path.join(frontend_path, "server.js")
    if os.path.exists(standalone_path):
        print(f"[SYSTEM] Detected standalone build. Running in PRODUCTION mode.")
        # Standalone server needs to know its port
        os.environ["PORT"] = "8000" 
        frontend_cmd = f"node {standalone_path}"
    else:
        print(f"[SYSTEM] No standalone build found. Running in DEVELOPMENT mode.")
        frontend_cmd = "npm run dev -- -p 8000"

    print(f"DEBUG: backend_cmd={backend_cmd}")
    print(f"DEBUG: frontend_cmd={frontend_cmd}")

    # Create threads for parallel execution
    backend_thread = threading.Thread(
        target=run_command, 
        args=(backend_cmd, backend_path, "BACKEND"),
        daemon=True
    )
    
    frontend_thread = threading.Thread(
        target=run_command, 
        args=(frontend_cmd, frontend_path, "FRONTEND"),
        daemon=True
    )

    # Start processes
    backend_thread.start()
    # Tiny delay to let the backend initialize
    time.sleep(2) 
    frontend_thread.start()

    print("\n" + "="*50)
    print("🚀 MediWeb is taking off on a SINGLE PORT!")
    print(f"🔗 Unified Access Hub: http://localhost:8000")
    print(f"   (Frontend + Backend integrated via Port 8000)")
    print("="*50 + "\n")

    try:
        # Keep the main thread alive while runners are active
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down MediWeb...")
        # Since they are daemon threads, they will close when main exits

if __name__ == "__main__":
    run_app()
