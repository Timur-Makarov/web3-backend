FROM alpine:3.19

RUN apk add --update nodejs npm

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
