from pydantic import BaseModel
from datetime import datetime


class Emergency(BaseModel):
    id: str
    timestamp: datetime
    status: str = "pending"
    sender: dict = {
        "name": "발신자",
        "webex_url": "https://webex.com/meet/emergency-room",  # 실제 웹엑스 룸 URL로 변경 필요
    }
