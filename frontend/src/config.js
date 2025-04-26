/**
 * 외부 API 설정 및 환경 변수
 */
const API_CONFIG = {
    // 게시판 업데이트 API 주소와 엔드포인트를 분리 관리
    NOTICES_BASE_URL: "https://d425-211-63-152-142.ngrok-free.app",
    NOTICES_SYNC_ENDPOINT: "/notices/sync2",

    // 기본 로컬 백엔드 API URL (기존 API 엔드포인트용)
    LOCAL_API_URL: "http://localhost:8001"
};

export default API_CONFIG;
