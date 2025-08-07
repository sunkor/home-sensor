FROM grafana/grafana
USER root
RUN apk update && apk add --no-cache curl
COPY provisioning/ /etc/grafana/provisioning/
COPY dashboards/ /var/lib/grafana/dashboards/
EXPOSE 3000
