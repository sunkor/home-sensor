Set-Location -Path Monitoring
docker build -t sunkor/grafana -f grafana.dockerfile .
Set-Location -Path ../SensorListener
docker build -t sunkor/sensor-listener -f sensor-listener.dockerfile .
