import React, { useEffect, useRef } from 'react';

const MessageLog = ({ messages }) => {
    const messagesEndRef = useRef(null);

    // 메시지가 추가될 때마다 스크롤을 맨 아래로 이동
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // 메시지 타임스탬프 포맷팅
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    };

    return (
        <div className="message-log">
            <h2>시스템 로그</h2>
            <div className="messages">
                {messages.length === 0 ? (
                    <div className="message message-system">
                        로그 메시지가 아직 없습니다.
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div key={index} className={`message message-${message.type}`}>
                            <div className="message-content">{message.content}</div>
                            <div className="message-timestamp">{formatTime(message.timestamp)}</div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};

export default MessageLog;