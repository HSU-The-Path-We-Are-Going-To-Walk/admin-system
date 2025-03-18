# 고흥시 버스정류장 관리 시스템

고흥시 버스정류장을 모니터링하고 관리하는 웹 기반 시스템입니다.

## 주요 기능

- 고흥시 지도 위에 버스정류장 위치 표시
- 정류장에서 발생하는 긴급 버튼 이벤트 실시간 알림
- 관리자용 인터페이스
- 반응형 디자인 (모바일/데스크탑)

## 기술 스택

- **백엔드**: FastAPI (Python)
- **프론트엔드**: React
- **배포**: Docker
- **지도**: 카카오 맵 API

## 설치 및 실행 방법

### 요구사항

- Docker 및 Docker Compose
- 카카오 개발자 계정 및 API 키

### 카카오 맵 API 설정

1. [카카오 개발자 사이트](https://developers.kakao.com)에서 계정 생성
2. 애플리케이션 등록 후 JavaScript 키 발급
3. `/frontend/public/index.html` 파일의 `YOUR_KAKAO_APP_KEY` 부분을 발급받은 API 키로 교체

### 실행 방법

1. 저장소 클론
   ```bash
   git clone https://github.com/HSU-The-Path-We-Are-Going-To-Walk/emergency-button.git
   cd emergency-button
   ```

2. Docker Compose로 실행
   ```bash
   docker-compose up -d
   ```

3. 웹 브라우저에서 접속: http://localhost:3000

## 시스템 구성

- 좌측 상단에 햄버거 메뉴 버튼
- 고흥시 지도 중앙 표시
- 우측 하단에 실시간 알림 스택
- 정류장 물리 버튼 작동 시 실시간 알림

## 라이센스

MIT 라이센스를 따릅니다. 세부 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
