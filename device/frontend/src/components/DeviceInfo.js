import React from 'react';

const DeviceInfo = ({ deviceInfo }) => {
    return (
        <div className="device-info">
            <h2>{deviceInfo.name}</h2>
            <p>디바이스 ID: {deviceInfo.id}</p>
            <div className={`device-status status-${deviceInfo.status}`}>
                {deviceInfo.status === 'online' ? '온라인' : '오프라인'}
            </div>
        </div>
    );
};

export default DeviceInfo;