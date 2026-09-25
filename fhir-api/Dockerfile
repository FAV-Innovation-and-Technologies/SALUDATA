FROM node:24.19.0-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43

ENV APP_HOME=/src

WORKDIR ${APP_HOME}

COPY package.step1.json ./package.json
COPY package-lock.step1.json ./package-lock.json
COPY scripts/patch-kafkajs-request-queue.js ./scripts/patch-kafkajs-request-queue.js
RUN set -eux; \
    npm ci --omit=dev --ignore-scripts --no-audit --no-fund; \
    node scripts/patch-kafkajs-request-queue.js; \
    rm -rf /usr/local/lib/node_modules/npm /opt/yarn-v1.22.22; \
    rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg;

COPY src/ ./src/

EXPOSE 3000
USER node
CMD ["node", "src/step1-ingestion.js"]
