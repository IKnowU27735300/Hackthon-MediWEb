import subprocess
import sys
import os
import threading
import time

def kill_port(port):
    try:
        if os.name == 'nt':  # Windows
            output = subprocess.check_output(f'netstat -aon | findstr :{port}', shell=True).decode()
            for line in output.strip().split('\n'):
                if f'LISTENING' in line and f':{port}' in line:
                    parts = line.strip().split()
                    pid = parts[-1]
                    if pid != '0':
                        print(f"[SYSTEM] Cleaning up port {port} (killing PID {pid})...")
                        subprocess.run(f'taskkill /f /pid {pid}', shell=True, capture_output=True)
    except Exception:
        pass

def run_command(command, cwd, name):
    print(f"[{name}] Starting: {command}")
    try:
        process = subprocess.Popen(
            command, 
            cwd=cwd, 
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
            env=os.environ.copy()
        )
        
        for line in iter(process.stdout.readline, ""):
            print(f"[{name}] {line.strip()}")
        
        process.stdout.close()
        return_code = process.wait()
        if return_code != 0:
            print(f"[{name}] Process exited with code {return_code}")
    except Exception as e:
        print(f"[{name}] FAILED TO START: {str(e)}")

def run_app():
    root_path = os.path.dirname(os.path.abspath(__file__))
    backend_path = os.path.join(root_path, "backend")
    frontend_path = os.path.join(root_path, "frontend")

    unified_port = os.environ.get("PORT", "8000")
    backend_port = os.environ.get("BACKEND_PORT", "8001")
    
    print(f"\n" + "="*50)
    print(f"🛠️  MEDIWEB DEPLOYMENT SYSTEM")
    print(f"🌐 Main URL/Port (Frontend): {unified_port}")
    print(f"⚙️  System Port (Backend): {backend_port}")
    print("="*50 + "\n")

    print(f"[SYSTEM] Cleaning up ports...")
    kill_port(unified_port)
    kill_port(backend_port)

    # Dependency check for backend
    try:
        import sqlalchemy
    except ImportError:
        print(f"[SYSTEM] Installing missing backend libraries...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "sqlalchemy", "fastapi", "uvicorn", "pydantic", "python-dotenv", "python-multipart", "emails", "twilio", "psycopg2-binary"])

    # Configure Environment
    os.environ["HOSTNAME"] = "0.0.0.0"
    os.environ["PORT"] = unified_port
    os.environ["PYTHONPATH"] = backend_path

    # Commands
    backend_cmd = f"{sys.executable} -m uvicorn main:app --host 0.0.0.0 --port {backend_port}"
    
    # Check for standalone or dev mode
    standalone_path = os.path.join(frontend_path, "server.js")
    if os.path.exists(standalone_path):
        print(f"[FRONTEND] Found production build (server.js).")
        frontend_cmd = f"node {standalone_path}"
    else:
        # On Windows 'npm' might need to be 'npm.cmd'
        npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
        if os.environ.get("NODE_ENV") == "production":
            print(f"[FRONTEND] Starting in Production mode via npm.")
            frontend_cmd = f"{npm_cmd} run start -- -p {unified_port}"
        else:
            print(f"[FRONTEND] Starting in Development mode via npm.")
            frontend_cmd = f"{npm_cmd} run dev -- -p {unified_port}"

    # Threads
    backend_thread = threading.Thread(target=run_command, args=(backend_cmd, backend_path, "BACKEND"), daemon=True)
    frontend_thread = threading.Thread(target=run_command, args=(frontend_cmd, frontend_path, "FRONTEND"), daemon=True)

    print("[SYSTEM] Starting Backend...")
    backend_thread.start()
    
    print("[SYSTEM] Waiting for backend to warm up...")
    time.sleep(8) 
    
    print("[SYSTEM] Starting Frontend...")
    frontend_thread.start()

    print("\n🚀 MediWeb is Launching!")
    print(f"🔗 Main Interface: http://{os.environ.get('HOSTNAME', 'localhost')}:{unified_port}")
    print(f"🛡️  Backend API: http://{os.environ.get('HOSTNAME', 'localhost')}:{backend_port}")

    try:
        while True:
            if not backend_thread.is_alive() or not frontend_thread.is_alive():
                b_stat = "RUNNING" if backend_thread.is_alive() else "STOPPED"
                f_stat = "RUNNING" if frontend_thread.is_alive() else "STOPPED"
                print(f"[MONITOR] Status: Backend={b_stat}, Frontend={f_stat}")
                if not backend_thread.is_alive() and not frontend_thread.is_alive():
                    break
            time.sleep(5)
    except KeyboardInterrupt:
        print("\n🛑 Closing MediWeb...")

if __name__ == "__main__":
    run_app()
