import React, { useState, useRef, useEffect } from 'react';

const SearchBar = ({ busStops, onSearch }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef(null);

    // 검색어 변경 시 실시간으로 제안 업데이트
    useEffect(() => {
        if (query.trim() === '') {
            setSuggestions([]);
            return;
        }

        const filtered = busStops.filter(stop =>
            stop.name.toLowerCase().includes(query.toLowerCase())
        );
        setSuggestions(filtered);
    }, [query, busStops]);

    // 외부 클릭 시 제안 목록 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // 검색 실행
    const handleSearch = (stop) => {
        if (stop) {
            onSearch(stop);
            setQuery(stop.name);
            setShowSuggestions(false);
        }
    };

    // 엔터 키 누를 때 검색
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && suggestions.length > 0) {
            handleSearch(suggestions[0]);
        }
    };

    return (
        <div className="search-container">
            <input
                type="text"
                className="search-input"
                placeholder="정류소 검색..."
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
            />
            {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-container" ref={suggestionsRef}>
                    {suggestions.map(stop => (
                        <div
                            key={stop.id}
                            className="suggestion-item"
                            onClick={() => handleSearch(stop)}
                        >
                            {stop.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
