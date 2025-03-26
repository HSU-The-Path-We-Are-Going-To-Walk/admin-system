#!/usr/bin/env python3
"""
TAGO(국가대중교통정보센터) API를 사용하여 고흥시 버스정류장 위치 정보를 수집하는 스크립트
"""

import requests
import json
import time
import os
import xml.etree.ElementTree as ET
from urllib.parse import urlencode, quote_plus

# TAGO API 설정
API_KEY = "PWg7zQCmIEIfoTpRBOEXcvjKtxWDrMphHqsO8WbjVgTobNBfhklQyrUz7KXCkECz8hCNHgcpVT2lJKfpZp+RTw=="
BASE_URL = "http://apis.data.go.kr/1613000/BusSttnInfoInqireService"


def parse_xml_response(xml_str):
    """
    XML 응답을 파싱하여 Python 딕셔너리로 변환
    """
    root = ET.fromstring(xml_str)
    result = {}

    # 응답 헤더 처리
    header = root.find(".//cmmMsgHeader")
    if header is not None:
        result["header"] = {
            "returnCode": header.findtext("returnCode", ""),
            "returnMessage": header.findtext("returnMsg", ""),
            "errMsg": header.findtext("errMsg", ""),
            "returnAuthMsg": header.findtext("returnAuthMsg", ""),
        }

    # 응답 바디 처리
    items = root.findall(".//item")
    if items:
        result["items"] = []
        for item in items:
            item_dict = {}
            for child in item:
                item_dict[child.tag] = child.text
            result["items"].append(item_dict)

    return result


def call_api(endpoint, params):
    """
    TAGO API 호출 및 응답 처리
    """
    try:
        # 파라미터에서 serviceKey만 별도로 처리
        service_key = params.pop("serviceKey", API_KEY)

        # URL에 직접 serviceKey 추가
        url = f"{endpoint}?serviceKey={quote_plus(service_key)}"

        # 나머지 파라미터는 requests가 처리하도록 함
        if params:
            response = requests.get(url, params=params)
        else:
            response = requests.get(url)

        print(f"\nAPI 요청:")
        print(f"URL: {response.url}")
        print(f"응답 상태 코드: {response.status_code}")

        if response.status_code == 200:
            content_type = response.headers.get("Content-Type", "")
            if "xml" in content_type.lower():
                result = parse_xml_response(response.text)
            else:
                result = response.json()

            print(f"응답 내용: {json.dumps(result, ensure_ascii=False, indent=2)}")
            return result
        else:
            print(f"API 오류: {response.status_code}")
            print(f"응답 내용: {response.text}")
            return None

    except Exception as e:
        print(f"API 호출 중 오류 발생: {e}")
        print(f"요청 URL: {url}")
        return None


def get_city_code():
    """
    도시 코드 목록을 조회하여 고흥군의 코드를 찾습니다.
    """
    endpoint = f"{BASE_URL}/getCtyCodeList"
    params = {"serviceKey": API_KEY}

    result = call_api(endpoint, params)

    if result and "items" in result:
        for city in result["items"]:
            if "고흥" in city.get("cityname", ""):
                return city.get("citycode")

    print("고흥군의 도시 코드를 찾을 수 없습니다.")
    return None


def get_bus_stations(city_code):
    """
    TAGO API를 사용하여 특정 도시의 버스정류소 목록을 조회합니다.
    """
    endpoint = f"{BASE_URL}/getSttnNoList"
    params = {
        "serviceKey": API_KEY,
        "cityCode": city_code,
        "numOfRows": "1000",
        "pageNo": "1",
    }

    result = call_api(endpoint, params)

    if result and "items" in result:
        return result["items"]
    return []


def collect_bus_stops():
    """
    고흥군의 모든 버스정류장 정보를 수집합니다.
    """
    print("고흥군 버스정류장 데이터 수집 시작...\n")

    # 도시 코드 조회
    city_code = get_city_code()
    if not city_code:
        return []

    print(f"고흥군 도시 코드: {city_code}\n")

    # 버스정류장 목록 조회
    stations = get_bus_stations(city_code)

    if not stations:
        print("버스정류장 정보를 가져올 수 없습니다.")
        return []

    print(f"총 {len(stations)}개의 버스정류장을 찾았습니다.\n")

    # 정류장 정보 정리
    bus_stops = []
    for i, station in enumerate(stations, 1):
        try:
            stop_info = {
                "id": i,
                "name": station.get("nodenm", ""),  # 정류소 명칭
                "lat": float(station.get("gpslati", 0)),  # 위도
                "lng": float(station.get("gpslong", 0)),  # 경도
                "address": station.get("nodeno", ""),  # 정류소 번호
                "tago_id": station.get("nodeid", ""),  # TAGO 정류소 ID
            }

            if stop_info["lat"] != 0 and stop_info["lng"] != 0:
                bus_stops.append(stop_info)
                print(f"[{i}] {stop_info['name']} (ID: {stop_info['tago_id']})")
                print(f"    위치: ({stop_info['lat']}, {stop_info['lng']})")
                print(f"    정류장 번호: {stop_info['address']}")
            else:
                print(f"[{i}] {stop_info['name']} - 위치 정보 없음, 제외됨")

        except Exception as e:
            print(f"정류장 정보 처리 중 오류: {e}")

    return bus_stops


def generate_bus_stops_file(bus_stops):
    """
    버스정류장 정보로 Python 파일 생성
    """
    output_path = "app/data/updated_bus_stops.py"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write('"""\n고흥시 버스정류장 데이터 (TAGO API로 수집됨)\n"""\n\n')
        f.write("# 고흥시 버스정류장 데이터\n")
        f.write("bus_stops = [\n")

        for stop in bus_stops:
            # 기본 필드만 포함
            f.write(
                f"    {{\"id\": {stop['id']}, \"name\": \"{stop['name']}\", "
                f"\"lat\": {stop['lat']}, \"lng\": {stop['lng']}}},\n"
            )

        f.write("]\n\n")
        f.write("def get_all_bus_stops():\n")
        f.write('    """모든 버스 정류장 데이터를 반환합니다."""\n')
        f.write("    return bus_stops\n\n")
        f.write("def get_bus_stop_by_id(stop_id):\n")
        f.write('    """ID로 버스 정류장을 찾습니다."""\n')
        f.write("    for stop in bus_stops:\n")
        f.write('        if stop["id"] == stop_id:\n')
        f.write("            return stop\n")
        f.write("    return None\n")

    # 상세 정보가 포함된 JSON 파일도 생성
    json_path = "app/data/bus_stops_detailed.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(bus_stops, f, ensure_ascii=False, indent=2)

    print(f"\n버스정류장 정보 파일이 생성되었습니다:")
    print(f"1. 기본 Python 파일: {output_path}")
    print(f"2. 상세 JSON 파일: {json_path}")
    print("\n업데이트를 적용하려면 다음 명령을 실행하세요:")
    print("cp app/data/updated_bus_stops.py app/data/bus_stops.py")


def main():
    """
    메인 실행 함수
    """
    print("TAGO API를 사용하여 고흥군 버스정류장 데이터 수집을 시작합니다...\n")

    # 버스정류장 수집
    bus_stops = collect_bus_stops()

    if not bus_stops:
        print("\n고흥군 버스정류장 데이터를 찾을 수 없습니다.")
        return

    print(f"\n총 {len(bus_stops)}개의 유효한 버스정류장 정보를 수집했습니다.")

    # 데이터 파일 생성
    generate_bus_stops_file(bus_stops)


if __name__ == "__main__":
    main()
