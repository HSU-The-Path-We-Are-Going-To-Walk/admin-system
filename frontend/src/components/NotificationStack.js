import React, { useEffect } from 'react';

const NotificationStack = ({ notifications, onClose, onAddDebug }) => {
    // F2 키 이벤트 리스너 - 디버그 알림만 추가
    useEffect(() => {
        console.log("NotificationStack 컴포넌트가 마운트되었습니다.");

        // 디버그 알림 추가를 위한 키보드 이벤트 리스너
        const handleKeyDown = (event) => {
            if (event.key === 'F4') {
                if (onAddDebug) {
                    console.log("디버그 알림 추가");
                    onAddDebug();
                } else {
                    console.error("디버그 알림 추가 함수가 전달되지 않았습니다");
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onAddDebug]);

    return (
        <div className="notification-stack">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className="notification-item"
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
