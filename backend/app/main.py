from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import json
from app.data.bus_stops import get_all_bus_stops, get_bus_stop_by_id

app = FastAPI(title="고흥시 버스정류장 관리 시스템 API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 실제 프론트엔드 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    return get_all_bus_stops()


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
    bus_stop = get_bus_stop_by_id(bus_stop_id)
    if bus_stop:
        # WebSocket을 통해 클라이언트에 알림
        await manager.broadcast(
            json.dumps(
                {
                    "busStopId": bus_stop["id"],
                    "busStopName": bus_stop["name"],
                    "lat": bus_stop["lat"],
                    "lng": bus_stop["lng"],
                    "timestamp": None,  # 클라이언트에서 시간 생성
                }
            )
        )
        return {"message": f"Emergency signal sent for bus stop: {bus_stop['name']}"}
    return {"error": "Bus stop not found"}
