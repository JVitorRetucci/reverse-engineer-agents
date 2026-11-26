#!/usr/bin/env sh
set -eu

HOST_PROJECTS_PATH="$(node -e "const c=require('./agents.config.json'); process.stdout.write(c.runtime?.host_projects_mount_source || '..')")"
export HOST_PROJECTS_PATH

docker compose up --build
