import React, { useState, useEffect } from 'react';
import BusStopMap from './components/BusStopMap';
import Sidebar from './components/Sidebar';
import NotificationStack from './components/NotificationStack';
import axios from 'axios';
import './App.css';

function App() {
    // 상태 관리
    const [busStops, setBusStops] = useState([]);
    // 초기 알림 없이 빈 배열로 시작
    const [notifications, setNotifications] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    // 버스 정류장 데이터 로드
    useEffect(() => {
        const fetchBusStops = async () => {
            try {
                console.log('버스 정류장 데이터 요청 시작');
                const response = await axios.get('http://localhost:8000/api/bus-stops');
                console.log('버스 정류장 데이터 응답 수신:', response.data);

                if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                    setBusStops(response.data);
                    setIsLoading(false);
                } else {
                    console.error('버스 정류장 데이터가 비어있거나 잘못된 형식입니다.');
                    setLoadError('버스 정류장 데이터를 불러오지 못했습니다.');
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('버스 정류장 데이터 로드 실패:', error);
                setLoadError(`데이터 로드 실패: ${error.message}`);
                setIsLoading(false);
            }
        };

        fetchBusStops();
    }, []);

    // WebSocket 연결 설정
    useEffect(() => {
        let socket = null;
        let reconnectTimer = null;

        const connectWebSocket = () => {
            try {
                socket = new WebSocket('ws://localhost:8000/ws/emergency');

                socket.onopen = () => {
                    console.log('웹소켓 연결 성공');
                };

                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        const newNotification = {
                            id: Date.now(),
                            busStopId: data.busStopId,
                            busStopName: data.busStopName,
                            message: `${data.busStopName}에서 긴급 버튼이 눌렸습니다!`,
                            timestamp: new Date().toLocaleTimeString()
                        };

                        setNotifications(prev => [newNotification, ...prev].slice(0, 10));
                    } catch (error) {
                        console.error('웹소켓 메시지 처리 오류:', error);
                    }
                };

                socket.onclose = (event) => {
                    console.log('웹소켓 연결 종료:', event.code, event.reason);

                    // 비정상적 종료일 경우 재연결 시도
                    if (event.code !== 1000) {
                        console.log('5초 후 웹소켓 재연결 시도...');
                        reconnectTimer = setTimeout(connectWebSocket, 5000);
                    }
                };

                socket.onerror = (error) => {
                    console.error('웹소켓 오류:', error);
                };
            } catch (err) {
                console.error('웹소켓 연결 중 오류:', err);
            }
        };

        connectWebSocket();

        return () => {
            if (socket) {
                socket.close(1000, "사용자가 페이지를 떠남");
            }
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }
        };
    }, []);

    // 시뮬레이션 긴급 알림 함수 추가
    const simulateEmergency = (busStopId) => {
        console.log(`simulateEmergency 함수 호출됨: 정류장 ID ${busStopId}`);
        const busStop = busStops.find(stop => stop.id === busStopId);
        if (busStop) {
            const newNotification = {
                id: Date.now(),
                busStopId: busStop.id,
                busStopName: busStop.name,
                message: `${busStop.name}에서 긴급 버튼이 눌렸습니다!`,
                timestamp: new Date().toLocaleTimeString()
            };
            console.log("새 알림 생성:", newNotification);
            setNotifications(prev => {
                console.log("이전 알림:", prev);
                const newNotifications = [newNotification, ...prev];
                console.log("업데이트된 알림:", newNotifications);
                return newNotifications;
            });
        } else {
            console.error(`ID가 ${busStopId}인 버스 정류장을 찾을 수 없습니다.`);
        }
    };

    // 컴포넌트에 simulateEmergency 함수 전달
    useEffect(() => {
        window.simulateEmergency = simulateEmergency;
        return () => {
            delete window.simulateEmergency;
        };
    }, [busStops]);

    // 알림 제거 함수
    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    };

    // 디버그 알림 추가 함수
    const addDebugNotification = () => {
        const debugNotification = {
            id: Date.now(),
            busStopId: 999,
            busStopName: 'DEBUG',
            message: '디버그 알림 - F2키로 추가된 알림',
            timestamp: new Date().toLocaleTimeString()
        };
        setNotifications(prev => [debugNotification, ...prev]);
    };

    return (
        <div className="app">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                ☰
            </button>

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {isLoading ? (
                <div className="map-placeholder">
                    <h2>고흥시 버스정류장 관리 시스템</h2>
                    <p>지도를 불러오는 중입니다...</p>
                </div>
            ) : loadError ? (
                <div className="map-placeholder">
                    <h2>데이터 로드 오류</h2>
                    <p>{loadError}</p>
                </div>
            ) : (
                <BusStopMap busStops={busStops} />
            )}

            <NotificationStack
                notifications={notifications}
                onClose={removeNotification}
                onAddDebug={addDebugNotification}
            />
        </div>
    );
}

export default App;
