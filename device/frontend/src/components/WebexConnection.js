import React from 'react';

const WebexConnection = ({ status }) => {
    // 상태에 따른 메시지 및 클래스 설정
    const getStatusInfo = () => {
        switch (status) {
            case 'connected':
                return {
                    message: '관리자와 Webex로 연결되어 있습니다.',
                    description: '화상 및 음성 통화가 가능합니다.',
                    statusClass: 'status-connected'
                };
            case 'connecting':
                return {
                    message: '연결 중...',
                    description: '관리자와 Webex 연결을 설정하는 중입니다.',
                    statusClass: 'status-connecting'
                };
            case 'disconnected':
            default:
                return {
                    message: '연결 대기 중',
                    description: '관리자가 연결을 요청하면 자동으로 연결됩니다.',
                    statusClass: 'status-disconnected'
                };
        }
    };

    const statusInfo = getStatusInfo();

    return (
        <div className="webex-connection">
            <h3>Webex 연결 상태</h3>

            <div className="webex-status">
                <div className={`status-indicator ${statusInfo.statusClass}`} />
                <span className="status-text">{statusInfo.message}</span>
            </div>

            <p>{statusInfo.description}</p>

            {status === 'connected' && (
                <p className="connection-info">
                    <strong>실시간 통화 중</strong> - 관리자가 볼 수 있습니다.
                </p>
            )}
        </div>
    );
};

export default WebexConnection;