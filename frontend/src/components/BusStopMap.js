import React, { useEffect, useRef, useState } from 'react';

const BusStopMap = ({ busStops }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markers = useRef([]);
    const overlays = useRef([]);
    const [mapError, setMapError] = useState(null);

    // 고흥시 중심 좌표
    const goheungCenter = { lat: 34.6111, lng: 127.2850 };

    // 마커 클릭 이벤트 처리
    const handleMarkerClick = (marker, stop) => {
        try {
            // 이전 오버레이 모두 닫기
            overlays.current.forEach(overlay => overlay.setMap(null));
            overlays.current = [];

            // 새 오버레이 생성
            const content = `
                <div class="bus-stop-popup">
                    <div class="popup-header">
                        <h3>${stop.name}</h3>
                        <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                    </div>
                    <div class="popup-content">
                        <button class="emergency-btn" onclick="window.sendEmergency(${stop.id})">
                            긴급 버튼 시뮬레이션
                        </button>
                    </div>
                </div>
            `;

            // 오버레이 생성 및 지도에 표시
            const position = new window.kakao.maps.LatLng(stop.lat, stop.lng);
            const overlay = new window.kakao.maps.CustomOverlay({
                content: content,
                position: position,
                yAnchor: 1
            });

            overlay.setMap(mapInstance.current);
            overlays.current.push(overlay);
        } catch (error) {
            console.error("오버레이 생성 중 오류:", error);
        }
    };

    // 긴급 버튼 시뮬레이션 전송 함수 수정
    useEffect(() => {
        window.sendEmergency = (busStopId) => {
            console.log(`정류장 ${busStopId}에서 긴급 버튼 클릭됨`);

            // API 호출
            fetch(`http://localhost:8000/api/simulate-emergency/${busStopId}`, {
                method: 'POST'
            })
                .then(response => response.json())
                .then(data => {
                    console.log('API 응답:', data);

                    // 전역 함수를 통해 알림 추가
                    if (window.simulateEmergency) {
                        window.simulateEmergency(busStopId);
                        console.log('알림이 생성되었습니다.');
                    } else {
                        console.error('simulateEmergency 함수가 정의되지 않았습니다.');
                    }
                })
                .catch(err => {
                    console.error('긴급 버튼 API 호출 실패:', err);
                    // API 호출 실패해도 알림 생성
                    if (window.simulateEmergency) {
                        window.simulateEmergency(busStopId);
                    }
                });
        };

        return () => {
            delete window.sendEmergency;
        };
    }, []);

    // 카카오맵 로딩 확인 함수
    const waitForKakaoMaps = () => {
        return new Promise((resolve, reject) => {
            if (window.kakao && window.kakao.maps) {
                resolve();
                return;
            }

            const maxWaitTime = 10000; // 10초
            const interval = 100;
            let waited = 0;

            const checkKakao = setInterval(() => {
                if (window.kakao && window.kakao.maps) {
                    clearInterval(checkKakao);
                    resolve();
                    return;
                }
                waited += interval;
                if (waited >= maxWaitTime) {
                    clearInterval(checkKakao);
                    reject(new Error("카카오맵 API 로딩 시간 초과"));
                }
            }, interval);
        });
    };

    // 지도 초기화 및 마커 생성
    useEffect(() => {
        const initializeMap = async () => {
            try {
                // 카카오맵 로딩 대기
                await waitForKakaoMaps();

                // 컨테이너 크기 확인
                if (mapRef.current.clientWidth === 0 || mapRef.current.clientHeight === 0) {
                    console.error("지도 컨테이너 크기가 0입니다.");
                    setMapError("지도 컨테이너의 크기가 올바르지 않습니다.");
                    return;
                }

                console.log("지도 컨테이너 크기:", mapRef.current.clientWidth, "x", mapRef.current.clientHeight);

                // 지도 생성
                const container = mapRef.current;
                const options = {
                    center: new window.kakao.maps.LatLng(goheungCenter.lat, goheungCenter.lng),
                    level: 7
                };

                console.log("지도 생성 시작");
                const map = new window.kakao.maps.Map(container, options);
                mapInstance.current = map;
                console.log("지도 생성 완료");

                // 마커 생성
                busStops.forEach(stop => {
                    const position = new window.kakao.maps.LatLng(stop.lat, stop.lng);
                    const marker = new window.kakao.maps.Marker({
                        position: position,
                        title: stop.name
                    });
                    marker.setMap(map);
                    markers.current.push(marker);

                    // 마커 클릭 이벤트
                    window.kakao.maps.event.addListener(marker, 'click', () => handleMarkerClick(marker, stop));
                });

                // 지도 타입 컨트롤 추가
                const mapTypeControl = new window.kakao.maps.MapTypeControl();
                map.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPRIGHT);

                // 줌 컨트롤 추가
                const zoomControl = new window.kakao.maps.ZoomControl();
                map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

                console.log("지도 설정 완료");
            } catch (error) {
                console.error("지도 초기화 중 오류:", error);
                setMapError(`지도를 불러올 수 없습니다: ${error.message}`);
            }
        };

        initializeMap();

        // 컴포넌트 언마운트 시 마커 제거
        return () => {
            if (markers.current.length > 0) {
                markers.current.forEach(marker => marker.setMap(null));
            }
            if (overlays.current.length > 0) {
                overlays.current.forEach(overlay => overlay.setMap(null));
            }
        };
    }, [busStops]);

    return (
        <>
            {mapError ? (
                <div className="map-error">
                    <h3>지도 로딩 오류</h3>
                    <p>{mapError}</p>
                </div>
            ) : null}
            <div ref={mapRef} className="map-container" style={{ width: "100%", height: "100vh" }}></div>
        </>
    );
};

export default BusStopMap;
