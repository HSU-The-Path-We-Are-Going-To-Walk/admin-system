FROM node:18-alpine

WORKDIR /app

# 패키지 설치 전 의존성 파일 복사
COPY package.json package-lock.json* ./

# customize-cra 및 react-app-rewired 먼저 설치
RUN npm install --save react-app-rewired customize-cra

# 나머지 의존성 설치
RUN npm install --legacy-peer-deps

# 소스 코드 복사
COPY . .

# 실행 스크립트 설정
CMD ["npm", "start"]

# 노출 포트
EXPOSE 3000
