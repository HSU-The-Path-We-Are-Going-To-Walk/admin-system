import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WebexMeetingManager = () => {
    const [meetingUrl, setMeetingUrl] = useState('https://meet1508.webex.com/meet/pr25546136832');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [meetingActive, setMeetingActive] = useState(false);
    const [savedMeeting, setSavedMeeting] = useState(null);

    // 컴포넌트 마운트 시 저장된 미팅 정보 로드
    useEffect(() => {
        const fetchActiveMeeting = async () => {
            try {
                const response = await axios.get('/api/webex-meeting');
                if (response.data && response.data.active) {
                    setSavedMeeting(response.data);
                    setMeetingActive(true);
                }
            } catch (error) {
                console.error('미팅 정보 로드 중 오류:', error);
            }
        };

        fetchActiveMeeting();
    }, []);

    // 미팅 정보 저장 함수
    const saveMeetingUrl = async () => {
        if (!meetingUrl.trim()) {
            setError('미팅 URL을 입력해주세요.');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // 미팅 정보 생성
            const meetingInfo = {
                url: meetingUrl,
                created: new Date().toISOString(),
                hostName: '직접 입력됨',
                active: true
            };

            // 서버에 미팅 정보 저장
            const response = await axios.post('/api/webex-meeting', meetingInfo);

            // 저장된 미팅 정보 설정
            setSavedMeeting(response.data);
            setMeetingActive(true);

        } catch (error) {
            console.error('미팅 정보 저장 중 오류:', error);
            setError(`미팅 정보 저장 실패: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 기존 미팅 종료
    const endMeeting = async () => {
        try {
            setIsLoading(true);

            // 서버에 미팅 종료 요청
            await axios.delete('/api/webex-meeting');

            // 상태 업데이트
            setSavedMeeting(null);
            setMeetingActive(false);
            setMeetingUrl('');

        } catch (error) {
            console.error('미팅 종료 중 오류:', error);
            setError(`미팅 종료 실패: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="webex-meeting-manager">
            <h2>웹엑스 미팅 관리</h2>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {meetingActive ? (
                <div className="active-meeting-container">
                    <div className="active-meeting-info">
                        <h3>현재 활성화된 미팅</h3>
                        <div className="meeting-details">
                            <p><strong>생성 시간:</strong> {new Date(savedMeeting.created).toLocaleString()}</p>
                            <p><strong>미팅 URL:</strong> <a href={savedMeeting.url} target="_blank" rel="noopener noreferrer">{savedMeeting.url}</a></p>
                        </div>
                        <div className="meeting-status">
                            <span className="status-indicator active"></span>
                            <span>활성화됨 - 비상 버튼 알림 시 자동 연결</span>
                        </div>
                    </div>
                    <button
                        className="end-meeting-btn"
                        onClick={endMeeting}
                        disabled={isLoading}
                    >
                        {isLoading ? '처리 중...' : '미팅 비활성화'}
                    </button>
                </div>
            ) : (
                <div className="create-meeting-container">
                    <div className="create-options">
                        <h3>웹엑스 미팅 URL 설정</h3>
                        <p>아래 기본 미팅 URL을 사용하거나 다른 URL을 입력하세요.</p>

                        <div className="form-group">
                            <label>
                                미팅 URL:
                                <input
                                    type="text"
                                    value={meetingUrl}
                                    onChange={(e) => setMeetingUrl(e.target.value)}
                                    placeholder="https://meet1508.webex.com/meet/pr25546136832"
                                    disabled={isLoading}
                                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                />
                            </label>
                            <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                                기본 미팅 URL이 설정되어 있습니다. 다른 URL을 사용하려면 변경하세요.
                            </small>
                        </div>
                        <button
                            className="save-button"
                            onClick={saveMeetingUrl}
                            disabled={isLoading || !meetingUrl.trim()}
                            style={{
                                marginTop: '15px',
                                padding: '8px 15px',
                                backgroundColor: '#0052cc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {isLoading ? '저장 중...' : '미팅 URL 저장'}
                        </button>
                    </div>
                </div>
            )}

            <div className="meeting-instructions">
                <h4>사용 방법</h4>
                <ol style={{ paddingLeft: '20px' }}>
                    <li>Webex 웹사이트 또는 앱에서 새 미팅을 생성하세요.</li>
                    <li>미팅 초대 링크를 복사하여 위 입력란에 붙여넣으세요.</li>
                    <li>미팅 링크를 저장하면 비상 버튼 알림 시 나로도공용터미널에서 자동으로 연결됩니다.</li>
                    <li>미팅을 종료하려면 '미팅 비활성화' 버튼을 클릭하세요.</li>
                </ol>
            </div>
        </div>
    );
};

export default WebexMeetingManager;