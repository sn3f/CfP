FROM redis:alpine3.22

RUN apk add --no-cache gettext

COPY ./users.acl.template /etc/redis/users.acl.template
COPY ./docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
