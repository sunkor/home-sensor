import glob
import time
import requests
from datetime import datetime

# defining the api-endpoint
#API_ENDPOINT = "https://j61jqvi1u8.execute-api.ap-southeast-2.amazonaws.com/prod"
API_ENDPOINT = "http://localhost:8080/temperature_data"
headers = {'Content-type': 'application/json'}


def read_temp():
    temp_c = 35.2
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
    print(read_temp())
    time.sleep(1)
