import React, { useEffect, useRef, useState } from 'react';

const BusStopMap = ({ busStops, searchedStop }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markers = useRef({}); // 객체 형태로 변경하여 ID로 빠르게 접근
    const overlays = useRef([]);
    const [mapError, setMapError] = useState(null);

    // 고흥시 중심 좌표
    const goheungCenter = { lat: 34.6111, lng: 127.2850 };

    // 마커 클릭 이벤트 처리
    const handleMarkerClick = (marker, stop) => {
        try {
            console.log(`마커 클릭: ${stop.name}`);

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
                    // WebSocket을 통해 알림이 이미 전송되므로 여기서는 추가 알림을 생성하지 않음
                })
                .catch(err => {
                    console.error('긴급 버튼 API 호출 실패:', err);
                    // API 호출 실패 시에만 클라이언트 쪽에서 알림 생성 (백업 메커니즘)
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

                // 마커 생성 - 객체 형태로 저장
                busStops.forEach(stop => {
                    const position = new window.kakao.maps.LatLng(stop.lat, stop.lng);
                    const marker = new window.kakao.maps.Marker({
                        position: position,
                        title: stop.name
                    });
                    marker.setMap(map);

                    // ID를 키로 하여 마커 저장
                    markers.current[stop.id] = {
                        marker: marker,
                        stop: stop
                    };

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
            Object.values(markers.current).forEach(({ marker }) => marker.setMap(null));
            overlays.current.forEach(overlay => overlay.setMap(null));
        };
    }, [busStops]);

    // 검색된 정류소 변경 시 지도 이동 및 마커 클릭
    useEffect(() => {
        if (searchedStop && mapInstance.current && markers.current) {
            console.log("검색된 정류소로 이동:", searchedStop.name, "타임스탬프:", searchedStop.timestamp);

            // 해당 정류소로 지도 중심 이동
            const position = new window.kakao.maps.LatLng(searchedStop.lat, searchedStop.lng);

            // 강제로 setCenter 먼저 적용 후 부드러운 이동을 위해 약간 지연 후 panTo 실행
            mapInstance.current.setCenter(position);

            // 적절한 줌 레벨로 설정
            if (mapInstance.current.getLevel() > 3) {
                mapInstance.current.setLevel(3, { animate: true });
            }

            // ID로 마커 찾기 
            const markerInfo = markers.current[searchedStop.id];

            // 마커가 있으면 클릭 이벤트 트리거
            if (markerInfo) {
                // 이전 오버레이 모두 닫기
                overlays.current.forEach(overlay => overlay.setMap(null));
                overlays.current = [];

                // 약간 지연시켜 지도 이동 후 오버레이가 표시되도록 함
                setTimeout(() => {
                    // 지도 이동을 보장하기 위해 panTo 한번 더 호출
                    mapInstance.current.panTo(position);

                    // 마커 클릭 효과 - 핸들러 직접 호출
                    handleMarkerClick(markerInfo.marker, searchedStop);

                    // 마커 시각적 강조
                    try {
                        // Animation 객체 안전하게 확인
                        if (window.kakao && window.kakao.maps && window.kakao.maps.Animation &&
                            typeof window.kakao.maps.Animation.BOUNCE !== 'undefined') {
                            // BOUNCE 애니메이션 사용
                            markerInfo.marker.setAnimation(window.kakao.maps.Animation.BOUNCE);
                            setTimeout(() => {
                                markerInfo.marker.setAnimation(null);
                            }, 2000); // 2초 후 애니메이션 중지
                        } else {
                            console.log("카카오맵 애니메이션 기능을 사용할 수 없습니다. 대체 강조 효과를 적용합니다.");
                            // 애니메이션 대신 마커를 깜빡이는 효과로 대체
                            const blinkMarker = () => {
                                let isVisible = false;
                                let count = 0;
                                const interval = setInterval(() => {
                                    if (count >= 5) { // 5회 깜빡임
                                        clearInterval(interval);
                                        markerInfo.marker.setVisible(true);
                                        return;
                                    }
                                    isVisible = !isVisible;
                                    markerInfo.marker.setVisible(isVisible);
                                    count++;
                                }, 200); // 200ms 간격
                            };
                            blinkMarker();
                        }
                    } catch (error) {
                        console.error("마커 강조 표시 중 오류 발생:", error);
                    }
                }, 100); // 지연시간 단축 (300ms → 100ms)
            }
        }
    }, [searchedStop]);

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
