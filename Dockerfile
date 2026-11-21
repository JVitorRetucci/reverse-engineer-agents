FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git bash curl tar \
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
