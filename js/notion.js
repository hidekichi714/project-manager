/**
 * Notion Integration Module
 * 
 * 注意: Notion APIは内部統合トークンまたはOAuthが必要です。
 * https://developers.notion.com/ でインテグレーションを作成してください。
 */

const NotionIntegration = {
    // 設定（ユーザーが設定）
    API_TOKEN: '', // Notion Internal Integration Token
    DATABASE_ID: '', // 連携するデータベースID

    // 状態
    connected: false,

    // 初期化
    init() {
        this.API_TOKEN = localStorage.getItem('notion_token') || '';
        this.DATABASE_ID = localStorage.getItem('notion_database') || '';
        this.connected = !!(this.API_TOKEN && this.DATABASE_ID);
        this.updateUI();
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('connectNotion')?.addEventListener('click', () => {
            this.openSettings();
        });
        document.getElementById('disconnectNotion')?.addEventListener('click', () => {
            this.disconnect();
        });
        document.getElementById('syncNotion')?.addEventListener('click', () => {
            this.sync();
        });
    },

    // 設定モーダルを開く
    openSettings() {
        const token = prompt('Notion Internal Integration Token を入力してください:');
        if (!token) return;

        const databaseId = prompt('連携するNotionデータベースIDを入力してください:');
        if (!databaseId) return;

        this.setCredentials(token, databaseId);
    },

    // 認証情報を設定
    setCredentials(token, databaseId) {
        this.API_TOKEN = token;
        this.DATABASE_ID = databaseId;
        localStorage.setItem('notion_token', token);
        localStorage.setItem('notion_database', databaseId);
        this.connected = true;
        this.updateUI();
        UI.showToast('Notionに接続しました', 'success');
    },

    // 切断
    disconnect() {
        this.API_TOKEN = '';
        this.DATABASE_ID = '';
        localStorage.removeItem('notion_token');
        localStorage.removeItem('notion_database');
        this.connected = false;
        this.updateUI();
        UI.showToast('Notion連携を解除しました', 'success');
    },

    // データベースからアイテム取得
    async fetchItems() {
        if (!this.connected) return [];

        try {
            // 注意: Notion APIはCORSでブロックされるため、
            // プロキシサーバー経由でアクセスする必要があります
            const response = await fetch(`https://api.notion.com/v1/databases/${this.DATABASE_ID}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.API_TOKEN}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    page_size: 100
                })
            });

            if (!response.ok) {
                throw new Error(`Notion API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Notion items:', data.results);
            return data.results;
        } catch (error) {
            console.error('Notion fetch error:', error);

            // CORSエラーの場合の代替メッセージ
            if (error.message.includes('CORS') || error.message.includes('fetch')) {
                UI.showToast('Notion APIはサーバー経由のアクセスが必要です', 'warning');
            } else {
                UI.showToast('Notionからの取得に失敗しました', 'error');
            }
            return [];
        }
    },

    // 同期
    async sync() {
        if (!this.connected) {
            UI.showToast('Notionに接続してください', 'warning');
            return;
        }

        UI.showToast('Notionと同期中...', 'info');

        const items = await this.fetchItems();

        if (items.length === 0) {
            UI.showToast('アイテムが取得できませんでした', 'warning');
            return;
        }

        // Notionアイテムをローカルに変換
        items.forEach(item => {
            const properties = item.properties;

            // タイトルプロパティを探す
            const titleProp = Object.values(properties).find(p => p.type === 'title');
            const title = titleProp?.title?.[0]?.plain_text || '(タイトルなし)';

            // ステータスプロパティを探す
            const statusProp = Object.values(properties).find(p => p.type === 'status' || p.type === 'checkbox');
            const completed = statusProp?.checkbox || statusProp?.status?.name === 'Done';

            // 日付プロパティを探す
            const dateProp = Object.values(properties).find(p => p.type === 'date');
            const dueDate = dateProp?.date?.start || null;

            const localTodo = {
                id: `notion_${item.id}`,
                title: title,
                priority: 'medium',
                dueDate: dueDate,
                completed: completed,
                notionId: item.id,
            };

            // ローカルToDoに追加（重複チェック）
            const todos = ToDo.getAll();
            const existing = todos.find(t => t.notionId === item.id);
            if (!existing) {
                ToDo.saveTodo(localTodo);
            }
        });

        ToDo.render();
        UI.showToast(`${items.length}件のアイテムを同期しました`, 'success');
    },

    // UI更新
    updateUI() {
        const connectBtn = document.getElementById('connectNotion');
        const disconnectBtn = document.getElementById('disconnectNotion');
        const syncBtn = document.getElementById('syncNotion');
        const status = document.getElementById('notionStatus');

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
Notion連携のセットアップ:

1. https://www.notion.so/my-integrations にアクセス
2. 「新しいインテグレーション」を作成
3. 名前を入力し、関連するワークスペースを選択
4. 「Internal Integration Token」をコピー
5. 連携したいNotionデータベースを開く
6. 「...」→「接続先」→作成したインテグレーションを追加
7. データベースURLからデータベースIDを取得
   例: https://notion.so/DATABASE_ID?v=xxx

注意: Notion APIはCORSでブラウザから直接アクセスできないため、
本番環境ではプロキシサーバーが必要です。
        `;
        alert(message);
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    NotionIntegration.init();
});
