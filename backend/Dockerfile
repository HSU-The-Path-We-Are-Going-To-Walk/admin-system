FROM python:3.9-slim

WORKDIR /app

# 디버깅과 문제 해결을 위한 도구 설치
RUN apt-get update && apt-get install -y \
    curl \
    procps \
    && rm -rf /var/lib/apt/lists/*

# 파이썬 환경 최적화
ENV PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 명시적으로 gunicorn과 필요한 추가 의존성 설치
RUN pip install --no-cache-dir gunicorn uvloop httptools

COPY . .

# 기본 명령은 docker-compose에서 오버라이드됨
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
