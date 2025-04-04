from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import requests
import asyncio
import time
import logging
import os
import socket
from datetime import datetime

# 로깅 설정 개선
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],  # 콘솔에 로그 출력
)
logger = logging.getLogger("송곡정류장_시스템")

app = FastAPI(title="송곡정류장 디바이스 시스템")

# CORS 설정 - 모든 출처 허용 (개발 환경용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포 시 정확한 도메인으로 제한해야 함
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 디바이스 설정
DEVICE_INFO = {
    "name": "송곡정류장",
    "id": "songkok_busstop_450",  # 송곡정류장 ID를 450으로 수정
    "location": {"lat": 37.540, "lng": 127.070},
    "status": "online",
    "last_connection": None,
    "webex_enabled": True,
}

# 중앙 서버 설정 (관리자 시스템)
ADMIN_SERVER_URL = os.environ.get(
    "ADMIN_SERVER_URL", "http://host.docker.internal:8000"
)

logger.info(f"관리자 서버 URL 설정: {ADMIN_SERVER_URL}")


# 클라이언트 웹소켓 연결 관리
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.admin_connection = None  # 관리자 웹소켓 연결
        self.webex_active = False  # Webex 연결 상태

    async def connect(self, websocket: WebSocket, client_type: str):
        await websocket.accept()
        logger.info(f"웹소켓 연결 성공: {client_type}")

        if client_type == "admin":
            self.admin_connection = websocket
            logger.info("관리자가 연결되었습니다.")
            # 관리자에게 연결 확인 메시지 전송
            await self.send_personal_message(
                {"type": "connection_established", "device_info": DEVICE_INFO},
                websocket,
            )
        else:
            self.active_connections.append(websocket)
            logger.info(
                f"새 클라이언트가 연결되었습니다. 현재 연결 수: {len(self.active_connections)}"
            )

    def disconnect(self, websocket: WebSocket):
        if self.admin_connection == websocket:
            self.admin_connection = None
            self.webex_active = False
            logger.info("관리자 연결이 종료되었습니다.")
        elif websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(
                f"클라이언트 연결이 종료되었습니다. 남은 연결 수: {len(self.active_connections)}"
            )

    async def send_personal_message(self, message, websocket: WebSocket):
        if isinstance(message, dict):
            message = json.dumps(message)
        await websocket.send_text(message)

    async def broadcast(self, message):
        if isinstance(message, dict):
            message = json.dumps(message)
        for connection in self.active_connections:
            await connection.send_text(message)
        if self.admin_connection:
            await self.admin_connection.send_text(message)


manager = ConnectionManager()


# 기본 상태 정보
@app.get("/")
async def get_info():
    logger.info("디바이스 정보 요청 받음")
    return {
        "device": DEVICE_INFO,
        "status": "online",
        "timestamp": datetime.now().isoformat(),
    }


# 상태 정보 엔드포인트
@app.get("/status")
async def get_status():
    logger.info("디바이스 상태 정보 요청 받음")
    return {
        "device_id": DEVICE_INFO["id"],
        "name": DEVICE_INFO["name"],
        "status": DEVICE_INFO["status"],
        "webex_enabled": DEVICE_INFO["webex_enabled"],
        "last_connection": DEVICE_INFO["last_connection"],
        "timestamp": datetime.now().isoformat(),
    }


# 비상 알림 전송 엔드포인트 개선
@app.post("/emergency")
async def trigger_emergency(request: Request, background_tasks: BackgroundTasks):
    try:
        # 요청 본문 로깅
        body = await request.json()
        logger.info(f"비상 알림 요청 받음: {body}")

        emergency_data = {
            "device_id": DEVICE_INFO["id"],
            "location_name": DEVICE_INFO["name"],
            "timestamp": datetime.now().isoformat(),
            "location": DEVICE_INFO["location"],
            "type": "emergency_button",
            "message": "비상 버튼이 눌렸습니다. 즉시 조치가 필요합니다.",
        }

        # 비동기로 관리자 서버에 비상 알림 전송
        background_tasks.add_task(send_emergency_to_admin, emergency_data)

        # 연결된 클라이언트에게 브로드캐스트
        message = {"type": "emergency_activated", "data": emergency_data}
        background_tasks.add_task(broadcast_emergency, message)

        # 응답 로깅
        logger.info("비상 알림 처리 성공, 응답 반환")
        return {
            "status": "success",
            "message": "비상 신호를 전송했습니다.",
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"비상 알림 전송 오류: {str(e)}")
        return {"status": "error", "message": f"비상 신호 전송 실패: {str(e)}"}


# 웹소켓 연결 엔드포인트 (클라이언트용)
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_info = f"{websocket.client.host}:{websocket.client.port}"
    logger.info(f"웹소켓 연결 요청: {client_info}")

    await manager.connect(websocket, "client")
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"클라이언트로부터 메시지 받음: {data}")
            try:
                msg = json.loads(data)
                await process_client_message(msg, websocket)
            except json.JSONDecodeError:
                logger.error("잘못된 JSON 형식입니다.")
    except WebSocketDisconnect:
        logger.info(f"클라이언트 연결 종료: {client_info}")
        manager.disconnect(websocket)


# 웹소켓 연결 엔드포인트 (관리자용)
@app.websocket("/ws/admin")
async def websocket_admin_endpoint(websocket: WebSocket):
    client_info = f"{websocket.client.host}:{websocket.client.port}"
    logger.info(f"관리자 웹소켓 연결 요청: {client_info}")

    await manager.connect(websocket, "admin")
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"관리자로부터 메시지 받음: {data}")
            try:
                msg = json.loads(data)
                await process_admin_message(msg, websocket)
            except json.JSONDecodeError:
                logger.error("잘못된 JSON 형식입니다.")
                await manager.send_personal_message(
                    {"type": "error", "message": "잘못된 메시지 형식"}, websocket
                )
    except WebSocketDisconnect:
        logger.info(f"관리자 연결 종료: {client_info}")
        manager.disconnect(websocket)


# 비상 알림을 관리자 서버로 전송 (새로운 엔드포인트 사용)
async def send_emergency_to_admin(emergency_data):
    try:
        # 송곡정류장 ID를 명시적으로 450으로 고정
        numeric_id = 450  # 송곡정류장 ID 고정

        # 새 엔드포인트 URL 생성
        emergency_endpoint = f"{ADMIN_SERVER_URL}/api/simulate-emergency/{numeric_id}"
        logger.info(
            f"관리자 서버로 비상 알림 전송 시도: {emergency_endpoint} (송곡정류장 ID: {numeric_id})"
        )

        # 헤더 준비
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "SongkokDevice/1.0",
        }

        # HTTP 요청 수행 (POST 메소드로 전송)
        logger.info(f"비상 알림 HTTP 요청 시작: {emergency_endpoint}")
        response = requests.post(emergency_endpoint, headers=headers, timeout=5)
        logger.info(f"비상 알림 HTTP 요청 완료: 상태 코드 {response.status_code}")

        if response.status_code != 200:
            response_text = response.text[:200]
            logger.error(
                f"관리자 서버에 비상 알림 전송 실패: {response.status_code}, 응답: {response_text}"
            )
            return False
        else:
            logger.info("관리자 서버에 비상 알림 전송 성공")
            try:
                response_data = response.json()
                logger.info(f"응답 데이터: {response_data}")
            except:
                logger.warning("응답 데이터 파싱 실패")
            return True

    except requests.RequestException as req_err:
        logger.error(f"HTTP 요청 오류: {str(req_err)}")
        return False
    except Exception as e:
        logger.error(f"비상 알림 전송 중 오류 발생: {str(e)}")
        return False


# 비상 알림을 모든 연결된 클라이언트에게 브로드캐스트
async def broadcast_emergency(message):
    await manager.broadcast(message)
    logger.info(f"비상 상황이 모든 클라이언트에게 브로드캐스트되었습니다.")


# 클라이언트 메시지 처리
async def process_client_message(message, websocket):
    msg_type = message.get("type", "")
    logger.info(f"클라이언트 메시지 처리: {msg_type}")

    if msg_type == "ping":
        await manager.send_personal_message({"type": "pong"}, websocket)
        logger.info("PONG 응답 전송")
    elif msg_type == "emergency_button":
        logger.info("비상 버튼 메시지 수신, 처리 중...")
        # 비상 알림 데이터 형식 개선 - busStopId 필드 추가
        device_id_parts = DEVICE_INFO["id"].split("_")
        numeric_id = device_id_parts[-1] if len(device_id_parts) > 1 else "450"

        try:
            # ID를 정수로 변환 시도
            numeric_id = int(numeric_id)
        except ValueError:
            # 변환 실패 시 기본값 사용
            numeric_id = 450

        emergency_data = {
            "device_id": DEVICE_INFO["id"],
            "location_name": DEVICE_INFO["name"],
            "timestamp": datetime.now().isoformat(),
            "location": DEVICE_INFO["location"],
            "type": "emergency_button",
            "message": "비상 버튼이 눌렸습니다. 즉시 조치가 필요합니다.",
            "busStopId": numeric_id,  # 관리자 시스템에서 기대하는 필드 추가
        }

        # 관리자 서버로 비상 알림을 전송하지만, 클라이언트에게는 중복 메시지를 보내지 않음
        await send_emergency_to_admin(emergency_data)

        # 클라이언트 브로드캐스트 제거 - 프론트엔드에서 이미 알림을 표시하고 있음
        # await manager.broadcast({"type": "emergency_activated", "data": emergency_data})

        logger.info("비상 버튼이 활성화되었습니다. (클라이언트 중복 알림 방지)")
    else:
        logger.warning(f"처리되지 않은 메시지 유형: {msg_type}")


# 관리자 메시지 처리
async def process_admin_message(message, websocket):
    msg_type = message.get("type", "")
    logger.info(f"관리자 메시지 처리: {msg_type}")

    if msg_type == "webex_connect_request":
        # Webex 연결 요청
        manager.webex_active = True
        DEVICE_INFO["last_connection"] = datetime.now().isoformat()

        # 관리자에게 연결 확인
        await manager.send_personal_message(
            {
                "type": "webex_connection_established",
                "timestamp": datetime.now().isoformat(),
                "device_info": DEVICE_INFO,
            },
            websocket,
        )

        # 연결된 모든 클라이언트에게도 알림
        await manager.broadcast(
            {"type": "webex_connection_status", "connected": True, "with": "admin"}
        )

        logger.info("관리자와 Webex 연결이 설정되었습니다.")

    elif msg_type == "webex_disconnect":
        # Webex 연결 종료
        manager.webex_active = False

        await manager.send_personal_message(
            {
                "type": "webex_connection_terminated",
                "timestamp": datetime.now().isoformat(),
            },
            websocket,
        )

        await manager.broadcast({"type": "webex_connection_status", "connected": False})

        logger.info("관리자와 Webex 연결이 종료되었습니다.")

    elif msg_type == "admin_message":
        # 관리자의 채팅 메시지
        content = message.get("content", "")
        if content:
            await manager.broadcast(
                {
                    "type": "admin_message",
                    "content": content,
                    "timestamp": datetime.now().isoformat(),
                }
            )
            logger.info(f"관리자 메시지 브로드캐스트: {content}")

    elif msg_type == "ping":
        await manager.send_personal_message({"type": "pong"}, websocket)
        logger.info("관리자 PING에 PONG 응답 전송")

    else:
        logger.warning(f"처리되지 않은 관리자 메시지 유형: {msg_type}")


if __name__ == "__main__":
    import uvicorn

    # 환경 변수에서 포트 가져오기, 기본값은 8001
    port = int(os.environ.get("PORT", 8001))
    logger.info(f"서버를 포트 {port}에서 시작합니다...")

    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
