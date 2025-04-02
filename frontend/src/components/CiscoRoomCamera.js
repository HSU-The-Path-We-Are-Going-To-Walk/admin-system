import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

/**
 * Cisco Room Camera Component
 * 
 * This component handles connection to Cisco TelePresence Room Camera devices
 * and displays their video feed
 */
const CiscoRoomCamera = ({ busStop, onClose }) => {
    const [status, setStatus] = useState('connecting'); // connecting, connected, error
    const [errorMessage, setErrorMessage] = useState('');
    const videoRef = useRef(null);

    // Camera connection info based on the provided Cisco device info
    const CAMERA_CONFIG = {
        ip: '192.168.101.160',
        model: 'Cisco Integrated Camera',
        software: 'ce11.26.1.5',
        serialNumber: '53ff615d0d9',
        username: 'admin', // Default credentials, update as needed
        password: 'admin'  // Default credentials, update as needed
    };

    useEffect(() => {
        const connectToCamera = async () => {
            try {
                setStatus('connecting');

                // In a real implementation, this would be a call to an API that handles
                // authentication and connection to the Cisco camera RTSP stream
                // For now, we'll simulate the connection process

                console.log(`Connecting to camera at ${CAMERA_CONFIG.ip} for bus stop ${busStop.name}...`);

                // Simulate connection delay
                await new Promise(resolve => setTimeout(resolve, 2000));

                // In a real implementation, we would:
                // 1. Authenticate with the device using the admin credentials
                // 2. Get an RTSP or HTTP stream URL
                // 3. Connect and start displaying video feed

                // For this demonstration, we'll simulate a successful connection
                setStatus('connected');

                // In a real implementation, we would set up a WebSocket connection
                // or use a library like jsmpeg to handle the video stream

                // Sample code for accessing a stream in a real-world situation:
                /*
                if (videoRef.current) {
                    // For HTTP MJPEG stream:
                    // videoRef.current.src = `http://${CAMERA_CONFIG.ip}/video`;

                    // For RTSP stream, you would need a media server or WebRTC gateway
                    // as browsers can't directly play RTSP streams
                }
                */

            } catch (error) {
                console.error("Camera connection error:", error);
                setStatus('error');
                setErrorMessage(`연결 오류: ${error.message || '카메라에 연결할 수 없습니다'}`);
            }
        };

        connectToCamera();

        // Cleanup on unmount
        return () => {
            // Disconnect from camera
            console.log("Disconnecting from camera");
            // Any cleanup code would go here
            // e.g., closing WebSocket connections, stopping video feeds, etc.
        };
    }, [busStop]);

    // Handle user pressing the close button
    const handleClose = () => {
        if (onClose) onClose();
    };

    return (
        <div className="cisco-camera-view">
            <div className="camera-header">
                <h3>{busStop.name} - Cisco Room Camera</h3>
                <button className="camera-close-btn" onClick={handleClose}>×</button>
            </div>

            <div className="camera-content">
                {status === 'connecting' && (
                    <div className="camera-connecting">
                        <div className="spinner"></div>
                        <p>카메라 연결 중... ({CAMERA_CONFIG.ip})</p>
                    </div>
                )}

                {status === 'connected' && (
                    <>
                        <div className="camera-info">
                            <span>모델: {CAMERA_CONFIG.model}</span>
                            <span>IP: {CAMERA_CONFIG.ip}</span>
                            <span>상태: 연결됨</span>
                        </div>

                        {/* In a real implementation, this would show the actual video feed */}
                        <div className="video-feed">
                            {/* For demonstration, showing a simulation of the camera feed */}
                            <div className="simulated-feed">
                                <div className="camera-overlay-text">
                                    <p>{busStop.name} 정류장 실시간 화면</p>
                                    <p className="camera-details">
                                        Cisco TelePresence ({CAMERA_CONFIG.model})<br />
                                        {CAMERA_CONFIG.ip}<br />
                                        {new Date().toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                            {/* In a real implementation, would use: */}
                            {/* <video ref={videoRef} autoPlay playsInline muted /> */}
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <div className="camera-error">
                        <div className="error-icon">!</div>
                        <p>{errorMessage}</p>
                        <button
                            className="retry-button"
                            onClick={() => {
                                setStatus('connecting');
                                // Reset the connection process
                                setTimeout(() => {
                                    setStatus('connected');
                                }, 2000);
                            }}
                        >
                            재연결
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CiscoRoomCamera;