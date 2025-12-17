import subprocess
import sys

# increasing timeout or handling input is hard from here, but capturing output is key.
# we'll try a dry run which usually triggers auth check or conflict check without changing remote.
try:
    with open('push_log.txt', 'w', encoding='utf-8') as f:
        try:
            # We use a short timeout so we don't hang if it asks for password on CLI (unlikely on windows default)
            # actually check_output hangs if input is needed.
            # providing input=None means it might fail if it asks.
            out = subprocess.check_output(["git", "push", "origin", "main", "--dry-run"], stderr=subprocess.STDOUT, timeout=10)
            f.write(out.decode('utf-8'))
        except subprocess.TimeoutExpired:
            f.write("Timeout: Command requested input or took too long.")
        except subprocess.CalledProcessError as e:
            f.write(e.output.decode('utf-8'))
except Exception as e:
    with open('push_log.txt', 'w', encoding='utf-8') as f:
        f.write(str(e))
