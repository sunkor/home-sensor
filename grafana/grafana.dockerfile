FROM grafana/grafana
USER root
RUN apt-get update && apt-get install -y curl
COPY provisioning/ /etc/grafana/provisioning/
COPY dashboards/ /var/lib/grafana/dashboards/
EXPOSE 3000
