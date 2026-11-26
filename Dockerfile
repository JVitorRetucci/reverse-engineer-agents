FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates git bash curl tar \
      fonts-liberation \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libatspi2.0-0 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libexpat1 \
      libfontconfig1 \
      libgbm1 \
      libglib2.0-0 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libx11-6 \
      libx11-xcb1 \
      libxcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxrandr2 \
      libxrender1 \
      libxshmfence1 \
      libxss1 \
      libxtst6 \
    && rm -rf /var/lib/apt/lists/*

RUN case "$(dpkg --print-architecture)" in \
      amd64) SCC_ARCH=x86_64 ;; \
      arm64) SCC_ARCH=arm64 ;; \
      *) echo "Unsupported architecture" && exit 1 ;; \
    esac \
    && curl -fL "https://github.com/boyter/scc/releases/latest/download/scc_Linux_${SCC_ARCH}.tar.gz" -o /tmp/scc.tar.gz \
    && tar -xzf /tmp/scc.tar.gz -C /usr/local/bin scc \
    && rm /tmp/scc.tar.gz

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 4000 4101 4102 4103 4201 4202 4203

CMD ["npm", "run", "dev"]
