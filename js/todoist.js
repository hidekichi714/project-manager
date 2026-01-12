/**
 * Todoist Integration Module
 * 
 * 注意: Todoist API v2はOAuth2認証が必要です。
 * 本番環境では https://developer.todoist.com/ でアプリを登録してください。
 */

const TodoistIntegration = {
    // 設定（実際のキーはユーザーが設定）
    CLIENT_ID: '', // Todoist Developer Console から取得
    CLIENT_SECRET: '', // サーバーサイドで使用
    REDIRECT_URI: window.location.origin + '/todoist-callback.html',

    // 状態
    accessToken: null,
    connected: false,

    // 初期化
    init() {
        // ローカルストレージからトークンを復元
        this.accessToken = localStorage.getItem('todoist_token');
        this.connected = !!this.accessToken;
        this.updateUI();
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('connectTodoist')?.addEventListener('click', () => {
            this.connect();
        });
        document.getElementById('disconnectTodoist')?.addEventListener('click', () => {
            this.disconnect();
        });
        document.getElementById('syncTodoist')?.addEventListener('click', () => {
            this.sync();
        });
    },

    // OAuth認証開始
    connect() {
        if (!this.CLIENT_ID) {
            this.showSetupInstructions();
            return;
        }

        const state = Math.random().toString(36).substring(2);
        localStorage.setItem('todoist_state', state);

        const authUrl = `https://todoist.com/oauth/authorize?` +
            `client_id=${this.CLIENT_ID}` +
            `&scope=data:read_write,data:delete` +
            `&state=${state}` +
            `&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}`;

        window.open(authUrl, 'todoist-auth', 'width=600,height=700');
    },

    // OAuthコールバック処理（todoist-callback.htmlから呼ばれる）
    handleCallback(code, state) {
        const savedState = localStorage.getItem('todoist_state');
        if (state !== savedState) {
            UI.showToast('認証エラー: 状態が一致しません', 'error');
            return;
        }

        // 注意: 本番環境ではサーバーサイドでトークン交換を行う必要があります
        // クライアントサイドでは CLIENT_SECRET を露出させないでください
        UI.showToast('Todoist連携にはサーバーサイド設定が必要です', 'warning');
    },

    // 手動でトークンを設定（開発用）
    setToken(token) {
        this.accessToken = token;
        localStorage.setItem('todoist_token', token);
        this.connected = true;
        this.updateUI();
        UI.showToast('Todoistに接続しました', 'success');
    },

    // 切断
    disconnect() {
        this.accessToken = null;
        localStorage.removeItem('todoist_token');
        this.connected = false;
        this.updateUI();
        UI.showToast('Todoist連携を解除しました', 'success');
    },

    // タスク取得
    async fetchTasks() {
        if (!this.accessToken) return [];

        try {
            const response = await fetch('https://api.todoist.com/rest/v2/tasks', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch tasks');

            const tasks = await response.json();
            console.log('Todoist tasks:', tasks);
            return tasks;
        } catch (error) {
            console.error('Todoist fetch error:', error);
            UI.showToast('Todoistからの取得に失敗しました', 'error');
            return [];
        }
    },

    // タスク同期
    async sync() {
        if (!this.connected) {
            UI.showToast('Todoistに接続してください', 'warning');
            return;
        }

        UI.showToast('Todoistと同期中...', 'info');

        const todoistTasks = await this.fetchTasks();

        // Todoistタスクをローカルに変換
        todoistTasks.forEach(task => {
            const localTodo = {
                id: `todoist_${task.id}`,
                title: task.content,
                priority: this.convertPriority(task.priority),
                dueDate: task.due?.date || null,
                completed: task.is_completed,
                todoistId: task.id,
            };

            // ローカルToDoに追加（重複チェック）
            const todos = ToDo.getAll();
            const existing = todos.find(t => t.todoistId === task.id);
            if (!existing) {
                ToDo.saveTodo(localTodo);
            }
        });

        ToDo.render();
        UI.showToast(`${todoistTasks.length}件のタスクを同期しました`, 'success');
    },

    // 優先度変換（Todoist: 1-4, 低→高）
    convertPriority(todoistPriority) {
        if (todoistPriority >= 4) return 'high';
        if (todoistPriority >= 3) return 'medium';
        return 'low';
    },

    // UI更新
    updateUI() {
        const connectBtn = document.getElementById('connectTodoist');
        const disconnectBtn = document.getElementById('disconnectTodoist');
        const syncBtn = document.getElementById('syncTodoist');
        const status = document.getElementById('todoistStatus');

        if (this.connected) {
            status?.classList.add('connected');
            status && (status.textContent = '接続中');
            connectBtn?.classList.add('hidden');
            disconnectBtn?.classList.remove('hidden');
            syncBtn?.classList.remove('hidden');
        } else {
            status?.classList.remove('connected');
            status && (status.textContent = '未接続');
            connectBtn?.classList.remove('hidden');
            disconnectBtn?.classList.add('hidden');
            syncBtn?.classList.add('hidden');
        }
    },

    // セットアップ手順
    showSetupInstructions() {
        const message = `
Todoist連携のセットアップ:

1. https://developer.todoist.com/ にアクセス
2. 「App Console」→「Create a new app」
3. アプリ名と説明を入力
4. OAuth redirect URL: ${this.REDIRECT_URI}
5. Client ID を js/todoist.js の CLIENT_ID に設定
6. サーバーサイドでトークン交換を実装

開発用: 
- Todoistの設定 → 連携 → 開発者 でAPIトークンを取得
- コンソールで TodoistIntegration.setToken('YOUR_TOKEN') を実行
        `;
        alert(message);
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    TodoistIntegration.init();
});
