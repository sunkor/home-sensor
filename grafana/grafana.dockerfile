FROM grafana/grafana
USER root

RUN apk update
RUN apk add --update curl

COPY provisioning/ /etc/grafana/provisioning/
COPY dashboards/ /var/lib/grafana/dashboards/

#expose port
EXPOSE 3000
