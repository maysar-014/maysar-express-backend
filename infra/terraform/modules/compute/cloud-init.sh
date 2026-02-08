#!/bin/bash
set -e

# Update system
yum update -y

# Install Docker
yum install -y yum-utils device-mapper-persistent-data lvm2
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start Docker
systemctl start docker
systemctl enable docker

# Create application directory
mkdir -p /opt/maysar
cd /opt/maysar

# Create .env file
cat > .env <<EOF
NODE_ENV=${NODE_ENV}
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}
POSTGRES_DB=maysar_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
PORT=${PORT}
EOF

# Create docker-compose.yml (embedded or downloaded)
cat > docker-compose.yml <<'EOF'
version: '3.8'

services:
  app:
    image: ${DOCKER_IMAGE}
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=${NODE_ENV}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    deploy:
      resources:
        limits:
          memory: 512M

  postgres:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_DB: maysar_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 256M

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          memory: 128M

volumes:
  postgres_data:
  redis_data:
EOF

# Pull and start containers
# Using docker-compose directly might fail if image is private or not logged in.
# Assuming public image or credentials handled elsewhere for now. 
# Or user will handle image pull manually.
# For now, we attempt to up.
docker-compose up -d

# Create systemd service for auto-start
cat > /etc/systemd/system/maysar-app.service <<EOF
[Unit]
Description=Maysar Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/maysar
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl enable maysar-app.service

# Prevent idle instance reclamation (minimal activity)
cat > /etc/cron.hourly/keep-alive <<'EOF'
#!/bin/bash
curl -s http://localhost:3000/health > /dev/null
EOF
chmod +x /etc/cron.hourly/keep-alive
