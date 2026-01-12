/**
 * Voice Module - Web Speech APIによる音声入力
 */

const Voice = {
    // 状態
    recognition: null,
    isListening: false,
    currentTarget: null,
    supported: false,

    // 初期化
    init() {
        // Web Speech API対応チェック
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.log('Voice: このブラウザは音声認識をサポートしていません');
            return;
        }

        this.supported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'ja-JP';
        this.recognition.interimResults = true;
        this.recognition.continuous = false;

        // イベントハンドラ
        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript;

            if (this.currentTarget) {
                this.currentTarget.value = transcript;
                // inputイベントを発火
                this.currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateButtons();
        };

        this.recognition.onerror = (event) => {
            console.error('音声認識エラー:', event.error);
            this.isListening = false;
            this.updateButtons();

            if (event.error === 'not-allowed') {
                UI.showToast('マイクの使用が許可されていません', 'warning');
            }
        };

        // マイクボタンを追加
        this.addVoiceButtons();
    },

    // マイクボタンを入力フィールドに追加
    addVoiceButtons() {
        if (!this.supported) return;

        // プロジェクト名
        this.addButtonToInput('projectName');
        // タスク名
        this.addButtonToInput('taskName');
        // カテゴリ名
        this.addButtonToInput('categoryName');
        // 検索
        this.addButtonToInput('searchInput');
    },

    addButtonToInput(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        // ラッパーを作成
        const wrapper = document.createElement('div');
        wrapper.className = 'voice-input-wrapper';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        // マイクボタン
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'voice-btn';
        btn.innerHTML = '🎤';
        btn.title = '音声入力';
        btn.dataset.targetId = inputId;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle(inputId);
        });
        wrapper.appendChild(btn);
    },

    // 音声認識開始/停止
    toggle(inputId) {
        if (!this.supported) {
            UI.showToast('このブラウザは音声認識をサポートしていません', 'warning');
            return;
        }

        if (this.isListening) {
            this.stop();
        } else {
            this.start(inputId);
        }
    },

    start(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        this.currentTarget = input;
        this.isListening = true;
        this.updateButtons();

        try {
            this.recognition.start();
        } catch (e) {
            console.error('音声認識開始エラー:', e);
        }
    },

    stop() {
        this.isListening = false;
        this.recognition.stop();
        this.updateButtons();
    },

    // ボタン状態更新
    updateButtons() {
        document.querySelectorAll('.voice-btn').forEach(btn => {
            if (this.isListening && btn.dataset.targetId === this.currentTarget?.id) {
                btn.classList.add('listening');
                btn.innerHTML = '⏹️';
            } else {
                btn.classList.remove('listening');
                btn.innerHTML = '🎤';
            }
        });
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    Voice.init();
});
