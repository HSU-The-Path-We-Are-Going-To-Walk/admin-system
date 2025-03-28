FROM node:16-alpine

WORKDIR /app

# 필요한 환경 변수 설정
ENV GENERATE_SOURCEMAP=false
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
ENV FAST_REFRESH=false

# 빌드에 필요한 도구 설치 (Webex 모듈 의존성)
RUN apk add --no-cache python3 make g++ git

# 패키지 설치 파일 복사 및 설치
COPY package*.json ./

# 명시적으로 Webex와 지도 SDK 설치 - 의존성 문제 해결
RUN npm install
RUN npm install react-kakao-maps-sdk --force
RUN npm install webex --legacy-peer-deps

# 전체 애플리케이션 복사
COPY . .

# 개발용 서버 시작
EXPOSE 3000
CMD ["npm", "start"]
