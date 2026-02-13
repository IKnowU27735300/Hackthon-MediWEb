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

    # Render/Cloud Platforms provide a dynamic PORT
    # Use 8000 as a local fallback
    unified_port = os.environ.get("PORT", "8000")
    # Backend will run on a different internal port
    backend_port = "8001"

    print(f"[SYSTEM] Starting MediWeb on Gateway Port: {unified_port}")

    # Command for backend (FastAPI via Uvicorn)
    backend_cmd = f"python3 -m uvicorn main:app --host 0.0.0.0 --port {backend_port}"

    # Set mandatory Next.js host for Docker/Cloud
    os.environ["HOSTNAME"] = "0.0.0.0"
    os.environ["PORT"] = unified_port

    standalone_path = os.path.join(frontend_path, "server.js")
    if os.path.exists(standalone_path):
        print(f"[SYSTEM] PRODUCTION MODE: Running Next.js standalone.")
        frontend_cmd = f"node {standalone_path}"
    else:
        print(f"[SYSTEM] DEVELOPMENT MODE: Running Next.js dev.")
        frontend_cmd = f"npm run dev -- -p {unified_port}"

    # Create threads
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

    backend_thread.start()
    time.sleep(3) # Give backend a moment to bind
    frontend_thread.start()

    print("\n" + "="*50)
    print("🚀 MediWeb Deployment Status")
    print(f"🔗 Gateway URL: http://0.0.0.0:{unified_port}")
    print(f"🔗 Internal API: http://0.0.0.0:{backend_port}")
    print("="*50 + "\n")

    try:
        while True:
            # Check if threads are still alive
            if not backend_thread.is_alive():
                print("🛑 CRITICAL: Backend thread died!")
                return
            if not frontend_thread.is_alive():
                print("🛑 CRITICAL: Frontend thread died!")
                return
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")

if __name__ == "__main__":
    run_app()
