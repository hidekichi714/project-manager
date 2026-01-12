/**
 * Weekly View Module - 週間バーチカルビュー
 */

const WeeklyView = {
    // 設定
    config: {
        startHour: 6,
        endHour: 23,
        slotHeight: 48, // 1時間あたりの高さ(px)
    },

    // 現在の表示週
    currentDate: new Date(),

    // 初期化
    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('weeklyPrev')?.addEventListener('click', () => this.navigate(-1));
        document.getElementById('weeklyNext')?.addEventListener('click', () => this.navigate(1));
        document.getElementById('weeklyToday')?.addEventListener('click', () => this.goToToday());
        document.getElementById('dailyPrev')?.addEventListener('click', () => this.navigateDaily(-1));
        document.getElementById('dailyNext')?.addEventListener('click', () => this.navigateDaily(1));
        document.getElementById('dailyToday')?.addEventListener('click', () => this.goToToday());
    },

    navigate(direction) {
        this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
        this.renderWeekly();
    },

    navigateDaily(direction) {
        this.currentDate.setDate(this.currentDate.getDate() + direction);
        this.renderDaily();
    },

    goToToday() {
        this.currentDate = new Date();
        const activeView = document.querySelector('.view-container.active')?.id;
        if (activeView === 'weeklyView') {
            this.renderWeekly();
        } else {
            this.renderDaily();
        }
    },

    // 週の開始日を取得（月曜日）
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },

    // 週間ビューをレンダリング
    renderWeekly() {
        const container = document.getElementById('weeklyContainer');
        if (!container) return;

        const weekStart = this.getWeekStart(this.currentDate);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            days.push(d);
        }

        // タイトル更新
        const title = document.getElementById('weeklyTitle');
        if (title) {
            const endDate = new Date(weekStart);
            endDate.setDate(weekStart.getDate() + 6);
            title.textContent = `${this.formatDateShort(weekStart)} - ${this.formatDateShort(endDate)}`;
        }

        // タスク取得
        const tasks = Storage.getTasks();
        const googleEvents = GoogleCalendar.getEvents() || [];

        let html = this.renderWeeklyHeader(days);
        html += this.renderWeeklyBody(days, tasks, googleEvents);

        container.innerHTML = html;
        this.bindEventClicks();
    },

    renderWeeklyHeader(days) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

        let html = '<div class="weekly-header"><div class="weekly-time-gutter"></div>';
        days.forEach(day => {
            const isToday = day.toDateString() === today.toDateString();
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            html += `
                <div class="weekly-day-header ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}">
                    <span class="day-name">${dayNames[day.getDay()]}</span>
                    <span class="day-number">${day.getDate()}</span>
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    renderWeeklyBody(days, tasks, googleEvents) {
        const { startHour, endHour, slotHeight } = this.config;
        const hours = [];
        for (let h = startHour; h <= endHour; h++) {
            hours.push(h);
        }

        let html = '<div class="weekly-body">';

        // 時間軸
        html += '<div class="weekly-time-column">';
        hours.forEach(hour => {
            html += `<div class="weekly-time-slot" style="height: ${slotHeight}px">${hour}:00</div>`;
        });
        html += '</div>';

        // 各曜日のカラム
        days.forEach(day => {
            const dayStr = this.formatDate(day);
            const dayTasks = tasks.filter(t => t.startDate === dayStr || t.endDate === dayStr);
            const dayEvents = googleEvents.filter(e => {
                const eventDate = new Date(e.start.dateTime || e.start.date);
                return eventDate.toDateString() === day.toDateString();
            });

            const today = new Date();
            const isToday = day.toDateString() === today.toDateString();
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            html += `<div class="weekly-day-column ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}" data-date="${dayStr}">`;

            // 時間スロット
            hours.forEach(hour => {
                html += `<div class="weekly-hour-slot" data-hour="${hour}" style="height: ${slotHeight}px"></div>`;
            });

            // タスクをオーバーレイ
            dayTasks.forEach(task => {
                html += this.renderTaskBlock(task, startHour, slotHeight);
            });

            // Googleイベントをオーバーレイ
            dayEvents.forEach(event => {
                html += this.renderGoogleEventBlock(event, startHour, slotHeight);
            });

            html += '</div>';
        });

        html += '</div>';
        return html;
    },

    renderTaskBlock(task, startHour, slotHeight) {
        // 終日タスクは上部に表示
        const top = 0;
        const height = slotHeight / 2;

        return `
            <div class="weekly-event task priority-${task.priority}" 
                 style="top: ${top}px; height: ${height}px;"
                 data-task-id="${task.id}">
                <span class="event-title">${UI.escapeHtml(task.name)}</span>
            </div>
        `;
    },

    renderGoogleEventBlock(event, startHour, slotHeight) {
        const eventId = event.id;
        const calendarId = event.calendarId || 'primary';
        const isAllDay = !event.start.dateTime;

        if (isAllDay) {
            // 終日イベント
            return `
                <div class="weekly-event google all-day draggable-event" 
                     draggable="true"
                     data-event-id="${eventId}"
                     data-calendar-id="${calendarId}"
                     data-all-day="true"
                     style="top: 0; height: 24px; background: ${event.calendarColor || '#4285f4'}20; border-left-color: ${event.calendarColor || '#4285f4'};">
                    <span class="event-title">${UI.escapeHtml(event.summary || '(タイトルなし)')}</span>
                </div>
            `;
        }

        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);

        const startMinutes = (startTime.getHours() - startHour) * 60 + startTime.getMinutes();
        const duration = (endTime - startTime) / (1000 * 60);

        const top = (startMinutes / 60) * slotHeight;
        const height = Math.max((duration / 60) * slotHeight, 24);

        if (top < 0) return '';

        return `
            <div class="weekly-event google draggable-event" 
                 draggable="true"
                 data-event-id="${eventId}"
                 data-calendar-id="${calendarId}"
                 data-duration="${duration}"
                 data-all-day="false"
                 style="top: ${top}px; height: ${height}px; background: ${event.calendarColor || '#4285f4'}30; border-left-color: ${event.calendarColor || '#4285f4'};">
                <span class="event-time">${this.formatTime(startTime)}</span>
                <span class="event-title">${UI.escapeHtml(event.summary || '(タイトルなし)')}</span>
            </div>
        `;
    },

    // 日間ビューをレンダリング
    renderDaily() {
        const container = document.getElementById('dailyContainer');
        if (!container) return;

        const day = new Date(this.currentDate);
        day.setHours(0, 0, 0, 0);

        // タイトル更新
        const title = document.getElementById('dailyTitle');
        if (title) {
            const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
            title.textContent = `${day.getFullYear()}年${day.getMonth() + 1}月${day.getDate()}日 (${dayNames[day.getDay()]})`;
        }

        const tasks = Storage.getTasks();
        const googleEvents = GoogleCalendar.getEvents() || [];
        const dayStr = this.formatDate(day);

        const dayTasks = tasks.filter(t => t.startDate === dayStr || t.endDate === dayStr);
        const dayEvents = googleEvents.filter(e => {
            const eventDate = new Date(e.start.dateTime || e.start.date);
            return eventDate.toDateString() === day.toDateString();
        });

        let html = this.renderDailyBody(dayTasks, dayEvents);
        container.innerHTML = html;
        this.bindEventClicks();
    },

    renderDailyBody(tasks, googleEvents) {
        const { startHour, endHour, slotHeight } = this.config;
        const hours = [];
        for (let h = startHour; h <= endHour; h++) {
            hours.push(h);
        }

        let html = '<div class="daily-body">';

        // 時間軸
        html += '<div class="daily-time-column">';
        hours.forEach(hour => {
            html += `<div class="daily-time-slot" style="height: ${slotHeight}px">${hour}:00</div>`;
        });
        html += '</div>';

        // イベントカラム
        html += '<div class="daily-events-column">';

        hours.forEach(hour => {
            html += `<div class="daily-hour-slot" data-hour="${hour}" style="height: ${slotHeight}px"></div>`;
        });

        // 終日イベント
        tasks.forEach(task => {
            html += `
                <div class="daily-event task priority-${task.priority}" 
                     style="top: 0; height: 28px;"
                     data-task-id="${task.id}">
                    <span class="event-title">${UI.escapeHtml(task.name)}</span>
                </div>
            `;
        });

        // Googleイベント
        googleEvents.forEach(event => {
            if (!event.start.dateTime) {
                html += `
                    <div class="daily-event google all-day" 
                         style="top: 0; height: 28px; background: ${event.calendarColor || '#4285f4'}20; border-left-color: ${event.calendarColor || '#4285f4'};">
                        <span class="event-title">${UI.escapeHtml(event.summary || '(タイトルなし)')}</span>
                    </div>
                `;
                return;
            }

            const startTime = new Date(event.start.dateTime);
            const endTime = new Date(event.end.dateTime);

            const startMinutes = (startTime.getHours() - startHour) * 60 + startTime.getMinutes();
            const duration = (endTime - startTime) / (1000 * 60);

            const top = (startMinutes / 60) * slotHeight;
            const height = Math.max((duration / 60) * slotHeight, 28);

            if (top >= 0) {
                html += `
                    <div class="daily-event google" 
                         style="top: ${top}px; height: ${height}px; background: ${event.calendarColor || '#4285f4'}20; border-left-color: ${event.calendarColor || '#4285f4'};">
                        <span class="event-time">${this.formatTime(startTime)} - ${this.formatTime(endTime)}</span>
                        <span class="event-title">${UI.escapeHtml(event.summary || '(タイトルなし)')}</span>
                    </div>
                `;
            }
        });

        html += '</div></div>';
        return html;
    },

    bindEventClicks() {
        // タスククリック
        document.querySelectorAll('.weekly-event.task, .daily-event.task').forEach(el => {
            el.addEventListener('click', () => {
                const task = Storage.getTask(el.dataset.taskId);
                if (task) UI.openTaskModal(task.projectId, task);
            });
        });

        // ドラッグ&ドロップハンドラー
        this.bindDragDrop();
    },

    bindDragDrop() {
        // ドラッグ開始
        document.querySelectorAll('.draggable-event').forEach(el => {
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    eventId: el.dataset.eventId,
                    calendarId: el.dataset.calendarId,
                    duration: parseInt(el.dataset.duration) || 60,
                    isAllDay: el.dataset.allDay === 'true'
                }));
                el.classList.add('dragging');
            });

            el.addEventListener('dragend', () => {
                el.classList.remove('dragging');
                document.querySelectorAll('.drop-target').forEach(t => t.classList.remove('drop-target'));
            });
        });

        // ドロップ先（時間スロット）
        document.querySelectorAll('.weekly-hour-slot, .daily-hour-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drop-target');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drop-target');
            });

            slot.addEventListener('drop', async (e) => {
                e.preventDefault();
                slot.classList.remove('drop-target');

                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    const hour = parseInt(slot.dataset.hour);
                    const column = slot.closest('.weekly-day-column, .daily-events-column');
                    const dateStr = column?.dataset?.date || this.formatDate(this.currentDate);

                    if (data.isAllDay) {
                        // 終日イベントを日付に移動
                        const newDate = dateStr;
                        const nextDay = new Date(dateStr);
                        nextDay.setDate(nextDay.getDate() + 1);
                        const endDate = this.formatDate(nextDay);

                        await GoogleCalendar.updateEvent(
                            data.eventId,
                            data.calendarId,
                            newDate,
                            endDate,
                            true
                        );
                    } else {
                        // 時間指定イベントを移動
                        const startDateTime = `${dateStr}T${String(hour).padStart(2, '0')}:00:00+09:00`;
                        const endDate = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00`);
                        endDate.setMinutes(endDate.getMinutes() + data.duration);
                        const endDateTime = `${dateStr}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00+09:00`;

                        await GoogleCalendar.updateEvent(
                            data.eventId,
                            data.calendarId,
                            startDateTime,
                            endDateTime,
                            false
                        );
                    }

                    // ビュー更新
                    const activeView = document.querySelector('.view-container:not(.hidden)')?.id;
                    if (activeView === 'weeklyView') {
                        this.renderWeekly();
                    } else {
                        this.renderDaily();
                    }
                } catch (error) {
                    console.error('Drag drop error:', error);
                }
            });
        });
    },

    // ユーティリティ
    formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    formatDateShort(date) {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    },

    formatTime(date) {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    WeeklyView.init();
});
