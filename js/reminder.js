/**
 * Reminder Module - ブラウザ通知でリマインダー機能
 */

const Reminder = {
    // 通知許可フラグ
    permitted: false,
    checkInterval: null,

    // 初期化
    async init() {
        // 通知APIサポートチェック
        if (!('Notification' in window)) {
            console.log('Reminder: このブラウザは通知をサポートしていません');
            return;
        }

        // 既に許可されているか確認
        if (Notification.permission === 'granted') {
            this.permitted = true;
        }

        // 定期チェック開始（1分ごと）
        this.startChecking();
    },

    // 通知許可をリクエスト
    async requestPermission() {
        if (!('Notification' in window)) {
            UI.showToast('このブラウザは通知をサポートしていません', 'warning');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.permitted = true;
                UI.showToast('通知が有効になりました', 'success');
                return true;
            } else {
                UI.showToast('通知の許可が必要です', 'warning');
                return false;
            }
        } catch (error) {
            console.error('通知許可エラー:', error);
            return false;
        }
    },

    // 定期チェック開始
    startChecking() {
        // 初回チェック
        this.checkReminders();

        // 1分ごとにチェック
        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, 60000);
    },

    // リマインダーチェック
    checkReminders() {
        if (!this.permitted) return;

        const tasks = Storage.getTasks();
        const now = new Date();

        tasks.forEach(task => {
            if (task.reminderDate && task.status !== 'done') {
                const reminderTime = new Date(task.reminderDate);
                const diff = reminderTime - now;

                // リマインダー時刻が現在から1分以内
                if (diff >= 0 && diff < 60000) {
                    this.showNotification(task);
                    // 一度通知したらリマインダーをクリア
                    task.reminderDate = null;
                    Storage.saveTask(task);
                }
            }
        });
    },

    // 通知表示
    showNotification(task) {
        const project = Storage.getProject(task.projectId);
        const projectName = project ? project.name : '';

        const notification = new Notification('タスクリマインダー', {
            body: `${task.name}\n${projectName}`,
            icon: '/icons/icon-192.png',
            tag: task.id,
            requireInteraction: true
        });

        notification.onclick = () => {
            window.focus();
            UI.openTaskModal(task.projectId, task);
            notification.close();
        };
    },

    // クリーンアップ
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    Reminder.init();
});
