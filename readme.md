docker build -t sunkor/grafana -f grafana.dockerfile .
docker build -t sunkor/sensor-listener -f sensor-listener.dockerfile .

docker-compose up -d
docker-compose down
