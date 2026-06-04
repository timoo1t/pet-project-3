import sys
import os
import threading
import webbrowser
import time


def resource_path(relative_path):
    """Get path to resource — works for dev and PyInstaller bundle."""
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.dirname(__file__), relative_path)


# Point Flask to bundled templates/static
os.environ["FLASK_TEMPLATE_FOLDER"] = resource_path("templates")
os.environ["FLASK_STATIC_FOLDER"] = resource_path("static")

# History file sits next to the exe so it persists between runs
if hasattr(sys, "_MEIPASS"):
    history_dir = os.path.dirname(sys.executable)
else:
    history_dir = os.path.dirname(__file__)

os.environ["HISTORY_DIR"] = history_dir

from webgui.app import app  # noqa: E402


def open_browser():
    time.sleep(1.2)
    webbrowser.open("http://127.0.0.1:5000")


if __name__ == "__main__":
    threading.Thread(target=open_browser, daemon=True).start()
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)
