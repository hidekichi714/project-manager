/**
 * Gantt Chart Module - ガントチャートの描画と操作
 */

const Gantt = {
    // 設定
    config: {
        cellWidth: 40,
        rowHeight: 40,
        projectRowHeight: 48,
        scale: 'week', // 'day', 'week', 'month'
        visibleDays: 42 // 表示日数（6週間）
    },

    // 現在の表示期間
    currentDate: new Date(),
    startDate: null,
    endDate: null,

    // 折りたたみ状態
    collapsedProjects: new Set(),

    // 初期化
    init() {
        this.calculatePeriod();
    },

    // 期間計算
    calculatePeriod() {
        const today = new Date(this.currentDate);

        // 週の始まり（月曜）に調整
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        this.startDate = new Date(today);
        this.startDate.setDate(today.getDate() + diff - 7); // 1週間前から表示

        this.endDate = new Date(this.startDate);
        this.endDate.setDate(this.startDate.getDate() + this.config.visibleDays);

        this.updatePeriodLabel();
    },

    updatePeriodLabel() {
        const label = document.getElementById('ganttPeriod');
        if (label) {
            const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
            label.textContent = `${this.currentDate.getFullYear()}年${months[this.currentDate.getMonth()]}`;
        }
    },

    // ナビゲーション
    navigate(direction) {
        const days = this.config.scale === 'month' ? 30 : this.config.scale === 'week' ? 14 : 7;
        this.currentDate.setDate(this.currentDate.getDate() + (direction * days));
        this.calculatePeriod();
        this.render();
    },

    // スケール変更
    setScale(scale) {
        this.config.scale = scale;

        switch (scale) {
            case 'day':
                this.config.cellWidth = 60;
                this.config.visibleDays = 21;
                break;
            case 'week':
                this.config.cellWidth = 40;
                this.config.visibleDays = 42;
                break;
            case 'month':
                this.config.cellWidth = 30;
                this.config.visibleDays = 90;
                break;
        }

        this.calculatePeriod();
        this.render();
    },

    // 日付配列生成
    getDates() {
        const dates = [];
        const current = new Date(this.startDate);

        while (current <= this.endDate) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return dates;
    },

    // レンダリング
    render() {
        const container = document.getElementById('ganttContainer');
        const emptyState = document.getElementById('ganttEmpty');

        const projects = UI.getFilteredProjects();

        if (projects.length === 0) {
            emptyState.style.display = 'flex';
            container.querySelector('.gantt-wrapper')?.remove();
            return;
        }

        emptyState.style.display = 'none';

        const dates = this.getDates();

        let html = `
            <div class="gantt-wrapper">
                <div class="gantt-sidebar">
                    <div class="gantt-sidebar-header">プロジェクト / タスク</div>
                    ${this.renderSidebarContent(projects)}
                </div>
                <div class="gantt-timeline">
                    <div class="gantt-header">
                        ${this.renderHeader(dates)}
                    </div>
                    <div class="gantt-body">
                        ${this.renderTimelineContent(projects, dates)}
                    </div>
                </div>
            </div>
        `;

        // 既存のwrapperを置換
        const existingWrapper = container.querySelector('.gantt-wrapper');
        if (existingWrapper) {
            existingWrapper.outerHTML = html;
        } else {
            container.insertAdjacentHTML('beforeend', html);
        }

        this.bindEvents();
    },

    // ヘッダー描画
    renderHeader(dates) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

        return dates.map(date => {
            const isToday = date.getTime() === today.getTime();
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            let classes = 'gantt-header-cell';
            if (isToday) classes += ' today';
            if (isWeekend) classes += ' weekend';

            return `
                <div class="${classes}" style="min-width: ${this.config.cellWidth}px">
                    <span class="day-name">${dayNames[date.getDay()]}</span>
                    ${date.getDate()}
                </div>
            `;
        }).join('');
    },

    // サイドバーコンテンツ
    renderSidebarContent(projects) {
        let html = '';

        projects.forEach(project => {
            const isCollapsed = this.collapsedProjects.has(project.id);
            const tasks = Storage.getTasks(project.id);
            const filteredTasks = UI.filterTasks(tasks);

            html += `
                <div class="gantt-project-row" data-project-id="${project.id}">
                    <span class="gantt-project-toggle ${isCollapsed ? 'collapsed' : ''}">▼</span>
                    <span class="gantt-project-name">${UI.escapeHtml(project.name)}</span>
                    <div class="gantt-project-actions">
                        <button class="gantt-project-action project-add-task" title="タスク追加">➕</button>
                        <button class="gantt-project-action project-edit" title="編集">✏️</button>
                    </div>
                </div>
            `;

            if (!isCollapsed) {
                filteredTasks.forEach(task => {
                    const priorityLabels = { 'high': '高', 'medium': '中', 'low': '低' };
                    const isDone = task.status === 'done';
                    html += `
                        <div class="gantt-task-row" data-task-id="${task.id}" data-project-id="${task.projectId}">
                            <input type="checkbox" class="task-checkbox" ${isDone ? 'checked' : ''} data-task-id="${task.id}">
                            <span class="gantt-task-status ${task.status}"></span>
                            <span class="gantt-task-name ${isDone ? 'completed' : ''}">${UI.escapeHtml(task.name)}</span>
                            <span class="gantt-task-priority ${task.priority}">${priorityLabels[task.priority]}</span>
                        </div>
                    `;
                });
            }
        });

        return html;
    },

    // タイムラインコンテンツ
    renderTimelineContent(projects, dates) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let html = '';

        projects.forEach(project => {
            const isCollapsed = this.collapsedProjects.has(project.id);
            const tasks = Storage.getTasks(project.id);
            const filteredTasks = UI.filterTasks(tasks);

            // プロジェクト行
            html += `
                <div class="gantt-project-timeline" style="height: ${this.config.projectRowHeight}px">
                    ${this.renderGridLines(dates, today)}
                    ${this.renderProjectBar(project, dates)}
                </div>
            `;

            // タスク行
            if (!isCollapsed) {
                filteredTasks.forEach(task => {
                    html += `
                        <div class="gantt-task-timeline" style="height: ${this.config.rowHeight}px" data-task-id="${task.id}">
                            ${this.renderGridLines(dates, today)}
                            ${this.renderTaskBar(task, dates)}
                        </div>
                    `;
                });
            }
        });

        return html;
    },

    // グリッドライン
    renderGridLines(dates, today) {
        let html = '';

        dates.forEach((date, index) => {
            const left = index * this.config.cellWidth;
            const isToday = date.getTime() === today.getTime();

            if (isToday) {
                html += `<div class="gantt-today-line" style="left: ${left + this.config.cellWidth / 2}px"></div>`;
            }
        });

        return html;
    },

    // プロジェクトバー
    renderProjectBar(project, dates) {
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        const { left, width } = this.calculateBarPosition(start, end, dates);

        if (width <= 0) return '';

        return `<div class="gantt-project-bar" style="left: ${left}px; width: ${width}px"></div>`;
    },

    // タスクバー
    renderTaskBar(task, dates) {
        const start = new Date(task.startDate);
        const end = new Date(task.endDate);
        const { left, width } = this.calculateBarPosition(start, end, dates);

        if (width <= 0) return '';

        const progressWidth = (task.progress || 0) * width / 100;

        return `
            <div class="gantt-task-bar priority-${task.priority} status-${task.status}" 
                 style="left: ${left}px; width: ${width}px"
                 data-task-id="${task.id}">
                <div class="gantt-task-bar-fill" style="width: ${progressWidth}px"></div>
                <span class="gantt-task-bar-label">${UI.escapeHtml(task.name)}</span>
            </div>
        `;
    },

    // バー位置計算
    calculateBarPosition(startDate, endDate, dates) {
        if (dates.length === 0) return { left: 0, width: 0 };

        const periodStart = dates[0];
        const periodEnd = dates[dates.length - 1];

        // 期間外チェック
        if (endDate < periodStart || startDate > periodEnd) {
            return { left: 0, width: 0 };
        }

        // 開始位置
        const effectiveStart = startDate < periodStart ? periodStart : startDate;
        const startDiff = Math.floor((effectiveStart - periodStart) / (1000 * 60 * 60 * 24));
        const left = startDiff * this.config.cellWidth;

        // 幅
        const effectiveEnd = endDate > periodEnd ? periodEnd : endDate;
        const daysDiff = Math.floor((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
        const width = daysDiff * this.config.cellWidth;

        return { left, width };
    },

    // イベントバインド
    bindEvents() {
        // プロジェクト行クリック（折りたたみトグル）
        document.querySelectorAll('.gantt-project-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.gantt-project-actions')) return;

                const projectId = row.dataset.projectId;
                this.toggleProject(projectId);
            });
        });

        // タスク追加
        document.querySelectorAll('.project-add-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.closest('.gantt-project-row').dataset.projectId;
                UI.openTaskModal(projectId);
            });
        });

        // プロジェクト編集
        document.querySelectorAll('.gantt-project-row .project-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.closest('.gantt-project-row').dataset.projectId;
                const project = Storage.getProject(projectId);
                if (project) UI.openProjectModal(project);
            });
        });

        // タスク行クリック
        document.querySelectorAll('.gantt-task-row').forEach(row => {
            row.addEventListener('click', (e) => {
                // チェックボックスクリック時はスキップ
                if (e.target.classList.contains('task-checkbox')) return;

                const task = Storage.getTask(row.dataset.taskId);
                if (task) UI.openTaskModal(task.projectId, task);
            });
        });

        // タスク完了チェックボックス
        document.querySelectorAll('.gantt-task-row .task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const taskId = checkbox.dataset.taskId;
                const task = Storage.getTask(taskId);
                if (task) {
                    task.status = checkbox.checked ? 'done' : 'todo';
                    task.progress = checkbox.checked ? 100 : 0;
                    Storage.saveTask(task);
                    UI.showToast(checkbox.checked ? 'タスクを完了しました' : 'タスクを未完了に戻しました', 'success');
                    this.render();
                    UI.renderProjectList();
                }
            });
        });

        // タスクバークリック
        document.querySelectorAll('.gantt-task-bar').forEach(bar => {
            bar.addEventListener('click', () => {
                const task = Storage.getTask(bar.dataset.taskId);
                if (task) UI.openTaskModal(task.projectId, task);
            });
        });
    },

    // プロジェクト折りたたみトグル
    toggleProject(projectId) {
        if (this.collapsedProjects.has(projectId)) {
            this.collapsedProjects.delete(projectId);
        } else {
            this.collapsedProjects.add(projectId);
        }
        this.render();
    }
};

// 初期化
Gantt.init();
