from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import uuid
from models import Emergency
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket 연결을 저장할 변수
connected_clients = set()
emergencies = []


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            print(f"Received message: {data}")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        connected_clients.remove(websocket)


@app.post("/emergency")
async def create_emergency():
    emergency = Emergency(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(),
        status="pending",
        sender={
            "name": "발신자",
            "webex_url": f"https://webex.com/meet/emergency-{uuid.uuid4()}",
        },
    )
    emergencies.append(emergency)

    emergency_dict = {
        "id": emergency.id,
        "timestamp": emergency.timestamp.isoformat(),
        "status": emergency.status,
        "sender": emergency.sender,
    }

    for client in connected_clients.copy():
        try:
            await client.send_json(emergency_dict)
        except Exception as e:
            print(f"Error sending to client: {e}")
            connected_clients.remove(client)

    return emergency


@app.get("/emergencies")
async def get_emergencies():
    return emergencies
