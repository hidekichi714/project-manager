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
            menuToggle: document.getElementById('menuToggle'),
            searchBtn: document.getElementById('searchBtn'),
            userBtn: document.getElementById('userBtn'),
            syncStatus: document.getElementById('syncStatus'),

            // Sidebar
            sidebar: document.getElementById('sidebar'),
            categoryList: document.getElementById('categoryList'),
            addCategoryBtn: document.getElementById('addCategoryBtn'),
            filterStatus: document.getElementById('filterStatus'),
            filterPriority: document.getElementById('filterPriority'),
            exportBtn: document.getElementById('exportBtn'),
            importBtn: document.getElementById('importBtn'),
            importFile: document.getElementById('importFile'),

            // Main
            addProjectBtn: document.getElementById('addProjectBtn'),
            viewGantt: document.getElementById('viewGantt'),
            viewCalendar: document.getElementById('viewCalendar'),
            viewList: document.getElementById('viewList'),
            ganttView: document.getElementById('ganttView'),
            calendarView: document.getElementById('calendarView'),
            listView: document.getElementById('listView'),
            projectList: document.getElementById('projectList'),
            ganttContainer: document.getElementById('ganttContainer'),

            // Gantt controls
            ganttPrev: document.getElementById('ganttPrev'),
            ganttNext: document.getElementById('ganttNext'),
            ganttPeriod: document.getElementById('ganttPeriod'),
            ganttScale: document.getElementById('ganttScale'),

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
            googleLoginBtn: document.getElementById('googleLoginBtn'),
            userNotLoggedIn: document.getElementById('userNotLoggedIn'),
            userLoggedIn: document.getElementById('userLoggedIn'),
            userAvatar: document.getElementById('userAvatar'),
            userName: document.getElementById('userName'),
            userEmail: document.getElementById('userEmail'),
            syncNowBtn: document.getElementById('syncNowBtn'),
            logoutBtn: document.getElementById('logoutBtn'),

            // Toast
            toastContainer: document.getElementById('toastContainer')
        };
    },

    // イベントバインド
    bindEvents() {
        const { elements } = this;

        // Menu toggle (mobile)
        elements.menuToggle?.addEventListener('click', () => this.toggleSidebar());

        // View toggle
        elements.viewGantt?.addEventListener('click', () => this.switchView('gantt'));
        elements.viewCalendar?.addEventListener('click', () => this.switchView('calendar'));
        elements.viewList?.addEventListener('click', () => this.switchView('list'));

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

        // User modal
        elements.userBtn?.addEventListener('click', () => this.openModal(elements.userModal));
        elements.userModalClose?.addEventListener('click', () => this.closeModal(elements.userModal));

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

        // Filters
        elements.filterStatus?.addEventListener('change', () => this.applyFilters());
        elements.filterPriority?.addEventListener('change', () => this.applyFilters());

        // Gantt controls
        elements.ganttPrev?.addEventListener('click', () => Gantt.navigate(-1));
        elements.ganttNext?.addEventListener('click', () => Gantt.navigate(1));
        elements.ganttScale?.addEventListener('change', (e) => Gantt.setScale(e.target.value));

        // Modal backdrop click
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', () => {
                const modal = backdrop.closest('.modal');
                this.closeModal(modal);
            });
        });

        // Category click
        elements.categoryList?.addEventListener('click', (e) => {
            const item = e.target.closest('.category-item');
            if (item) {
                this.selectCategory(item.dataset.category);
            }
        });
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
    switchView(view) {
        const { viewGantt, viewCalendar, viewList, ganttView, calendarView, listView } = this.elements;
        const viewWeekly = document.getElementById('viewWeekly');
        const viewDaily = document.getElementById('viewDaily');
        const weeklyView = document.getElementById('weeklyView');
        const dailyView = document.getElementById('dailyView');

        // 全て非アクティブ・非表示に
        viewGantt?.classList.remove('active');
        viewCalendar?.classList.remove('active');
        viewList?.classList.remove('active');
        viewWeekly?.classList.remove('active');
        viewDaily?.classList.remove('active');
        ganttView?.classList.add('hidden');
        calendarView?.classList.add('hidden');
        listView?.classList.add('hidden');
        weeklyView?.classList.add('hidden');
        dailyView?.classList.add('hidden');

        // 選択されたビューをアクティブに
        if (view === 'gantt') {
            viewGantt?.classList.add('active');
            ganttView?.classList.remove('hidden');
            Gantt.render();
        } else if (view === 'calendar') {
            viewCalendar?.classList.add('active');
            calendarView?.classList.remove('hidden');
            Calendar.render();
        } else if (view === 'weekly') {
            viewWeekly?.classList.add('active');
            weeklyView?.classList.remove('hidden');
            if (typeof WeeklyView !== 'undefined') WeeklyView.renderWeekly();
        } else if (view === 'daily') {
            viewDaily?.classList.add('active');
            dailyView?.classList.remove('hidden');
            if (typeof WeeklyView !== 'undefined') WeeklyView.renderDaily();
        } else {
            viewList?.classList.add('active');
            listView?.classList.remove('hidden');
            this.renderProjectList();
        }
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
    }
};
