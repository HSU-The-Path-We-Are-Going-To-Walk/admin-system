import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import WebexConnection from './components/WebexConnection';
import EmergencyButton from './components/EmergencyButton';
import DeviceInfo from './components/DeviceInfo';
import MessageLog from './components/MessageLog';

function App() {
    const [webexStatus, setWebexStatus] = useState('disconnected'); // disconnected, connecting, connected
    const [messages, setMessages] = useState([]);
    const [lastEmergency, setLastEmergency] = useState(null);
    const [deviceInfo, setDeviceInfo] = useState({
        name: '송곡정류장',
        id: 'songkok_busstop_001',
        status: 'online'
    });

    const websocketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    // 웹소켓 연결 초기화
    useEffect(() => {
        connectWebsocket();

        return () => {
            if (websocketRef.current) {
                websocketRef.current.close();
            }

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    // 웹소켓 연결 함수
    const connectWebsocket = () => {
        try {
            // Nginx 프록시를 통해 웹소켓 연결 (포트 지정 없이)
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host; // 포트 번호 포함
            const wsUrl = `${wsProtocol}//${host}/ws`;

            console.log(`웹소켓 연결 시도: ${wsUrl}`);
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('웹소켓 연결 성공');
                addMessage({ type: 'system', content: '시스템이 온라인 상태입니다.' });

                // 5초마다 핑 메시지 전송
                const pingInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 5000);

                // 연결이 끊어지면 interval 제거
                ws.onclose = () => {
                    clearInterval(pingInterval);
                    console.log('웹소켓 연결 종료됨');
                    addMessage({ type: 'system', content: '서버와의 연결이 종료되었습니다. 재연결 중...' });

                    // 3초 후에 재연결 시도
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectWebsocket();
                    }, 3000);
                };
            };

            ws.onerror = (error) => {
                console.error('웹소켓 오류:', error);
                addMessage({ type: 'error', content: '서버 연결 오류가 발생했습니다.' });
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebsocketMessage(data);
                } catch (error) {
                    console.error('메시지 파싱 오류:', error);
                }
            };

            websocketRef.current = ws;
        } catch (error) {
            console.error('웹소켓 연결 실패:', error);
            addMessage({ type: 'error', content: '서버 연결에 실패했습니다. 재연결 중...' });

            // 3초 후에 재연결 시도
            reconnectTimeoutRef.current = setTimeout(() => {
                connectWebsocket();
            }, 3000);
        }
    };

    // 웹소켓 메시지 처리 함수
    const handleWebsocketMessage = (data) => {
        console.log('수신된 메시지:', data);

        switch (data.type) {
            case 'pong':
                // 핑-퐁 응답, 특별한 처리 없음
                break;

            case 'webex_connection_status':
                setWebexStatus(data.connected ? 'connected' : 'disconnected');
                addMessage({
                    type: 'system',
                    content: data.connected
                        ? '관리자와 Webex 연결이 설정되었습니다.'
                        : 'Webex 연결이 종료되었습니다.'
                });
                break;

            case 'admin_message':
                addMessage({ type: 'admin', content: data.content });
                break;

            case 'emergency_activated':
                setLastEmergency(new Date().toISOString());
                // 비상 알림 메시지를 서버에서 받을 때는 추가하지 않음 (프론트엔드에서 이미 추가함)
                console.log('서버로부터 emergency_activated 이벤트를 받았습니다 (메시지 중복 방지)');
                break;

            default:
                console.log('처리되지 않은 메시지 유형:', data.type);
        }
    };

    // 메시지 추가 함수
    const addMessage = (message) => {
        setMessages(prevMessages => [
            ...prevMessages,
            { ...message, timestamp: new Date().toISOString() }
        ]);
    };

    // 비상 버튼 클릭 핸들러
    const handleEmergencyButtonClick = async () => {
        try {
            // 버튼 클릭 시 항상 메시지 추가 (한 번만)
            setLastEmergency(new Date().toISOString());
            addMessage({
                type: 'emergency',
                content: '비상 알림이 발송되었습니다! 관리자가 곧 응답할 것입니다.'
            });

            if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
                // 웹소켓을 통해 비상 메시지 전송
                console.log('웹소켓을 통해 비상 메시지 전송');
                websocketRef.current.send(JSON.stringify({
                    type: 'emergency_button',
                    timestamp: new Date().toISOString()
                }));
            } else {
                // 웹소켓 연결이 없는 경우 직접 API 호출
                console.log('HTTP를 통해 비상 알림 전송');

                // Nginx 프록시를 통해 API 요청 (포트 지정 없이)
                const apiUrl = `/emergency`;
                console.log(`비상 알림 전송 API URL: ${apiUrl}`);

                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            timestamp: new Date().toISOString(),
                            deviceId: deviceInfo.id,
                            deviceName: deviceInfo.name
                        })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`비상 알림 응답 오류: ${response.status} - ${errorText}`);
                        throw new Error(`비상 알림 전송 실패 (상태 코드: ${response.status})`);
                    }

                    const responseData = await response.json();
                    console.log('비상 알림 응답:', responseData);
                } catch (fetchError) {
                    console.error('Fetch 오류:', fetchError);
                    throw new Error(`비상 알림 전송 실패: ${fetchError.message}`);
                }
            }
        } catch (error) {
            console.error('비상 알림 전송 오류:', error);
            addMessage({ type: 'error', content: `비상 알림 전송에 실패했습니다: ${error.message}` });
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>송곡정류장 디바이스</h1>
            </header>

            <main className="App-main">
                <DeviceInfo deviceInfo={deviceInfo} />

                <div className="device-controls">
                    <WebexConnection status={webexStatus} />
                    <EmergencyButton onClick={handleEmergencyButtonClick} lastEmergency={lastEmergency} />
                </div>

                <MessageLog messages={messages} />
            </main>

            <footer className="App-footer">
                &copy; 2023 송곡정류장 디바이스 시스템 v1.0
            </footer>
        </div>
    );
}

export default App;