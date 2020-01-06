import os
import glob
import time
import requests
from datetime import datetime
import sys

os.system('modprobe w1-gpio')
os.system('modprobe w1-therm')

base_dir = '/sys/bus/w1/devices/'
device_folder = glob.glob(base_dir + '28*')[0]
device_file = device_folder + '/w1_slave'

# defining the api-endpoint
API_ENDPOINT = ""
headers = {'Content-type': 'application/json',
           'x-api-key': 'g2Ewlnl4Hw8j5VqucqJJi8OFqE9nDFND5gZfOz51'}


def read_temp_raw():
    f = open(device_file, 'r')
    lines = f.readlines()
    f.close()
    return lines


def read_temp():
    lines = read_temp_raw()
    while lines[0].strip()[-3:] != 'YES':
        time.sleep(0.2)
        lines = read_temp_raw()
    equals_pos = lines[1].find('t=')
    if equals_pos != -1:
        temp_string = lines[1][equals_pos+2:]
        temp_c = float(temp_string) / 1000.0
        temp_f = temp_c * 9.0 / 5.0 + 32.0
        today = datetime.now()
        timeInString = today.strftime("%d/%m/%Y %H:%M:%S")
        data = {'location': 'study_room',
                'temperature': temp_c}
        # sending post request and saving response as response object
        result = requests.post(url=API_ENDPOINT, json=data, headers=headers)
        print(result.reason)
        print(result.status_code)
        print(result.text)
        return temp_c


while True:
    try:
        print(read_temp())
    except:
        e = sys.exc_info()[0]
        print("An exception occured. %s" % e)
    time.sleep(1)
