from datetime import datetime

msg = "hello world"
print(msg)

today = datetime.now()
print(today.strftime("%d/%m/%Y %H:%M:%S"))
