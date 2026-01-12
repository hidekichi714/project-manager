/**
 * ToDo Module - 独立したToDoリスト管理
 */

const ToDo = {
    // ストレージキー
    STORAGE_KEY: 'pm_todos',

    // 初期化
    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        // 新規ToDo追加
        document.getElementById('addTodoBtn')?.addEventListener('click', () => {
            this.openModal();
        });

        // フォーム送信
        document.getElementById('todoForm')?.addEventListener('submit', (e) => {
            this.handleSubmit(e);
        });

        // モーダル閉じる
        document.getElementById('todoModalClose')?.addEventListener('click', () => {
            this.closeModal();
        });
        document.getElementById('todoCancel')?.addEventListener('click', () => {
            this.closeModal();
        });

        // クイックフィルター
        document.querySelectorAll('.todo-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.todo-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.render(btn.dataset.filter);
            });
        });
    },

    // ToDoを取得
    getAll() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    // ToDoを保存
    save(todos) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(todos));
    },

    // ToDo追加/更新
    saveTodo(todo) {
        const todos = this.getAll();
        if (todo.id) {
            const index = todos.findIndex(t => t.id === todo.id);
            if (index >= 0) {
                todos[index] = { ...todos[index], ...todo };
            }
        } else {
            todo.id = 'todo_' + Date.now();
            todo.createdAt = new Date().toISOString();
            todos.push(todo);
        }
        this.save(todos);
        return todo;
    },

    // ToDo削除
    delete(id) {
        let todos = this.getAll();
        todos = todos.filter(t => t.id !== id);
        this.save(todos);
    },

    // 完了トグル
    toggleComplete(id) {
        const todos = this.getAll();
        const todo = todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            todo.completedAt = todo.completed ? new Date().toISOString() : null;
            this.save(todos);
        }
        return todo;
    },

    // レンダリング
    render(filter = 'all') {
        const container = document.getElementById('todoList');
        if (!container) return;

        let todos = this.getAll();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        // フィルター適用
        if (filter === 'today') {
            todos = todos.filter(t => {
                if (!t.dueDate) return false;
                const due = new Date(t.dueDate);
                due.setHours(0, 0, 0, 0);
                return due.getTime() === today.getTime();
            });
        } else if (filter === 'tomorrow') {
            todos = todos.filter(t => {
                if (!t.dueDate) return false;
                const due = new Date(t.dueDate);
                due.setHours(0, 0, 0, 0);
                return due.getTime() === tomorrow.getTime();
            });
        } else if (filter === 'week') {
            todos = todos.filter(t => {
                if (!t.dueDate) return false;
                const due = new Date(t.dueDate);
                due.setHours(0, 0, 0, 0);
                return due >= today && due <= weekEnd;
            });
        } else if (filter === 'active') {
            todos = todos.filter(t => !t.completed);
        } else if (filter === 'completed') {
            todos = todos.filter(t => t.completed);
        }

        // 並び替え（優先度高→期限近い→作成順）
        todos.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        if (todos.length === 0) {
            container.innerHTML = `
                <div class="todo-empty">
                    <div class="empty-icon">✅</div>
                    <p>ToDoがありません</p>
                </div>
            `;
            return;
        }

        container.innerHTML = todos.map(todo => this.renderItem(todo)).join('');
        this.bindItemEvents();
    },

    renderItem(todo) {
        const dueText = todo.dueDate ? this.formatDueDate(todo.dueDate) : '';
        const isOverdue = todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date();

        return `
            <div class="todo-item ${todo.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-id="${todo.id}">
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                <div class="todo-content">
                    <span class="todo-title">${UI.escapeHtml(todo.title)}</span>
                    <div class="todo-meta">
                        ${todo.priority ? `<span class="todo-priority ${todo.priority}">${this.getPriorityLabel(todo.priority)}</span>` : ''}
                        ${dueText ? `<span class="todo-due ${isOverdue ? 'overdue' : ''}">${dueText}</span>` : ''}
                    </div>
                </div>
                <button class="todo-delete" title="削除">×</button>
            </div>
        `;
    },

    bindItemEvents() {
        // チェックボックス
        document.querySelectorAll('.todo-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const id = cb.closest('.todo-item').dataset.id;
                this.toggleComplete(id);
                this.render(document.querySelector('.todo-filter-btn.active')?.dataset.filter || 'all');
            });
        });

        // 削除
        document.querySelectorAll('.todo-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.todo-item').dataset.id;
                if (confirm('このToDoを削除しますか？')) {
                    this.delete(id);
                    this.render(document.querySelector('.todo-filter-btn.active')?.dataset.filter || 'all');
                    UI.showToast('ToDoを削除しました', 'success');
                }
            });
        });

        // アイテムクリックで編集
        document.querySelectorAll('.todo-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('todo-checkbox') || e.target.classList.contains('todo-delete')) return;
                const todo = this.getAll().find(t => t.id === item.dataset.id);
                if (todo) this.openModal(todo);
            });
        });
    },

    // モーダル
    openModal(todo = null) {
        const modal = document.getElementById('todoModal');
        const form = document.getElementById('todoForm');
        const titleInput = document.getElementById('todoTitle');
        const prioritySelect = document.getElementById('todoPriority');
        const dueDateInput = document.getElementById('todoDueDate');
        const idInput = document.getElementById('todoId');
        const deleteBtn = document.getElementById('todoDelete');

        form.reset();

        if (todo) {
            document.getElementById('todoModalTitle').textContent = 'ToDo編集';
            idInput.value = todo.id;
            titleInput.value = todo.title;
            prioritySelect.value = todo.priority || 'medium';
            dueDateInput.value = todo.dueDate || '';
            deleteBtn.style.display = 'block';
        } else {
            document.getElementById('todoModalTitle').textContent = 'ToDo追加';
            idInput.value = '';
            prioritySelect.value = 'medium';
            deleteBtn.style.display = 'none';
        }

        modal.classList.add('active');
        titleInput.focus();
    },

    closeModal() {
        document.getElementById('todoModal')?.classList.remove('active');
    },

    async handleSubmit(e) {
        e.preventDefault();

        const syncGoogle = document.getElementById('todoSyncGoogle')?.checked;
        const dueDate = document.getElementById('todoDueDate').value || null;

        const todo = {
            id: document.getElementById('todoId').value || null,
            title: document.getElementById('todoTitle').value,
            priority: document.getElementById('todoPriority').value,
            dueDate: dueDate,
        };

        const savedTodo = this.saveTodo(todo);

        // Google Calendarに同期
        if (syncGoogle && dueDate && typeof GoogleCalendar !== 'undefined' && GoogleCalendar.connected) {
            try {
                await GoogleCalendar.createEvent({
                    title: savedTodo.title,
                    allDay: true,
                    startDate: dueDate,
                    endDate: dueDate,
                    description: `ToDo: ${savedTodo.title}\n優先度: ${this.getPriorityLabel(savedTodo.priority)}`
                });
                UI.showToast('ToDoをGoogle Calendarに同期しました', 'success');
            } catch (error) {
                console.error('Google Calendar sync error:', error);
                UI.showToast('Google Calendar同期に失敗しました', 'warning');
            }
        }

        this.closeModal();
        this.render(document.querySelector('.todo-filter-btn.active')?.dataset.filter || 'all');
        if (!syncGoogle) {
            UI.showToast(todo.id ? 'ToDoを更新しました' : 'ToDoを追加しました', 'success');
        }
    },

    // ユーティリティ
    formatDueDate(dateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dateStr);
        due.setHours(0, 0, 0, 0);

        const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24));

        if (diff === 0) return '今日';
        if (diff === 1) return '明日';
        if (diff === -1) return '昨日';
        if (diff < 0) return `${Math.abs(diff)}日前`;
        if (diff <= 7) return `${diff}日後`;

        return `${due.getMonth() + 1}/${due.getDate()}`;
    },

    getPriorityLabel(priority) {
        const labels = { high: '高', medium: '中', low: '低' };
        return labels[priority] || '';
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    ToDo.init();
});
