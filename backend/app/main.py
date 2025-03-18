from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import json

app = FastAPI(title="고흥시 버스정류장 관리 시스템 API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 실제 프론트엔드 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 버스정류장 더미 데이터
bus_stops = [
    {"id": 1, "name": "고흥버스터미널", "lat": 34.61121, "lng": 127.28501},
    {"id": 2, "name": "고흥군청", "lat": 34.61056, "lng": 127.28456},
    {"id": 3, "name": "녹동항", "lat": 34.45004, "lng": 127.11628},
    {"id": 4, "name": "풍양초등학교", "lat": 34.58345, "lng": 127.33671},
    {"id": 5, "name": "고흥종합병원", "lat": 34.60894, "lng": 127.28561},
]


# WebSocket 연결을 관리하기 위한 클래스
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


@app.get("/")
async def root():
    return {"message": "고흥시 버스정류장 관리 시스템 API"}


@app.get("/api/bus-stops")
async def get_bus_stops():
    return bus_stops


@app.websocket("/ws/emergency")
async def emergency_notification(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # 긴급 버튼 이벤트 처리
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# 긴급 버튼 신호 시뮬레이션용 API
@app.post("/api/simulate-emergency/{bus_stop_id}")
async def simulate_emergency(bus_stop_id: int):
    bus_stop = next((stop for stop in bus_stops if stop["id"] == bus_stop_id), None)
    if bus_stop:
        # 실제 WebSocket을 통해 클라이언트에 알림을 보내는 코드 필요
        return {"message": f"Emergency signal sent for bus stop: {bus_stop['name']}"}
    return {"error": "Bus stop not found"}
