/**
 * Webex SDK 설정 및 도우미 함수
 */

// 명확히 토큰 설정
const TOKEN = process.env.REACT_APP_WEBEX_ACCESS_TOKEN ||
    'MTVlYjFhNTAtMWViYy00MGQ3LWE3YTgtNzc4YjNjZWUwNzg2MjNhY2UxNDItMTQw_P0A1_4afba7eb-aa79-414b-83ef-005e438f3e44';

// 토큰 유효성 체크 로깅
console.log('Webex 토큰 설정 확인:', {
    토큰길이: TOKEN.length,
    토큰앞부분: TOKEN.substring(0, 10) + '...'
});

// 토큰 내보내기
export const WEBEX_ACCESS_TOKEN = TOKEN;

// 몇 가지 상수 및 Webex SDK가 필요로 하는 전역 변수 설정
global.Buffer = global.Buffer || require('buffer').Buffer;

if (typeof process === 'undefined') {
    global.process = require('process');
}

// 테스트 연결 함수
export const testWebexConnection = async (webexInstance) => {
    try {
        if (!webexInstance) {
            throw new Error('Webex instance is not initialized');
        }

        // 기본 연결 테스트 - 자신의 정보 가져오기
        const me = await webexInstance.people.get('me');
        console.log('Webex connection successful!', me);

        return {
            success: true,
            user: me
        };
    } catch (error) {
        console.error('Webex connection test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// 명명된 객체 사용
const webexConfig = {
    WEBEX_ACCESS_TOKEN,
    testWebexConnection
};

export default webexConfig;
