FROM node:latest
WORKDIR /app
COPY package*.json download-models.mjs ./
RUN npm ci
