# 송곡정류장 디바이스 시스템

이 프로젝트는 버스 정류장 관리 시스템의 테스트용 송곡정류장 디바이스를 시뮬레이션하는 애플리케이션입니다.

## 주요 기능

1. **관리자 Webex 연결**: 관리자가 연결 신호를 보내면 즉시 Webex 연결 준비
2. **비상 알림**: 비상 버튼을 통해 관리자 페이지로 정류장 비상 알림 전송
3. **실시간 통신**: 웹소켓을 통한 실시간 관리자와의 메시지 통신

## 시스템 구성

- **백엔드**: FastAPI로 구현된 RESTful API 및 웹소켓 서버
- **프론트엔드**: React로 구현된 사용자 인터페이스
- **배포**: Docker 및 Docker Compose를 이용한 컨테이너화

## 시작하기

### 개발 환경 설정

1. 필요한 도구:
   - Docker 및 Docker Compose
   - Node.js 16 이상 (로컬 개발 시)
   - Python 3.9 이상 (로컬 개발 시)

### 실행 방법

#### Docker Compose를 이용한 실행 (권장)

```bash
# 프로젝트 루트 디렉토리에서
cd device

# 서비스 빌드 및 시작
docker-compose up --build

# 백그라운드 실행
docker-compose up -d --build
```

#### 로컬 개발 환경

**백엔드:**
```bash
cd device/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**프론트엔드:**
```bash
cd device/frontend
npm install
npm start
```

## API 엔드포인트

- `GET /` - 디바이스 기본 정보
- `GET /status` - 디바이스 상태 정보
- `POST /emergency` - 비상 알림 트리거
- `WebSocket /ws` - 일반 디바이스 웹소켓 연결
- `WebSocket /ws/admin` - 관리자 웹소켓 연결

## 웹소켓 메시지 형식

### 클라이언트 → 서버

```json
{
  "type": "emergency_button",
  "timestamp": "2023-06-01T12:00:00.000Z"
}
```

### 서버 → 클라이언트

```json
{
  "type": "webex_connection_status",
  "connected": true,
  "with": "admin"
}
```

## 문제 해결

- **웹소켓 연결 실패**: 백엔드 서버가 실행 중인지 확인
- **관리자 연결 불가**: 네트워크 방화벽 설정 확인
- **Docker 실행 오류**: Docker 및 Docker Compose가 최신 버전인지 확인