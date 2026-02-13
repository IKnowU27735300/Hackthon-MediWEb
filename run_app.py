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
    backend_port = "8001"
    
    print(f"[SYSTEM] Initializing MediWeb...")
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
        frontend_cmd = f"node {standalone_path}"
    else:
        # On Windows 'npm' might need to be 'npm.cmd'
        npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
        frontend_cmd = f"{npm_cmd} run dev -- -p {unified_port}"

    # Threads
    backend_thread = threading.Thread(target=run_command, args=(backend_cmd, backend_path, "BACKEND"), daemon=True)
    frontend_thread = threading.Thread(target=run_command, args=(frontend_cmd, frontend_path, "FRONTEND"), daemon=True)

    backend_thread.start()
    time.sleep(5) # Increased wait for backend
    frontend_thread.start()

    print("\n" + "="*50)
    print("🚀 MediWeb is Launching!")
    print(f"🔗 Access the Website: http://localhost:{unified_port}")
    print("="*50 + "\n")

    try:
        while True:
            if not backend_thread.is_alive() and not frontend_thread.is_alive():
                print("🛑 Both services stopped. Exiting.")
                break
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n🛑 Closing MediWeb...")

if __name__ == "__main__":
    run_app()
