/**
 * UI Module - UIコンポーネントとインタラクション
 */

const UI = {
    // DOM要素キャッシュ
    elements: {},

    // 初期化
    init() {
        this.cacheElements();
        this.bindEvents();
        this.renderCategories();
        this.updateProjectCount();
    },

    // 要素キャッシュ
    cacheElements() {
        this.elements = {
            // Header
            header: document.querySelector('.header'),
            logo: document.querySelector('.header-logo'),
            searchBtn: document.getElementById('searchBtn'),
            syncStatus: document.getElementById('syncStatus'),
            addProjectBtn: document.getElementById('addProjectBtn'),

            // Sidebar
            sidebar: document.getElementById('sidebar'),
            categoryList: document.getElementById('categoryList'),
            addCategoryBtn: document.getElementById('addCategoryBtn'),
            exportBtn: document.getElementById('exportBtn'),
            importBtn: document.getElementById('importBtn'),
            importFile: document.getElementById('importFile'),

            // Navigation
            navItems: document.querySelectorAll('.nav-item'),

            // Views
            ganttView: document.getElementById('ganttView'),
            calendarView: document.getElementById('calendarView'),
            weeklyView: document.getElementById('weeklyView'),
            dailyView: document.getElementById('dailyView'),
            listView: document.getElementById('listView'),
            priorityView: document.getElementById('priorityView'),
            projectList: document.getElementById('projectList'),

            // Priority Nav
            navEisenhower: document.getElementById('navEisenhower'),
            navEatTheFrog: document.getElementById('navEatTheFrog'),

            // View Header (Date display)
            viewTitle: document.getElementById('viewTitle'),
            viewWeekNum: document.getElementById('viewWeekNum'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),

            // Project Modal
            projectModal: document.getElementById('projectModal'),
            projectForm: document.getElementById('projectForm'),
            projectModalTitle: document.getElementById('projectModalTitle'),
            projectModalClose: document.getElementById('projectModalClose'),
            projectCancel: document.getElementById('projectCancel'),
            projectId: document.getElementById('projectId'),
            projectName: document.getElementById('projectName'),
            projectCategory: document.getElementById('projectCategory'),
            projectStartDate: document.getElementById('projectStartDate'),
            projectEndDate: document.getElementById('projectEndDate'),
            projectDescription: document.getElementById('projectDescription'),

            // Task Modal
            taskModal: document.getElementById('taskModal'),
            taskForm: document.getElementById('taskForm'),
            taskModalTitle: document.getElementById('taskModalTitle'),
            taskModalClose: document.getElementById('taskModalClose'),
            taskCancel: document.getElementById('taskCancel'),
            taskDelete: document.getElementById('taskDelete'),
            taskId: document.getElementById('taskId'),
            taskProjectId: document.getElementById('taskProjectId'),
            taskName: document.getElementById('taskName'),
            taskPriority: document.getElementById('taskPriority'),
            taskStatus: document.getElementById('taskStatus'),
            taskStartDate: document.getElementById('taskStartDate'),
            taskEndDate: document.getElementById('taskEndDate'),
            taskProgress: document.getElementById('taskProgress'),
            taskProgressValue: document.getElementById('taskProgressValue'),
            taskDescription: document.getElementById('taskDescription'),
            taskReminderDate: document.getElementById('taskReminderDate'),
            taskAddToGoogleCalendar: document.getElementById('taskAddToGoogleCalendar'),

            // Category Modal
            categoryModal: document.getElementById('categoryModal'),
            categoryForm: document.getElementById('categoryForm'),
            categoryModalClose: document.getElementById('categoryModalClose'),
            categoryCancel: document.getElementById('categoryCancel'),
            categoryName: document.getElementById('categoryName'),
            categoryColor: document.getElementById('categoryColor'),

            // Search Modal
            searchModal: document.getElementById('searchModal'),
            searchModalClose: document.getElementById('searchModalClose'),
            searchInput: document.getElementById('searchInput'),
            searchResults: document.getElementById('searchResults'),

            // User Modal
            userModal: document.getElementById('userModal'),
            userModalClose: document.getElementById('userModalClose'),
            userName: document.getElementById('userName'),
            userEmail: document.getElementById('userEmail'),
            logoutBtn: document.getElementById('logoutBtn'),

            // Toast
            toastContainer: document.getElementById('toastContainer') || this.createToastContainer()
        };
    },

    createToastContainer() {
        const el = document.createElement('div');
        el.id = 'toastContainer';
        el.className = 'toast-container';
        document.body.appendChild(el);
        return el;
    },

    // イベントバインド
    bindEvents() {
        const { elements } = this;

        // Navigation (Header Tabs)
        elements.navItems?.forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                this.switchView(view);

                // Update active state in UI
                elements.navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Common Nav Arrows (Date navigation)
        elements.prevBtn?.addEventListener('click', () => this.navigateDate(-1));
        elements.nextBtn?.addEventListener('click', () => this.navigateDate(1));

        // Priority Navigation
        elements.navEisenhower?.addEventListener('click', () => {
            this.switchView('priority', 'eisenhower');
        });

        elements.navEatTheFrog?.addEventListener('click', () => {
            this.switchView('priority', 'frog');
        });

        // Project modal
        elements.addProjectBtn?.addEventListener('click', () => this.openProjectModal());
        elements.projectModalClose?.addEventListener('click', () => this.closeModal(elements.projectModal));
        elements.projectCancel?.addEventListener('click', () => this.closeModal(elements.projectModal));
        elements.projectForm?.addEventListener('submit', (e) => this.handleProjectSubmit(e));

        // Task modal
        elements.taskModalClose?.addEventListener('click', () => this.closeModal(elements.taskModal));
        elements.taskCancel?.addEventListener('click', () => this.closeModal(elements.taskModal));
        elements.taskForm?.addEventListener('submit', (e) => this.handleTaskSubmit(e));
        elements.taskDelete?.addEventListener('click', () => this.handleTaskDelete());
        elements.taskProgress?.addEventListener('input', (e) => {
            elements.taskProgressValue.textContent = e.target.value;
        });

        // Category modal
        elements.addCategoryBtn?.addEventListener('click', () => this.openCategoryModal());
        elements.categoryModalClose?.addEventListener('click', () => this.closeModal(elements.categoryModal));
        elements.categoryCancel?.addEventListener('click', () => this.closeModal(elements.categoryModal));
        elements.categoryForm?.addEventListener('submit', (e) => this.handleCategorySubmit(e));

        // Search modal
        elements.searchBtn?.addEventListener('click', () => this.openModal(elements.searchModal));
        elements.searchModalClose?.addEventListener('click', () => this.closeModal(elements.searchModal));
        elements.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // User profile (placeholder behavior)
        document.querySelector('.user-profile')?.addEventListener('click', () => {
            UI.showToast('ユーザー設定は準備中です', 'info');
        });

        // Export/Import
        elements.exportBtn?.addEventListener('click', () => ExportModule.exportToJson());
        elements.importBtn?.addEventListener('click', () => elements.importFile.click());
        elements.importFile?.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                ExportModule.importFromJson(e.target.files[0]).then(() => {
                    this.renderCategories();
                    this.updateProjectCount();
                    Gantt.render();
                    this.renderProjectList();
                });
            }
        });

        // Modal backdrop click
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', () => {
                const modal = backdrop.closest('.modal');
                this.closeModal(modal);
            });
        });

        // Google Calendar Quick Add
        document.getElementById('sidebarAddEvent')?.addEventListener('click', () => {
            if (typeof GoogleCalendar !== 'undefined') {
                GoogleCalendar.openEventModal();
            }
        });

        // Category click
        elements.categoryList?.addEventListener('click', (e) => {
            const item = e.target.closest('.category-item');
            if (item) {
                this.selectCategory(item.dataset.category);
            }
        });

        // Quick Add Form
        document.getElementById('quickAddForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('quickAddInput');
            const dateInput = document.getElementById('quickAddDate');
            const calendarSelect = document.getElementById('quickAddCalendar');

            const text = input?.value?.trim();
            const dueDate = dateInput?.value || new Date().toISOString().split('T')[0];
            const calendarId = calendarSelect?.value;

            if (text && typeof ToDo !== 'undefined') {
                const savedTodo = ToDo.saveTodo({
                    title: text,
                    dueDate: dueDate,
                    priority: 'medium'
                });

                // Google Calendarに同期
                if (calendarId && typeof GoogleCalendar !== 'undefined' && GoogleCalendar.connected) {
                    try {
                        await GoogleCalendar.addEvent({
                            title: text,
                            allDay: true,
                            startDate: dueDate,
                            endDate: dueDate,
                            calendarId: calendarId
                        });
                        this.showToast('タスクを追加し、Googleカレンダーに同期しました', 'success');
                    } catch (error) {
                        console.error('Google Calendar sync error:', error);
                        this.showToast('タスクを追加しましたが、カレンダー同期に失敗しました', 'warning');
                    }
                } else {
                    this.showToast('タスクを追加しました', 'success');
                }

                input.value = '';
                dateInput.value = '';
                ToDo.render();
                this.renderDueTasks();
            }
        });

        // Quick Add Calendar Selector - populate from Google Calendar
        this.populateQuickAddCalendar();

        // Initial render of due tasks
        this.renderDueTasks();
    },

    // Date navigation common handler
    navigateDate(direction) {
        const activeView = this.getActiveView();

        if (activeView === 'gantt' && typeof Gantt !== 'undefined') {
            Gantt.navigate(direction);
        } else if (activeView === 'calendar' && typeof Calendar !== 'undefined') {
            Calendar.navigate(direction);
        } else if ((activeView === 'weekly' || activeView === 'daily') && typeof WeeklyView !== 'undefined') {
            WeeklyView.navigate(direction);
        }
    },

    // Get current active view
    getActiveView() {
        if (!this.elements.ganttView.classList.contains('hidden')) return 'gantt';
        if (!this.elements.calendarView.classList.contains('hidden')) return 'calendar';
        if (!this.elements.weeklyView.classList.contains('hidden')) return 'weekly';
        if (!this.elements.dailyView.classList.contains('hidden')) return 'daily';
        if (!this.elements.listView.classList.contains('hidden')) return 'list';
        if (!this.elements.priorityView.classList.contains('hidden')) return 'priority'; // Added this
        return 'gantt';
    },


    // サイドバートグル
    toggleSidebar() {
        const { sidebar } = this.elements;
        sidebar.classList.toggle('open');

        // オーバーレイ追加/削除
        let overlay = document.querySelector('.sidebar-overlay');
        if (sidebar.classList.contains('open')) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay active';
                overlay.addEventListener('click', () => this.toggleSidebar());
                document.body.appendChild(overlay);
            }
        } else {
            overlay?.remove();
        }
    },

    // ビュー切り替え
    switchView(viewName, subType = null) {
        const { elements } = this;

        // Hide all views
        [
            elements.ganttView,
            elements.calendarView,
            elements.weeklyView,
            elements.dailyView,
            elements.listView,
            elements.priorityView // Add this
        ].forEach(el => el?.classList.add('hidden'));

        // Show selected view
        if (viewName === 'gantt') {
            elements.ganttView.classList.remove('hidden');
            if (typeof Gantt !== 'undefined') Gantt.init();
        } else if (viewName === 'calendar') {
            elements.calendarView.classList.remove('hidden');
            if (typeof Calendar !== 'undefined') Calendar.render();
        } else if (viewName === 'weekly') {
            elements.weeklyView.classList.remove('hidden');
            if (typeof WeeklyView !== 'undefined') WeeklyView.renderWeekly();
        } else if (viewName === 'daily') {
            elements.dailyView.classList.remove('hidden');
            if (typeof WeeklyView !== 'undefined') WeeklyView.renderDaily();
        } else if (viewName === 'list') {
            elements.listView.classList.remove('hidden');
            // List view render logic?
        } else if (viewName === 'priority') {
            elements.priorityView.classList.remove('hidden');
            if (typeof Priority !== 'undefined') {
                if (subType === 'eisenhower') Priority.renderEisenhower();
                if (subType === 'frog') Priority.renderEatTheFrog();
            }
        }

        // Update Nav Active State
        elements.navItems.forEach(item => {
            if (item.dataset.view === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Clear manual active states for sidebar items if needed
    },

    // モーダル操作
    openModal(modal) {
        modal?.classList.add('active');
    },

    closeModal(modal) {
        modal?.classList.remove('active');
    },

    // プロジェクトモーダル
    openProjectModal(project = null) {
        const { elements } = this;

        if (project) {
            elements.projectModalTitle.textContent = 'プロジェクト編集';
            elements.projectId.value = project.id;
            elements.projectName.value = project.name;
            elements.projectCategory.value = project.category || '';
            elements.projectStartDate.value = project.startDate;
            elements.projectEndDate.value = project.endDate;
            elements.projectDescription.value = project.description || '';
        } else {
            elements.projectModalTitle.textContent = 'プロジェクト追加';
            elements.projectForm.reset();
            elements.projectId.value = '';

            // デフォルト日付設定
            const today = new Date();
            const nextMonth = new Date(today);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            elements.projectStartDate.value = this.formatDate(today);
            elements.projectEndDate.value = this.formatDate(nextMonth);
        }

        this.updateCategorySelect();
        this.openModal(elements.projectModal);
    },

    handleProjectSubmit(e) {
        e.preventDefault();
        const { elements } = this;

        const project = {
            id: elements.projectId.value || null,
            name: elements.projectName.value,
            category: elements.projectCategory.value,
            startDate: elements.projectStartDate.value,
            endDate: elements.projectEndDate.value,
            description: elements.projectDescription.value
        };

        Storage.saveProject(project);
        this.closeModal(elements.projectModal);
        this.showToast('プロジェクトを保存しました', 'success');
        this.updateProjectCount();
        Gantt.render();
        this.renderProjectList();
    },

    // タスクモーダル
    openTaskModal(projectId, task = null) {
        const { elements } = this;
        const project = Storage.getProject(projectId);

        if (task) {
            elements.taskModalTitle.textContent = 'タスク編集';
            elements.taskId.value = task.id;
            elements.taskProjectId.value = task.projectId;
            elements.taskName.value = task.name;
            elements.taskPriority.value = task.priority || 'medium';
            elements.taskStatus.value = task.status || 'todo';
            elements.taskStartDate.value = task.startDate;
            elements.taskEndDate.value = task.endDate;
            elements.taskProgress.value = task.progress || 0;
            elements.taskProgressValue.textContent = task.progress || 0;
            elements.taskDescription.value = task.description || '';
            elements.taskReminderDate.value = task.reminderDate || '';
            elements.taskAddToGoogleCalendar.checked = false;
            elements.taskDelete.style.display = 'block';
        } else {
            elements.taskModalTitle.textContent = 'タスク追加';
            elements.taskForm.reset();
            elements.taskId.value = '';
            elements.taskProjectId.value = projectId;
            elements.taskProgress.value = 0;
            elements.taskProgressValue.textContent = '0';
            elements.taskReminderDate.value = '';
            elements.taskAddToGoogleCalendar.checked = false;
            elements.taskDelete.style.display = 'none';

            // プロジェクト期間をデフォルトに
            if (project) {
                elements.taskStartDate.value = project.startDate;
                elements.taskEndDate.value = project.endDate;
            }
        }

        this.openModal(elements.taskModal);
    },

    async handleTaskSubmit(e) {
        e.preventDefault();
        const { elements } = this;

        const task = {
            id: elements.taskId.value || null,
            projectId: elements.taskProjectId.value,
            name: elements.taskName.value,
            priority: elements.taskPriority.value,
            status: elements.taskStatus.value,
            startDate: elements.taskStartDate.value,
            endDate: elements.taskEndDate.value,
            progress: parseInt(elements.taskProgress.value),
            description: elements.taskDescription.value,
            reminderDate: elements.taskReminderDate.value || null
        };

        // リマインダー設定時に通知許可を確認
        if (task.reminderDate && typeof Reminder !== 'undefined' && !Reminder.permitted) {
            await Reminder.requestPermission();
        }

        const savedTask = Storage.saveTask(task);

        // Googleカレンダーに追加
        if (elements.taskAddToGoogleCalendar.checked && typeof GoogleCalendar !== 'undefined') {
            const project = Storage.getProject(task.projectId);
            await GoogleCalendar.addTaskToCalendar(savedTask, project);
        }

        // ToDoにも自動登録（終了日を期限として設定）
        if (typeof ToDo !== 'undefined') {
            const todos = ToDo.getAll();
            const existingTodo = todos.find(t => t.taskId === savedTask.id);

            if (!existingTodo) {
                // 新規ToDo作成
                const project = Storage.getProject(savedTask.projectId);
                ToDo.saveTodo({
                    title: project ? `[${project.name}] ${savedTask.name}` : savedTask.name,
                    priority: savedTask.priority,
                    dueDate: savedTask.endDate,
                    taskId: savedTask.id,
                    completed: savedTask.status === 'done'
                });
            } else {
                // 既存ToDo更新
                ToDo.saveTodo({
                    ...existingTodo,
                    dueDate: savedTask.endDate,
                    completed: savedTask.status === 'done'
                });
            }
            ToDo.render();
        }

        this.closeModal(elements.taskModal);
        this.showToast('タスクを保存しました', 'success');
        Gantt.render();
        this.renderProjectList();

        // カレンダービュー更新
        if (typeof Calendar !== 'undefined') {
            Calendar.render();
        }
    },

    handleTaskDelete() {
        const taskId = this.elements.taskId.value;
        if (taskId && confirm('このタスクを削除しますか？')) {
            Storage.deleteTask(taskId);
            this.closeModal(this.elements.taskModal);
            this.showToast('タスクを削除しました', 'success');
            Gantt.render();
            this.renderProjectList();
        }
    },

    // カテゴリモーダル
    openCategoryModal() {
        const { elements } = this;
        elements.categoryForm.reset();
        elements.categoryColor.value = '#6366f1';
        this.openModal(elements.categoryModal);
    },

    handleCategorySubmit(e) {
        e.preventDefault();
        const { elements } = this;

        const category = {
            name: elements.categoryName.value,
            color: elements.categoryColor.value
        };

        Storage.saveCategory(category);
        this.closeModal(elements.categoryModal);
        this.showToast('カテゴリを追加しました', 'success');
        this.renderCategories();
        this.updateCategorySelect();
    },

    // カテゴリ表示
    renderCategories() {
        const { categoryList } = this.elements;
        const categories = Storage.getCategories();
        const projects = Storage.getProjects();

        // カウント計算
        const counts = { all: projects.length };
        categories.forEach(cat => {
            counts[cat.id] = projects.filter(p => p.category === cat.id).length;
        });

        let html = `
            <li class="category-item active" data-category="all">
                <span class="category-icon">📁</span>
                <span class="category-name">すべて</span>
                <span class="category-count">${counts.all}</span>
            </li>
        `;

        categories.forEach(cat => {
            html += `
                <li class="category-item" data-category="${cat.id}">
                    <span class="category-color" style="background: ${cat.color}"></span>
                    <span class="category-name">${this.escapeHtml(cat.name)}</span>
                    <span class="category-count">${counts[cat.id] || 0}</span>
                    <button class="category-delete" data-id="${cat.id}" title="削除">×</button>
                </li>
            `;
        });

        categoryList.innerHTML = html;
        this.bindCategoryEvents();
    },

    // カテゴリイベントバインド
    bindCategoryEvents() {
        // 削除ボタン
        document.querySelectorAll('.category-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const catId = btn.dataset.id;
                const category = Storage.getCategories().find(c => c.id === catId);
                if (category && confirm(`「${category.name}」を削除しますか？\n関連するプロジェクトはカテゴリなしになります。`)) {
                    Storage.deleteCategory(catId);
                    this.showToast('カテゴリを削除しました', 'success');
                    this.renderCategories();
                    this.updateCategorySelect();
                    Gantt.render();
                    this.renderProjectList();
                }
            });
        });
    },

    selectCategory(categoryId) {
        // アクティブ更新
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.toggle('active', item.dataset.category === categoryId);
        });

        // フィルタ適用
        App.currentCategory = categoryId === 'all' ? null : categoryId;
        Gantt.render();
        this.renderProjectList();
    },

    updateCategorySelect() {
        const { projectCategory } = this.elements;
        const categories = Storage.getCategories();

        let html = '<option value="">カテゴリを選択</option>';
        categories.forEach(cat => {
            html += `<option value="${cat.id}">${this.escapeHtml(cat.name)}</option>`;
        });

        projectCategory.innerHTML = html;
    },

    updateProjectCount() {
        const projects = Storage.getProjects();
        const countAll = document.getElementById('countAll');
        if (countAll) countAll.textContent = projects.length;
    },

    // フィルタ
    applyFilters() {
        App.filters = {
            status: this.elements.filterStatus.value,
            priority: this.elements.filterPriority.value
        };
        Gantt.render();
        this.renderProjectList();
    },

    // 検索
    handleSearch(query) {
        const { searchResults } = this.elements;

        if (!query.trim()) {
            searchResults.innerHTML = '<p class="search-hint">検索ワードを入力してください</p>';
            return;
        }

        const q = query.toLowerCase();
        const projects = Storage.getProjects().filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        );
        const tasks = Storage.getTasks().filter(t =>
            t.name.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q))
        );

        let html = '';

        if (projects.length > 0) {
            html += '<div class="search-section"><h4>プロジェクト</h4>';
            projects.forEach(p => {
                html += `
                    <div class="search-result-item" data-type="project" data-id="${p.id}">
                        <strong>📁 ${this.escapeHtml(p.name)}</strong>
                        <small>${p.startDate} 〜 ${p.endDate}</small>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (tasks.length > 0) {
            html += '<div class="search-section"><h4>タスク</h4>';
            tasks.forEach(t => {
                const project = Storage.getProject(t.projectId);
                html += `
                    <div class="search-result-item" data-type="task" data-id="${t.id}">
                        <strong>📋 ${this.escapeHtml(t.name)}</strong>
                        <small>${project ? project.name : ''}</small>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (!html) {
            html = '<p class="search-hint">結果が見つかりませんでした</p>';
        }

        searchResults.innerHTML = html;

        // 結果クリックイベント
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                this.closeModal(this.elements.searchModal);
                if (item.dataset.type === 'project') {
                    const project = Storage.getProject(item.dataset.id);
                    if (project) this.openProjectModal(project);
                } else {
                    const task = Storage.getTask(item.dataset.id);
                    if (task) this.openTaskModal(task.projectId, task);
                }
            });
        });
    },

    // プロジェクトリスト表示
    renderProjectList() {
        const { projectList } = this.elements;
        const projects = this.getFilteredProjects();

        if (projects.length === 0) {
            projectList.innerHTML = `
                <div class="list-empty">
                    <div class="empty-icon">📋</div>
                    <p>プロジェクトがありません</p>
                    <p class="empty-hint">「プロジェクト追加」ボタンから始めましょう</p>
                </div>
            `;
            return;
        }

        let html = '';
        projects.forEach(project => {
            const tasks = Storage.getTasks(project.id);
            const filteredTasks = this.filterTasks(tasks);
            const completedTasks = tasks.filter(t => t.status === 'done').length;
            const progress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

            html += `
                <div class="project-card" data-id="${project.id}">
                    <div class="project-card-header">
                        <h3 class="project-card-title">${this.escapeHtml(project.name)}</h3>
                        <div class="project-card-actions">
                            <button class="btn-icon project-edit" title="編集">✏️</button>
                            <button class="btn-icon project-delete" title="削除">🗑️</button>
                        </div>
                    </div>
                    <div class="project-card-meta">
                        <span>📅 ${project.startDate} 〜 ${project.endDate}</span>
                    </div>
                    <div class="project-card-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">${progress}%</span>
                    </div>
                    <div class="project-card-tasks">
                        ${filteredTasks.map(task => this.renderTaskItem(task)).join('')}
                        <button class="btn-add-task" data-project-id="${project.id}">
                            <span>+</span> タスクを追加
                        </button>
                    </div>
                </div>
            `;
        });

        projectList.innerHTML = html;
        this.bindProjectListEvents();
    },

    renderTaskItem(task) {
        const statusLabels = { 'todo': '未着手', 'in-progress': '進行中', 'done': '完了', 'on-hold': '保留' };
        const priorityLabels = { 'high': '高', 'medium': '中', 'low': '低' };
        const isDone = task.status === 'done';

        return `
            <div class="task-item" data-id="${task.id}" data-project-id="${task.projectId}">
                <input type="checkbox" class="task-checkbox" ${isDone ? 'checked' : ''} data-task-id="${task.id}">
                <span class="gantt-task-status ${task.status}"></span>
                <span class="task-item-name ${isDone ? 'completed' : ''}">${this.escapeHtml(task.name)}</span>
                <span class="gantt-task-priority ${task.priority}">${priorityLabels[task.priority]}</span>
            </div>
        `;
    },

    bindProjectListEvents() {
        // プロジェクト編集
        document.querySelectorAll('.project-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.closest('.project-card').dataset.id;
                const project = Storage.getProject(projectId);
                if (project) this.openProjectModal(project);
            });
        });

        // プロジェクト削除
        document.querySelectorAll('.project-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.closest('.project-card').dataset.id;
                if (confirm('このプロジェクトと関連タスクを削除しますか？')) {
                    Storage.deleteProject(projectId);
                    this.showToast('プロジェクトを削除しました', 'success');
                    this.updateProjectCount();
                    this.renderCategories();
                    Gantt.render();
                    this.renderProjectList();
                }
            });
        });

        // タスク追加
        document.querySelectorAll('.btn-add-task').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openTaskModal(btn.dataset.projectId);
            });
        });

        // タスク編集
        document.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // チェックボックスクリック時はスキップ
                if (e.target.classList.contains('task-checkbox')) return;

                const task = Storage.getTask(item.dataset.id);
                if (task) this.openTaskModal(task.projectId, task);
            });
        });

        // タスク完了チェックボックス（リストビュー）
        document.querySelectorAll('.task-item .task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const taskId = checkbox.dataset.taskId;
                const task = Storage.getTask(taskId);
                if (task) {
                    task.status = checkbox.checked ? 'done' : 'todo';
                    task.progress = checkbox.checked ? 100 : 0;
                    Storage.saveTask(task);
                    this.showToast(checkbox.checked ? 'タスクを完了しました' : 'タスクを未完了に戻しました', 'success');
                    Gantt.render();
                    this.renderProjectList();
                }
            });
        });
    },

    // Quick Add Calendar Selector を更新
    populateQuickAddCalendar() {
        const select = document.getElementById('quickAddCalendar');
        if (!select) return;

        // Google Calendarが接続されている場合のみ
        if (typeof GoogleCalendar !== 'undefined' && GoogleCalendar.connected && GoogleCalendar.calendars) {
            let options = '<option value="">同期しない</option>';
            GoogleCalendar.calendars.forEach(cal => {
                options += `<option value="${cal.id}">${this.escapeHtml(cal.summary)}</option>`;
            });
            select.innerHTML = options;
            select.disabled = false;
        } else {
            select.innerHTML = '<option value="">Googleカレンダー未接続</option>';
            select.disabled = true;
        }
    },

    // フィルタ適用
    getFilteredProjects() {
        let projects = Storage.getProjects();

        if (App.currentCategory) {
            projects = projects.filter(p => p.category === App.currentCategory);
        }

        return projects;
    },

    filterTasks(tasks) {
        const { status, priority } = App.filters;

        return tasks.filter(task => {
            if (status !== 'all' && task.status !== status) return false;
            if (priority !== 'all' && task.priority !== priority) return false;
            return true;
        });
    },

    // トースト通知
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;

        this.elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // ユーティリティ
    formatDate(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 今日までの締切タスクを表示
    renderDueTasks() {
        const container = document.getElementById('dueTasks');
        if (!container) return;

        const today = new Date().toISOString().split('T')[0];
        let dueTasks = [];

        // ToDoから取得
        if (typeof ToDo !== 'undefined') {
            const todos = ToDo.getAll?.() || JSON.parse(localStorage.getItem('pm_todos') || '[]');
            dueTasks = dueTasks.concat(
                todos.filter(t => !t.completed && t.dueDate && t.dueDate <= today)
                    .map(t => ({ ...t, type: 'todo', displayName: t.title }))
            );
        }

        // プロジェクトのサブタスクから取得
        if (typeof Storage !== 'undefined') {
            const projects = Storage.getProjects?.() || [];
            projects.forEach(project => {
                const tasks = Storage.getTasks?.(project.id) || [];
                tasks.forEach(task => {
                    if (task.endDate && task.endDate <= today && task.progress < 100) {
                        dueTasks.push({ ...task, type: 'subtask', projectName: project.name, displayName: task.name });
                    }
                });
            });
        }

        if (dueTasks.length === 0) {
            container.innerHTML = '<div class="due-task-empty">締切タスクはありません 🎉</div>';
            return;
        }

        let html = '';
        dueTasks.slice(0, 10).forEach(task => {
            const isOverdue = (task.dueDate && task.dueDate < today) || (task.endDate && task.endDate < today);
            html += `
                <div class="due-task-item ${isOverdue ? 'overdue' : ''}" data-type="${task.type}" data-id="${task.id}">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="task-name">${this.escapeHtml(task.displayName || task.title || task.name || '(無題)')}</span>
                </div>
            `;
        });

        container.innerHTML = html;

        // チェックボックスのイベント
        container.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const item = e.target.closest('.due-task-item');
                const id = item.dataset.id;
                const type = item.dataset.type;

                if (type === 'todo' && typeof ToDo !== 'undefined') {
                    ToDo.toggle(id);
                } else if (type === 'subtask' && typeof Storage !== 'undefined') {
                    const task = Storage.getTask(id);
                    if (task) {
                        task.progress = checkbox.checked ? 100 : 0;
                        Storage.saveTask(task);
                    }
                }
                this.renderDueTasks();
            });
        });
    }
};
