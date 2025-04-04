FROM node:16-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . ./

RUN npm run build

# 프로덕션 환경
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

# nginx 설정 추가
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]