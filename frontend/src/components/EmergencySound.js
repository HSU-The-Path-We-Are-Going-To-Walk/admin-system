// 긴급 알림음을 관리하는 컴포넌트
class EmergencySound {
    constructor() {
        this.audioContext = null;
        this.soundBuffer = null;
        this.isInitialized = false;
        this.volume = 0.7; // 기본 볼륨(0-1)
        this.isEnabled = true; // 소리 활성화 여부
    }

    // 오디오 컨텍스트 초기화
    async init() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.isInitialized = true;

            // 시스템 경고음 생성 ('두둥' 효과)
            await this.createSystemAlertSound();

            console.log('알림음 시스템이 초기화되었습니다.');
            return true;
        } catch (err) {
            console.error('알림음 초기화 실패:', err);
            return false;
        }
    }

    // 시스템 경고음 생성 - '두둥' 느낌의 시스템 경고음
    async createSystemAlertSound() {
        try {
            // 2초 길이의 오디오 버퍼 생성
            const duration = 2;
            const sampleRate = this.audioContext.sampleRate;
            const bufferSize = duration * sampleRate;
            const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

            // 채널 데이터 가져오기
            const leftChannel = buffer.getChannelData(0);
            const rightChannel = buffer.getChannelData(1);

            // '두둥' 알림 생성
            // 1. 첫 번째 '두' - 낮은 음
            const firstNoteFreq = 150; // 낮은 주파수
            const firstNoteStart = 0;
            const firstNoteDuration = 0.2; // 짧은 첫 음

            // 2. 두 번째 '둥' - 약간 더 낮은 음
            const secondNoteFreq = 120; // 더 낮은 주파수
            const secondNoteGap = 0.05; // 첫음과 두번째 음 사이 짧은 간격
            const secondNoteStart = firstNoteStart + firstNoteDuration + secondNoteGap;
            const secondNoteDuration = 0.5; // 더 긴 두번째 음

            // 음의 감쇠 속도 설정
            const attackTime = 0.005; // 소리 시작시 빠르게 커짐
            const firstDecayTime = firstNoteDuration * 0.7; // 소리 감쇠 시간
            const secondDecayTime = secondNoteDuration * 0.8; // 소리 감쇠 시간

            // 첫 번째 '두' 생성
            this.generateNote(
                leftChannel,
                rightChannel,
                firstNoteFreq,
                firstNoteStart,
                firstNoteDuration,
                sampleRate,
                attackTime,
                firstDecayTime
            );

            // 두 번째 '둥' 생성
            this.generateNote(
                leftChannel,
                rightChannel,
                secondNoteFreq,
                secondNoteStart,
                secondNoteDuration,
                sampleRate,
                attackTime,
                secondDecayTime,
                0.85 // 약간 더 큰 볼륨으로
            );

            this.soundBuffer = buffer;
            console.log('시스템 경고음이 생성되었습니다.');
            return true;
        } catch (err) {
            console.error('알림음 생성 오류:', err);
            return false;
        }
    }

    // 특정 주파수의 음을 생성하는 함수
    generateNote(leftChannel, rightChannel, frequency, startTime, duration, sampleRate, attackTime, decayTime, volumeMultiplier = 0.7) {
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.floor((startTime + duration) * sampleRate);
        const attackSamples = Math.floor(attackTime * sampleRate);
        const decaySamples = Math.floor(decayTime * sampleRate);

        // 기본 진폭
        const amplitude = 0.7 * volumeMultiplier;

        for (let i = startSample; i < endSample; i++) {
            if (i >= leftChannel.length) break;

            // 현재 시간
            const t = (i - startSample) / sampleRate;

            // 기본 사인파
            const sine = Math.sin(2 * Math.PI * frequency * t);

            // 하모닉 추가 (풍부한 음색을 위해)
            const harmonic1 = Math.sin(2 * Math.PI * (frequency * 2) * t) * 0.3; // 2배음
            const harmonic2 = Math.sin(2 * Math.PI * (frequency * 3) * t) * 0.15; // 3배음

            // 복합 파형
            let sample = (sine + harmonic1 + harmonic2) * amplitude;

            // 진폭 엔벨로프 적용 (시작시 서서히 증가, 끝에 서서히 감소)
            const samplePosition = i - startSample;

            // Attack 단계 (소리 시작시 빠르게 커짐)
            if (samplePosition < attackSamples) {
                sample *= samplePosition / attackSamples;
            }
            // Decay 및 Sustain 단계 (점진적 감소)
            else {
                const decayStart = endSample - startSample - decaySamples;
                if (samplePosition > decayStart) {
                    // 지수적 감쇠 적용
                    const decayPosition = samplePosition - decayStart;
                    const decayFactor = 1 - (decayPosition / decaySamples);
                    sample *= Math.pow(decayFactor, 2); // 제곱하여 더 빠른 감쇠 효과
                }
            }

            // 스테레오 효과를 위해 왼쪽과 오른쪽 채널에 약간 다르게 적용
            leftChannel[i] += sample;
            rightChannel[i] += sample * 0.95; // 약간의 스테레오 효과
        }
    }

    // 알림음 재생
    play() {
        if (!this.isEnabled) return; // 소리가 비활성화되었으면 재생하지 않음

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

            // 저음 강화를 위한 필터 추가
            const bassFilter = this.audioContext.createBiquadFilter();
            bassFilter.type = 'lowshelf';
            bassFilter.frequency.value = 200;
            bassFilter.gain.value = 10; // 저음 강화

            // 리버브 효과 추가 (두둥 느낌 강화)
            const convolver = this.audioContext.createConvolver();
            convolver.buffer = this.createReverbImpulse(1.5, 0.8); // 공간감 있는 리버브

            // 원음/효과음 믹스 비율 설정
            const dryGain = this.audioContext.createGain();
            dryGain.gain.value = 0.7; // 원음 70%

            const wetGain = this.audioContext.createGain();
            wetGain.gain.value = 0.3; // 효과음 30%

            // 컴프레서 추가하여 볼륨 일정하게 유지
            const compressor = this.audioContext.createDynamicsCompressor();
            compressor.threshold.value = -18;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            // 연결 구성: 소스 -> 게인 -> 베이스필터 -> (드라이/웻 믹스) -> 컴프레서 -> 출력
            source.connect(gainNode);
            gainNode.connect(bassFilter);

            // 드라이 패스 (원음)
            bassFilter.connect(dryGain);
            dryGain.connect(compressor);

            // 웻 패스 (리버브)
            bassFilter.connect(convolver);
            convolver.connect(wetGain);
            wetGain.connect(compressor);

            // 출력
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

                // 약간의 랜덤 노이즈 추가로 자연스러운 리버브
                channelData[i] = (Math.random() * 2 - 1) * amplitude * 0.3;
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

    // 소리 활성화/비활성화 설정
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
}

// 싱글톤 인스턴스 생성
const emergencySound = new EmergencySound();

export default emergencySound;