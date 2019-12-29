docker build -t sunkor/grafana -f .\Monitoring\grafana.dockerfile .
docker build -t sunkor/sensor_listener -f .\sensor_listener.dockerfile .