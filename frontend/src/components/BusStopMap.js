import React, { useEffect, useState, useRef } from 'react';

const BusStopMap = ({ busStops, searchedStop, activeEmergencies }) => {
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const markersRef = useRef({});
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [infoWindow, setInfoWindow] = useState(null);
    const [mapError, setMapError] = useState(null);

    // 카카오맵 초기화 - index.html에 이미 로드된 API 사용
    useEffect(() => {
        try {
            // 카카오맵 API가 로드되었는지 확인
            if (!window.kakao || !window.kakao.maps) {
                setMapError('카카오맵 API가 로드되지 않았습니다. index.html의 API 키를 확인하세요.');
                return;
            }

            const container = document.getElementById('map');
            if (!container) {
                console.error('지도 컨테이너를 찾을 수 없습니다');
                setMapError('지도 컨테이너를 찾을 수 없습니다');
                return;
            }

            const options = {
                center: new window.kakao.maps.LatLng(34.6112, 127.2917), // 고흥군 중심 좌표
                level: 9 // 지도 확대 레벨
            };

            const newMap = new window.kakao.maps.Map(container, options);
            setMap(newMap);

            // 인포윈도우 생성
            const infoWindowInstance = new window.kakao.maps.InfoWindow({
                zIndex: 1,
                removable: true
            });
            setInfoWindow(infoWindowInstance);

            console.log('지도가 성공적으로 로드되었습니다');
        } catch (error) {
            console.error('지도 초기화 오류:', error);
            setMapError('지도를 초기화하는 중 오류가 발생했습니다: ' + error.message);
        }
    }, []);

    // 버스 정류장 마커 생성
    useEffect(() => {
        if (!map || !busStops || busStops.length === 0) return;

        // 기존 마커 제거
        Object.values(markersRef.current).forEach(markerInfo => {
            if (markerInfo && markerInfo.marker) {
                markerInfo.marker.setMap(null);
            }
            if (markerInfo && markerInfo.pulseOverlay) {
                markerInfo.pulseOverlay.setMap(null);
            }
        });

        markersRef.current = {};

        // 새 마커 생성
        busStops.forEach(stop => {
            createMarker(stop);
        });

        // 지도 범위를 모든 마커가 보이도록 설정
        if (Object.keys(markersRef.current).length > 0) {
            const bounds = new window.kakao.maps.LatLngBounds();
            busStops.forEach(stop => {
                bounds.extend(new window.kakao.maps.LatLng(stop.lat, stop.lng));
            });
            map.setBounds(bounds);
        }
    }, [map, busStops]);

    // 마커 생성 함수
    const createMarker = (stop) => {
        try {
            const position = new window.kakao.maps.LatLng(stop.lat, stop.lng);

            // 간단한 원형 마커 생성 (이미지 파일 대신)
            const marker = new window.kakao.maps.Marker({
                position: position,
                title: stop.name,
                clickable: true
            });

            marker.setMap(map);

            // 마커 클릭 이벤트
            window.kakao.maps.event.addListener(marker, 'click', () => {
                setSelectedMarker(stop);

                // 인포윈도우 내용
                const content = `
                    <div class="bus-stop-popup">
                        <div class="popup-header">
                            <h3>${stop.name}</h3>
                        </div>
                        <div class="popup-content">
                            <p>위치: ${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}</p>
                            <button class="emergency-btn" onclick="window.simulateEmergency(${stop.id})">
                                긴급 버튼 테스트
                            </button>
                        </div>
                    </div>
                `;

                if (infoWindow) {
                    infoWindow.setContent(content);
                    infoWindow.open(map, marker);
                }
            });

            // 마커 정보 저장
            markersRef.current[stop.id] = {
                marker: marker,
                stop: stop
            };

            return marker;
        } catch (error) {
            console.error(`마커 생성 중 오류 (${stop.name}):`, error);
            return null;
        }
    };

    // 검색된 정류장이 있으면 해당 위치로 이동
    useEffect(() => {
        if (!map || !searchedStop) return;

        const position = new window.kakao.maps.LatLng(searchedStop.lat, searchedStop.lng);
        map.setCenter(position);
        map.setLevel(3); // 확대 레벨 설정

        // 해당 마커를 찾아 클릭 이벤트 트리거
        const targetMarkerInfo = markersRef.current[searchedStop.id];
        if (targetMarkerInfo && targetMarkerInfo.marker) {
            window.kakao.maps.event.trigger(targetMarkerInfo.marker, 'click');
        }
    }, [map, searchedStop]);

    // 긴급 알림이 발생한 정류장 마커 스타일 변경
    useEffect(() => {
        if (!map || !activeEmergencies || activeEmergencies.length === 0 || Object.keys(markersRef.current).length === 0) return;

        try {
            // 현재 긴급 상태인 정류장 ID 목록
            const emergencyIds = activeEmergencies.map(emergency => emergency.busStopId);

            // 모든 마커 확인 및 상태에 맞게 업데이트
            Object.entries(markersRef.current).forEach(([stopId, markerInfo]) => {
                if (!markerInfo || !markerInfo.marker) return;

                const isEmergency = emergencyIds.includes(parseInt(stopId));
                const position = markerInfo.marker.getPosition();
                const stop = markerInfo.stop;

                // 기존 마커와 펄스 오버레이 제거
                markerInfo.marker.setMap(null);
                if (markerInfo.pulseOverlay) {
                    markerInfo.pulseOverlay.setMap(null);
                }

                // 새 마커 생성 (이미지 없이 기본 마커 사용)
                const newMarker = new window.kakao.maps.Marker({
                    position: position,
                    title: stop.name,
                    clickable: true
                });

                newMarker.setMap(map);

                // 마커 클릭 이벤트 다시 연결
                window.kakao.maps.event.addListener(newMarker, 'click', () => {
                    setSelectedMarker(stop);

                    // 인포윈도우 내용
                    const content = `
                        <div class="bus-stop-popup">
                            <div class="popup-header">
                                <h3>${stop.name}</h3>
                            </div>
                            <div class="popup-content">
                                <p>위치: ${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}</p>
                                <button class="emergency-btn" onclick="window.simulateEmergency(${stop.id})">
                                    긴급 버튼 테스트
                                </button>
                            </div>
                        </div>
                    `;

                    if (infoWindow) {
                        infoWindow.setContent(content);
                        infoWindow.open(map, newMarker);
                    }
                });

                // 마커 정보 업데이트
                markersRef.current[stopId].marker = newMarker;

                // 긴급 상태일 경우 깜빡이는 효과 추가
                if (isEmergency) {
                    // 깜빡이는 원 효과를 위한 커스텀 오버레이 생성
                    const pulseContent = document.createElement('div');
                    pulseContent.className = 'emergency-pulse-effect';

                    const pulseOverlay = new window.kakao.maps.CustomOverlay({
                        position: position,
                        content: pulseContent,
                        zIndex: 1
                    });

                    pulseOverlay.setMap(map);
                    markersRef.current[stopId].pulseOverlay = pulseOverlay;
                } else {
                    markersRef.current[stopId].pulseOverlay = null;
                }
            });
        } catch (error) {
            console.error('긴급 마커 업데이트 중 오류:', error);
        }
    }, [map, activeEmergencies]);

    return (
        <>
            {mapError && (
                <div className="map-error">
                    <h3>지도 로딩 오류</h3>
                    <p>{mapError}</p>
                </div>
            )}
            <div id="map" className="map-container"></div>
        </>
    );
};

export default BusStopMap;
