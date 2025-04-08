import React, { useEffect, useState, useRef, useCallback } from 'react';
import Webex from 'webex';
import { WEBEX_ACCESS_TOKEN } from '../WebexConfiguration';

/**
 * Webex Device Connection Component
 * 
 * 관리자가 버튼을 누르면 즉시 연결하는 컴포넌트
 * - 관리자는 디바이스 카메라를 볼 수 있음
 * - 양방향 오디오 지원
 */
const WebexDeviceConnect = ({ busStop, onClose }) => {
    const [status, setStatus] = useState('idle');
    const [webexSession, setWebexSession] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const videoRef = useRef(null);
    const webexRef = useRef(null);
    const meetingRef = useRef(null);

    // cleanupMeeting 함수를 useCallback으로 감싸서 의존성 문제 해결
    const cleanupMeeting = useCallback(() => {
        if (meetingRef.current) {
            try {
                meetingRef.current.leave()
                    .catch(e => console.warn('미팅 종료 중 오류:', e.message));
            } catch (e) {
                console.error('미팅 정리 중 오류:', e);
            }
            meetingRef.current = null;
        }

        if (localStream) {
            try {
                localStream.getTracks().forEach(track => track.stop());
            } catch (e) {
                console.warn('로컬 미디어 스트림 정리 중 오류:', e);
            }
        }

        if (webexRef.current && typeof webexRef.current.meetings.stopLocalMediaStreams === 'function') {
            try {
                webexRef.current.meetings.stopLocalMediaStreams();
            } catch (e) {
                console.warn('로컬 미디어 중지 중 오류:', e);
            }
        }
    }, [localStream]);

    // Webex SDK 인스턴스 생성 및 초기화
    useEffect(() => {
        console.log('Initializing Webex SDK');

        const initializeWebex = async () => {
            try {
                // 명시적인 초기화 옵션 추가
                const config = {
                    credentials: {
                        access_token: WEBEX_ACCESS_TOKEN
                    },
                    logger: {
                        level: 'debug' // 개발용 상세 로깅
                    },
                    meetings: {
                        reconnection: {
                            enabled: true
                        },
                        mediaSettings: {
                            receiveVideo: true,
                            receiveAudio: true,
                            receiveShare: true
                        }
                    }
                };

                webexRef.current = new Webex(config);
                console.log('Webex SDK 객체 생성됨');

                try {
                    // 인증 검증 - 필수
                    const me = await webexRef.current.people.get('me');
                    console.log('Webex 인증 성공:', me.displayName);

                    // 명시적으로 디바이스 등록
                    try {
                        if (webexRef.current.internal && webexRef.current.internal.device) {
                            await webexRef.current.internal.device.register();
                            console.log('Webex 디바이스 등록 성공');
                        }
                    } catch (deviceErr) {
                        console.warn('디바이스 등록 중 비치명적 오류:', deviceErr.message);
                    }

                    // 미팅 시스템 준비
                    try {
                        if (webexRef.current.meetings && typeof webexRef.current.meetings.register === 'function') {
                            await webexRef.current.meetings.register();
                            console.log('Webex 미팅 시스템 등록 성공');
                        }
                    } catch (regErr) {
                        console.warn('미팅 시스템 등록 중 비치명적 오류:', regErr.message);
                    }

                    setIsInitialized(true);
                } catch (authErr) {
                    throw new Error('인증 실패: ' + authErr.message);
                }

            } catch (error) {
                console.error('Webex 초기화 오류:', error);
                setErrorMessage(`Webex 초기화 오류: ${error.message}`);
                setStatus('error');
            }
        };

        initializeWebex();

        return () => {
            cleanupMeeting();
        };
    }, [cleanupMeeting]);

    // 직접 통화 연결 함수
    const initiateWebexCall = async () => {
        try {
            setStatus('connecting');
            console.log(`${busStop.name} 정류장으로 통화 시도 중...`);

            if (!webexRef.current) {
                throw new Error('Webex SDK가 초기화되지 않았습니다');
            }

            // 사용자 정보 확인
            const me = await webexRef.current.people.get('me');
            console.log('사용자 정보:', me.displayName);

            // 더 간단한 기본 접근법 사용
            console.log('미팅 생성 시도 중...');
            let meeting = null;

            try {
                // 가장 단순한 형태로 시도
                console.log('빈 객체로 미팅 생성 시도');
                meeting = await webexRef.current.meetings.create({});
                console.log('미팅 생성 성공 (빈 객체):', meeting.id);
            } catch (createError) {
                console.error('미팅 생성 실패:', createError);

                if (createError.message && createError.message.includes('invalid destination')) {
                    // 대상 지정이 필요한 경우 시도
                    try {
                        // 간단한 스페이스 미팅
                        console.log('개인 공간으로 미팅 생성 시도');
                        const destination = {
                            type: 'USER',
                            id: me.id
                        };

                        meeting = await webexRef.current.meetings.create(destination);
                        console.log('개인 공간으로 미팅 생성 성공:', meeting.id);
                    } catch (userError) {
                        console.error('개인 공간 미팅 생성 실패:', userError);
                        throw new Error(`모든 미팅 생성 방법이 실패했습니다: ${userError.message}`);
                    }
                } else {
                    throw new Error(`미팅 생성 실패: ${createError.message}`);
                }
            }

            if (!meeting) {
                throw new Error('미팅 객체 생성에 실패했습니다');
            }

            meetingRef.current = meeting;

            // 디버깅 정보 출력
            console.log('미팅 메서드 확인:',
                Object.keys(meeting).filter(k => typeof meeting[k] === 'function').join(', ')
            );

            // 미팅 참여 전 추가 확인
            if (meeting.join && typeof meeting.join === 'function') {
                console.log('join 메서드가 존재합니다');
            } else {
                throw new Error('미팅 객체에 join 메서드가 없습니다');
            }

            // 추가: 미팅 상태 확인
            if (meeting.state) {
                console.log('현재 미팅 상태:', meeting.state);
            }

            // 대기 추가 - 간혹 미팅 생성과 참여 사이에 약간의 지연이 필요할 수 있음
            console.log('미팅 준비 대기 중...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 가장 단순한 미디어 설정으로 참여 시도
            try {
                console.log('미팅 참여 시도 중...');

                await meeting.join();
                console.log('미팅 참여 성공 (기본 설정)');

                // 성공 시 미디어 설정 추가
                try {
                    console.log('미디어 추가 시도...');
                    const mediaSettings = {
                        sendAudio: true,
                        sendVideo: false,
                        receiveAudio: true,
                        receiveVideo: true
                    };

                    await meeting.getMediaStreams(mediaSettings);
                    console.log('미디어 스트림 획득 성공');

                    await meeting.addMedia(mediaSettings);
                    console.log('미디어 추가 성공');
                } catch (mediaError) {
                    console.warn('미디어 설정 중 오류 (비치명적):', mediaError);
                }
            } catch (joinError) {
                console.error('미팅 참여 실패:', joinError);
                throw new Error(`미팅 참여 실패: ${joinError.message || '알 수 없는 오류'}`);
            }

            // 이벤트 핸들러 설정
            meeting.on('media:ready', (media) => {
                console.log('미디어 준비됨:', media.type);

                if (media.type === 'remoteVideo' && videoRef.current) {
                    videoRef.current.srcObject = media.stream;
                    console.log('원격 비디오 스트림 연결됨');
                } else if (media.type === 'localAudio') {
                    setLocalStream(media.stream);
                    console.log('로컬 오디오 스트림 준비됨');
                }
            });

            // 미디어 중지 이벤트
            meeting.on('media:stopped', (media) => {
                console.log('미디어 중지됨:', media.type);
            });

            // 미팅 상태 변경 이벤트
            meeting.on('meeting:stateChange', (state) => {
                console.log('미팅 상태 변경:', state);
                if (state === 'ACTIVE' || state === 'STARTED') {
                    setStatus('connected');
                } else if (state === 'ENDED' || state === 'LEFT') {
                    setStatus('idle');
                }
            });

            // 미팅 오류 이벤트
            meeting.on('error', (error) => {
                console.error('미팅 중 오류:', error);
                setErrorMessage(`통화 중 오류 발생: ${error.message || '알 수 없는 오류'}`);
                setStatus('error');
            });

            // 세션 정보 생성
            const sessionInfo = {
                id: meeting.id,
                busStop: busStop,
                startTime: new Date(),

                toggleMute: () => {
                    try {
                        const newState = !isMuted;
                        if (newState) {
                            meeting.muteAudio();
                        } else {
                            meeting.unmuteAudio();
                        }
                        setIsMuted(newState);
                        return newState;
                    } catch (e) {
                        console.error('음소거 상태 변경 중 오류:', e);
                        return isMuted;
                    }
                },

                disconnect: () => {
                    try {
                        meeting.leave().catch(e =>
                            console.warn('미팅 종료 중 오류:', e)
                        );
                        setStatus('idle');
                        return true;
                    } catch (e) {
                        console.error('미팅 종료 중 오류:', e);
                        return false;
                    }
                }
            };

            setWebexSession(sessionInfo);
            setStatus('connected');

        } catch (error) {
            console.error('최종 연결 오류:', error);

            // 오류 분석을 위한 추가 정보 수집
            try {
                // 스택 트레이스 확인
                if (error.stack) {
                    console.log('오류 스택:', error.stack);
                }

                // SDK 상태 확인 
                if (webexRef.current) {
                    console.log('SDK 상태:', {
                        isAuthorized: !!webexRef.current.credentials.isAuthorized,
                        meetings: !!webexRef.current.meetings,
                        device: !!webexRef.current.internal?.device
                    });
                }
            } catch (e) {
                console.warn('오류 분석 중 예외 발생:', e);
            }

            // 사용자 친화적인 오류 메시지
            let userFriendlyError = error.message || '알 수 없는 오류';

            if (userFriendlyError.includes('undefined') && userFriendlyError.includes('state')) {
                userFriendlyError = 'Webex 내부 상태 오류: SDK가 미팅 상태를 인식하지 못합니다. 새로고침하거나 다시 시도해보세요.';
            } else if (userFriendlyError.includes('Cannot read properties')) {
                userFriendlyError = 'Webex SDK 내부 오류: 필요한 객체가 초기화되지 않았습니다. 다시 시도해보세요.';
            }
            // 기존 오류 메시지 변환 로직 유지...

            setErrorMessage(`연결 오류: ${userFriendlyError}`);
            setStatus('error');
        }
    };

    // 음소거 토글
    const toggleMute = () => {
        if (webexSession) {
            const newMuteState = webexSession.toggleMute();
            setIsMuted(newMuteState);
        }
    };

    // 컴포넌트 언마운트 또는 닫기 처리
    const handleClose = () => {
        cleanupMeeting();
        if (onClose) onClose();
    };

    return (
        <div className="webex-device-view">
            <div className="camera-header">
                <h3>{busStop.name} - 실시간 통화</h3>
                <div className="call-controls">
                    {status === 'connected' && (
                        <button
                            className={`mute-button ${isMuted ? 'muted' : ''}`}
                            onClick={toggleMute}
                            title={isMuted ? '음소거 해제' : '음소거'}
                        >
                            {isMuted ? '🔇' : '🔊'}
                        </button>
                    )}
                    <button className="camera-close-btn" onClick={handleClose} title="종료">×</button>
                </div>
            </div>

            <div className="webex-content">
                {status === 'idle' && (
                    <div className="webex-connect-prompt">
                        <h3>{busStop.name} 정류장과 통화 연결</h3>
                        <p>실시간 영상을 확인하고 통화할 수 있습니다.</p>
                        <div className="webex-status-info">
                            {isInitialized ?
                                <p className="webex-ready">Webex SDK 준비 완료</p> :
                                <p className="webex-not-ready">Webex SDK 초기화 중...</p>
                            }
                        </div>
                        <button
                            className="webex-connect-btn"
                            onClick={initiateWebexCall}
                            disabled={!isInitialized}
                        >
                            {busStop.name} 연결하기
                        </button>
                    </div>
                )}

                {status === 'connecting' && (
                    <div className="webex-connecting">
                        <div className="spinner"></div>
                        <p>Webex를 통해 {busStop.name} 정류장에 연결 중...</p>
                    </div>
                )}

                {status === 'connected' && (
                    <div className="webex-active-call">
                        <div className="video-container">
                            <div className="remote-video">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="device-video"
                                />
                                <div className="camera-overlay-text">
                                    <p>{busStop.name} 정류장 실시간 화면</p>
                                    <p className="live-indicator">● LIVE</p>
                                    <p className="camera-details">
                                        실시간 연결<br />
                                        연결 시간: {new Date().toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="webex-call-status">
                            <div className="call-status-indicator">
                                <div className="status-dot connected"></div>
                                <span>연결됨: {busStop.name} 정류장</span>
                            </div>
                            <div className="call-duration">
                                <span>통화 중</span>
                            </div>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="webex-error">
                        <div className="error-icon">!</div>
                        <p>{errorMessage}</p>
                        <div className="error-details">
                            <details>
                                <summary>문제 해결 팁</summary>
                                <ul>
                                    <li>Webex 토큰이 유효한지 확인하세요</li>
                                    <li>인터넷 연결 상태를 확인하세요</li>
                                    <li>브라우저가 카메라와 마이크 접근 권한을 허용했는지 확인하세요</li>
                                    <li>오류가 지속되면 Webex 관리자에게 문의하세요</li>
                                </ul>
                            </details>
                        </div>
                        <button
                            className="retry-button"
                            onClick={initiateWebexCall}
                            disabled={!isInitialized}
                        >
                            다시 연결
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WebexDeviceConnect;