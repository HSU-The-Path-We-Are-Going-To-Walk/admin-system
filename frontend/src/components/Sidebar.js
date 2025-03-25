import React from 'react';

const Sidebar = ({ isOpen, onClose, onMenuSelect }) => {
    const handleMenuClick = (menuOption) => {
        if (onMenuSelect) {
            onMenuSelect(menuOption);
        }
        // 모바일에서는 메뉴 선택 시 자동으로 사이드바를 닫도록 설정
        if (window.innerWidth < 768) {
            onClose();
        }
    };

    return (
        <div className={`sidebar-container ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <h2>고흥시 버스정류장</h2>
                <button className="close-button" onClick={onClose}>×</button>
            </div>
            <div className="sidebar-content">
                <div className="menu-item" onClick={() => handleMenuClick('bus-stops')}>
                    <span className="menu-icon">🚏</span>정류장 목록
                </div>
                <div className="menu-item" onClick={() => handleMenuClick('emergency-history')}>
                    <span className="menu-icon">🚨</span>긴급 알림 내역
                </div>
                <div className="menu-item" onClick={() => handleMenuClick('bulletin-board')}>
                    <span className="menu-icon">📋</span>게시판 업데이트
                </div>
                <div className="menu-item" onClick={() => handleMenuClick('settings')}>
                    <span className="menu-icon">⚙️</span>설정
                </div>
                <div className="menu-item" onClick={() => handleMenuClick('admin-info')}>
                    <span className="menu-icon">👤</span>관리자 정보
                </div>
                <div className="menu-item" onClick={() => handleMenuClick('help')}>
                    <span className="menu-icon">❓</span>도움말
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
