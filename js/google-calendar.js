/**
 * Google Calendar Module - Google Calendar API連携
 */

const GoogleCalendar = {
    // 設定
    API_KEY: 'AIzaSyD9NRHbJpngxYvOxVhBlBkdgsunCZHooXs',
    CLIENT_ID: '170943366688-nchj26gtkncu6s3t9rp4hn15hea45ssh.apps.googleusercontent.com',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',

    // 状態
    initialized: false,
    connected: false,
    events: [],
    calendars: [],
    selectedCalendars: new Set(),
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
            // カレンダー一覧を取得
            await this.fetchCalendars();

            // Quick Add Calendar Selectorを更新
            if (typeof UI !== 'undefined') {
                UI.populateQuickAddCalendar();
            }

            const now = new Date();
            const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

            // 選択されたカレンダーからイベントを取得
            this.events = [];
            const calendarsToFetch = this.selectedCalendars.size > 0
                ? [...this.selectedCalendars]
                : this.calendars.map(c => c.id);

            for (const calendarId of calendarsToFetch) {
                try {
                    const response = await gapi.client.calendar.events.list({
                        calendarId: calendarId,
                        timeMin: timeMin,
                        timeMax: timeMax,
                        showDeleted: false,
                        singleEvents: true,
                        maxResults: 50,
                        orderBy: 'startTime',
                    });

                    const calendarInfo = this.calendars.find(c => c.id === calendarId);
                    const eventsWithCalendar = (response.result.items || []).map(event => ({
                        ...event,
                        calendarId: calendarId,
                        calendarName: calendarInfo?.summary || 'カレンダー',
                        calendarColor: calendarInfo?.backgroundColor || '#4285f4'
                    }));
                    this.events.push(...eventsWithCalendar);
                } catch (err) {
                    console.warn(`カレンダー ${calendarId} の取得に失敗:`, err);
                }
            }

            console.log(`Google Calendar: ${this.events.length}件のイベントを取得`);
            this.updateCalendarSelector();
            Calendar.render();

            // アクティブなビューも更新
            const activeView = document.querySelector('.view-container:not(.hidden)')?.id;
            if (activeView === 'weeklyView' && typeof WeeklyView !== 'undefined') {
                WeeklyView.renderWeekly();
            } else if (activeView === 'dailyView' && typeof WeeklyView !== 'undefined') {
                WeeklyView.renderDaily();
            }

            UI.showToast('Googleカレンダーを同期しました', 'success');
        } catch (error) {
            console.error('イベント取得エラー:', error);
            UI.showToast('カレンダーの取得に失敗しました', 'error');
        }
    },

    // カレンダー一覧取得
    async fetchCalendars() {
        try {
            const response = await gapi.client.calendar.calendarList.list();
            this.calendars = response.result.items || [];

            // 初回は全カレンダーを選択
            if (this.selectedCalendars.size === 0) {
                this.calendars.forEach(c => this.selectedCalendars.add(c.id));
            }

            console.log(`Google Calendar: ${this.calendars.length}件のカレンダーを取得`);
        } catch (error) {
            console.error('カレンダー一覧取得エラー:', error);
        }
    },

    // カレンダー選択をトグル
    toggleCalendar(calendarId) {
        if (this.selectedCalendars.has(calendarId)) {
            this.selectedCalendars.delete(calendarId);
        } else {
            this.selectedCalendars.add(calendarId);
        }
        this.fetchEvents();
    },

    // カレンダー選択UI更新
    updateCalendarSelector() {
        const container = document.getElementById('calendarSelector');
        if (!container) return;

        let html = '';
        this.calendars.forEach(cal => {
            const isSelected = this.selectedCalendars.has(cal.id);
            html += `
                <label class="calendar-selector-item" style="--cal-color: ${cal.backgroundColor}">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} data-calendar-id="${cal.id}">
                    <span class="calendar-dot" style="background: ${cal.backgroundColor}"></span>
                    <span class="calendar-name">${cal.summary}</span>
                </label>
            `;
        });
        container.innerHTML = html;

        // イベントバインド
        container.querySelectorAll('input').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.toggleCalendar(checkbox.dataset.calendarId);
            });
        });
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
        const status = document.getElementById('googleCalendarStatus');
        const connectBtn = document.getElementById('connectGoogleCalendar');
        const disconnectBtn = document.getElementById('disconnectGoogleCalendar');
        const addEventBtn = document.getElementById('addGoogleEvent');
        const selectorContainer = document.getElementById('calendarSelectorContainer');
        const syncStatus = document.getElementById('syncStatus');

        // Sync status indicator in header
        if (syncStatus) {
            syncStatus.style.opacity = this.connected ? '1' : '0.3';
            syncStatus.title = this.connected ? 'Google同期: ON' : 'Google同期: OFF';
        }

        // API未設定の場合
        if (!this.API_KEY || !this.CLIENT_ID) {
            if (status) status.textContent = '未設定';
            if (connectBtn) {
                connectBtn.textContent = 'セットアップ';
                connectBtn.onclick = () => this.showSetupInstructions();
            }
            return;
        }

        // 接続済みの場合
        if (this.connected) {
            if (status) {
                status.textContent = '接続中';
                status.classList.add('connected');
            }
            if (connectBtn) connectBtn.classList.add('hidden');
            if (disconnectBtn) disconnectBtn.classList.remove('hidden');
            if (selectorContainer) selectorContainer.classList.remove('hidden');
            if (addEventBtn) addEventBtn.classList.remove('hidden');

            // サイドバーのカレンダーリスト更新
            if (typeof UI !== 'undefined' && typeof UI.renderCalendarList === 'function') {
                UI.renderCalendarList();
            }
        } else {
            // 未接続の場合
            if (status) {
                status.textContent = '未接続';
                status.classList.remove('connected');
            }
            if (connectBtn) {
                connectBtn.classList.remove('hidden');
                connectBtn.onclick = () => this.connect();
            }
            if (disconnectBtn) disconnectBtn.classList.add('hidden');
            if (selectorContainer) selectorContainer.classList.add('hidden');
            if (addEventBtn) addEventBtn.classList.add('hidden');
        }

        // カレンダービュー再描画
        if (typeof Calendar !== 'undefined') {
            Calendar.render();
        }
    },

    // 編集モーダルを開く
    async openEditEventModal(eventId, calendarId = 'primary') {
        if (!this.connected) {
            UI.showToast('Googleカレンダーに接続してください', 'warning');
            return;
        }

        try {
            // イベント詳細を取得
            const response = await gapi.client.calendar.events.get({
                calendarId: calendarId,
                eventId: eventId
            });
            const event = response.result;

            // モーダルを開いてデータを入力
            const modal = document.getElementById('googleEventModal');
            if (!modal) return;

            // 編集モード用にフォームを設定
            document.getElementById('googleEventTitle').value = event.summary || '';

            // カレンダーセレクターを更新してから現在のカレンダーを設定
            const calendarSelect = document.getElementById('googleEventCalendar');
            if (calendarSelect) {
                this.populateCalendarSelect(calendarSelect);
                calendarSelect.value = calendarId;
            }

            const isAllDay = !event.start.dateTime;
            document.getElementById('googleEventAllDay').checked = isAllDay;

            if (isAllDay) {
                document.getElementById('googleEventStartDate').value = event.start.date || '';
                document.getElementById('googleEventEndDate').value = event.end.date || '';
                document.getElementById('googleEventDateRow').classList.remove('hidden');
                document.getElementById('googleEventTimeRow').classList.add('hidden');
            } else {
                const startDT = new Date(event.start.dateTime);
                const endDT = new Date(event.end.dateTime);
                // ローカル時間をdatetime-local形式に変換（YYYY-MM-DDTHH:MM）
                const formatLocalDateTime = (date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    return `${year}-${month}-${day}T${hours}:${minutes}`;
                };
                document.getElementById('googleEventStartTime').value = formatLocalDateTime(startDT);
                document.getElementById('googleEventEndTime').value = formatLocalDateTime(endDT);
                document.getElementById('googleEventDateRow').classList.add('hidden');
                document.getElementById('googleEventTimeRow').classList.remove('hidden');
            }

            // 編集モードフラグとイベントIDを保存
            modal.dataset.editMode = 'true';
            modal.dataset.eventId = eventId;
            modal.dataset.calendarId = calendarId;

            // モーダルタイトル変更
            const modalTitle = modal.querySelector('.modal-title');
            if (modalTitle) modalTitle.textContent = '📝 予定を編集';

            // 編集モード時は削除ボタンを表示、ボタンテキストを「更新」に変更
            const deleteBtn = document.getElementById('googleEventDelete');
            const submitBtn = document.getElementById('googleEventSubmit');
            if (deleteBtn) deleteBtn.classList.remove('hidden');
            if (submitBtn) submitBtn.textContent = '更新';

            modal.classList.add('active');
        } catch (error) {
            console.error('イベント取得エラー:', error);
            UI.showToast('イベントの取得に失敗しました', 'error');
        }
    },

    // イベント詳細を更新
    async updateEventDetails(eventId, calendarId, eventData) {
        if (!this.connected) {
            UI.showToast('Googleカレンダーに接続してください', 'warning');
            return null;
        }

        try {
            let update = {
                summary: eventData.title
            };

            if (eventData.allDay) {
                update.start = { date: eventData.startDate };
                update.end = { date: eventData.endDate || this.addDays(eventData.startDate, 1) };
            } else {
                update.start = { dateTime: this.toISODateTime(eventData.startTime), timeZone: 'Asia/Tokyo' };
                update.end = { dateTime: eventData.endTime ? this.toISODateTime(eventData.endTime) : this.addHours(this.toISODateTime(eventData.startTime), 1), timeZone: 'Asia/Tokyo' };
            }

            const response = await gapi.client.calendar.events.patch({
                calendarId: calendarId,
                eventId: eventId,
                resource: update,
            });

            console.log('イベント更新成功:', response.result);
            UI.showToast('予定を更新しました', 'success');
            this.fetchEvents();
            return response.result;
        } catch (error) {
            console.error('イベント更新エラー:', error);
            UI.showToast('予定の更新に失敗しました', 'error');
            return null;
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
    },

    // 新規イベント作成
    async createEvent(eventData) {
        if (!this.connected) {
            UI.showToast('Googleカレンダーに接続してください', 'warning');
            return null;
        }

        try {
            let event = {
                summary: eventData.title,
                description: eventData.description || '',
            };

            if (eventData.allDay) {
                // 終日イベント
                event.start = { date: eventData.startDate };
                event.end = { date: this.addDays(eventData.endDate || eventData.startDate, 1) };
            } else {
                // 時間指定イベント - datetime-localをISO8601に変換
                const startDateTime = this.toISODateTime(eventData.startTime);
                const endDateTime = eventData.endTime
                    ? this.toISODateTime(eventData.endTime)
                    : this.addHours(startDateTime, 1);

                event.start = { dateTime: startDateTime, timeZone: 'Asia/Tokyo' };
                event.end = { dateTime: endDateTime, timeZone: 'Asia/Tokyo' };
            }

            const calendarId = eventData.calendarId || 'primary';

            const response = await gapi.client.calendar.events.insert({
                calendarId: calendarId,
                resource: event,
            });

            console.log('イベント作成成功:', response.result);
            UI.showToast('予定を追加しました', 'success');
            this.fetchEvents();
            return response.result;
        } catch (error) {
            console.error('イベント作成エラー:', error);
            UI.showToast('予定の追加に失敗しました: ' + (error.result?.error?.message || error.message), 'error');
            return null;
        }
    },

    // datetime-localをISO8601形式に変換
    toISODateTime(datetimeLocal) {
        // datetime-local形式: 2026-01-12T14:30
        // ISO8601形式: 2026-01-12T14:30:00+09:00
        if (!datetimeLocal) return null;
        return datetimeLocal + ':00+09:00';
    },

    addHours(dateTimeStr, hours) {
        const date = new Date(dateTimeStr);
        date.setHours(date.getHours() + hours);
        return date.toISOString();
    },

    // イベント更新（ドラッグ&ドロップ用）
    async updateEvent(eventId, calendarId, newStart, newEnd, isAllDay = false) {
        if (!this.connected) {
            UI.showToast('Googleカレンダーに接続してください', 'warning');
            return null;
        }

        try {
            let update = {};

            if (isAllDay) {
                // 終日イベント - YYYY-MM-DD形式のみ使用
                const startDate = newStart.split('T')[0];
                const endDate = newEnd.split('T')[0];
                update.start = { date: startDate };
                update.end = { date: endDate };
            } else {
                // 時間指定イベント
                // 終日イベントから変換する際は、dateフィールドを明示的にnullにする
                update.start = {
                    dateTime: newStart,
                    date: null
                };
                update.end = {
                    dateTime: newEnd,
                    date: null
                };
            }

            console.log('updateEvent params:', { eventId, calendarId, update, isAllDay });

            const response = await gapi.client.calendar.events.patch({
                calendarId: calendarId || 'primary',
                eventId: eventId,
                resource: update,
            });

            console.log('イベント更新成功:', response.result);
            UI.showToast('予定を移動しました', 'success');
            this.fetchEvents();
            return response.result;
        } catch (error) {
            console.error('イベント更新エラー:', error);
            // 詳細なエラー情報を取得
            if (error.result && error.result.error) {
                console.error('API Error details:', error.result.error);
                const errorMessage = error.result.error.message || 'Unknown error';
                UI.showToast(`移動失敗: ${errorMessage}`, 'error');
            } else {
                UI.showToast('予定の移動に失敗しました', 'error');
            }
            return null;
        }
    },

    // イベント削除
    async deleteEvent(eventId, calendarId = 'primary') {
        if (!this.connected) {
            UI.showToast('Googleカレンダーに接続してください', 'warning');
            return false;
        }

        try {
            await gapi.client.calendar.events.delete({
                calendarId: calendarId,
                eventId: eventId,
            });

            console.log('イベント削除成功:', eventId);
            UI.showToast('予定を削除しました', 'success');
            this.fetchEvents();
            return true;
        } catch (error) {
            console.error('イベント削除エラー:', error);
            UI.showToast('予定の削除に失敗しました', 'error');
            return false;
        }
    },

    // カレンダーリスト取得
    async listCalendars() {
        if (!this.connected) return [];

        try {
            const response = await gapi.client.calendar.calendarList.list();
            this.calendars = response.result.items;
            return this.calendars;
        } catch (error) {
            console.error('Google Calendar リスト取得エラー:', error);
            return [];
        }
    },

    // イベント取得
    async listUpcomingEvents() {
        if (!this.connected) return;

        // 選択されたカレンダーのみ対象にする（未実装時はprimaryのみ）
        const calendarId = 'primary';

        try {
            const response = await gapi.client.calendar.events.list({
                'calendarId': calendarId,
                'timeMin': (new Date()).toISOString(),
                'showDeleted': false,
                'singleEvents': true,
                'maxResults': 10,
                'orderBy': 'startTime'
            });

            this.events = response.result.items;
            this.updateUI();
            return this.events;
        } catch (error) {
            console.error('Google Calendar イベント取得エラー:', error);
        }
    },

    // イベント追加 (DnD対応)
    async addEvent(eventData) {
        if (!this.connected) {
            alert('Google Calendarに接続されていません。');
            return;
        }

        const event = {
            'summary': eventData.title,
            'description': eventData.description || '',
            'start': {
                'dateTime': eventData.start, // ISO String
                'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            'end': {
                'dateTime': eventData.end, // ISO String
                'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };

        try {
            await gapi.client.calendar.events.insert({
                'calendarId': 'primary', // 将来的に選択可能に
                'resource': event
            });

            // リロードして反映
            await this.listUpcomingEvents();
            // UI通知があれば良いが、とりあえずコンソールへ
            console.log('Google Calendar イベント追加成功');
            return true;
        } catch (error) {
            console.error('Google Calendar イベント追加エラー:', error);
            alert('イベントの追加に失敗しました。');
            return false;
        }
    },

    // イベントモーダル
    openEventModal(defaultDate = null) {
        const modal = document.getElementById('googleEventModal');
        const form = document.getElementById('googleEventForm');
        const startDate = document.getElementById('googleEventStartDate');
        const startTime = document.getElementById('googleEventStartTime');
        const allDayCheckbox = document.getElementById('googleEventAllDay');
        const calendarSelect = document.getElementById('googleEventCalendar');

        form.reset();
        allDayCheckbox.checked = true;
        this.toggleTimeFields(true);

        // デフォルト日付設定
        const now = new Date();
        const today = defaultDate || now.toISOString().split('T')[0];
        startDate.value = today;

        // デフォルト時刻設定
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(Math.ceil(now.getMinutes() / 30) * 30).padStart(2, '0');
        startTime.value = `${today}T${hours}:${minutes === '60' ? '00' : minutes}`;

        // カレンダードロップダウンを更新
        this.populateCalendarSelect(calendarSelect);

        modal.classList.add('active');
    },

    populateCalendarSelect(selectElement) {
        if (!selectElement) return;

        selectElement.innerHTML = '';

        // 書き込み可能なカレンダーのみ表示
        const writableCalendars = this.calendars.filter(cal =>
            cal.accessRole === 'owner' || cal.accessRole === 'writer'
        );

        if (writableCalendars.length === 0) {
            selectElement.innerHTML = '<option value="primary">メインカレンダー</option>';
            return;
        }

        writableCalendars.forEach(cal => {
            const option = document.createElement('option');
            option.value = cal.id;
            option.textContent = cal.summary;
            option.style.color = cal.backgroundColor;
            if (cal.primary) option.selected = true;
            selectElement.appendChild(option);
        });
    },

    closeEventModal() {
        const modal = document.getElementById('googleEventModal');
        if (!modal) return;

        modal.classList.remove('active');

        // 編集モードをリセット
        modal.dataset.editMode = 'false';
        delete modal.dataset.eventId;
        delete modal.dataset.calendarId;

        // 削除ボタンを非表示に戻す
        const deleteBtn = document.getElementById('googleEventDelete');
        const submitBtn = document.getElementById('googleEventSubmit');
        if (deleteBtn) deleteBtn.classList.add('hidden');
        if (submitBtn) submitBtn.textContent = '追加';

        // タイトルを元に戻す
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) modalTitle.textContent = '📅 Googleカレンダーに予定追加';

        // フォームをリセット
        document.getElementById('googleEventForm')?.reset();
    },

    toggleTimeFields(isAllDay) {
        const dateRow = document.getElementById('googleEventDateRow');
        const timeRow = document.getElementById('googleEventTimeRow');

        if (isAllDay) {
            dateRow.classList.remove('hidden');
            timeRow.classList.add('hidden');
        } else {
            dateRow.classList.add('hidden');
            timeRow.classList.remove('hidden');
        }
    },

    async handleEventSubmit(e) {
        e.preventDefault();

        const allDay = document.getElementById('googleEventAllDay').checked;

        const eventData = {
            title: document.getElementById('googleEventTitle').value,
            description: document.getElementById('googleEventDescription').value,
            calendarId: document.getElementById('googleEventCalendar').value,
            allDay: allDay,
        };

        if (allDay) {
            eventData.startDate = document.getElementById('googleEventStartDate').value;
            eventData.endDate = document.getElementById('googleEventEndDate').value || eventData.startDate;
        } else {
            eventData.startTime = document.getElementById('googleEventStartTime').value;
            eventData.endTime = document.getElementById('googleEventEndTime').value;
        }

        const result = await this.createEvent(eventData);
        if (result) {
            this.closeEventModal();
        }
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

    // 予定追加ボタン
    document.getElementById('addGoogleEvent')?.addEventListener('click', () => {
        GoogleCalendar.openEventModal();
    });

    // サイドバー予定追加ボタン
    document.getElementById('sidebarAddEvent')?.addEventListener('click', () => {
        if (!GoogleCalendar.connected) {
            GoogleCalendar.connect();
            return;
        }
        GoogleCalendar.openEventModal();
    });

    // モーダル閉じる
    document.getElementById('googleEventModalClose')?.addEventListener('click', () => {
        GoogleCalendar.closeEventModal();
    });
    document.getElementById('googleEventCancel')?.addEventListener('click', () => {
        GoogleCalendar.closeEventModal();
    });

    // 削除ボタン
    document.getElementById('googleEventDelete')?.addEventListener('click', () => {
        const modal = document.getElementById('googleEventModal');
        if (!modal || modal.dataset.editMode !== 'true') return;

        const eventId = modal.dataset.eventId;
        const calendarId = modal.dataset.calendarId || 'primary';

        if (confirm('この予定を削除しますか？')) {
            GoogleCalendar.deleteEvent(eventId, calendarId).then(() => {
                GoogleCalendar.closeEventModal();
                // ビュー更新
                const activeView = document.querySelector('.view-container:not(.hidden)')?.id;
                if (activeView === 'weeklyView' && typeof WeeklyView !== 'undefined') {
                    WeeklyView.renderWeekly();
                } else if (activeView === 'dailyView' && typeof WeeklyView !== 'undefined') {
                    WeeklyView.renderDaily();
                } else if (activeView === 'calendarView' && typeof Calendar !== 'undefined') {
                    Calendar.render();
                }
            });
        }
    });

    // 終日トグル
    document.getElementById('googleEventAllDay')?.addEventListener('change', (e) => {
        GoogleCalendar.toggleTimeFields(e.target.checked);
    });

    // フォーム送信
    document.getElementById('googleEventForm')?.addEventListener('submit', (e) => {
        GoogleCalendar.handleEventSubmit(e);
    });

    // 初期化
    GoogleCalendar.init();
});
