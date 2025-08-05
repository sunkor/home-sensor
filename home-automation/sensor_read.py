import os
import glob
import time
import requests
from datetime import datetime
import sys
import logging

# Read configuration from environment
API_ENDPOINT = os.environ.get("API_ENDPOINT")
API_KEY = os.environ.get("API_KEY")
if not API_ENDPOINT:
    raise EnvironmentError("API_ENDPOINT environment variable is not set")
if not API_KEY:
    raise EnvironmentError("API_KEY environment variable is not set")

os.system('modprobe w1-gpio')
os.system('modprobe w1-therm')

base_dir = '/sys/bus/w1/devices/'
device_folders = glob.glob(base_dir + '28*')
if not device_folders:
    raise FileNotFoundError(f"No temperature sensor device found in {base_dir}")
device_file = device_folders[0] + '/w1_slave'

headers = {'Content-type': 'application/json',
           'x-api-key': API_KEY}


def read_temp_raw():
    with open(device_file, "r") as f:
        lines = f.readlines()
    return lines


def read_temp():
    lines = read_temp_raw()
    while lines[0].strip()[-3:] != 'YES':
        time.sleep(0.2)
        lines = read_temp_raw()
    equals_pos = lines[1].find('t=')
    if equals_pos == -1:
        logging.error("Temperature marker 't=' not found in sensor output: %s", lines)
        raise ValueError("Temperature marker 't=' not found in sensor output")
    temp_string = lines[1][equals_pos+2:]
    temp_c = float(temp_string) / 1000.0
    # temp_f = temp_c * 9.0 / 5.0 + 32.0
    today = datetime.now()
    # timeInString = today.strftime("%d/%m/%Y %H:%M:%S")
    data = {'location': 'study_room',
            'temperature': temp_c}
    # sending post request and saving response as response object
    result = requests.post(url=API_ENDPOINT, json=data, headers=headers, timeout=10)
    print(result.reason)
    print(result.status_code)
    print(result.text)
    if 400 <= result.status_code < 500:
        raise ValueError(f"Client error {result.status_code}: {result.text}")
    result.raise_for_status()
    return temp_c


backoff = 1
MAX_BACKOFF = 60

while True:
    try:
        print(read_temp())
        backoff = 1
    except requests.exceptions.RequestException as e:
        logging.exception("Request failed: %s", e)
        logging.error("Retrying in %s seconds", backoff)
        time.sleep(backoff)
        backoff = min(backoff * 2, MAX_BACKOFF)
    except ValueError as e:
        logging.error("Configuration error: %s", e)
        break
    except Exception as e:
        logging.exception("Unexpected error: %s", e)
        break
    time.sleep(1)
