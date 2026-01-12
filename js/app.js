/**
 * App Module - アプリケーションのメインエントリーポイント
 */

const App = {
    // 状態
    currentCategory: null,
    filters: {
        status: 'all',
        priority: 'all'
    },

    // 初期化
    init() {
        console.log('📊 プロジェクト管理ツール 起動中...');

        // モジュール初期化
        Storage.init();
        UI.init();
        Gantt.init();

        // 初回レンダリング
        Gantt.render();
        UI.renderProjectList();

        // Service Worker登録（PWA）
        this.registerServiceWorker();

        console.log('✅ 初期化完了');
    },

    // Service Worker登録
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered:', registration.scope);
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
};

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
