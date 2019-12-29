FROM grafana/grafana
USER root

RUN apk update
RUN apk add
RUN apk add --update curl

#expose port
EXPOSE 3000