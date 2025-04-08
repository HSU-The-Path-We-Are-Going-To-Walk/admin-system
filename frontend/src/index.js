// 모든 import 문을 상단에 배치
import 'process';
import { Buffer } from 'buffer';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// import 후에 전역 변수 설정
window.Buffer = Buffer;
window.process = process;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
