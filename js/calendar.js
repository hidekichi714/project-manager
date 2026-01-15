/**
 * Calendar Module - カレンダービューの表示と操作
 */

const Calendar = {
    // 設定
    currentDate: new Date(),
    maxEventsPerDay: 3,

    // 日本語設定
    monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    dayNames: ['月', '火', '水', '木', '金', '土', '日'],

    // 初期化
    init() {
        this.bindEvents();
    },

    // イベントバインド
    bindEvents() {
        // Local navigation listeners removed (handled by UI)
    },

    // ナビゲーション
    navigate(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.render();
    },

    goToToday() {
        this.currentDate = new Date();
        this.render();
    },

    // レンダリング
    render() {
        const container = document.getElementById('calendarContainer');
        if (!container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // タイトル更新
        const title = document.getElementById('viewTitle');
        const weekNum = document.getElementById('viewWeekNum');

        if (title) {
            title.textContent = `${year}年${this.monthNames[month]}`;
        }

        if (weekNum) {
            weekNum.classList.add('hidden');
        }

        // カレンダーグリッド生成
        const days = this.getCalendarDays(year, month);
        const tasks = Storage.getTasks();
        const googleEvents = GoogleCalendar.getEvents() || [];

        let html = this.renderHeader();
        html += this.renderDays(days, tasks, googleEvents);

        container.innerHTML = `<div class="calendar-grid">${html}</div>`;
        this.bindDayEvents();
        this.initDragDrop();
    },

    // ヘッダー（曜日）
    renderHeader() {
        return this.dayNames.map((day, index) => {
            // index: 0=月, 1=火, 2=水, 3=木, 4=金, 5=土, 6=日
            const isSaturday = index === 5;
            const isSunday = index === 6;
            const isWeekend = isSaturday || isSunday;
            const dayClass = isSaturday ? 'saturday' : (isSunday ? 'sunday' : '');
            return `<div class="calendar-header-cell ${isWeekend ? 'weekend' : ''} ${dayClass}">${day}</div>`;
        }).join('');
    },

    // カレンダー日付配列を取得
    getCalendarDays(year, month) {
        const days = [];
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // 前月の日を追加（月曜始まり）
        // getDay(): 0=日, 1=月, 2=火, ..., 6=土
        // 月曜始まりにするため、getDay()を変換: 月=0, 火=1, ..., 日=6
        let firstDayOfWeek = firstDay.getDay();
        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // 日曜(0)→6, 月曜(1)→0, ...
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({ date, isCurrentMonth: false });
        }

        // 当月の日を追加
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(year, month, d);
            days.push({ date, isCurrentMonth: true });
        }

        // 次月の日を追加（6週間分になるまで）
        const remaining = 42 - days.length;
        for (let d = 1; d <= remaining; d++) {
            const date = new Date(year, month + 1, d);
            days.push({ date, isCurrentMonth: false });
        }

        return days;
    },

    // 日付セルをレンダリング
    renderDays(days, tasks, googleEvents) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return days.map(({ date, isCurrentMonth }) => {
            const dateStr = this.formatDate(date);
            const isToday = date.getTime() === today.getTime();

            // この日のタスクを取得
            const dayTasks = tasks.filter(task => {
                const start = new Date(task.startDate);
                const end = new Date(task.endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                return date >= start && date <= end;
            });

            // この日のGoogleイベントを取得
            const dayGoogleEvents = googleEvents.filter(event => {
                const eventDate = new Date(event.start.dateTime || event.start.date);
                eventDate.setHours(0, 0, 0, 0);
                return eventDate.getTime() === date.getTime();
            });

            const allEvents = [...dayTasks.map(t => ({ ...t, type: 'task' })),
            ...dayGoogleEvents.map(e => ({ ...e, type: 'google' }))];
            const hasEvents = dayTasks.length > 0;
            // 曜日判定（月曜始まり: getDay() 0=日, 6=土）
            const dayOfWeek = date.getDay();
            const isSaturday = dayOfWeek === 6;
            const isSunday = dayOfWeek === 0;
            const isWeekend = isSaturday || isSunday;

            let classes = 'calendar-day';
            if (!isCurrentMonth) classes += ' other-month';
            if (isToday) classes += ' today';
            if (isWeekend) classes += ' weekend';
            if (isSaturday) classes += ' saturday';
            if (isSunday) classes += ' sunday';
            if (hasEvents) classes += ' has-events';
            if (dayGoogleEvents.length > 0) classes += ' has-google-events';

            return `
                <div class="${classes}" data-date="${dateStr}">
                    <div class="day-number">${date.getDate()}</div>
                    <div class="day-events">
                        ${this.renderEvents(allEvents)}
                    </div>
                </div>
            `;
        }).join('');
    },

    // イベント一覧をレンダリング
    renderEvents(events) {
        if (events.length === 0) return '';

        const visible = events.slice(0, this.maxEventsPerDay);
        const remaining = events.length - this.maxEventsPerDay;

        let html = visible.map(event => {
            if (event.type === 'task') {
                return `
                    <div class="calendar-event task priority-${event.priority} status-${event.status}" 
                         data-task-id="${event.id}" title="${UI.escapeHtml(event.name)}">
                        ${UI.escapeHtml(event.name)}
                    </div>
                `;
            } else {
                const title = event.summary || '(タイトルなし)';
                const color = event.calendarColor || '#4285f4';
                return `
                    <div class="calendar-event type-google" 
                         data-event-id="${event.id}"
                         data-calendar-id="${event.calendarId || 'primary'}"
                         style="background: ${color}20; border-left-color: ${color};"
                         title="${event.calendarName}: ${UI.escapeHtml(title)}">
                        ${UI.escapeHtml(title)}
                    </div>
                `;
            }
        }).join('');

        if (remaining > 0) {
            html += `<div class="more-events">+${remaining}件</div>`;
        }

        return html;
    },

    // 日付セルのイベント
    bindDayEvents() {
        // タスククリック
        document.querySelectorAll('.calendar-event.task').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const task = Storage.getTask(el.dataset.taskId);
                if (task) UI.openTaskModal(task.projectId, task);
            });
        });

        // 日付セルクリック（将来的にクイック追加機能用）
        document.querySelectorAll('.calendar-day').forEach(el => {
            el.addEventListener('dblclick', () => {
                const date = el.dataset.date;
                // 将来: その日に新規タスクを追加するモーダルを開く
                console.log('Double clicked:', date);
            });
        });
    },

    // 日付フォーマット
    formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    // ドラッグ&ドロップ初期化
    // ドラッグ&ドロップ初期化
    initDragDrop() {
        const container = document.getElementById('calendarContainer');
        if (!container) return;

        // Googleイベントをドラッグ可能に
        document.querySelectorAll('.calendar-event.type-google').forEach(el => {
            const eventId = el.dataset.eventId;
            const calendarId = el.dataset.calendarId;
            if (!eventId) return;

            el.setAttribute('draggable', 'true');
            el.classList.add('draggable-calendar-event');

            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'google-event',
                    eventId: eventId,
                    calendarId: calendarId || 'primary'
                }));
                el.classList.add('dragging');
            });

            el.addEventListener('dragend', () => {
                el.classList.remove('dragging');
            });
        });

        // 日付セルをドロップ先に
        container.querySelectorAll('.calendar-day').forEach(cell => {
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                cell.classList.add('drop-target');
            });

            cell.addEventListener('dragleave', () => {
                cell.classList.remove('drop-target');
            });

            cell.addEventListener('drop', async (e) => {
                e.preventDefault();
                cell.classList.remove('drop-target');

                try {
                    const dataRaw = e.dataTransfer.getData('text/plain');
                    if (!dataRaw) return;

                    const data = JSON.parse(dataRaw);
                    const newDate = cell.dataset.date;

                    // Googleイベントの移動
                    if (data.type === 'google-event' && typeof GoogleCalendar !== 'undefined') {
                        // 終日イベントとして移動（簡易実装）
                        const nextDay = new Date(newDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        const y = nextDay.getFullYear();
                        const m = String(nextDay.getMonth() + 1).padStart(2, '0');
                        const d = String(nextDay.getDate()).padStart(2, '0');
                        const endDate = `${y}-${m}-${d}`;

                        await GoogleCalendar.updateEvent(
                            data.eventId,
                            data.calendarId,
                            newDate,
                            endDate,
                            true
                        );
                        // 再描画はGoogleCalendar側で呼ばれるか、イベントリスナーで
                        this.render();
                    }
                    // ToDoタスクのドロップ (新規Googleカレンダー予定)
                    else if (data.type === 'todo' && typeof GoogleCalendar !== 'undefined') {
                        // 時間はデフォルト設定 (9:00 - 10:00)
                        const startTime = new Date(newDate);
                        startTime.setHours(9, 0, 0);

                        const endTime = new Date(startTime);
                        endTime.setHours(10, 0, 0);

                        await GoogleCalendar.addEvent({
                            title: data.title || '新しい予定',
                            description: data.description || '',
                            start: startTime.toISOString(),
                            end: endTime.toISOString()
                        });
                    }
                } catch (error) {
                    console.error('Calendar drop error:', error);
                }
            });
        });
    }
};

// 初期化（DOMContentLoaded後）
document.addEventListener('DOMContentLoaded', () => {
    Calendar.init();
});
