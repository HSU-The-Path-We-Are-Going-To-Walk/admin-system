#!/bin/bash

# 개발 환경 시작 스크립트
echo "🚀 고흥시 버스정류장 관리 시스템 개발 환경 시작"

# 현재 디렉토리를 프로젝트 루트로 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Docker 컨테이너 상태 확인
if docker-compose ps | grep -q "emergency-button"; then
  echo "✅ 기존 컨테이너가 실행 중입니다"
  
  # 재시작 여부 물어보기
  read -p "컨테이너를 재시작할까요? (y/n): " RESTART
  if [[ "$RESTART" == "y" ]]; then
    echo "🔄 컨테이너를 재시작합니다..."
    docker-compose restart
  fi
else
  echo "🔄 컨테이너를 시작합니다..."
  docker-compose up -d
fi

# 로그 보기
echo "📋 개발 로그를 표시합니다. Ctrl+C로 로그 보기를 중단할 수 있습니다."
docker-compose logs -f

# 사용법
echo "
📝 사용 방법:
- 프론트엔드 UI: http://localhost:3000
- 백엔드 API: http://localhost:8000
- API 문서: http://localhost:8000/docs

문제 발생 시:
- docker-compose restart frontend  # 프론트엔드만 재시작
- docker-compose restart backend   # 백엔드만 재시작
- docker-compose restart          # 모두 재시작
"
