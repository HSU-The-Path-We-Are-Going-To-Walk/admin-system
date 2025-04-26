import React, { useEffect, useState, useRef } from 'react';

const BusStopMap = ({ busStops, searchedStop, activeEmergencies, isSidebarOpen }) => {
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const markersRef = useRef({});
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [infoWindow, setInfoWindow] = useState(null);
    const [mapError, setMapError] = useState(null);
    const [activeCameraStop, setActiveCameraStop] = useState(null);
    const moveAnimationRef = useRef(null); // 이동 애니메이션 참조 추가
    const animationInProgressRef = useRef(false); // 애니메이션 진행 여부 추적
    const mapInitializedRef = useRef(false); // 지도 초기화 여부 추적
    const initialLoadComplete = useRef(false); // 초기 로딩 완료 여부
    const [emergencyPopup, setEmergencyPopup] = useState(null); // { stop } 형태
    const [emergencyRecipient, setEmergencyRecipient] = useState('admin');
    const [emergencyMessage, setEmergencyMessage] = useState('');

    // 팝업 열기 함수 (window에서 호출)
    useEffect(() => {
        window.openEmergencyPopup = (stopId) => {
            const stop = busStops.find(s => s.id === stopId);
            if (stop) {
                setEmergencyRecipient('admin');
                setEmergencyMessage(`${stop.name} 정류장에서 발생한 비상상황입니다.`);
                setEmergencyPopup({ stop });
            }
        };
        return () => { delete window.openEmergencyPopup; };
    }, [busStops]);

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
                level: 8 // 지도 확대 레벨
            };

            const newMap = new window.kakao.maps.Map(container, options);

            // 줌 컨트롤 추가
            const zoomControl = new window.kakao.maps.ZoomControl();
            newMap.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

            // 맵이 로드된 후 초기 설정 완료로 표시
            mapInitializedRef.current = true;

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

        // 처음 로드될 때만 중심점 설정하고, 줌 레벨은 유지
        if (!initialLoadComplete.current && Object.keys(markersRef.current).length > 0) {
            // 모든 마커가 보이도록 bounds 설정
            const bounds = new window.kakao.maps.LatLngBounds();
            busStops.forEach(stop => {
                bounds.extend(new window.kakao.maps.LatLng(stop.lat, stop.lng));
            });

            // 현재 줌 레벨 저장
            const currentLevel = map.getLevel();

            // 일단 bounds로 중심점 이동
            map.setBounds(bounds);

            // 사이드바가 열려 있으면 중심을 왼쪽(서쪽)으로 보정
            if (isSidebarOpen) {
                const center = map.getCenter();
                // 경도(lng)를 약간 서쪽으로 이동 (0.01~0.03 정도, 지역에 따라 조정)
                const offset = 0.025; // 고흥군 기준 약 2~3km
                const newCenter = new window.kakao.maps.LatLng(center.getLat(), center.getLng() - offset);
                map.setCenter(newCenter);
            }

            // 그 후 줌 레벨은 원래 설정값으로 복구
            map.setLevel(currentLevel);

            initialLoadComplete.current = true;
        }
    }, [map, busStops, isSidebarOpen]);

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
                    <button class="emergency-btn" onclick="window.openEmergencyPopup(${stop.id})">
                        긴급 메시지 전송
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

    // 새로운 부드러운 이동 효과 함수 - 점진적인 좌표 변경 방식으로 구현
    const smoothMoveToLocation = (targetPosition, targetLevel, currentLevel) => {
        // 이미 애니메이션이 진행 중이면 모든 타이머 취소
        if (animationInProgressRef.current) {
            clearAllAnimations();
        }

        // 애니메이션 시작 표시
        animationInProgressRef.current = true;
        console.log("애니메이션 시작", new Date().toISOString());

        // 애니메이션 설정 상수
        const ANIMATION_STEPS = 100;      // 애니메이션 총 단계 수
        const STEP_INTERVAL = 25;        // 각 단계 간 간격 (ms)
        const MINIMUM_ZOOM_LEVEL = 3;    // 최종 줌인 레벨

        // 타이머 참조 저장용 배열
        const timers = [];

        // 현재 지도 중심점
        const currentCenter = map.getCenter();
        const startPosition = {
            lat: currentCenter.getLat(),
            lng: currentCenter.getLng()
        };

        // 목표 위치
        const endPosition = {
            lat: targetPosition.getLat(),
            lng: targetPosition.getLng()
        };

        // 현재 줌 레벨
        let currentZoomLevel = currentLevel;

        // 1단계: 줌 레벨과 위치 동시 변경을 위한 단계 계산
        const latDiff = endPosition.lat - startPosition.lat;
        const lngDiff = endPosition.lng - startPosition.lng;

        // 거리 기반으로 적절한 줌아웃 레벨 결정
        const distance = calculateDistance(
            startPosition.lat, startPosition.lng,
            endPosition.lat, endPosition.lng
        );

        console.log("이동 거리 (km):", (distance / 1000).toFixed(2));

        // 줌 레벨 결정 (거리에 따라 달라짐)
        let maxZoomOutLevel;
        if (distance > 50000) {
            maxZoomOutLevel = 8; // 50km 이상
        } else if (distance > 10000) {
            maxZoomOutLevel = 7; // 10km ~ 50km
        } else if (distance > 5000) {
            maxZoomOutLevel = 6; // 5km ~ 10km
        } else if (distance > 1000) {
            maxZoomOutLevel = 5; // 1km ~ 5km
        } else {
            maxZoomOutLevel = Math.min(Math.max(currentLevel, 3), 4); // 1km 이내
        }

        // 이미 충분히 확대된 경우 줌아웃 레벨 유지
        maxZoomOutLevel = Math.max(maxZoomOutLevel, currentLevel);

        console.log("시작 레벨:", currentLevel, "최대 확대 레벨:", maxZoomOutLevel, "최종 레벨:", MINIMUM_ZOOM_LEVEL);

        // 애니메이션 단계별 실행
        let step = 0;

        // 초기 줌아웃 (첫 1/3은 줌아웃)
        const zoomOutSteps = Math.floor(ANIMATION_STEPS * 0.25);

        // 이동 단계 (중간 2/3는 이동)
        const moveStartStep = Math.floor(ANIMATION_STEPS * 0.1); // 줌아웃 진행 중에 이동 시작
        const moveEndStep = Math.floor(ANIMATION_STEPS * 0.75);  // 줌인 시작 전에 이동 완료

        // 줌인 단계 (마지막 1/3은 줌인)
        const zoomInStartStep = Math.floor(ANIMATION_STEPS * 0.6); // 이동 진행 중에 줌인 시작

        const animation = setInterval(() => {
            try {
                step++;

                // 1) 줌 레벨 계산: 점진적인 줌아웃 후 줌인
                let targetZoomForStep;

                if (step < zoomOutSteps) {
                    // 줌아웃 단계
                    const zoomOutProgress = step / zoomOutSteps;
                    targetZoomForStep = currentLevel + Math.floor((maxZoomOutLevel - currentLevel) * zoomOutProgress);
                } else if (step >= zoomInStartStep) {
                    // 줌인 단계
                    const zoomInProgress = (step - zoomInStartStep) / (ANIMATION_STEPS - zoomInStartStep);
                    targetZoomForStep = maxZoomOutLevel - Math.floor((maxZoomOutLevel - MINIMUM_ZOOM_LEVEL) * zoomInProgress);
                } else {
                    // 중간 단계는 줌아웃 레벨 유지
                    targetZoomForStep = maxZoomOutLevel;
                }

                // 줌 레벨 조정 - 필요한 경우에만
                if (map.getLevel() !== targetZoomForStep) {
                    map.setLevel(targetZoomForStep);
                }

                // 2) 위치 계산: 점진적인 이동
                if (step >= moveStartStep && step <= moveEndStep) {
                    const moveProgress = (step - moveStartStep) / (moveEndStep - moveStartStep);
                    // easeInOutCubic 이징 함수 적용 (부드러운 가속/감속)
                    const easedProgress = easeInOut(moveProgress);

                    const newLat = startPosition.lat + (latDiff * easedProgress);
                    const newLng = startPosition.lng + (lngDiff * easedProgress);

                    const newPosition = new window.kakao.maps.LatLng(newLat, newLng);
                    map.setCenter(newPosition);
                }

                // 애니메이션 완료
                if (step >= ANIMATION_STEPS) {
                    clearInterval(animation);
                    finishAnimation();
                }

            } catch (error) {
                console.error("애니메이션 단계 실행 중 오류:", error);
                clearInterval(animation);

                // 오류 발생 시 기본 이동으로 대체
                map.setCenter(targetPosition);
                map.setLevel(MINIMUM_ZOOM_LEVEL);
                finishAnimation();
            }
        }, STEP_INTERVAL);

        timers.push(animation);

        // 애니메이션 완료 후 처리
        function finishAnimation() {
            console.log("애니메이션 완료");

            // 최종 위치와 줌 레벨 확인
            map.setCenter(targetPosition);
            map.setLevel(MINIMUM_ZOOM_LEVEL);

            // 인포윈도우 표시
            const infoWindowTimer = setTimeout(() => {
                try {
                    const targetMarkerInfo = markersRef.current[searchedStop.id];
                    if (targetMarkerInfo && targetMarkerInfo.marker) {
                        window.kakao.maps.event.trigger(targetMarkerInfo.marker, 'click');
                    }
                } catch (e) {
                    console.error("인포윈도우 표시 오류:", e);
                }

                animationInProgressRef.current = false;
            }, 200);

            timers.push(infoWindowTimer);
        }

        // 모든 타이머 참조 저장
        moveAnimationRef.current = timers;
    };

    // 이징 함수 - 부드러운 가속/감속을 위한 함수
    function easeInOut(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    // 두 좌표 사이의 거리 계산 함수 (하버사인 공식)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        try {
            // 카카오맵 geometry 라이브러리가 있다면 사용
            if (window.kakao && window.kakao.maps && window.kakao.maps.geometry) {
                const point1 = new window.kakao.maps.LatLng(lat1, lon1);
                const point2 = new window.kakao.maps.LatLng(lat2, lon2);
                return window.kakao.maps.geometry.getDistance(point1, point2);
            } else {
                // 기하 라이브러리가 없으면 하버사인 공식으로 계산
                const R = 6371e3; // 지구 반경 (미터)
                const φ1 = lat1 * Math.PI / 180;
                const φ2 = lat2 * Math.PI / 180;
                const Δφ = (lat2 - lat1) * Math.PI / 180;
                const Δλ = (lon2 - lon1) * Math.PI / 180;

                const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                return R * c; // 미터 단위 거리
            }
        } catch (error) {
            console.error("거리 계산 오류:", error);

            // 오류 발생 시 매우 단순한 추정 (정확하지 않음)
            const latDiff = Math.abs(lat1 - lat2);
            const lngDiff = Math.abs(lon1 - lon2);
            return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000;
        }
    }

    // 모든 애니메이션 타이머 정리
    const clearAllAnimations = () => {
        console.log("기존 애니메이션 정리");
        if (moveAnimationRef.current && Array.isArray(moveAnimationRef.current)) {
            moveAnimationRef.current.forEach(timer => {
                if (typeof timer === 'number') {
                    clearTimeout(timer);
                    clearInterval(timer);
                }
            });
        }
        moveAnimationRef.current = [];
        animationInProgressRef.current = false;
    };

    // 검색된 정류장이 있으면 해당 위치로 이동
    useEffect(() => {
        if (!map || !searchedStop) return;

        console.log("검색된 정류장:", searchedStop.name);

        try {
            const position = new window.kakao.maps.LatLng(searchedStop.lat, searchedStop.lng);
            const currentLevel = map.getLevel();

            // 부드러운 이동 효과 적용
            smoothMoveToLocation(position, 3, currentLevel);
        } catch (error) {
            console.error("검색 위치 이동 중 오류:", error);

            // 오류 발생 시 기본 이동
            try {
                const position = new window.kakao.maps.LatLng(searchedStop.lat, searchedStop.lng);
                map.setCenter(position);
                map.setLevel(3);

                // 마커 클릭
                setTimeout(() => {
                    const targetMarkerInfo = markersRef.current[searchedStop.id];
                    if (targetMarkerInfo && targetMarkerInfo.marker) {
                        window.kakao.maps.event.trigger(targetMarkerInfo.marker, 'click');
                    }
                }, 500);
            } catch (fallbackError) {
                console.error("기본 이동도 실패:", fallbackError);
            }
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

            // 마커의 정보를 찾음
            const markerInfo = markersRef.current[activeCameraStop.id];
            if (!markerInfo || !markerInfo.marker) {
                throw new Error("마커를 찾을 수 없습니다");
            }

            // DOM에 먼저 추가 (중앙에 바로 표시)
            document.body.appendChild(overlayContent);

            // 중앙에 바로 표시 (처음부터 위치를 50%로 고정)
            overlayContent.style.left = '50%';
            overlayContent.style.top = '50%';

            // 애니메이션 시작 (작은 크기에서 큰 크기로)
            requestAnimationFrame(() => {
                overlayContent.classList.add('active');
            });

            return () => {
                if (overlayContent.parentNode) {
                    overlayContent.parentNode.removeChild(overlayContent);
                }
            };
        } catch (error) {
            console.error("카메라 오버레이 생성 중 오류:", error);
        }
    }, [map, activeCameraStop]);

    // 컴포넌트 언마운트 시 애니메이션 정리
    useEffect(() => {
        return () => {
            clearAllAnimations();
        };
    }, []);

    // 긴급 메시지 팝업 렌더링
    const renderEmergencyPopup = () => {
        if (!emergencyPopup) return null;
        const { stop } = emergencyPopup;
        return (
            <div className="emergency-message-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="emergency-message-modal" style={{ background: '#fff', borderRadius: 8, padding: 24, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
                    <h2 style={{ marginBottom: 16 }}>{stop.name} - 긴급 메시지 전송</h2>
                    <div style={{ marginBottom: 12 }}>
                        <strong>받는 사람:</strong><br />
                        <label style={{ marginRight: 12 }}>
                            <input type="radio" name="recipient" value="admin" checked={emergencyRecipient === 'admin'} onChange={() => setEmergencyRecipient('admin')} /> 인근 직원
                        </label>
                        <label style={{ marginRight: 12 }}>
                            <input type="radio" name="recipient" value="119" checked={emergencyRecipient === '119'} onChange={() => setEmergencyRecipient('119')} /> 119
                        </label>
                        <label>
                            <input type="radio" name="recipient" value="112" checked={emergencyRecipient === '112'} onChange={() => setEmergencyRecipient('112')} /> 112
                        </label>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <strong>내용:</strong><br />
                        <textarea style={{ width: '100%', minHeight: 60 }} value={emergencyMessage} onChange={e => setEmergencyMessage(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={() => setEmergencyPopup(null)} style={{ padding: '6px 16px' }}>닫기</button>
                        <button onClick={() => {
                            alert(`메시지가 전송되었습니다.\n받는 사람: ${emergencyRecipient}\n내용: ${emergencyMessage}`);
                            setEmergencyPopup(null);
                        }} style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px' }}>전송</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {mapError && (
                <div className="map-error">
                    <h3>지도 로딩 오류</h3>
                    <p>{mapError}</p>
                </div>
            )}
            <div id="map" className="map-container"></div>
            {renderEmergencyPopup()}
        </>
    );
};

export default BusStopMap;
