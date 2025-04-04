import React, { useState } from 'react';

const EmergencyButton = ({ onClick, lastEmergency }) => {
    const [isPressed, setIsPressed] = useState(false);

    // 버튼 클릭 핸들러
    const handleButtonClick = () => {
        setIsPressed(true);

        // 버튼 클릭 효과를 위해 짧은 타이머 설정
        setTimeout(() => {
            setIsPressed(false);

            // 부모 컴포넌트의 onClick 핸들러 호출
            if (onClick) {
                onClick();
            }
        }, 200);
    };

    // 마지막 비상 알림 시간 포맷팅
    const formatLastEmergency = () => {
        if (!lastEmergency) return null;

        const date = new Date(lastEmergency);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    };

    return (
        <div className="emergency-button-container">
            <button
                className={`emergency-button ${isPressed ? 'pressed' : ''}`}
                onClick={handleButtonClick}
                style={{
                    transform: isPressed ? 'scale(0.95)' : 'scale(1)',
                    boxShadow: isPressed ? '0 2px 5px rgba(220, 53, 69, 0.4)' : '0 4px 10px rgba(220, 53, 69, 0.5)'
                }}
            >
                비상 버튼
            </button>

            {lastEmergency && (
                <div className="last-emergency">
                    마지막 비상 알림: {formatLastEmergency()}
                </div>
            )}

            <div className="emergency-instructions">
                <p>비상 상황 발생 시 누르세요.<br />즉시 관리자에게 알림이 전송됩니다.</p>
            </div>
        </div>
    );
};

export default EmergencyButton;