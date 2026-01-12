/**
 * Calendar Module - カレンダービューの表示と操作
 */

const Calendar = {
    // 設定
    currentDate: new Date(),
    maxEventsPerDay: 3,

    // 日本語設定
    monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    dayNames: ['日', '月', '火', '水', '木', '金', '土'],

    // 初期化
    init() {
        this.bindEvents();
    },

    // イベントバインド
    bindEvents() {
        document.getElementById('calendarPrev')?.addEventListener('click', () => this.navigate(-1));
        document.getElementById('calendarNext')?.addEventListener('click', () => this.navigate(1));
        document.getElementById('calendarToday')?.addEventListener('click', () => this.goToToday());
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
        const title = document.getElementById('calendarTitle');
        if (title) {
            title.textContent = `${year}年${this.monthNames[month]}`;
        }

        // カレンダーグリッド生成
        const days = this.getCalendarDays(year, month);
        const tasks = Storage.getTasks();
        const googleEvents = GoogleCalendar.getEvents() || [];

        let html = this.renderHeader();
        html += this.renderDays(days, tasks, googleEvents);

        container.innerHTML = `<div class="calendar-grid">${html}</div>`;
        this.bindDayEvents();
    },

    // ヘッダー（曜日）
    renderHeader() {
        return this.dayNames.map((day, index) => {
            const isWeekend = index === 0 || index === 6;
            return `<div class="calendar-header-cell ${isWeekend ? 'weekend' : ''}">${day}</div>`;
        }).join('');
    },

    // カレンダー日付配列を取得
    getCalendarDays(year, month) {
        const days = [];
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // 前月の日を追加
        const firstDayOfWeek = firstDay.getDay();
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
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

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
            const hasGoogleEvents = dayGoogleEvents.length > 0;

            let classes = 'calendar-day';
            if (!isCurrentMonth) classes += ' other-month';
            if (isToday) classes += ' today';
            if (isWeekend) classes += ' weekend';
            if (hasEvents) classes += ' has-events';
            if (hasGoogleEvents) classes += ' has-google-events';

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
                    <div class="calendar-event google" 
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
    }
};

// 初期化（DOMContentLoaded後）
document.addEventListener('DOMContentLoaded', () => {
    Calendar.init();
});
