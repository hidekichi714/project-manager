/**
 * Google Calendar Module - Google Calendar API連携
 */

const GoogleCalendar = {
    // 設定
    API_KEY: 'AIzaSyD9NRHbJpngxYvOxVhBlBkdgsunCZHooXs',
    CLIENT_ID: '170943366688-nchj26gtkncu6s3t9rp4hn15hea45ssh.apps.googleusercontent.com',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/calendar.events',

    // 状態
    initialized: false,
    connected: false,
    events: [],
    tokenClient: null,

    // 初期化
    async init() {
        // API設定が未設定の場合はスキップ
        if (!this.API_KEY || !this.CLIENT_ID) {
            console.log('Google Calendar: API未設定（カレンダー連携は無効）');
            this.updateUI();
            return;
        }

        try {
            await this.loadGapiScript();
            await this.loadGisScript();
            await this.initializeGapi();
            this.initializeGis();
            this.initialized = true;
            console.log('Google Calendar: 初期化完了');
            this.updateUI();
        } catch (error) {
            console.error('Google Calendar 初期化エラー:', error);
        }
    },

    // GAPI スクリプト読み込み
    loadGapiScript() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    // GIS スクリプト読み込み
    loadGisScript() {
        return new Promise((resolve, reject) => {
            if (window.google?.accounts) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    // GAPI 初期化
    async initializeGapi() {
        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: this.API_KEY,
                        discoveryDocs: [this.DISCOVERY_DOC],
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    },

    // GIS 初期化
    initializeGis() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES,
            callback: (response) => {
                if (response.error) {
                    console.error('Google Calendar 認証エラー:', response);
                    return;
                }
                this.connected = true;
                this.updateUI();
                this.fetchEvents();
            },
        });
    },

    // 接続
    connect() {
        if (!this.initialized) {
            this.showSetupInstructions();
            return;
        }

        if (gapi.client.getToken() === null) {
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            this.tokenClient.requestAccessToken({ prompt: '' });
        }
    },

    // 切断
    disconnect() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
        }
        this.connected = false;
        this.events = [];
        this.updateUI();
        Calendar.render();
    },

    // イベント取得
    async fetchEvents() {
        if (!this.connected) return;

        try {
            const now = new Date();
            const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

            const response = await gapi.client.calendar.events.list({
                calendarId: 'primary',
                timeMin: timeMin,
                timeMax: timeMax,
                showDeleted: false,
                singleEvents: true,
                maxResults: 100,
                orderBy: 'startTime',
            });

            this.events = response.result.items || [];
            console.log(`Google Calendar: ${this.events.length}件のイベントを取得`);
            Calendar.render();
            UI.showToast('Googleカレンダーを同期しました', 'success');
        } catch (error) {
            console.error('イベント取得エラー:', error);
            UI.showToast('カレンダーの取得に失敗しました', 'error');
        }
    },

    // イベント一覧を取得
    getEvents() {
        return this.events;
    },

    // セットアップ手順を表示
    showSetupInstructions() {
        const message = `
Google Calendar API のセットアップが必要です：

1. Google Cloud Console (https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（またはFirebaseと同じプロジェクトを使用）
3. 「APIとサービス」→「ライブラリ」でGoogle Calendar APIを有効化
4. 「認証情報」→「認証情報を作成」→「OAuth クライアント ID」
5. アプリケーションの種類: 「ウェブ アプリケーション」
6. 承認済みのJavaScript生成元にドメインを追加
7. クライアントIDとAPIキーをコードに設定

詳細はドキュメントを参照してください。
        `;
        alert(message);
    },

    // UI更新
    updateUI() {
        const section = document.getElementById('googleCalendarSection');
        const status = document.getElementById('googleCalendarStatus');
        const connectBtn = document.getElementById('connectGoogleCalendar');
        const disconnectBtn = document.getElementById('disconnectGoogleCalendar');

        if (!this.API_KEY || !this.CLIENT_ID) {
            if (status) status.textContent = '未設定';
            if (connectBtn) {
                connectBtn.textContent = 'セットアップ';
                connectBtn.onclick = () => this.showSetupInstructions();
            }
            return;
        }

        if (this.connected) {
            if (status) {
                status.textContent = '接続中';
                status.classList.add('connected');
            }
            if (connectBtn) connectBtn.classList.add('hidden');
            if (disconnectBtn) disconnectBtn.classList.remove('hidden');
        } else {
            if (status) {
                status.textContent = '未接続';
                status.classList.remove('connected');
            }
            if (connectBtn) {
                connectBtn.classList.remove('hidden');
                connectBtn.onclick = () => this.connect();
            }
            if (disconnectBtn) disconnectBtn.classList.add('hidden');
        }
    },

    // タスクをGoogleカレンダーに追加
    async addTaskToCalendar(task, project) {
        if (!this.connected) {
            // 未接続の場合は接続を試行
            await this.connect();
            // 接続後も未接続なら中断
            if (!this.connected) {
                UI.showToast('Googleカレンダーに接続してください', 'warning');
                return null;
            }
        }

        try {
            const event = {
                summary: task.name,
                description: `${project ? project.name + ' - ' : ''}${task.description || ''}
ステータス: ${this.getStatusLabel(task.status)}
優先度: ${this.getPriorityLabel(task.priority)}`,
                start: {
                    date: task.startDate,
                },
                end: {
                    date: this.addDays(task.endDate, 1), // 終日イベントは翌日を指定
                },
                colorId: this.getPriorityColorId(task.priority),
            };

            const response = await gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event,
            });

            console.log('Googleカレンダーに追加:', response.result);
            UI.showToast('Googleカレンダーに追加しました', 'success');

            // イベント一覧を再取得
            this.fetchEvents();

            return response.result;
        } catch (error) {
            console.error('カレンダー追加エラー:', error);
            UI.showToast('カレンダーへの追加に失敗しました', 'error');
            return null;
        }
    },

    // ヘルパーメソッド
    addDays(dateStr, days) {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    },

    getStatusLabel(status) {
        const labels = { 'todo': '未着手', 'in-progress': '進行中', 'done': '完了', 'on-hold': '保留' };
        return labels[status] || status;
    },

    getPriorityLabel(priority) {
        const labels = { 'high': '高', 'medium': '中', 'low': '低' };
        return labels[priority] || priority;
    },

    getPriorityColorId(priority) {
        // Google Calendar color IDs: 11=赤, 5=黄, 2=緑
        const colors = { 'high': '11', 'medium': '5', 'low': '2' };
        return colors[priority] || '9';
    }
};

// イベントリスナー
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connectGoogleCalendar')?.addEventListener('click', () => {
        GoogleCalendar.connect();
    });

    document.getElementById('disconnectGoogleCalendar')?.addEventListener('click', () => {
        GoogleCalendar.disconnect();
    });

    // 初期化
    GoogleCalendar.init();
});
