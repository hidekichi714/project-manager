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
        this.resizeState = {
            isResizing: false,
            type: null, // 'top' or 'bottom'
            eventId: null,
            calendarId: null,
            startMinutes: 0,
            duration: 0,
            originalY: 0,
            originalHeight: 0,
            originalTop: 0,
            element: null
        };
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
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            days.push(d);
        }

        // タイトル更新
        const title = document.getElementById('weeklyTitle');
        if (title) {
            title.textContent = `${this.formatDateShort(weekStart)} - ${this.formatDateShort(weekEnd)}`;
        }

        // タスク取得
        const tasks = Storage.getTasks();
        const googleEvents = GoogleCalendar.getEvents() || [];

        // 週内に期限のあるToDoを取得
        const weekTodos = this.getWeekTodos(weekEnd);

        let html = '<div class="weekly-layout">';

        // ToDoパネル
        html += this.renderTodoPanel(weekTodos, weekEnd);

        // カレンダーグリッド
        html += '<div class="weekly-calendar">';
        html += this.renderWeeklyHeader(days);
        html += this.renderWeeklyBody(days, tasks, googleEvents);
        html += '</div>';

        html += '</div>';

        container.innerHTML = html;
        this.bindEventClicks();
    },

    // 週内期限のToDoを取得
    getWeekTodos(weekEnd) {
        if (typeof ToDo === 'undefined') return [];

        const todos = ToDo.getAll();
        return todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return true; // 期限なしも表示
            const due = new Date(todo.dueDate);
            due.setHours(23, 59, 59);
            return due <= weekEnd;
        });
    },

    // ToDoパネルをレンダリング
    renderTodoPanel(todos, weekEnd) {
        let html = '<div class="weekly-todo-panel">';
        html += '<h3 class="weekly-todo-title">📋 今週のタスク</h3>';
        html += `<p class="weekly-todo-subtitle">${this.formatDateShort(weekEnd)}までの期限</p>`;
        html += '<div class="weekly-todo-list">';

        if (todos.length === 0) {
            html += '<div class="weekly-todo-empty">タスクはありません</div>';
        } else {
            todos.forEach(todo => {
                const dueText = todo.dueDate ? ToDo.formatDueDate(todo.dueDate) : '期限なし';
                html += `
                    <div class="weekly-todo-item draggable-todo" 
                         draggable="true"
                         data-todo-id="${todo.id}"
                         data-todo-title="${UI.escapeHtml(todo.title)}"
                         data-todo-date="${todo.dueDate || ''}">
                        <span class="todo-priority-dot ${todo.priority}"></span>
                        <div class="todo-info">
                            <span class="todo-name">${UI.escapeHtml(todo.title)}</span>
                            <span class="todo-due">${dueText}</span>
                        </div>
                    </div>
                `;
            });
        }

        html += '</div></div>';
        return html;
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

    renderGoogleEventBlock(event, startHour, slotHeight, isDaily = false) {
        const eventId = event.id;
        const calendarId = event.calendarId || 'primary';
        const isAllDay = !event.start.dateTime;
        const baseClass = isDaily ? 'daily-event' : 'weekly-event';

        if (isAllDay) {
            // 終日イベント
            return `
                <div class="${baseClass} google all-day draggable-event" 
                     draggable="true"
                     data-event-id="${eventId}"
                     data-calendar-id="${calendarId}"
                     data-all-day="true"
                     style="top: 0; height: ${isDaily ? '28px' : '24px'}; background: ${event.calendarColor || '#4285f4'}20; border-left-color: ${event.calendarColor || '#4285f4'};">
                    <span class="event-title">${UI.escapeHtml(event.summary || '(タイトルなし)')}</span>
                </div>
            `;
        }

        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);

        const startMinutes = (startTime.getHours() - startHour) * 60 + startTime.getMinutes();
        const duration = (endTime - startTime) / (1000 * 60);

        const top = (startMinutes / 60) * slotHeight;
        const height = Math.max((duration / 60) * slotHeight, isDaily ? 28 : 24);

        if (top < 0) return '';

        return `
            <div class="${baseClass} google draggable-event" 
                 draggable="true"
                 data-event-id="${eventId}"
                 data-calendar-id="${calendarId}"
                 data-duration="${duration}"
                 data-all-day="false"
                 style="top: ${top}px; height: ${height}px; background: ${event.calendarColor || '#4285f4'}30; border-left-color: ${event.calendarColor || '#4285f4'};">
                <div class="event-resize-handle event-resize-top"></div>
                <span class="event-time">${this.formatTime(startTime)}${isDaily ? ' - ' + this.formatTime(endTime) : ''}</span>
                <span class="event-title">${UI.escapeHtml(event.summary || '(タイトルなし)')}</span>
                <div class="event-resize-handle event-resize-bottom"></div>
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
        html += '<div class="daily-events-column" data-date="' + this.formatDate(this.currentDate) + '">';

        hours.forEach(hour => {
            html += `<div class="daily-hour-slot" data-hour="${hour}" style="height: ${slotHeight}px"></div>`;
        });

        // 終日イベント（タスク）
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
            html += this.renderGoogleEventBlock(event, startHour, slotHeight, true);
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

        // リサイズハンドラー
        this.initResize();
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

        // ToDoドラッグハンドラー
        this.bindTodoDrag();
    },

    bindTodoDrag() {
        document.querySelectorAll('.draggable-todo').forEach(el => {
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'todo',
                    todoId: el.dataset.todoId,
                    title: el.dataset.todoTitle,
                    date: el.dataset.todoDate
                }));
                el.classList.add('dragging');
            });

            el.addEventListener('dragend', () => {
                el.classList.remove('dragging');
            });
        });

        // 日付カラムへのドロップを追加
        document.querySelectorAll('.weekly-day-column, .daily-events-column').forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drop-target');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drop-target');
            });

            column.addEventListener('drop', async (e) => {
                e.preventDefault();
                column.classList.remove('drop-target');

                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));

                    // ToDoをGoogle Calendarに登録
                    if (data.type === 'todo' && typeof GoogleCalendar !== 'undefined' && GoogleCalendar.connected) {
                        const dateStr = column.dataset.date;

                        await GoogleCalendar.createEvent({
                            title: data.title,
                            allDay: true,
                            startDate: dateStr,
                            endDate: dateStr,
                            description: 'ToDoから登録'
                        });

                        UI.showToast('Google Calendarに予定を追加しました', 'success');
                        const activeView = document.querySelector('.view-container:not(.hidden)')?.id;
                        if (activeView === 'weeklyView') {
                            this.renderWeekly();
                        } else {
                            this.renderDaily();
                        }
                    }
                } catch (error) {
                    console.error('Todo drop error:', error);
                }
            });
        });
    },

    // リサイズ機能の初期化
    initResize() {
        const container = document.querySelector('.main-content');
        if (!container) return;

        container.addEventListener('mousedown', (e) => {
            const handle = e.target.closest('.event-resize-handle');
            if (!handle) return;

            e.preventDefault();
            e.stopPropagation();

            const eventBlock = handle.closest('.weekly-event, .daily-event');
            if (!eventBlock) return;

            const isTop = handle.classList.contains('event-resize-top');

            this.resizeState = {
                isResizing: true,
                type: isTop ? 'top' : 'bottom',
                eventId: eventBlock.dataset.eventId,
                calendarId: eventBlock.dataset.calendarId,
                originalY: e.clientY,
                originalTop: parseInt(eventBlock.style.top) || 0,
                originalHeight: parseInt(eventBlock.style.height) || 0,
                element: eventBlock,
                duration: parseInt(eventBlock.dataset.duration) || 60
            };

            eventBlock.classList.add('resizing');

            // マウス移動と終了のイベントを登録
            const moveHandler = (moveEvent) => this.handleResizeMove(moveEvent);
            const upHandler = () => {
                this.handleResizeEnd();
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('mouseup', upHandler);
            };

            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('mouseup', upHandler);
        });
    },

    handleResizeMove(e) {
        if (!this.resizeState.isResizing) return;

        const deltaY = e.clientY - this.resizeState.originalY;
        const { type, originalTop, originalHeight, element } = this.resizeState;
        const slotHeight = this.config.slotHeight;

        if (type === 'bottom') {
            const newHeight = Math.max(slotHeight / 4, originalHeight + deltaY);
            element.style.height = `${newHeight}px`;
        } else if (type === 'top') {
            const newTop = originalTop + deltaY;
            const newHeight = Math.max(slotHeight / 4, originalHeight - deltaY);

            if (newHeight > slotHeight / 4) {
                element.style.top = `${newTop}px`;
                element.style.height = `${newHeight}px`;
            }
        }
    },

    async handleResizeEnd() {
        if (!this.resizeState.isResizing) return;

        const { element, eventId, calendarId } = this.resizeState;
        element.classList.remove('resizing');
        this.resizeState.isResizing = false;

        const top = parseInt(element.style.top) || 0;
        const height = parseInt(element.style.height) || 0;
        const slotHeight = this.config.slotHeight;
        const startHour = this.config.startHour;

        // 新しい開始時間と終了時間を計算
        const startMinutesTotal = (top / slotHeight) * 60;
        const durationMinutes = (height / slotHeight) * 60;

        const startH = Math.floor(startMinutesTotal / 60) + startHour;
        const startM = Math.round((startMinutesTotal % 60) / 15) * 15; // 15分単位にスナップ

        const column = element.closest('.weekly-day-column, .daily-events-column');
        const dateStr = column?.dataset?.date || this.formatDate(this.currentDate);

        const newStart = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
        const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);

        try {
            await GoogleCalendar.updateEvent(
                eventId,
                calendarId,
                newStart.toISOString(),
                newEnd.toISOString(),
                false
            );
            UI.showToast('予定の期間を更新しました', 'success');
        } catch (error) {
            console.error('Resize update error:', error);
            UI.showToast('予定の更新に失敗しました', 'warning');
        }

        // ビュー再描画
        const activeView = document.querySelector('.view-container:not(.hidden)')?.id;
        if (activeView === 'weeklyView') {
            this.renderWeekly();
        } else {
            this.renderDaily();
        }
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
