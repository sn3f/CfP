#!/bin/sh
set -e

envsubst < /etc/redis/users.acl.template > /etc/redis/users.acl
exec redis-server --aclfile /etc/redis/users.acl --appendonly yes --appendfsync everysec
