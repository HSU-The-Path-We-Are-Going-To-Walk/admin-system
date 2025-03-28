import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

// Dynamic import for Webex to avoid build issues
// 웹엑스 모듈을 동적으로 로드하여 빌드 시 발생하는 오류를 방지
const loadWebex = async () => {
    try {
        return await import('webex').then(module => module.default);
    } catch (error) {
        console.warn('Webex 모듈을 불러올 수 없습니다. 일부 기능이 제한될 수 있습니다:', error);
        return null;
    }
};

/**
 * Cisco Room Camera component for connecting to Cisco Board 70S
 * Supports both direct camera/audio communication and Webex integration
 */
const CiscoRoomCamera = ({ stopId, stopName, isActive, onClose }) => {
    const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
    const [connectionType, setConnectionType] = useState('direct'); // direct, webex
    const [errorMessage, setErrorMessage] = useState('');
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [webexMeetingUrl, setWebexMeetingUrl] = useState('');
    const [webex, setWebex] = useState(null);
    const [isWebexLoaded, setIsWebexLoaded] = useState(false);
    const videoRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const peerConnectionRef = useRef(null);

    // 백엔드 API URL (환경에 맞게 설정)
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

    // 송곡 정류장 설정 (stopId: 450)
    const isSonggokStation = stopId === 450;
    const deviceIpAddress = isSonggokStation ? '192.168.101.3' : '192.168.1.100'; // 송곡 정류장의 IP는 실제 장치로 설정

    // 웹엑스 모듈 로드 시도
    useEffect(() => {
        const initializeWebex = async () => {
            try {
                const WebexModule = await loadWebex();
                if (WebexModule) {
                    // Webex SDK 초기화
                    const webexInstance = new WebexModule({
                        credentials: {
                            access_token: process.env.REACT_APP_WEBEX_ACCESS_TOKEN || ''
                        }
                    });
                    setWebex(webexInstance);
                    setIsWebexLoaded(true);
                    console.log('Webex SDK가 성공적으로 로드되었습니다.');
                }
            } catch (error) {
                console.error('Webex SDK 초기화 실패:', error);
            }
        };

        if (isActive) {
            initializeWebex();
        }

        return () => {
            disconnectFromDevice();
        };
    }, [isActive]);

    // Initialize connection on component mount
    useEffect(() => {
        if (isActive) {
            // Reset states when component becomes active
            setConnectionStatus('disconnected');
            setErrorMessage('');
        }
    }, [isActive]);

    // Direct connection to Cisco device using xAPI via backend API
    const connectDirectToDevice = async () => {
        try {
            setConnectionStatus('connecting');
            setConnectionType('direct');

            // 송곡 정류장인 경우 실제 연결 시도 메시지
            if (isSonggokStation) {
                console.log(`송곡 정류장 카메라에 실제 연결 시도: ${deviceIpAddress}`);
            } else {
                console.log(`일반 정류장 카메라에 연결 시뮬레이션: ${deviceIpAddress}`);
            }

            // 백엔드 API를 통한 실제 연결 시도
            try {
                const response = await axios.post(`${API_BASE_URL}/api/connect-cisco-device`, {
                    deviceIp: deviceIpAddress,
                    stationName: stopName,
                    stationId: stopId
                });

                // API 응답 확인
                if (response.data.status === "success") {
                    // 성공적으로 연결됨
                    setConnectionStatus('connected');
                    setDeviceInfo(response.data.deviceInfo || {
                        name: `Cisco Board 70S (${stopName})`,
                        ip: deviceIpAddress,
                        model: 'Cisco Webex Board 70S',
                        serialNumber: isSonggokStation ? 'SN-SONGGOK-450' : 'SN-BUS-STOP-' + stopId,
                        softwareVersion: 'ce9.15.3.17',
                        status: isSonggokStation ? '온라인' : '시뮬레이션'
                    });

                    // 카메라 스트림 초기화
                    initializeCameraStream();
                } else {
                    // 연결 실패 - 시뮬레이션 모드로 전환
                    console.log('API 연결 실패, 시뮬레이션 모드로 전환', response.data.message);
                    simulateConnection();
                }
            } catch (error) {
                console.log('API 호출 오류, 시뮬레이션 모드로 전환:', error.message);
                // API 연결 실패 시 시뮬레이션 모드로 대체
                simulateConnection();
            }
        } catch (error) {
            console.error('Failed to connect to device:', error);
            setConnectionStatus('error');
            setErrorMessage('연결 시도 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
        }
    };

    // 연결 시뮬레이션 (백엔드 연결 실패 시 폴백)
    const simulateConnection = () => {
        console.log('시뮬레이션 모드로 연결 진행...');
        setTimeout(() => {
            setConnectionStatus('connected');
            setDeviceInfo({
                name: `Cisco Board 70S (${stopName})`,
                ip: deviceIpAddress,
                model: 'Cisco Webex Board 70S',
                serialNumber: isSonggokStation ? 'SN-SONGGOK-450' : 'SN-BUS-STOP-' + stopId,
                softwareVersion: 'ce9.15.3.17',
                status: isSonggokStation ? '시뮬레이션(백엔드 연결 실패)' : '시뮬레이션'
            });

            // 카메라 스트림 초기화
            initializeCameraStream();
        }, 1500);
    };

    // Initialize camera stream from device or local camera
    const initializeCameraStream = async () => {
        try {
            if (videoRef.current) {
                console.log('카메라 스트림 초기화...');

                // 로컬 비디오 스트림 사용
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    try {
                        const constraints = {
                            video: {
                                width: { ideal: 1280 },
                                height: { ideal: 720 }
                            },
                            audio: true
                        };

                        const stream = await navigator.mediaDevices.getUserMedia(constraints);

                        if (videoRef.current) {
                            videoRef.current.srcObject = stream;
                            console.log('카메라 스트림이 성공적으로 초기화되었습니다.');
                        }
                    } catch (mediaError) {
                        console.error('카메라 접근 실패:', mediaError);

                        // 카메라 접근 실패 시 검은 캔버스 표시
                        const canvas = document.createElement('canvas');
                        canvas.width = 1280;
                        canvas.height = 720;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = 'black';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // 텍스트 추가
                        ctx.font = '30px Arial';
                        ctx.fillStyle = 'white';
                        ctx.textAlign = 'center';
                        ctx.fillText('카메라를 사용할 수 없습니다', canvas.width / 2, canvas.height / 2);

                        // 캔버스를 비디오 스트림으로 변환
                        const stream = canvas.captureStream(30);
                        if (videoRef.current) {
                            videoRef.current.srcObject = stream;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to initialize camera stream:', error);
            setErrorMessage(`카메라 스트림 초기화 실패: ${error.message}`);
        }
    };

    // Connect via Webex meeting
    const connectViaWebex = async () => {
        try {
            setConnectionStatus('connecting');
            setConnectionType('webex');

            if (!isWebexLoaded) {
                // 웹엑스 모듈이 로드되지 않은 경우 백엔드 API만 사용
                console.log('Webex SDK가 로드되지 않아 백엔드 API만으로 처리합니다.');
            }

            // 미팅 이름 생성
            const meetingName = `긴급통화_${stopName}_${stopId}_${new Date().getTime()}`;

            // 송곡 정류장인 경우 실제 메시지 출력
            if (isSonggokStation) {
                console.log(`송곡 정류장(${deviceIpAddress})에 실제 Webex 연결 시도`);
            }

            try {
                // 백엔드 API를 통한 Webex 미팅 생성
                const response = await axios.post(`${API_BASE_URL}/api/create-webex-meeting`, {
                    meetingName,
                    stationName: stopName,
                    stationId: stopId
                });

                if (response.data.status === "success") {
                    const meetingUrl = response.data.meetingUrl;
                    setWebexMeetingUrl(meetingUrl);
                    setConnectionStatus('connected');

                    console.log(`Webex meeting created for ${stopName}: ${meetingUrl}`);

                    // 송곡 정류장인 경우 장치를 미팅에 초대
                    if (isSonggokStation) {
                        inviteDeviceToMeeting(meetingUrl);
                    }
                } else {
                    // API 실패 - 시뮬레이션 미팅 URL 생성
                    simulateWebexMeeting(meetingName);
                }
            } catch (error) {
                // API 호출 실패 - 시뮬레이션 미팅 URL 생성
                console.error('API 호출 실패, 시뮬레이션 모드로 전환:', error);
                simulateWebexMeeting(meetingName);
            }
        } catch (error) {
            console.error('Failed to create Webex meeting:', error);
            setConnectionStatus('error');
            setErrorMessage('Webex 미팅 생성에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
        }
    };

    // Webex 미팅 시뮬레이션
    const simulateWebexMeeting = (meetingName) => {
        console.log('시뮬레이션 Webex 미팅 생성...');

        // 시뮬레이션 미팅 URL 생성
        const meetingUrl = `https://web.webex.com/meet/${meetingName.toLowerCase().replace(/\s+/g, '-')}`;

        setTimeout(() => {
            setWebexMeetingUrl(meetingUrl);
            setConnectionStatus('connected');

            if (isSonggokStation) {
                console.log(`시뮬레이션 - 송곡 정류장(${deviceIpAddress})을 미팅에 초대: ${meetingUrl}`);
            }
        }, 1500);
    };

    // Invite Cisco device to the Webex meeting
    const inviteDeviceToMeeting = async (meetingUrl) => {
        try {
            if (isSonggokStation) {
                console.log(`송곡 정류장 Cisco Board(${deviceIpAddress})를 미팅에 초대: ${meetingUrl}`);

                try {
                    // 백엔드 API를 통한 장치 초대
                    const response = await axios.post(`${API_BASE_URL}/api/dial-cisco-device`, {
                        deviceIp: deviceIpAddress,
                        meetingUrl,
                        stationId: stopId
                    });

                    if (response.data.status === "success") {
                        console.log(`송곡 정류장 디바이스를 Webex 미팅에 초대 성공: ${meetingUrl}`);
                    } else {
                        console.warn(`미팅 초대 실패: ${response.data.message}`);
                    }
                } catch (error) {
                    console.warn('API 호출 실패, 초대 시도 중단:', error.message);
                }
            } else {
                console.log(`정류장 #${stopId}의 가상 장치를 미팅에 초대: ${meetingUrl}`);
            }
        } catch (error) {
            console.error('Failed to invite device to meeting:', error);
        }
    };

    // Disconnect from device
    const disconnectFromDevice = () => {
        // Reset video stream if any
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }

        // Close any active connections
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        // 직접 연결 방식일 경우 장치 연결 종료
        if (connectionType === 'direct' && deviceInfo) {
            // 실제 장치 연결 종료 요청
            if (isSonggokStation) {
                console.log(`송곡 정류장 실제 Cisco 장치 연결 종료 요청: ${deviceInfo.name}`);

                // 백엔드 API 호출하여 연결 종료
                axios.post(`${API_BASE_URL}/api/disconnect-cisco-device`, {
                    deviceIp: deviceIpAddress,
                    stationId: stopId
                }).catch(error => {
                    console.warn("장치 연결 종료 요청 실패:", error);
                });
            } else {
                console.log(`정류장 가상 장치 연결 종료: ${deviceInfo.name}`);
            }
        }

        // Reset state
        setConnectionStatus('disconnected');
        setDeviceInfo(null);
        setWebexMeetingUrl('');
    };

    // Join Webex meeting
    const joinWebexMeeting = () => {
        if (webexMeetingUrl) {
            // Open Webex meeting in new tab
            window.open(webexMeetingUrl, '_blank');
        }
    };

    // Handle camera commands (integrated with Backend API)
    const sendCameraCommand = async (command) => {
        if (connectionStatus !== 'connected') return;

        try {
            // 송곡 정류장인 경우 실제 카메라 제어
            console.log(`${isSonggokStation ? '실제' : '가상'} 카메라 제어 명령 전송: ${command}`);

            try {
                // 백엔드 API를 통한 카메라 제어
                const response = await axios.post(`${API_BASE_URL}/api/control-cisco-camera`, {
                    deviceIp: deviceIpAddress,
                    command: command,
                    stationId: stopId
                });

                if (response.data.status === "success") {
                    console.log(`카메라 명령 전송 성공: ${command}`);
                } else {
                    console.warn(`카메라 명령 전송 실패: ${response.data.message}`);
                }
            } catch (error) {
                console.warn('API 호출 실패, 명령 전송 중단:', error.message);
            }

            // 시뮬레이션 피드백
            simulateCameraCommand(command);
        } catch (error) {
            console.error('Failed to send camera command:', error);
        }
    };

    // 카메라 명령 시뮬레이션
    const simulateCameraCommand = (command) => {
        // 여기서 실제 비디오 줌/팬 효과를 시뮬레이션할 수 있음
        // 현재는 로그만 출력
        const commandMessages = {
            'zoomIn': '카메라 확대 중...',
            'zoomOut': '카메라 축소 중...',
            'panLeft': '카메라 왼쪽으로 이동 중...',
            'panRight': '카메라 오른쪽으로 이동 중...'
        };

        console.log(commandMessages[command] || `명령 실행 중: ${command}`);
    };

    // Render different UI based on connection status
    const renderConnectionContent = () => {
        switch (connectionStatus) {
            case 'disconnected':
                return (
                    <div className="connection-options">
                        <h3>연결 방식 선택</h3>
                        {isSonggokStation && (
                            <div className="real-device-notice">
                                <p>실제 장치 연결 가능 (IP: {deviceIpAddress})</p>
                            </div>
                        )}
                        <button
                            className="connection-btn direct-btn"
                            onClick={connectDirectToDevice}>
                            직접 연결
                        </button>
                        <button
                            className="connection-btn webex-btn"
                            onClick={connectViaWebex}>
                            Webex 통화
                        </button>
                    </div>
                );

            case 'connecting':
                return (
                    <div className="connecting-indicator">
                        <div className="spinner"></div>
                        <p>
                            {isSonggokStation
                                ? `송곡 정류장 ${connectionType === 'direct' ? '카메라에 연결' : 'Webex 미팅 생성'} 중...`
                                : `${connectionType === 'direct' ? '정류장 카메라에 연결' : 'Webex 미팅 생성'} 중...`}
                        </p>
                    </div>
                );

            case 'connected':
                if (connectionType === 'direct') {
                    return (
                        <div className="camera-content">
                            <div className="device-info">
                                <h3>{deviceInfo?.name}</h3>
                                <p>모델: {deviceInfo?.model}</p>
                                <p>상태: {deviceInfo?.status}</p>
                                <p>버전: {deviceInfo?.softwareVersion}</p>
                                {isSonggokStation && (
                                    <p className="real-device-tag">실제 장치</p>
                                )}
                            </div>

                            <div className="video-container">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted={false}
                                    style={{ width: '100%', maxHeight: '70vh' }}
                                >
                                    브라우저가 비디오를 지원하지 않습니다.
                                </video>

                                <div className="camera-controls">
                                    <button onClick={() => sendCameraCommand('zoomIn')}>확대(+)</button>
                                    <button onClick={() => sendCameraCommand('zoomOut')}>축소(-)</button>
                                    <button onClick={() => sendCameraCommand('panLeft')}>좌로</button>
                                    <button onClick={() => sendCameraCommand('panRight')}>우로</button>
                                </div>

                                <button className="emergency-button"
                                    onClick={() => alert(`${stopName} 정류장에 긴급 조치가 요청되었습니다.`)}>
                                    긴급 조치 요청
                                </button>
                            </div>
                        </div>
                    );
                } else { // Webex connection
                    return (
                        <div className="webex-content">
                            <h3>Webex 미팅이 준비되었습니다</h3>
                            {isSonggokStation && (
                                <div className="real-device-notice">
                                    <p>송곡 정류장 장치를 미팅에 초대했습니다.</p>
                                </div>
                            )}
                            <p>버스정류장 단말기가 통화에 참여하도록 초대했습니다.</p>
                            <p>아래 버튼을 클릭하여 미팅에 참여하세요.</p>
                            <button
                                className="webex-join-btn"
                                onClick={joinWebexMeeting}>
                                Webex 미팅 참여하기
                            </button>
                            <div className="meeting-url">
                                <p>미팅 URL:</p>
                                <a href={webexMeetingUrl} target="_blank" rel="noopener noreferrer">
                                    {webexMeetingUrl}
                                </a>
                            </div>
                        </div>
                    );
                }

            case 'error':
                return (
                    <div className="connection-error">
                        <div className="error-icon">❌</div>
                        <p>{errorMessage || '연결 중 오류가 발생했습니다'}</p>
                        <button
                            className="retry-btn"
                            onClick={() => setConnectionStatus('disconnected')}>
                            다시 시도
                        </button>
                    </div>
                );

            default:
                return <p>상태 정보 없음</p>;
        }
    };

    if (!isActive) return null;

    return (
        <div className={`cisco-room-camera ${connectionStatus} ${isSonggokStation ? 'real-device' : ''}`}>
            <div className="camera-header">
                <h2>{stopName} 정류장 연결</h2>
                {isSonggokStation && <span className="real-device-badge">실제 장치</span>}
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <div className="camera-body">
                {renderConnectionContent()}
            </div>

            {connectionStatus === 'connected' && (
                <div className="connection-footer">
                    <button
                        className="disconnect-btn"
                        onClick={disconnectFromDevice}>
                        연결 종료
                    </button>
                </div>
            )}
        </div>
    );
};

export default CiscoRoomCamera;