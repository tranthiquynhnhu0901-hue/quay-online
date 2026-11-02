FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY index.html styles.css app.js config.js ./
COPY assets ./assets
COPY server ./server
ENV HOST=0.0.0.0 PORT=4173 NODE_ENV=production
EXPOSE 4173
CMD ["npm","start"]
