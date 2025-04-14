from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import random
import asyncio
import json
from typing import List, Dict, Any
import traceback
from datetime import datetime
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

# 웹엑스 미팅 정보를 저장할 전역 변수
webex_meeting_info = None


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


@app.get("/api/health")
async def health_check():
    """시스템 상태 확인용 엔드포인트"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


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


# 긴급 버튼 신호 시뮬레이션용 API - 디바이스에서도 이 엔드포인트를 호출하도록 함
@app.post("/api/simulate-emergency/{bus_stop_id}")
async def simulate_emergency(bus_stop_id: int):
    print(f"비상 알림 수신: 정류장 ID {bus_stop_id}")
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
                    "timestamp": datetime.now().isoformat(),  # 서버에서 시간 생성
                }
            )
        )
        print(f"비상 알림 전송 완료: {bus_stop['name']}")
        return {"message": f"Emergency signal sent for bus stop: {bus_stop['name']}"}

    print(f"버스 정류장을 찾을 수 없음: ID {bus_stop_id}")
    return {"error": "Bus stop not found"}


@app.post("/update-notices")
async def update_notices(request_data: Dict[str, Any]):
    """
    게시판 데이터를 업데이트하는 API 엔드포인트

    이 엔드포인트는 실제 구현이 완료되면 외부 시스템에서 공지사항을 가져와 업데이트합니다.
    현재는 임시로 50% 확률로 성공 또는 실패를 반환합니다.
    """
    try:
        # 요청 시간 로깅
        print(
            f"게시판 업데이트 요청 받음: {request_data.get('requestTime', '시간 정보 없음')}"
        )

        # 임의로 성공 또는 실패 결정 (테스트용)
        # 실제 구현에서는 이 부분을 실제 게시판 업데이트 로직으로 대체
        if random.random() > 0.5:  # 50% 확률로 성공
            # 성공 응답
            return {
                "status": "success",
                "message": "게시판 데이터가 성공적으로 업데이트되었습니다.",
                "updatedAt": datetime.now().isoformat(),
                "count": random.randint(1, 10),  # 임의의 업데이트 항목 수
            }
        else:
            # 에러 발생 시뮬레이션
            raise HTTPException(
                status_code=500,
                detail="게시판 데이터를 가져오는 중 서버 오류가 발생했습니다.",
            )

    except Exception as e:
        # 에러 로깅
        print(f"게시판 업데이트 처리 중 오류 발생: {str(e)}")
        traceback.print_exc()

        # 클라이언트에 에러 응답
        raise HTTPException(
            status_code=500, detail=f"게시판 업데이트에 실패했습니다: {str(e)}"
        )


# 웹엑스 미팅 정보 저장 API (간소화 버전)
@app.post("/api/webex-meeting")
async def create_webex_meeting(meeting_info: Dict[str, Any]):
    """
    웹엑스 미팅 정보를 저장하는 API 엔드포인트
    """
    global webex_meeting_info
    try:
        # 요청 내용 로깅
        print(f"웹엑스 미팅 정보 저장 요청: {meeting_info}")

        # 미팅 URL 필수 확인
        if "url" not in meeting_info or not meeting_info["url"]:
            raise HTTPException(status_code=400, detail="웹엑스 미팅 URL이 필요합니다.")

        # 생성 시간은 서버에서 생성
        if "created" not in meeting_info:
            meeting_info["created"] = datetime.now().isoformat()

        # 활성화 여부가 없으면 기본값으로 True 설정
        if "active" not in meeting_info:
            meeting_info["active"] = True

        # 미팅 정보 저장
        webex_meeting_info = meeting_info

        print(f"웹엑스 미팅 정보 저장 완료: {webex_meeting_info}")

        return {
            "status": "success",
            "message": "웹엑스 미팅 정보가 성공적으로 저장되었습니다.",
            "timestamp": datetime.now().isoformat(),
            **webex_meeting_info,
        }

    except HTTPException as http_ex:
        # 이미 HTTPException인 경우 그대로 전달
        raise http_ex
    except Exception as e:
        # 에러 로깅
        print(f"웹엑스 미팅 정보 저장 중 오류 발생: {str(e)}")
        traceback.print_exc()

        # 클라이언트에 에러 응답
        raise HTTPException(
            status_code=500, detail=f"웹엑스 미팅 정보 저장에 실패했습니다: {str(e)}"
        )


# 웹엑스 미팅 정보 조회 API
@app.get("/api/webex-meeting")
async def get_webex_meeting():
    """
    현재 활성화된 웹엑스 미팅 정보를 조회하는 API 엔드포인트
    """
    if webex_meeting_info and webex_meeting_info.get("active", False):
        return webex_meeting_info
    else:
        return {"active": False, "message": "활성화된 미팅이 없습니다."}


# 디바이스에서 사용할 웹엑스 미팅 정보 조회 API (간소화 버전)
@app.get("/api/webex-meeting/{bus_stop_id}")
async def get_webex_meeting_for_device(bus_stop_id: int):
    """
    특정 정류장에서 사용할 웹엑스 미팅 정보를 조회하는 API 엔드포인트
    """
    print(f"미팅 정보 요청: 정류장 ID {bus_stop_id}")

    # 요청한 정류장이 존재하는지 확인
    bus_stop = get_bus_stop_by_id(bus_stop_id)
    if not bus_stop:
        raise HTTPException(
            status_code=404,
            detail=f"ID가 {bus_stop_id}인 버스 정류장을 찾을 수 없습니다.",
        )

    # 활성화된 미팅이 있는지 확인
    if not webex_meeting_info or not webex_meeting_info.get("active", False):
        return {
            "active": False,
            "message": "활성화된 미팅이 없습니다.",
            "busStopName": bus_stop["name"],
        }

    # 미팅 정보 반환 (URL만 반환)
    return {
        "active": True,
        "url": webex_meeting_info.get("url", ""),
        "busStopName": bus_stop["name"],
        "busStopId": bus_stop_id,
    }


# 웹엑스 미팅 종료 API
@app.delete("/api/webex-meeting")
async def delete_webex_meeting():
    """
    웹엑스 미팅을 종료하는 API 엔드포인트
    """
    global webex_meeting_info

    if webex_meeting_info:
        # 비활성화 처리
        webex_meeting_info["active"] = False
        webex_meeting_info["ended"] = datetime.now().isoformat()

        print(f"웹엑스 미팅 종료: {webex_meeting_info}")

        return {
            "status": "success",
            "message": "웹엑스 미팅이 종료되었습니다.",
            "timestamp": datetime.now().isoformat(),
        }
    else:
        return {
            "status": "warning",
            "message": "종료할 미팅이 없습니다.",
            "timestamp": datetime.now().isoformat(),
        }
