FROM node:16-alpine

WORKDIR /app

# 필요한 환경 변수 설정
ENV GENERATE_SOURCEMAP=false
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
ENV FAST_REFRESH=false

# 패키지 설치 파일 복사 및 설치
COPY package*.json ./
RUN npm install
# 명시적으로 카카오 맵 SDK 패키지 설치
RUN npm install react-kakao-maps-sdk --force

# 전체 애플리케이션 복사
COPY . .

# 개발용 서버 시작
EXPOSE 3000
CMD ["npm", "start"]
