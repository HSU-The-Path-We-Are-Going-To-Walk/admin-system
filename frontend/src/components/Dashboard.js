import React, { useState, useEffect } from 'react';
import './Dashboard.css';

function Dashboard() {
    const [emergencies, setEmergencies] = useState([]);
    const [ws, setWs] = useState(null);

    useEffect(() => {
        const websocket = new WebSocket('ws://localhost:8000/ws');

        websocket.onopen = () => {
            console.log('WebSocket 연결 성공');
            setWs(websocket);
        };

        websocket.onmessage = (event) => {
            console.log('새로운 비상알림 수신:', event.data);
            const newEmergency = JSON.parse(event.data);
            setEmergencies(prev => [newEmergency, ...prev]);
        };

        // 초기 데이터 로드
        fetch('http://localhost:8000/emergencies')
            .then(res => res.json())
            .then(data => setEmergencies(data.reverse()))
            .catch(err => console.error('데이터 로딩 에러:', err));

        return () => {
            if (websocket) websocket.close();
        };
    }, []);

    const connectToSender = (webexUrl) => {
        window.open(webexUrl, '_blank');
    };

    const deleteEmergency = (id) => {
        setEmergencies(prev => prev.filter(emergency => emergency.id !== id));
    };

    return (
        <div className="dashboard">
            <h1>비상 알림 대시보드</h1>
            <div className="emergencies-list">
                {emergencies.map(emergency => (
                    <div key={emergency.id}
                        className={`emergency-item ${emergency.status === 'pending' ? 'pending' : 'handled'}`}>
                        <div className="emergency-content">
                            <h3>새로운 비상 상황!</h3>
                            <p>발신자: {emergency.sender.name}</p>
                            <p>발생 시간: {new Date(emergency.timestamp).toLocaleString()}</p>
                            <p>상태: {emergency.status}</p>
                        </div>
                        <div className="emergency-actions">
                            <button
                                onClick={() => connectToSender(emergency.sender.webex_url)}
                                className="connect-btn">
                                화상 연결
                            </button>
                            <button
                                onClick={() => deleteEmergency(emergency.id)}
                                className="delete-btn">
                                삭제
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Dashboard;