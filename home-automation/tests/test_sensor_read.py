import importlib.util
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import os
import subprocess
import pytest


class DummyRequests:
    class exceptions:
        RequestException = Exception

    class HTTPError(Exception):
        pass


requests = DummyRequests()
sys.modules["requests"] = requests


def load_module():
    env = {"API_ENDPOINT": "http://example.com", "API_KEY": "k"}
    path = Path(__file__).resolve().parent.parent / "sensor_read.py"
    spec = importlib.util.spec_from_file_location("sensor_read", path)
    module = importlib.util.module_from_spec(spec)
    with (
        patch.dict(os.environ, env, clear=True),
        patch("subprocess.run", return_value=SimpleNamespace(returncode=0)),
        patch("glob.glob", return_value=["/sys/bus/w1/devices/28-000"]),
    ):
        spec.loader.exec_module(module)
    return module


def test_load_module_failure():
    mod = load_module()
    with patch.object(
        mod.subprocess,
        "run",
        side_effect=mod.subprocess.CalledProcessError(
            1, ["modprobe", "x"], stderr="err"
        ),
    ):
        with pytest.raises(OSError):
            mod._load_module("x")


def test_missing_env():
    path = Path(__file__).resolve().parent.parent / "sensor_read.py"
    spec = importlib.util.spec_from_file_location("sensor_read", path)
    module = importlib.util.module_from_spec(spec)
    with (
        patch.dict(os.environ, {"API_KEY": "k"}, clear=True),
        patch("subprocess.run", return_value=SimpleNamespace(returncode=0)),
        patch("glob.glob", return_value=["/sys/bus/w1/devices/28-000"]),
    ):
        with pytest.raises(EnvironmentError):
            spec.loader.exec_module(module)

