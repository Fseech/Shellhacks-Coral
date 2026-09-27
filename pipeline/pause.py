"""pause.py - one shared pause switch for every ReefWatch program on the same computer.

The Arduino's button decides it: capture.py raises the flag when the button says
"Paused" and lowers it when the button says "REC". worker.py and analyze.py
check the flag and wait while it is up.

The flag is just a small file in the computer's temp folder, so every program
can see it without talking to each other. A reboot clears it.
"""
import os
import tempfile
import time

PAUSE_FILE = os.environ.get("REEFWATCH_PAUSE_FILE",
                            os.path.join(tempfile.gettempdir(), "reefwatch.paused"))


def is_paused():
    return os.path.exists(PAUSE_FILE)


def set_paused(paused):
    """Raise (True) or lower (False) the flag. Only capture.py calls this."""
    try:
        if paused:
            with open(PAUSE_FILE, "w") as f:
                f.write("paused by the ReefWatch button\n")
        elif os.path.exists(PAUSE_FILE):
            os.remove(PAUSE_FILE)
    except OSError as e:
        print("Could not update the pause flag:", e)


def wait_while_paused(name, check_every=1.0):
    """Blocks while the flag is up. Prints once when pausing and once when resuming."""
    if not is_paused():
        return
    print(f"{name}: paused by the button.", flush=True)
    while is_paused():
        time.sleep(check_every)
    print(f"{name}: resumed.", flush=True)
