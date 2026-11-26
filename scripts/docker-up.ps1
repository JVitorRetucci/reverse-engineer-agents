$config = Get-Content -Raw "agents.config.json" | ConvertFrom-Json
$env:HOST_PROJECTS_PATH = $config.runtime.host_projects_mount_source

docker compose up --build
