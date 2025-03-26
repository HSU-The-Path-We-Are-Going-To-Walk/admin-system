import React, { useEffect, useState, useRef } from 'react';

const BusStopMap = ({ busStops, searchedStop, activeEmergencies }) => {
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const markersRef = useRef({});
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [infoWindow, setInfoWindow] = useState(null);
    const [mapError, setMapError] = useState(null);
    const [activeCameraStop, setActiveCameraStop] = useState(null);

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

            // 긴급 상황 처리 함수
            window.handleEmergencyAction = function (stopId) {
                const stop = busStops.find(s => s.id === stopId);
                if (stop) {
                    // 여기에 긴급 상황 처리 로직 추가
                    console.log(`긴급 상황 처리 - 정류장 ID: ${stopId}`);
                    // 예: 관리자에게 알림, 비상 연락망 가동 등
                    alert(`${stop.name} 정류장의 긴급 상황을 처리합니다.`);
                }
            };

            // 카메라 연결 함수 업데이트
            window.connectToCamera = function (stopId) {
                const stop = busStops.find(s => s.id === stopId);
                if (stop) {
                    setActiveCameraStop(stop);
                }
            };

            console.log('지도가 성공적으로 로드되었습니다');
        } catch (error) {
            console.error('지도 초기화 오류:', error);
            setMapError('지도를 초기화하는 중 오류가 발생했습니다: ' + error.message);
        }
    }, [busStops]);

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

    // 마커 클릭 이벤트 콘텐츠 템플릿
    const getInfoWindowContent = (stop) => `
        <div class="bus-stop-popup">
            <div class="popup-header">
                <h3>${stop.name}</h3>
            </div>
            <div class="popup-content">
                <p>위치: ${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}</p>
                <div class="popup-buttons">
                    <button class="camera-connect-btn" onclick="window.connectToCamera(${stop.id})">
                        <img src="/camera-icon.png" alt="Camera" onerror="this.style.display='none'; this.nextElementSibling.style.margin='0'" style="width:16px; height:16px; margin-right:4px; vertical-align:middle;">
                        <span>카메라 연결</span>
                    </button>
                    <button class="emergency-btn" onclick="window.simulateEmergency(${stop.id})">
                        긴급 버튼 테스트
                    </button>
                </div>
            </div>
        </div>`;

    // 마커 생성 함수
    const createMarker = (stop) => {
        try {
            const position = new window.kakao.maps.LatLng(stop.lat, stop.lng);
            const marker = new window.kakao.maps.Marker({
                position: position,
                title: stop.name,
                clickable: true
            });

            marker.setMap(map);

            // 마커 클릭 이벤트 - mouseEvent 파라미터 제거
            window.kakao.maps.event.addListener(marker, 'click', () => {
                if (infoWindow) {
                    infoWindow.close();
                }

                infoWindow.setContent(getInfoWindowContent(stop));
                infoWindow.open(map, marker);
                setSelectedMarker(stop);
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

                    // 인포윈도우 내용 - 모든 상황에서 동일한 내용 표시
                    const content = getInfoWindowContent(stop);

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
            console.error('긴급 마커 업데이트 중 오류:', error);;
        }
    }, [map, activeEmergencies]);

    // 카메라 화면을 표시할 오버레이
    useEffect(() => {
        if (!map || !activeCameraStop) return;

        try {
            // 카메라 화면 오버레이 생성
            const overlayContent = document.createElement('div');
            overlayContent.className = 'camera-overlay';

            overlayContent.innerHTML = `
                <div class="camera-view">
                    <div class="camera-header">
                        <h3>${activeCameraStop.name} - 실시간 카메라</h3>
                        <button class="camera-close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">
                            X
                        </button>
                    </div>
                    <div class="camera-content">
                        <div class="camera-placeholder">
                            <p>실제 카메라 화면이 여기에 표시됩니다</p>
                            <p>정류장 ID: ${activeCameraStop.id}</p>
                        </div>
                    </div>
                </div>
            `;

            // 오버레이에 닫기 이벤트 추가
            const closeBtn = overlayContent.querySelector('.camera-close-btn');
            closeBtn.addEventListener('click', () => {
                overlayContent.classList.remove('active');
                setTimeout(() => {
                    if (overlayContent.parentNode) {
                        overlayContent.parentNode.removeChild(overlayContent);
                    }
                    setActiveCameraStop(null);
                }, 500);
            });

            // 마커의 실제 위치를 가져옴
            const markerInfo = markersRef.current[activeCameraStop.id];
            if (!markerInfo || !markerInfo.marker) {
                throw new Error("마커를 찾을 수 없습니다");
            }

            // DOM에 추가하기 전에 초기 위치 설정
            const markerPosition = markerInfo.marker.getPosition();
            const projection = map.getProjection();
            const markerPoint = projection.pointFromCoords(markerPosition);
            const mapContainer = document.getElementById('map');
            const mapRect = mapContainer.getBoundingClientRect();

            // body에 추가
            document.body.appendChild(overlayContent);

            // 초기 위치 설정 (마커 위치)
            overlayContent.style.left = (markerPoint.x + mapRect.left) + 'px';
            overlayContent.style.top = (markerPoint.y + mapRect.top) + 'px';

            // 애니메이션 시작 (약간의 지연을 주어 초기 위치가 적용되도록 함)
            setTimeout(() => {
                overlayContent.classList.add('active');
                overlayContent.style.left = '50%';
                overlayContent.style.top = '50%';
                overlayContent.style.transform = 'translate(-50%, -50%) scale(1)';
                overlayContent.style.opacity = '1';
            }, 50);

            return () => {
                if (overlayContent.parentNode) {
                    overlayContent.parentNode.removeChild(overlayContent);
                }
            };
        } catch (error) {
            console.error("카메라 오버레이 생성 중 오류:", error);
        }
    }, [map, activeCameraStop]);

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
