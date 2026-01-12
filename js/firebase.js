/**
 * Firebase Module - Google認証とFirestore同期
 * Firebase v9+ modular SDK を使用
 */

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyB24akb9tN6gnAHoRw84KrOq_F42n81n_g",
    authDomain: "project-manager-a387a.firebaseapp.com",
    projectId: "project-manager-a387a",
    storageBucket: "project-manager-a387a.firebasestorage.app",
    messagingSenderId: "552802773314",
    appId: "1:552802773314:web:2ce724740dbc3d499200db"
};

// Firebase SDKのインポート（CDN経由）
let firebaseApp = null;
let auth = null;
let db = null;

const FirebaseModule = {
    // 初期化フラグ
    initialized: false,
    user: null,
    unsubscribe: null,

    // 初期化
    async init() {
        // Firebase設定が未設定の場合はスキップ
        if (!firebaseConfig.apiKey) {
            console.log('Firebase: 設定されていません（ローカルモードで動作）');
            this.updateSyncStatus('local');
            return;
        }

        try {
            // Firebase SDKを動的にロード
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const { getFirestore, doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            // Firebase初期化
            firebaseApp = initializeApp(firebaseConfig);
            auth = getAuth(firebaseApp);
            db = getFirestore(firebaseApp);

            // 認証状態の監視
            this.unsubscribe = onAuthStateChanged(auth, (user) => {
                this.user = user;
                this.updateUI();
                if (user) {
                    console.log('Firebase: ログイン済み -', user.email);
                    this.syncFromCloud();
                }
            });

            this.initialized = true;
            console.log('Firebase: 初期化完了');

            // SDKメソッドを保存
            this._signInWithPopup = signInWithPopup;
            this._GoogleAuthProvider = GoogleAuthProvider;
            this._signOut = signOut;
            this._doc = doc;
            this._setDoc = setDoc;
            this._getDoc = getDoc;

        } catch (error) {
            console.error('Firebase初期化エラー:', error);
            this.updateSyncStatus('local');
        }
    },

    // Google認証
    async signInWithGoogle() {
        if (!this.initialized) {
            UI.showToast('Firebase設定を確認してください', 'warning');
            this.showSetupInstructions();
            return null;
        }

        try {
            this.updateSyncStatus('syncing');
            const provider = new this._GoogleAuthProvider();
            const result = await this._signInWithPopup(auth, provider);
            this.user = result.user;
            this.updateUI();
            UI.showToast('ログインしました', 'success');
            return result.user;
        } catch (error) {
            console.error('Google認証エラー:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                UI.showToast('ログインがキャンセルされました', 'info');
            } else {
                UI.showToast('ログインに失敗しました: ' + error.message, 'error');
            }
            this.updateSyncStatus('local');
            return null;
        }
    },

    // ログアウト
    async signOut() {
        if (!this.initialized) return;

        try {
            await this._signOut(auth);
            this.user = null;
            this.updateUI();
            UI.showToast('ログアウトしました', 'success');
        } catch (error) {
            console.error('ログアウトエラー:', error);
            UI.showToast('ログアウトに失敗しました', 'error');
        }
    },

    // データ同期（クラウドへ保存）
    async syncToCloud() {
        if (!this.initialized || !this.user) {
            UI.showToast('ログインが必要です', 'warning');
            return;
        }

        try {
            this.updateSyncStatus('syncing');
            const data = Storage.exportData();

            const userDocRef = this._doc(db, 'users', this.user.uid);
            await this._setDoc(userDocRef, {
                data: JSON.stringify(data),
                updatedAt: new Date().toISOString(),
                email: this.user.email
            });

            this.updateSyncStatus('synced');
            UI.showToast('クラウドに同期しました', 'success');
        } catch (error) {
            console.error('同期エラー:', error);
            UI.showToast('同期に失敗しました: ' + error.message, 'error');
            this.updateSyncStatus('error');
        }
    },

    // データ同期（クラウドから読み込み）
    async syncFromCloud() {
        if (!this.initialized || !this.user) return;

        try {
            this.updateSyncStatus('syncing');

            const userDocRef = this._doc(db, 'users', this.user.uid);
            const docSnap = await this._getDoc(userDocRef);

            if (docSnap.exists()) {
                const cloudData = JSON.parse(docSnap.data().data);
                const localData = Storage.exportData();

                // クラウドデータが新しい場合のみインポート
                if (new Date(cloudData.exportedAt) > new Date(localData.exportedAt || 0)) {
                    Storage.importData(cloudData);
                    UI.renderCategories();
                    UI.updateProjectCount();
                    Gantt.render();
                    UI.renderProjectList();
                    console.log('Firebase: クラウドからデータを読み込みました');
                }
            }

            this.updateSyncStatus('synced');
        } catch (error) {
            console.error('読み込みエラー:', error);
            this.updateSyncStatus('error');
        }
    },

    // セットアップ手順を表示
    showSetupInstructions() {
        const message = `
Firebase のセットアップが必要です：

1. Firebase Console (https://console.firebase.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. Authentication で「Google」プロバイダを有効化
4. Firestore Database を作成
5. プロジェクト設定から Web アプリを追加
6. 設定値を js/firebase.js の firebaseConfig に貼り付け

詳細は実装計画書を参照してください。
        `;
        alert(message);
    },

    // UI更新
    updateUI() {
        const notLoggedIn = document.getElementById('userNotLoggedIn');
        const loggedIn = document.getElementById('userLoggedIn');
        const avatar = document.getElementById('userAvatar');
        const name = document.getElementById('userName');
        const email = document.getElementById('userEmail');

        if (this.user) {
            notLoggedIn?.classList.add('hidden');
            loggedIn?.classList.remove('hidden');

            if (avatar) avatar.src = this.user.photoURL || '';
            if (name) name.textContent = this.user.displayName || '';
            if (email) email.textContent = this.user.email || '';

            this.updateSyncStatus('synced');
        } else {
            notLoggedIn?.classList.remove('hidden');
            loggedIn?.classList.add('hidden');
            this.updateSyncStatus('local');
        }
    },

    // 同期状態表示更新
    updateSyncStatus(status) {
        const syncStatus = document.getElementById('syncStatus');
        const syncIcon = syncStatus?.querySelector('.sync-icon');
        const syncText = syncStatus?.querySelector('.sync-text');

        syncStatus?.classList.remove('synced', 'syncing', 'error');

        switch (status) {
            case 'synced':
                syncStatus?.classList.add('synced');
                if (syncIcon) syncIcon.textContent = '●';
                if (syncText) syncText.textContent = '同期済み';
                break;
            case 'syncing':
                syncStatus?.classList.add('syncing');
                if (syncIcon) syncIcon.textContent = '●';
                if (syncText) syncText.textContent = '同期中...';
                break;
            case 'error':
                syncStatus?.classList.add('error');
                if (syncIcon) syncIcon.textContent = '●';
                if (syncText) syncText.textContent = 'エラー';
                break;
            default:
                if (syncIcon) syncIcon.textContent = '●';
                if (syncText) syncText.textContent = 'ローカル';
        }
    },

    // クリーンアップ
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
};

// DOMContentLoaded時にイベントリスナー設定
document.addEventListener('DOMContentLoaded', () => {
    // Google ログインボタン
    document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
        await FirebaseModule.signInWithGoogle();
    });

    // 同期ボタン
    document.getElementById('syncNowBtn')?.addEventListener('click', async () => {
        await FirebaseModule.syncToCloud();
    });

    // ログアウトボタン
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await FirebaseModule.signOut();
    });

    // Firebase初期化
    FirebaseModule.init();
});

// ページ離脱時にクリーンアップ
window.addEventListener('beforeunload', () => {
    FirebaseModule.destroy();
});
