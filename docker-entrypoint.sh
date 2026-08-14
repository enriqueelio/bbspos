#!/bin/sh
set -e

cd /app/packages/db
prisma migrate deploy

cd /app/apps/store
node_modules/.bin/next start -p 3000 &

cd /app/apps/admin
node_modules/.bin/next start -p 3001 &

wait
