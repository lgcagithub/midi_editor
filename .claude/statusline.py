import json
import sys
import subprocess

data = json.load(sys.stdin)

# 当前目录名
cwd = data.get("workspace", {}).get("current_dir", ".")
dirname = cwd.replace("\\", "/").split("/")[-1]

# context 用量
pct = int(data.get("context_window", {}).get("used_percentage", 0))

# git 分支
try:
    br = subprocess.run(
        ["git", "branch", "--show-current"],
        capture_output=True, text=True
    ).stdout.strip() or "?"
except Exception:
    br = "?"

# ASCII 输出，兼容 Windows GBK 终端
print(f"dir:{dirname}  branch:{br[:20]}  ctx:{pct}%")
