from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import random
import asyncio
import json
import requests
from typing import List, Dict, Any
import traceback
from datetime import datetime
from pydantic import BaseModel
from app.data.bus_stops import get_all_bus_stops, get_bus_stop_by_id


# Cisco 장치 관련 모델
class CiscoDeviceConnection(BaseModel):
    deviceIp: str
    stationName: str
    stationId: int
    username: str = "admin"  # 기본값 설정
    password: str = ""  # 실제 구현에서는 환경변수나 설정에서 가져와야 함


class CiscoDeviceCommand(BaseModel):
    deviceIp: str
    command: str
    stationId: int


class WebexMeetingRequest(BaseModel):
    meetingName: str
    stationName: str
    stationId: int


# Cisco 장치 관리를 위한 변수
cisco_devices = {
    # 송곡 정류장(ID: 450)의 실제 디바이스 정보
    "450": {
        "ip": "192.168.101.3",
        "username": "admin",  # 실제 구현에서는 환경변수에서 로드
        "password": "cisco123",  # 실제 구현에서는 환경변수에서 로드
        "device_type": "Cisco Board 70S",
        "status": "online",
    }
}

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


# Cisco 장치에 연결하는 API
@app.post("/api/connect-cisco-device")
async def connect_cisco_device(connection: CiscoDeviceConnection):
    try:
        # 송곡 정류장(ID: 450)인지 확인
        if str(connection.stationId) != "450":
            return {
                "status": "error",
                "message": "해당 정류장에는 실제 장치가 연결되어 있지 않습니다.",
            }

        # 실제 디바이스 정보 가져오기
        device_info = cisco_devices.get(str(connection.stationId))
        if not device_info:
            return {"status": "error", "message": "장치 정보를 찾을 수 없습니다."}

        # Cisco xAPI 호출
        auth = (
            connection.username or device_info["username"],
            connection.password or device_info["password"],
        )

        url = f"https://{connection.deviceIp}/api/status"

        # 실제 장치 연결 - 보안상의 이유로 SSL 검증 비활성화
        # 실제 프로덕션에서는 적절한 SSL 인증서 설정 필요
        response = requests.get(url, auth=auth, verify=False, timeout=5)

        if response.status_code == 200:
            # 성공적으로 연결됨
            return {
                "status": "success",
                "message": "장치에 성공적으로 연결되었습니다.",
                "deviceInfo": {
                    "name": f"Cisco Board 70S ({connection.stationName})",
                    "ip": connection.deviceIp,
                    "model": "Cisco Webex Board 70S",
                    "serialNumber": f"SN-SONGGOK-{connection.stationId}",
                    "softwareVersion": "ce9.15.3.17",
                    "status": "online",
                },
            }
        else:
            # 연결 실패
            return {
                "status": "error",
                "message": f"장치 연결 실패: HTTP 상태 {response.status_code}",
                "details": response.text,
            }

    except requests.exceptions.RequestException as e:
        # 네트워크 오류
        return {"status": "error", "message": f"장치 연결 중 네트워크 오류: {str(e)}"}
    except Exception as e:
        # 기타 오류
        traceback.print_exc()
        return {"status": "error", "message": f"예상치 못한 오류: {str(e)}"}


# 카메라 제어 명령 전송 API
@app.post("/api/control-cisco-camera")
async def control_cisco_camera(command_request: CiscoDeviceCommand):
    try:
        # 송곡 정류장(ID: 450)인지 확인
        if str(command_request.stationId) != "450":
            return {
                "status": "error",
                "message": "해당 정류장에는 실제 장치가 연결되어 있지 않습니다.",
            }

        # 실제 디바이스 정보 가져오기
        device_info = cisco_devices.get(str(command_request.stationId))
        if not device_info:
            return {"status": "error", "message": "장치 정보를 찾을 수 없습니다."}

        # 명령에 따른 API 엔드포인트와 페이로드 결정
        url = f"https://{command_request.deviceIp}/api/command"
        auth = (device_info["username"], device_info["password"])

        payload = None
        if command_request.command == "zoomIn":
            payload = {"command": "Camera.Zoom", "arguments": {"Direction": "In"}}
        elif command_request.command == "zoomOut":
            payload = {"command": "Camera.Zoom", "arguments": {"Direction": "Out"}}
        elif command_request.command == "panLeft":
            payload = {"command": "Camera.Pan", "arguments": {"Direction": "Left"}}
        elif command_request.command == "panRight":
            payload = {"command": "Camera.Pan", "arguments": {"Direction": "Right"}}
        else:
            return {"status": "error", "message": "지원하지 않는 명령입니다."}

        # 실제 API 호출
        response = requests.post(url, json=payload, auth=auth, verify=False, timeout=5)

        if response.status_code == 200:
            return {
                "status": "success",
                "message": f"{command_request.command} 명령이 성공적으로 전송되었습니다.",
            }
        else:
            return {
                "status": "error",
                "message": f"명령 전송 실패: HTTP 상태 {response.status_code}",
                "details": response.text,
            }

    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": f"명령 전송 중 오류 발생: {str(e)}"}


# Webex 미팅 생성 API
@app.post("/api/create-webex-meeting")
async def create_webex_meeting(meeting_request: WebexMeetingRequest):
    try:
        # 송곡 정류장(ID: 450)인지 확인
        if str(meeting_request.stationId) != "450":
            # 시뮬레이션 모드 - 가상 미팅 URL 반환
            meeting_url = f"https://web.webex.com/meet/{meeting_request.meetingName.replace(' ', '-').lower()}"
            return {
                "status": "success",
                "message": "시뮬레이션 모드: 가상 Webex 미팅이 생성되었습니다.",
                "meetingUrl": meeting_url,
            }

        # 실제 장치가 있는 경우 Webex 미팅 생성
        try:
            # Webex API 호출 - 여기서는 직접 구현하지 않고 시뮬레이션
            # from webexteamssdk import WebexTeamsAPI
            # api = WebexTeamsAPI(access_token=os.environ.get("WEBEX_ACCESS_TOKEN"))
            # meeting = api.meetings.create(
            #     title=meeting_request.meetingName,
            #     password="123456",
            #     start=datetime.now().isoformat(),
            #     end=(datetime.now() + timedelta(hours=1)).isoformat(),
            # )
            # meetingUrl = meeting.webLink

            # 시뮬레이션된 미팅 URL
            meeting_url = f"https://web.webex.com/meet/{meeting_request.meetingName.replace(' ', '-').lower()}"

            # 성공적으로 미팅 생성
            return {
                "status": "success",
                "message": "Webex 미팅이 생성되었습니다.",
                "meetingUrl": meeting_url,
            }

        except Exception as webex_error:
            traceback.print_exc()
            return {
                "status": "error",
                "message": f"Webex 미팅 생성 중 오류: {str(webex_error)}",
            }

    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": f"미팅 생성 중 오류 발생: {str(e)}"}


# Cisco 장치를 Webex 미팅에 초대하는 API
@app.post("/api/dial-cisco-device")
async def dial_cisco_device(data: Dict[str, Any]):
    try:
        device_ip = data.get("deviceIp")
        meeting_url = data.get("meetingUrl")
        station_id = data.get("stationId")

        # 송곡 정류장(ID: 450)인지 확인
        if str(station_id) != "450":
            return {
                "status": "error",
                "message": "해당 정류장에는 실제 장치가 연결되어 있지 않습니다.",
            }

        # 디바이스 정보 가져오기
        device_info = cisco_devices.get(str(station_id))
        if not device_info:
            return {"status": "error", "message": "장치 정보를 찾을 수 없습니다."}

        # Cisco xAPI 다이얼 명령 실행
        url = f"https://{device_ip}/api/command"
        auth = (device_info["username"], device_info["password"])

        payload = {"command": "Dial", "arguments": {"Number": meeting_url}}

        # 실제 API 호출
        response = requests.post(url, json=payload, auth=auth, verify=False, timeout=5)

        if response.status_code == 200:
            return {
                "status": "success",
                "message": "장치가 Webex 미팅에 성공적으로 초대되었습니다.",
            }
        else:
            return {
                "status": "error",
                "message": f"미팅 초대 실패: HTTP 상태 {response.status_code}",
                "details": response.text,
            }

    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": f"미팅 초대 중 오류 발생: {str(e)}"}


# 장치 연결 종료 API
@app.post("/api/disconnect-cisco-device")
async def disconnect_cisco_device(data: Dict[str, Any]):
    try:
        device_ip = data.get("deviceIp")
        station_id = data.get("stationId")

        # 송곡 정류장(ID: 450)인지 확인
        if str(station_id) != "450":
            return {
                "status": "success",
                "message": "시뮬레이션 모드: 가상 장치 연결이 종료되었습니다.",
            }

        # 실제 장치 연결 종료 - 필요한 경우 통화 종료 명령 전송
        device_info = cisco_devices.get(str(station_id))
        if device_info:
            try:
                # 통화 종료 명령 전송
                url = f"https://{device_ip}/api/command"
                auth = (device_info["username"], device_info["password"])

                payload = {"command": "Call.Disconnect"}

                # 실제 API 호출
                response = requests.post(
                    url, json=payload, auth=auth, verify=False, timeout=5
                )

                if response.status_code == 200:
                    return {
                        "status": "success",
                        "message": "장치 연결이 성공적으로 종료되었습니다.",
                    }
                else:
                    return {
                        "status": "error",
                        "message": f"연결 종료 실패: HTTP 상태 {response.status_code}",
                        "details": response.text,
                    }

            except Exception as disconnect_error:
                return {
                    "status": "error",
                    "message": f"연결 종료 중 오류: {str(disconnect_error)}",
                }

        return {"status": "error", "message": "장치 정보를 찾을 수 없습니다."}

    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": f"장치 연결 종료 중 오류 발생: {str(e)}"}


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
