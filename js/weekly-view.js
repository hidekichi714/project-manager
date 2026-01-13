/**
 * Weekly View Module - 週間バーチカルビュー
 */

const WeeklyView = {
    // 設定
    config: {
        startHour: 4,
        endHour: 23,
        slotHeight: 48, // 1時間あたりの高さ(px)
        allDayHeight: 28, // 終日タスク1件の高さ
        maxAllDayVisible: 5, // 表示する終日タスクの最大数
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
        // Local navigation listeners removed as they are now handled by UI's common navigation
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

        // タイトルと週番号の更新
        const title = document.getElementById('viewTitle');
        const weekNum = document.getElementById('viewWeekNum');

        if (title) {
            const startStr = this.formatDateRange(weekStart);
            const endStr = this.formatDateRange(weekEnd);
            title.textContent = `${startStr} - ${endStr}`;
        }

        if (weekNum) {
            const wNum = this.getWeekNumber(weekStart);
            weekNum.textContent = `W${wNum < 10 ? '0' + wNum : wNum}`;
            weekNum.classList.remove('hidden');
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

    // 週内期限のToDoを取得（完了タスクも含む）
    getWeekTodos(weekEnd) {
        if (typeof ToDo === 'undefined') return [];

        const todos = ToDo.getAll();
        const weekEndDate = new Date(weekEnd);
        weekEndDate.setHours(23, 59, 59, 999);

        return todos.filter(todo => {
            // 期限なしは表示
            if (!todo.dueDate) return !todo.completed; // 未完了の期限なしのみ表示

            const due = new Date(todo.dueDate);
            due.setHours(23, 59, 59, 999);

            // 期限が週内のタスクを表示（完了/未完了どちらも）
            return due <= weekEndDate;
        });
    },

    // ToDoパネルをレンダリング
    renderTodoPanel(todos, weekEnd) {
        const today = new Date().toISOString().split('T')[0];

        let html = '<div class="weekly-todo-panel">';
        html += '<h3 class="weekly-todo-title">📋 今週のタスク</h3>';
        html += `<p class="weekly-todo-subtitle">${this.formatDateShort(weekEnd)}までの期限</p>`;
        html += '<div class="weekly-todo-list">';

        if (todos.length === 0) {
            html += '<div class="weekly-todo-empty">タスクはありません</div>';
        } else {
            todos.forEach(todo => {
                const dueText = todo.dueDate ? ToDo.formatDueDate(todo.dueDate) : '期限なし';
                const isCompleted = todo.completed;
                const isOverdue = !isCompleted && todo.dueDate && todo.dueDate < today;

                html += `
                    <div class="weekly-todo-item ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} draggable-todo" 
                         draggable="${!isCompleted}"
                         data-todo-id="${todo.id}"
                         data-todo-title="${UI.escapeHtml(todo.title)}"
                         data-todo-date="${todo.dueDate || ''}">
                        <input type="checkbox" class="todo-checkbox" ${isCompleted ? 'checked' : ''}>
                        <span class="todo-priority-dot ${todo.priority}"></span>
                        <div class="todo-info">
                            <span class="todo-name ${isCompleted ? 'strikethrough' : ''}">${UI.escapeHtml(todo.title)}</span>
                            ${!isCompleted ? `<input type="date" class="todo-date-edit" value="${todo.dueDate || ''}" title="期限を変更">` : `<span class="todo-due">${dueText}</span>`}
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
        const { startHour, endHour, slotHeight, allDayHeight, maxAllDayVisible } = this.config;
        const hours = [];
        for (let h = startHour; h <= endHour; h++) {
            hours.push(h);
        }

        // 終日イベントを抽出
        const allDayByDay = {};
        days.forEach(day => {
            const dayStr = this.formatDate(day);
            allDayByDay[dayStr] = googleEvents.filter(e => {
                const isAllDay = !e.start.dateTime;
                if (!isAllDay) return false;
                const eventDate = new Date(e.start.date);
                return eventDate.toDateString() === day.toDateString();
            });
        });

        // 終日セクション（ヘッダーとボディの間）
        const allDaySectionHeight = allDayHeight * maxAllDayVisible + 8;
        let html = `<div class="weekly-allday-row" style="min-height: ${allDaySectionHeight}px;">`;
        html += '<div class="weekly-time-gutter weekly-allday-label">終日</div>';
        days.forEach(day => {
            const dayStr = this.formatDate(day);
            const allDayEvents = allDayByDay[dayStr] || [];
            html += `<div class="weekly-allday-cell" data-date="${dayStr}">`;
            allDayEvents.slice(0, maxAllDayVisible).forEach(event => {
                html += `
                    <div class="allday-event draggable-allday" 
                         draggable="true"
                         data-event-id="${event.id}"
                         data-calendar-id="${event.calendarId || 'primary'}"
                         data-all-day="true"
                         style="background: ${event.calendarColor || '#4285f4'}30; border-left-color: ${event.calendarColor || '#4285f4'};">
                        <span class="event-title">${UI.escapeHtml(event.summary || '(タイトルなし)')}</span>
                    </div>
                `;
            });
            if (allDayEvents.length > maxAllDayVisible) {
                html += `<div class="allday-more">+${allDayEvents.length - maxAllDayVisible}件</div>`;
            }
            html += '</div>';
        });
        html += '</div>';

        // スクロール可能なボディ
        html += '<div class="weekly-body">';

        // 時間軸
        html += '<div class="weekly-time-column">';
        hours.forEach(hour => {
            html += `<div class="weekly-time-slot" style="height: ${slotHeight}px">${hour}:00</div>`;
        });
        html += '</div>';

        // 各曜日のカラム
        html += '<div class="weekly-day-columns">';
        days.forEach(day => {
            const dayStr = this.formatDate(day);
            const dayTasks = tasks.filter(t => t.startDate === dayStr || t.endDate === dayStr);
            const dayEvents = googleEvents.filter(e => {
                if (!e.start.dateTime) return false; // 終日は除外
                const eventDate = new Date(e.start.dateTime);
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

            // Googleイベントをオーバーレイ（衝突検出付き）
            const eventsWithPosition = this.calculateEventPositions(dayEvents, startHour, slotHeight);
            eventsWithPosition.forEach(eventData => {
                html += this.renderGoogleEventBlockWithPosition(eventData, startHour, slotHeight);
            });

            html += '</div>';
        });
        html += '</div>';

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
                <span class="event-title">${UI.escapeHtml(event.summary || '(タイトルなし)')}</span>
                <div class="event-resize-handle event-resize-bottom"></div>
            </div>
        `;
    },

    // イベント衝突検出と位置計算
    calculateEventPositions(events, startHour, slotHeight) {
        if (!events.length) return [];

        // イベントを開始時間でソート
        const sorted = events.map(e => {
            const start = new Date(e.start.dateTime);
            const end = new Date(e.end.dateTime);
            return {
                event: e,
                startMinutes: (start.getHours() - startHour) * 60 + start.getMinutes(),
                endMinutes: (end.getHours() - startHour) * 60 + end.getMinutes()
            };
        }).sort((a, b) => a.startMinutes - b.startMinutes);

        // 衝突グループを計算
        const groups = [];
        let currentGroup = [sorted[0]];
        let groupEnd = sorted[0].endMinutes;

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].startMinutes < groupEnd) {
                // 重なっている
                currentGroup.push(sorted[i]);
                groupEnd = Math.max(groupEnd, sorted[i].endMinutes);
            } else {
                // 新しいグループ
                groups.push(currentGroup);
                currentGroup = [sorted[i]];
                groupEnd = sorted[i].endMinutes;
            }
        }
        groups.push(currentGroup);

        // 各イベントに位置情報を付与
        const result = [];
        groups.forEach(group => {
            const count = group.length;
            group.forEach((item, index) => {
                result.push({
                    ...item,
                    left: (index / count) * 100,
                    width: 100 / count
                });
            });
        });

        return result;
    },

    // 位置情報付きイベントブロック描画
    renderGoogleEventBlockWithPosition(eventData, startHour, slotHeight) {
        const { event, startMinutes, left, width } = eventData;
        const eventId = event.id;
        const calendarId = event.calendarId || 'primary';

        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);
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
                 style="top: ${top}px; height: ${height}px; left: calc(4px + ${left}%); width: calc(${width}% - 8px); background: ${event.calendarColor || '#4285f4'}30; border-left-color: ${event.calendarColor || '#4285f4'};">
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
        const title = document.getElementById('viewTitle');
        const weekNum = document.getElementById('viewWeekNum');

        if (title) {
            const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
            title.textContent = `${day.getFullYear()}年${day.getMonth() + 1}月${day.getDate()}日 (${dayNames[day.getDay()]})`;
        }

        if (weekNum) {
            weekNum.classList.add('hidden');
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

        // Googleカレンダーイベントクリック（編集/削除メニュー表示）
        document.querySelectorAll('.weekly-event.google, .daily-event.google, .allday-event').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventId = el.dataset.eventId;
                const calendarId = el.dataset.calendarId || 'primary';
                const eventTitle = el.querySelector('.event-title')?.textContent || '予定';

                // 選択ダイアログ
                const action = prompt(
                    `「${eventTitle}」\n\n操作を選択してください:\n1 = 編集\n2 = 削除\nキャンセル = 何もしない`,
                    '1'
                );

                if (action === '1') {
                    // 編集モーダルを開く
                    if (typeof GoogleCalendar !== 'undefined') {
                        GoogleCalendar.openEditEventModal(eventId, calendarId);
                    }
                } else if (action === '2') {
                    // 削除
                    if (confirm('本当に削除しますか？')) {
                        if (typeof GoogleCalendar !== 'undefined') {
                            GoogleCalendar.deleteEvent(eventId, calendarId).then(() => {
                                const activeView = document.querySelector('.view-container:not(.hidden)')?.id;
                                if (activeView === 'weeklyView') {
                                    this.renderWeekly();
                                } else if (activeView === 'dailyView') {
                                    this.renderDaily();
                                }
                            });
                        }
                    }
                }
            });
        });

        // 週間パネルのチェックボックスイベント
        document.querySelectorAll('.weekly-todo-item .todo-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const item = e.target.closest('.weekly-todo-item');
                const id = item.dataset.todoId;
                if (typeof ToDo !== 'undefined') {
                    ToDo.toggleComplete(id);
                    this.renderWeekly();
                    if (typeof UI !== 'undefined') {
                        UI.renderDueTasks();
                        UI.renderArchive();
                    }
                }
            });
        });

        // 週間パネルの日付編集イベント
        document.querySelectorAll('.weekly-todo-item .todo-date-edit').forEach(dateInput => {
            dateInput.addEventListener('change', (e) => {
                e.stopPropagation();
                const item = e.target.closest('.weekly-todo-item');
                const id = item.dataset.todoId;
                const newDate = e.target.value;
                if (typeof ToDo !== 'undefined') {
                    const todos = ToDo.getAll();
                    const todo = todos.find(t => t.id === id);
                    if (todo) {
                        todo.dueDate = newDate;
                        ToDo.saveTodo(todo);
                        this.renderWeekly();
                        if (typeof UI !== 'undefined') {
                            UI.showToast('期限を更新しました', 'success');
                            UI.renderDueTasks();
                        }
                    }
                }
            });
        });

        // ドラッグ&ドロップハンドラー
        this.bindDragDrop();

        // リサイズハンドラー
        this.initResize();
    },

    bindDragDrop() {
        // ドラッグ開始（時間指定イベント）
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

        // ドラッグ開始（終日イベント）
        document.querySelectorAll('.draggable-allday').forEach(el => {
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    eventId: el.dataset.eventId,
                    calendarId: el.dataset.calendarId,
                    duration: 30,
                    isAllDay: true
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

                    console.log('Drop handler - data:', data, 'hour:', hour, 'dateStr:', dateStr);

                    if (data.isAllDay) {
                        // 終日イベントを30分の時間指定イベントに変換
                        const startDate = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00`);
                        const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30分後

                        // ISO形式に変換（タイムゾーン指定あり）
                        const startDateTime = startDate.toISOString();
                        const endDateTime = endDate.toISOString();

                        console.log('All-day to timed conversion:', { startDateTime, endDateTime });

                        const result = await GoogleCalendar.updateEvent(
                            data.eventId,
                            data.calendarId,
                            startDateTime,
                            endDateTime,
                            false // 終日から時間指定へ変換
                        );

                        if (!result) {
                            UI.showToast('予定の移動に失敗しました', 'error');
                        }
                    } else {
                        // 時間指定イベントを移動
                        const startDate = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00`);
                        const endDate = new Date(startDate.getTime() + data.duration * 60 * 1000);

                        const startDateTime = startDate.toISOString();
                        const endDateTime = endDate.toISOString();

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
                    UI.showToast('移動できませんでした: ' + (error.message || 'エラー'), 'error');
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

    formatTime(input) {
        // Dateオブジェクトの場合
        if (input instanceof Date) {
            const h = input.getHours();
            const m = input.getMinutes();
            return `${h}:${m.toString().padStart(2, '0')}`;
        }
        // 数値（分）の場合
        const h = Math.floor(input / 60);
        const m = input % 60;
        return `${h}:${m.toString().padStart(2, '0')}`;
    },

    // 日付フォーマット (範囲用)
    formatDateRange(date) {
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    },

    // 週番号を取得
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    WeeklyView.init();
});
