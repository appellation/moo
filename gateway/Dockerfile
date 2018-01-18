FROM node:8-alpine

WORKDIR /usr/src/bot
COPY package.json .

RUN npm i
COPY . .
CMD ["node", "src/index.js"]
