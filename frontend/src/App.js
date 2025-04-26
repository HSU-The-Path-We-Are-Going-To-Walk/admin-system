import React, { useState, useEffect } from 'react';
import BusStopMap from './components/BusStopMap';
import Sidebar from './components/Sidebar';
import NotificationStack from './components/NotificationStack';
import SearchBar from './components/SearchBar';
import WebexDeviceConnect from './components/WebexDeviceConnect';
import WebexMeetingManager from './components/WebexMeetingManager'; // 웹엑스 미팅 관리 컴포넌트 추가
import emergencySound from './components/EmergencySound';
import API_CONFIG from './config'; // 설정 파일 추가
import axios from 'axios';
import './App.css';

function App() {
    // 상태 관리
    const [busStops, setBusStops] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [searchedStop, setSearchedStop] = useState(null);
    // 액티브 메뉴 상태 추가
    const [activeMenu, setActiveMenu] = useState(null);
    // 알림 내역 저장
    const [emergencyHistory, setEmergencyHistory] = useState([]);
    // 게시판 업데이트 상태 추가
    const [bulletinUpdateStatus, setBulletinUpdateStatus] = useState(null); // 'loading', 'success', 'error' 중 하나
    const [bulletinUpdateMessage, setBulletinUpdateMessage] = useState('');
    const [updatedNotices, setUpdatedNotices] = useState([]);

    // 긴급 알림 활성화 상태 추가
    const [emergencyActive, setEmergencyActive] = useState(false);
    // 카메라 연결 상태 추가
    const [activeCameraStop, setActiveCameraStop] = useState(null);

    // 설정 상태 추가
    const [settings, setSettings] = useState({
        showStopNames: true,      // 정류장 이름 표시
        soundEnabled: true,       // 소리 알림
        notificationDuration: 60,  // 알림 유지시간 (초)
    });

    // localStorage에서 설정 불러오기
    useEffect(() => {
        const savedSettings = localStorage.getItem('mapSettings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }, []);

    // 설정 저장 함수
    const handleSaveSettings = (newSettings) => {
        setSettings(newSettings);
        localStorage.setItem('mapSettings', JSON.stringify(newSettings));
    };

    // 알림음 시스템 초기화
    useEffect(() => {
        emergencySound.init().then(success => {
            if (success) {
                console.log('알림음 시스템 준비 완료');
            } else {
                console.warn('알림음 시스템 초기화 실패');
            }
        });
    }, []);

    // 버스 정류장 데이터 로드
    useEffect(() => {
        const fetchBusStops = async () => {
            try {
                console.log('버스 정류장 데이터 요청 시작');
                const response = await axios.get('http://localhost:8001/api/bus-stops');
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
                socket = new WebSocket('ws://localhost:8001/ws/emergency');

                socket.onopen = () => {
                    console.log('웹소켓 연결 성공');
                };

                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        handleEmergencyMessage(data);
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

    // 화면 깜빡임 효과 활성화 함수
    const activateEmergencyEffect = () => {
        setEmergencyActive(true);

        // 설정된 소리 활성화 여부에 따라 알림음 재생
        if (settings.soundEnabled) {
            emergencySound.play();
        }

        // 5초 후 깜빡임 효과 종료
        setTimeout(() => {
            setEmergencyActive(false);
        }, 2000);
    };

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
                timestamp: new Date().toLocaleTimeString(),
                lat: busStop.lat,
                lng: busStop.lng
            };
            console.log("새 알림 생성:", newNotification);

            // 알림 내역에 추가
            setEmergencyHistory(prev => [newNotification, ...prev]);

            setNotifications(prev => {
                console.log("이전 알림:", prev);
                const newNotifications = [newNotification, ...prev];
                console.log("업데이트된 알림:", newNotifications);
                return newNotifications;
            });

            // 긴급 알림 활성화 (화면 깜빡임 효과 시작)
            activateEmergencyEffect();

            // 정류장으로 자동 이동
            setSearchedStop({
                id: busStop.id,
                name: busStop.name,
                lat: busStop.lat,
                lng: busStop.lng,
                timestamp: Date.now()
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
            timestamp: new Date().toLocaleTimeString(),
            lat: busStops[0]?.lat,
            lng: busStops[0]?.lng
        };
        setNotifications(prev => [debugNotification, ...prev]);
        // 알림 내역에도 추가
        setEmergencyHistory(prev => [debugNotification, ...prev]);

        // 디버그 알림도 긴급 알림 효과 적용
        activateEmergencyEffect();
    };

    // WebSocket 메시지 처리 함수 수정
    const handleEmergencyMessage = (data) => {
        try {
            const newNotification = {
                id: Date.now(),
                busStopId: data.busStopId,
                busStopName: data.busStopName,
                message: `${data.busStopName}에서 긴급 버튼이 눌렸습니다!`,
                timestamp: new Date().toLocaleTimeString(),
                lat: data.lat,
                lng: data.lng
            };

            // 알림 내역에 추가
            setEmergencyHistory(prev => [newNotification, ...prev]);
            setNotifications(prev => [newNotification, ...prev].slice(0, 10));

            // 긴급 알림 활성화
            activateEmergencyEffect();

            // 정류장으로 자동 이동
            setSearchedStop({
                id: data.busStopId,
                name: data.busStopName,
                lat: data.lat,
                lng: data.lng,
                timestamp: Date.now()
            });

            // 설정된 알림 유지시간에 따라 자동 제거 (0이면 수동으로만 제거)
            if (settings.notificationDuration > 0) {
                setTimeout(() => {
                    removeNotification(newNotification.id);
                }, settings.notificationDuration * 1000);
            }
        } catch (error) {
            console.error('알림 처리 중 오류:', error);
        }
    };

    // 검색 핸들러 함수
    const handleSearch = (stop) => {
        // 사이드바 메뉴가 열려있으면 닫기
        if (activeMenu) {
            setActiveMenu(null);
        }

        // 타임스탬프를 추가하여 매번 다른 객체로 인식되도록 함
        setSearchedStop({
            ...stop,
            timestamp: Date.now() // 타임스탬프 추가
        });
    };

    // 게시판 업데이트 함수
    const handleBulletinUpdate = async () => {
        setBulletinUpdateStatus('loading');
        setBulletinUpdateMessage('게시판 업데이트 중...');
        setUpdatedNotices([]);


        try {
            // 설정 파일에서 기본 URL 가져오기
            const baseUrl = API_CONFIG.NOTICES_SYNC_URL;
            // 최종 API URL 구성 (기본 URL 끝에 슬래시가 있는지 확인하고 경로 추가)
            const apiUrl = baseUrl.endsWith('/') ? `${baseUrl}notices/sync` : `${baseUrl}/notices/sync`;

            console.log('게시판 업데이트 요청 URL:', apiUrl); // 요청 URL 확인용 로그 추가

            // API 호출
            const response = await axios.post(apiUrl, {
                requestTime: new Date().toISOString()
            });

            console.log('게시판 업데이트 응답:', response.data);
            // 응답 구조 자세히 확인
            console.log('응답 데이터 타입:', typeof response.data);
            console.log('응답 데이터 키목록:', Object.keys(response.data));

            // 업데이트 성공
            setBulletinUpdateStatus('success');

            // 응답 데이터에서 제목 목록 추출
            // 서버 응답 구조에 따라 적절한 필드 사용
            let noticeTitles = [];

            // data 필드 확인 (일반적인 응답 구조)
            if (response.data.data && Array.isArray(response.data.data)) {
                noticeTitles = response.data.data;
            }
            // titles 필드 확인 (기존 가정했던 구조)
            else if (response.data.titles && Array.isArray(response.data.titles)) {
                noticeTitles = response.data.titles;
            }
            // 응답이 직접 배열인 경우
            else if (Array.isArray(response.data)) {
                noticeTitles = response.data;
            }

            console.log('추출된 게시판 제목 목록:', noticeTitles);

            setUpdatedNotices(noticeTitles);
            setBulletinUpdateMessage(`게시판 데이터가 성공적으로 업데이트되었습니다. (${noticeTitles.length}개)`);

            // 자동 초기화 타임아웃 제거 (결과가 사라지지 않도록)

        } catch (error) {
            console.error('게시판 업데이트 실패:', error);
            setBulletinUpdateStatus('error');
            setBulletinUpdateMessage(`게시판 업데이트에 실패했습니다: ${error.response?.data?.detail || error.message || '연결 오류'}`);
            setUpdatedNotices([]); // 에러 시 목록 초기화
        }
    };

    // 메뉴 선택 핸들러
    const handleMenuSelect = (menuOption) => {
        console.log(`선택된 메뉴: ${menuOption}`);

        // 게시판 업데이트 메뉴를 클릭한 경우, 즉시 업데이트 실행
        if (menuOption === 'bulletin-board') {
            handleBulletinUpdate();
        }

        setActiveMenu(menuOption);
    };

    // 선택된 메뉴에 따라 표시할 컴포넌트 결정
    const renderActiveMenuComponent = () => {
        switch (activeMenu) {
            case 'bus-stops':
                return (
                    <div className="menu-component bus-stops-list">
                        <h2>정류장 목록</h2>
                        <div className="bus-stops-container">
                            {busStops
                                .slice() // 원본 배열을 변경하지 않도록 복사
                                .sort((a, b) => a.name.localeCompare(b.name, 'ko')) // 한글 가나다순 정렬
                                .map(stop => (
                                    <div
                                        key={stop.id}
                                        className="bus-stop-item"
                                        onClick={() => handleSearch(stop)}
                                    >
                                        <div className="bus-stop-name">{stop.name}</div>
                                        <div className="bus-stop-loc">위치: {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}</div>
                                    </div>
                                ))}
                        </div>
                    </div>
                );

            case 'emergency-history':
                return (
                    <div className="menu-component emergency-history">
                        <h2>긴급 알림 내역</h2>
                        <div className="emergency-history-container">
                            {emergencyHistory.length > 0 ? (
                                emergencyHistory.map(notification => (
                                    <div
                                        key={notification.id}
                                        className="emergency-history-item"
                                        onClick={() => {
                                            handleNotificationClick(notification);
                                            setActiveMenu(null); // 메뉴 닫기
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="emergency-time">{notification.timestamp}</div>
                                        <div className="emergency-location">{notification.busStopName}</div>
                                        <div className="emergency-message">{notification.message}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-history-message">긴급 알림 내역이 없습니다.</div>
                            )}
                        </div>
                    </div>
                );

            // 웹엑스 미팅 관리 컴포넌트 추가
            case 'webex-meeting':
                return (
                    <div className="menu-component webex-meeting">
                        <WebexMeetingManager />
                    </div>
                );

            case 'bulletin-board':
                return (
                    <div className="menu-component bulletin-board">
                        <h2>게시판 업데이트</h2>
                        <div className={`bulletin-status ${bulletinUpdateStatus || ''}`}>
                            {bulletinUpdateStatus === 'loading' && (
                                <div className="bulletin-loading">
                                    <div className="bulletin-spinner"></div>
                                    <p>{bulletinUpdateMessage}</p>
                                </div>
                            )}

                            {bulletinUpdateStatus === 'success' && (
                                <div className="bulletin-success">
                                    <div className="success-icon">✓</div>
                                    <p>{bulletinUpdateMessage}</p>
                                    {/* 수집된 게시판 제목 목록 표시 */}
                                    {updatedNotices.length > 0 && (
                                        <div className="bulletin-success-details">
                                            <h4>수집된 게시물 제목:</h4>
                                            <ul className="bulletin-success-list">
                                                {updatedNotices.map((title, index) => (
                                                    <li key={index} className="bulletin-success-item">{title}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {bulletinUpdateStatus === 'error' && (
                                <div className="bulletin-error">
                                    <div className="error-icon">✗</div>
                                    <p>{bulletinUpdateMessage}</p>
                                    <button
                                        className="retry-button"
                                        onClick={handleBulletinUpdate}
                                    >
                                        다시 시도
                                    </button>
                                </div>
                            )}

                            {!bulletinUpdateStatus && (
                                <div className="bulletin-idle">
                                    <p>게시판 데이터를 업데이트하려면 아래 버튼을 클릭하세요.</p>
                                    <button
                                        className="update-button"
                                        onClick={handleBulletinUpdate}
                                    >
                                        게시판 업데이트
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'settings':
                return (
                    <div className="menu-component settings">
                        <h2>설정</h2>
                        <div className="settings-container">
                            <div className="setting-group">
                                <h3>알림 설정</h3>
                                <div className="setting-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={settings.soundEnabled}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                soundEnabled: e.target.checked
                                            }))}
                                        />
                                        소리 알림
                                    </label>
                                </div>
                                <div className="setting-item">
                                    <label>알림 유지시간:
                                        <select
                                            value={settings.notificationDuration}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                notificationDuration: parseInt(e.target.value)
                                            }))}
                                        >
                                            <option value="30">30초</option>
                                            <option value="60">1분</option>
                                            <option value="300">5분</option>
                                            <option value="0">계속 유지</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                            <button
                                className="settings-save-btn"
                                onClick={() => {
                                    handleSaveSettings(settings);
                                    // 설정 저장 후 성공 메시지 표시
                                    alert('설정이 저장되었습니다.');
                                }}
                            >
                                설정 저장
                            </button>
                        </div>
                    </div>
                );

            case 'admin-info':
                return (
                    <div className="menu-component admin-info">
                        <h2>관리자 정보</h2>
                        <div className="admin-info-container">
                            <div className="admin-info-item">
                                <strong>시스템명:</strong> 고흥시 버스정류장 관리 시스템
                            </div>
                            <div className="admin-info-item">
                                <strong>버전:</strong> 1.0.0
                            </div>
                            <div className="admin-info-item">
                                <strong>담당부서:</strong> 고흥시 교통과
                            </div>
                            <div className="admin-info-item">
                                <strong>연락처:</strong> 061-XXX-XXXX
                            </div>
                            <div className="admin-info-item">
                                <strong>이메일:</strong> transport@goheung.go.kr
                            </div>
                            <div className="admin-info-item">
                                <strong>개발:</strong> HSU-ThePathWeAreGoingToWalk-박한빈
                            </div>
                        </div>
                    </div>
                );

            case 'help':
                return (
                    <div className="menu-component help">
                        <h2>도움말</h2>
                        <div className="help-container">
                            <div className="help-section">
                                <h3>시스템 사용법</h3>
                                <ul className="help-list">
                                    <li>
                                        <strong>지도 사용:</strong> 지도를 드래그하여 이동하고, 휠 또는 +/- 버튼으로 확대/축소할 수 있습니다.
                                    </li>
                                    <li>
                                        <strong>정류장 검색:</strong> 상단 검색창에 정류장 이름을 입력하여 특정 정류장을 찾을 수 있습니다.
                                    </li>
                                    <li>
                                        <strong>정류장 정보:</strong> 지도의 정류장 마커를 클릭하면 해당 정류장의 상세 정보를 확인할 수 있습니다.
                                    </li>
                                    <li>
                                        <strong>알림 관리:</strong> 우측 하단에 표시되는 긴급 알림은 X 버튼을 클릭하여 닫을 수 있습니다.
                                    </li>
                                    <li>
                                        <strong>카메라 연결:</strong> 정류장 정보 창에서 카메라 연결 버튼을 클릭하면 해당 정류장의 실시간 화면을 볼 수 있습니다.
                                    </li>
                                    <li>
                                        <strong>게시판 업데이트:</strong> 메뉴에서 게시판 업데이트 버튼을 클릭하여 최신 공지사항을 업데이트할 수 있습니다.
                                    </li>
                                </ul>
                            </div>
                            <div className="help-section">
                                <h3>긴급 알림 시스템</h3>
                                <p>
                                    본 시스템은 각 정류장에 설치된 긴급 버튼으로부터 신호를 받아 실시간으로 관리자에게 알림을 전달합니다.
                                    긴급 상황 발생 시 즉시 해당 위치로 이동하여 조치를 취할 수 있도록 지원합니다.
                                </p>
                            </div>
                            <div className="help-section">
                                <h3>문제 해결</h3>
                                <p>
                                    시스템 사용 중 문제가 발생하면 관리자 정보의 연락처로 문의해 주세요.
                                    기술적인 문제는 개발팀에서 지원합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // 알림 클릭 핸들러 추가
    const handleNotificationClick = (notification) => {
        // 검색과 동일한 방식으로 위치 이동
        const stop = {
            id: notification.busStopId,
            name: notification.busStopName,
            lat: notification.lat,
            lng: notification.lng,
            timestamp: Date.now()
        };
        setSearchedStop(stop);
    };

    // 카메라 연결 핸들러 함수
    const handleConnectToCamera = (busStop) => {
        console.log(`카메라 연결 요청: ${busStop.name} (ID: ${busStop.id})`);
        setActiveCameraStop(busStop);
    };

    // 해당 함수를 window 객체에 연결
    useEffect(() => {
        window.connectToCamera = (stopId) => {
            const stop = busStops.find(s => s.id === stopId);
            if (stop) {
                handleConnectToCamera(stop);
            } else {
                console.error(`ID가 ${stopId}인 버스 정류장을 찾을 수 없습니다.`);
            }
        };

        return () => {
            delete window.connectToCamera;
        };
    }, [busStops]);

    return (
        <div className={`app ${activeMenu ? 'menu-active' : ''} ${emergencyActive ? 'emergency-active' : ''}`}>
            <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                ☰
            </button>

            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onMenuSelect={handleMenuSelect}
            />

            {/* 활성화된 메뉴 컴포넌트 */}
            {activeMenu && (
                <div className="active-menu-overlay">
                    <div className="active-menu-container">
                        <button
                            className="close-menu-btn"
                            onClick={() => setActiveMenu(null)}
                        >
                            ×
                        </button>
                        {renderActiveMenuComponent()}
                    </div>
                </div>
            )}

            {/* 긴급 알림 오버레이 */}
            {emergencyActive && (
                <div className="emergency-overlay"></div>
            )}

            {/* 카메라 연결 오버레이 */}
            {activeCameraStop && (
                <div className="active-camera-overlay">
                    <div className="active-camera-container">
                        <WebexDeviceConnect
                            busStop={activeCameraStop}
                            onClose={() => setActiveCameraStop(null)}
                        />
                    </div>
                </div>
            )}

            {/* 검색창 추가 */}
            <div className="search-bar-wrapper">
                <SearchBar busStops={busStops} onSearch={handleSearch} />
            </div>

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
                <BusStopMap
                    busStops={busStops}
                    searchedStop={searchedStop}
                    activeEmergencies={notifications}
                    isSidebarOpen={sidebarOpen}
                />
            )}

            <NotificationStack
                notifications={notifications}
                onClose={removeNotification}
                onAddDebug={addDebugNotification}
                onNotificationClick={handleNotificationClick}
            />
        </div>
    );
}

export default App;
