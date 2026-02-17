import subprocess
import os
import sys

os.chdir(r"c:\susan\petapp\backend")
sys.exit(subprocess.call([
    r"C:\susan\petapp\backend\venv\Scripts\python.exe",
    "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"
]))
