/**
 * Webex SDK 설정 및 도우미 함수
 */

// Webex API 설정
export const WEBEX_ACCESS_TOKEN = "Cc640913853e50260bde46808d70e771bdb05f6d0b2ec735875a6fd9a9d5273d5"; // 개인 액세스 토큰 입력

// 다른 Webex 관련 설정
export const WEBEX_CONFIG = {
    apiUrl: 'https://api.ciscospark.com/v1',
    clientId: '',  // OAuth 클라이언트 ID (현재 사용되지 않음)
    clientSecret: '', // OAuth 클라이언트 시크릿 (현재 사용되지 않음)
    redirectUri: 'http://localhost:3000/callback'
};

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
