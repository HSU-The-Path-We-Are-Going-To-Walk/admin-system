import React, { useEffect } from 'react';

const NotificationStack = ({ notifications, onClose, onAddDebug, onNotificationClick }) => {
    // F2 키 이벤트 리스너 - 긴급 테스트 실행
    useEffect(() => {
        // F2 키를 누르면 정류장 이름 또는 번호를 입력받아 긴급 테스트 실행
        const handleKeyDown = (event) => {
            if (event.key === 'F2') {
                const input = window.prompt('긴급 테스트를 실행할 정류장 이름 또는 번호를 입력하세요.');
                if (!input) return;
                // 숫자면 번호, 아니면 이름으로 찾기
                let stopId = null;
                if (/^\d+$/.test(input.trim())) {
                    stopId = parseInt(input.trim(), 10);
                } else {
                    // 이름으로 찾기 (대소문자 무시)
                    const allStops = window.busStopsForEmergency || [];
                    const found = allStops.find(s => s.name.replace(/\s/g, '') === input.replace(/\s/g, ''));
                    if (found) stopId = found.id;
                }
                if (stopId) {
                    if (window.simulateEmergency) {
                        window.simulateEmergency(stopId);
                    } else {
                        alert('긴급 테스트 함수를 찾을 수 없습니다.');
                    }
                } else {
                    alert('해당 정류장을 찾을 수 없습니다.');
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // 알림 클릭 핸들러
    const handleNotificationClick = (notification, e) => {
        // 닫기 버튼 클릭시에는 위치 이동하지 않음
        if (e.target.className === 'notification-close') {
            return;
        }

        // 위치 이동 및 알림 닫기
        if (onNotificationClick) {
            onNotificationClick(notification);
        }
        if (onClose) {
            onClose(notification.id);
        }
    };

    return (
        <div className="notification-stack">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className="notification-item"
                    onClick={(e) => handleNotificationClick(notification, e)}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="notification-title">긴급 알림</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{notification.timestamp}</div>
                    <button
                        className="notification-close"
                        onClick={() => onClose && onClose(notification.id)}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
};

export default NotificationStack;
