import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

/**
 * Webex Device Connection Component
 * 
 * This component establishes direct communication with a Cisco device via Webex,
 * displaying the device's camera feed to the admin and enabling two-way communication.
 */
const WebexDeviceConnect = ({ busStop, onClose }) => {
    const [status, setStatus] = useState('idle'); // idle, connecting, connected, error
    const [webexSession, setWebexSession] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [localStream, setLocalStream] = useState(null);

    const videoRef = useRef(null);
    const localVideoRef = useRef(null);
    const webexRef = useRef(null);

    // Device configuration for the bus stop
    const DEVICE_CONFIG = {
        // In a real implementation, these would come from a database or API
        deviceId: `device-${busStop.id}`,
        name: `${busStop.name} Device`,
        webexRoomId: `room${busStop.id}@webex.com`,
        ip: '192.168.101.160',
        model: 'Cisco Webex Room Kit',
        sipUri: `device-${busStop.id}@example.webex.com`
    };

    // Function to initiate Webex call to the device
    const initiateWebexCall = async () => {
        try {
            setStatus('connecting');
            console.log(`Initiating Webex call to device at ${busStop.name}...`);

            // Simulate Webex SDK initialization
            // In a real implementation, you would:
            // 1. Initialize the Webex SDK with proper authentication
            // 2. Get local media stream for microphone/camera
            // 3. Create a meeting/call to the device

            // Simulate getting local media stream
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });

                setLocalStream(stream);

                // Show local video preview
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                console.log("Local media stream obtained successfully");
            } catch (mediaError) {
                console.warn("Could not get local media: ", mediaError);
                // Continue anyway - we can still receive the device's video
            }

            // Simulate connection delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Create mock Webex session object
            const mockSession = {
                id: `webex-${Date.now()}`,
                deviceId: DEVICE_CONFIG.deviceId,
                startTime: new Date(),
                isActive: true,

                // Mock methods that would be available in a real Webex SDK
                toggleMute: () => {
                    setIsMuted(prev => !prev);
                    return !isMuted;
                },
                sendMessage: (message) => {
                    console.log(`Message sent to device: ${message}`);
                    return Promise.resolve({ delivered: true });
                },
                disconnect: () => {
                    console.log("Disconnecting Webex call");
                    if (localStream) {
                        localStream.getTracks().forEach(track => track.stop());
                    }
                    return Promise.resolve(true);
                }
            };

            setWebexSession(mockSession);
            setStatus('connected');
            console.log("Webex connection established successfully");

        } catch (error) {
            console.error("Webex connection error:", error);
            setStatus('error');
            setErrorMessage(`연결 오류: ${error.message || 'Webex 연결에 실패했습니다.'}`);
        }
    };

    // Handle chat message submission
    const handleSendMessage = (e) => {
        e.preventDefault();
        const messageInput = document.getElementById('webex-message-input');
        if (!messageInput || !messageInput.value.trim()) return;

        if (webexSession) {
            webexSession.sendMessage(messageInput.value);

            // Add message to chat UI
            const chatBox = document.getElementById('webex-chat-messages');
            if (chatBox) {
                const messageEl = document.createElement('div');
                messageEl.className = 'admin-message';
                messageEl.textContent = messageInput.value;
                chatBox.appendChild(messageEl);
                chatBox.scrollTop = chatBox.scrollHeight;
            }

            messageInput.value = '';
        }
    };

    // Toggle mute/unmute
    const toggleMute = () => {
        if (webexSession) {
            const newMuteState = webexSession.toggleMute();
            setIsMuted(newMuteState);

            // In a real implementation, would also mute the local audio stream
            if (localStream) {
                localStream.getAudioTracks().forEach(track => {
                    track.enabled = !newMuteState;
                });
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (webexSession) {
                webexSession.disconnect();
            }

            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [webexSession, localStream]);

    // Handle closing the component
    const handleClose = () => {
        if (webexSession) {
            webexSession.disconnect();
        }

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

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
                        <p>Webex를 통해 정류장 디바이스와 직접 연결하여 실시간 영상을 확인하고 통화할 수 있습니다.</p>
                        <button
                            className="webex-connect-btn"
                            onClick={initiateWebexCall}
                        >
                            정류장 연결하기
                        </button>
                    </div>
                )}

                {status === 'connecting' && (
                    <div className="webex-connecting">
                        <div className="spinner"></div>
                        <p>Webex를 통해 {busStop.name} 정류장에 연결 중...</p>
                        <p className="connect-details">기기 ID: {DEVICE_CONFIG.deviceId}</p>
                    </div>
                )}

                {status === 'connected' && (
                    <div className="webex-active-call">
                        <div className="video-container">
                            <div className="remote-video">
                                {/* In a real implementation, this would show the device's video feed */}
                                <div className="simulated-feed">
                                    <div className="camera-overlay-text">
                                        <p>{busStop.name} 정류장 실시간 화면</p>
                                        <p className="live-indicator">● LIVE</p>
                                        <p className="camera-details">
                                            {DEVICE_CONFIG.model}<br />
                                            연결 시간: {new Date().toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                {/* In a real implementation, would use: */}
                                {/* <video ref={videoRef} autoPlay playsInline /> */}
                            </div>

                            <div className="local-video-container">
                                {/* Admin's camera feed (local video) */}
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="local-video"
                                />
                                <div className="local-video-label">
                                    관리자 카메라 {isMuted ? '(음소거됨)' : ''}
                                </div>
                            </div>
                        </div>

                        <div className="webex-chat">
                            <div id="webex-chat-messages" className="chat-messages">
                                <div className="system-message">
                                    {busStop.name} 정류장과 연결되었습니다. 대화가 시작되었습니다.
                                </div>
                            </div>
                            <form className="chat-input-form" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    id="webex-message-input"
                                    placeholder="메시지 입력..."
                                />
                                <button type="submit">전송</button>
                            </form>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="webex-error">
                        <div className="error-icon">!</div>
                        <p>{errorMessage}</p>
                        <button
                            className="retry-button"
                            onClick={initiateWebexCall}
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