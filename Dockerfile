FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm i

COPY . .

EXPOSE 5173

CMD ["npx", "vite", "--host"]
