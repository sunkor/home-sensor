"""Read temperature data from a 1-Wire sensor and send it to an API.

The script expects two environment variables:

``API_ENDPOINT`` – URL of the service that accepts temperature readings.
``API_KEY`` – secret key used for authenticating with the service.
"""

import glob
import logging
import os
import subprocess
import time
from typing import List

import requests

logging.basicConfig(level=logging.INFO)

# Read configuration from environment
API_ENDPOINT = os.environ.get("API_ENDPOINT")
API_KEY = os.environ.get("API_KEY")
if not API_ENDPOINT:
    raise EnvironmentError("API_ENDPOINT environment variable is not set")
if not API_KEY:
    raise EnvironmentError("API_KEY environment variable is not set")


def _load_module(module: str) -> None:
    """Load a kernel module and verify the command succeeds."""
    try:
        subprocess.run([
            "modprobe",
            module,
        ], check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        logging.error(
            "modprobe %s failed with exit code %s: %s",
            module,
            exc.returncode,
            exc.stderr,
        )
        raise OSError(
            f"modprobe {module} failed with exit code {exc.returncode}"
        ) from exc


_load_module("w1-gpio")  # GPIO interface for 1-Wire
_load_module("w1-therm")  # 1-Wire thermometer driver

# Locate the sensor device file
BASE_DIR = "/sys/bus/w1/devices/"
device_folders = glob.glob(BASE_DIR + "28*")
if not device_folders:
    raise FileNotFoundError(f"No temperature sensor device found in {BASE_DIR}")
DEVICE_FILE = device_folders[0] + "/w1_slave"

# Prepare headers for authenticated API requests
HEADERS = {"Content-type": "application/json", "x-api-key": API_KEY}


def read_temp_raw() -> List[str]:
    """Return the raw lines read from the sensor's device file."""
    with open(DEVICE_FILE, "r", encoding="utf-8") as file:
        lines = file.readlines()
    return lines


def read_temp() -> float:
    """Parse temperature from the sensor output and POST it to the API."""
    lines = read_temp_raw()
    while lines[0].strip()[-3:] != "YES":
        time.sleep(0.2)
        lines = read_temp_raw()

    equals_pos = lines[1].find("t=")
    if equals_pos == -1:
        logging.error("Temperature marker 't=' not found in sensor output: %s", lines)
        raise ValueError("Temperature marker 't=' not found in sensor output")

    temp_string = lines[1][equals_pos + 2 :]
    temp_c = float(temp_string) / 1000.0

    # Submit the reading to the remote API
    data = {"location": "study_room", "temperature": temp_c}
    result = requests.post(url=API_ENDPOINT, json=data, headers=HEADERS, timeout=10)
    logging.info(
        "API responded with %s %s", result.status_code, result.reason
    )
    logging.debug("Response body: %s", result.text)
    if 400 <= result.status_code < 500:
        raise ValueError(f"Client error {result.status_code}: {result.text}")
    result.raise_for_status()
    return temp_c


def main() -> None:
    """Continuously read and report temperatures with exponential backoff."""
    backoff = 1
    max_backoff = 60

    while True:
        try:
            temperature = read_temp()
            logging.info("Current temperature: %.3f°C", temperature)
            backoff = 1
        except requests.exceptions.RequestException as exc:
            logging.exception("Request failed: %s", exc)
            logging.error("Retrying in %s seconds", backoff)
            time.sleep(backoff)
            backoff = min(backoff * 2, max_backoff)
        except ValueError as exc:
            logging.error("Configuration error: %s", exc)
            break
        except Exception as exc:  # pragma: no cover - unexpected errors
            logging.exception("Unexpected error: %s", exc)
            break
        time.sleep(1)


if __name__ == "__main__":
    main()
