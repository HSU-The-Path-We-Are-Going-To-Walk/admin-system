// 긴급 알림음을 관리하는 컴포넌트
class EmergencySound {
    constructor() {
        this.audioContext = null;
        this.soundBuffer = null;
        this.isInitialized = false;
        this.volume = 0.4; // 기본 볼륨(0-1)
    }

    // 오디오 컨텍스트 초기화
    async init() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.isInitialized = true;

            // 시스템 경고음 생성
            await this.createSystemAlertSound();

            console.log('알림음 시스템이 초기화되었습니다.');
            return true;
        } catch (err) {
            console.error('알림음 초기화 실패:', err);
            return false;
        }
    }

    // 시스템 경고음 생성 - 프로그래밍 방식으로 직접 생성
    async createSystemAlertSound() {
        try {
            // 3초 길이의 오디오 버퍼 생성
            const duration = 3;
            const sampleRate = this.audioContext.sampleRate;
            const bufferSize = duration * sampleRate;
            const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);

            // 채널 데이터 가져오기
            const channelData = buffer.getChannelData(0);

            // 기본 주파수 설정 (경고음에 사용될 주파수)
            // 낮은음과 높은음의 패턴을 교대로 반복
            const frequencies = [800, 1050]; // 더 시스템 경고음 느낌의 주파수

            // 경고음 패턴 생성
            let phase = 0;
            const patternLength = 0.25; // 각 패턴의 길이 (초)
            const patternSamples = patternLength * sampleRate;

            for (let i = 0; i < bufferSize; i++) {
                // 현재 패턴 인덱스 (0 또는 1)
                const patternIndex = Math.floor((i / patternSamples) % 2);
                const frequency = frequencies[patternIndex];

                // 시스템 경고음 생성을 위한 사각파 사용 (사인파보다 더 날카로운 소리)
                phase += 2 * Math.PI * frequency / sampleRate;

                // 사각파 (더 시스템 경고음 느낌)
                const square = phase % (2 * Math.PI) < Math.PI ? 1 : -1;
                // 사인파 (부드러움)
                const sine = Math.sin(phase);

                // 사각파 70%, 사인파 30% 혼합하여 시스템 경고음 느낌을 강화하면서 부드러움 유지
                const sample = (square * 0.7 + sine * 0.3) * 0.4; // 볼륨 0.4

                // 톤 변화를 더 부드럽게 하기 위한 블렌딩
                const blendZone = patternSamples * 0.1; // 10% 블렌딩 영역
                const patternPosition = i % patternSamples;

                if (patternPosition < blendZone) {
                    // 패턴 시작 부분 블렌딩 (페이드 인)
                    const fadeRatio = patternPosition / blendZone;
                    channelData[i] = sample * fadeRatio;
                } else if (patternPosition > patternSamples - blendZone) {
                    // 패턴 끝 부분 블렌딩 (페이드 아웃)
                    const fadeRatio = (patternSamples - patternPosition) / blendZone;
                    channelData[i] = sample * fadeRatio;
                } else {
                    channelData[i] = sample;
                }

                // 전체 알림음의 처음과 끝에 페이드 인/아웃 적용
                const fadeTime = 0.1; // 페이드 시간(초)
                const fadeInSamples = fadeTime * sampleRate;
                const fadeOutSamples = fadeTime * sampleRate;

                if (i < fadeInSamples) {
                    // 전체 페이드 인
                    const fadeVolume = i / fadeInSamples;
                    channelData[i] *= fadeVolume;
                } else if (i > bufferSize - fadeOutSamples) {
                    // 전체 페이드 아웃
                    const fadeVolume = (bufferSize - i) / fadeOutSamples;
                    channelData[i] *= fadeVolume;
                }
            }

            this.soundBuffer = buffer;
            console.log('시스템 경고음이 생성되었습니다.');
            return true;
        } catch (err) {
            console.error('알림음 생성 오류:', err);
            return false;
        }
    }

    // 알림음 재생
    play() {
        if (!this.isInitialized || !this.soundBuffer) {
            console.warn('알림음 시스템이 준비되지 않았습니다.');
            this.init().then(() => {
                if (this.soundBuffer) this._playSound();
            });
            return;
        }

        this._playSound();
    }

    // 내부 재생 함수
    _playSound() {
        try {
            // 이미 일시정지된 오디오 컨텍스트 재개
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            // 오디오 소스 생성
            const source = this.audioContext.createBufferSource();
            source.buffer = this.soundBuffer;

            // 볼륨 조절
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.volume;

            // 경고음에 효과 추가 - 약간의 리버브 (에코)
            const convolver = this.audioContext.createConvolver();

            // 짧은 임펄스 응답 생성으로 약간의 에코 효과
            const reverbDuration = 1;
            const reverbDecay = 0.8;
            const reverbBuffer = this.createReverbImpulse(reverbDuration, reverbDecay);
            convolver.buffer = reverbBuffer;

            // 원음과 리버브 효과 믹싱
            const dryGainNode = this.audioContext.createGain();
            dryGainNode.gain.value = 0.7; // 원음 70%

            const wetGainNode = this.audioContext.createGain();
            wetGainNode.gain.value = 0.3; // 리버브 30%

            // 컴프레서 추가하여 소리가 너무 크지 않도록 제한
            const compressor = this.audioContext.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            // 연결 구성: 소스 -> 게인 -> (드라이/웻 믹스) -> 컴프레서 -> 출력
            source.connect(gainNode);

            // 드라이 패스 (원래 소리)
            gainNode.connect(dryGainNode);
            dryGainNode.connect(compressor);

            // 웻 패스 (리버브 효과)
            gainNode.connect(convolver);
            convolver.connect(wetGainNode);
            wetGainNode.connect(compressor);

            // 최종 출력
            compressor.connect(this.audioContext.destination);

            // 소리 재생
            source.start();

            console.log('긴급 시스템 경고음이 재생되었습니다.');
        } catch (err) {
            console.error('알림음 재생 오류:', err);
        }
    }

    // 리버브 효과를 위한 임펄스 응답 생성
    createReverbImpulse(duration, decay) {
        const sampleRate = this.audioContext.sampleRate;
        const bufferSize = duration * sampleRate;
        const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = buffer.getChannelData(channel);

            for (let i = 0; i < bufferSize; i++) {
                // 지수 감쇠 함수로 임펄스 응답 생성
                const t = i / sampleRate;
                const amplitude = Math.pow(1 - t / duration, decay);

                // 약간의 랜덤 노이즈 추가로 더 자연스러운 리버브 효과
                channelData[i] = (Math.random() * 2 - 1) * amplitude * 0.5;
            }
        }

        return buffer;
    }

    // 볼륨 설정
    setVolume(value) {
        if (value >= 0 && value <= 1) {
            this.volume = value;
        }
    }
}

// 싱글톤 인스턴스 생성
const emergencySound = new EmergencySound();

export default emergencySound;