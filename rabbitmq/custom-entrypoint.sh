#!/bin/sh
set -e

envsubst < /etc/rabbitmq/definitions.template.json > /etc/rabbitmq/definitions.json

exec /usr/local/bin/docker-entrypoint.sh "$@"