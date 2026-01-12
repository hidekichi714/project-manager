/**
 * Export Module - データのエクスポート/インポート
 */

const ExportModule = {
    // JSONエクスポート
    exportToJson() {
        const data = Storage.exportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `project-manager-backup-${this.getDateString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        UI.showToast('データをエクスポートしました', 'success');
    },

    // JSONインポート
    importFromJson(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    Storage.importData(data);
                    UI.showToast('データをインポートしました', 'success');
                    resolve(data);
                } catch (error) {
                    UI.showToast('インポートに失敗しました: ' + error.message, 'error');
                    reject(error);
                }
            };

            reader.onerror = () => {
                UI.showToast('ファイルの読み込みに失敗しました', 'error');
                reject(new Error('File read error'));
            };

            reader.readAsText(file);
        });
    },

    // 日付文字列生成
    getDateString() {
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    }
};
