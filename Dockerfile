FROM node:24-bookworm-slim
WORKDIR /workspaces/attack-name-backend

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .

EXPOSE 8787
CMD ["npm", "run", "dev"]
