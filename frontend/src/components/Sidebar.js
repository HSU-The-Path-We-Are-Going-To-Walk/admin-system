import React from 'react';

const Sidebar = ({ isOpen, onClose }) => {
    return (
        <div className={`sidebar-container ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <h2>고흥시 버스정류장</h2>
                <button className="close-button" onClick={onClose}>×</button>
            </div>
            <div className="sidebar-content">
                <div className="menu-item">정류장 목록</div>
                <div className="menu-item">긴급 알림 내역</div>
                <div className="menu-item">설정</div>
                <div className="menu-item">관리자 정보</div>
                <div className="menu-item">도움말</div>
            </div>
        </div>
    );
};

export default Sidebar;
