
import importlib.util
import sys
import types
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

def load_module():
    path = Path(__file__).resolve().parent.parent / 'hello_world.py'
    spec = importlib.util.spec_from_file_location('home_automation.hello_world', path)
    module = importlib.util.module_from_spec(spec)
    pkg = sys.modules.setdefault('home_automation', types.ModuleType('home_automation'))
    spec.loader.exec_module(module)
    sys.modules['home_automation.hello_world'] = module
    setattr(pkg, 'hello_world', module)
    return module

hello_world = load_module()

def test_main_prints_greeting_and_timestamp(capsys):
    class FakeDateTime(datetime):
        @classmethod
        def now(cls):
            return datetime(2023, 1, 1, 12, 0, 0)

    with patch('home_automation.hello_world.datetime', FakeDateTime):
        hello_world.main()

    captured = capsys.readouterr()
    assert 'hello world' in captured.out
    assert '01/01/2023 12:00:00' in captured.out
