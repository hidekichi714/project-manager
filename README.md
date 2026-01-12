# 📊 プロジェクト管理ツール

日常業務のプロジェクト管理を効率化するためのWebアプリケーション（PWA）。

## ✨ 特徴

- **ガントチャート** - プロジェクトとタスクの期間を視覚的に管理
- **プロジェクト管理** - カテゴリ分け、優先度、ステータス管理
- **サブタスク** - 各プロジェクトに紐づくタスクの登録・編集
- **オフライン対応** - PWAとしてインストール可能
- **Google同期** - 複数デバイス間でデータを同期（要Firebase設定）
- **エクスポート/インポート** - JSONファイルでバックアップ

## 🚀 使い方

### ローカルで実行

```bash
# 任意のローカルサーバーで開く
npx serve .

# または Python
python -m http.server 3000
```

ブラウザで `http://localhost:3000` にアクセス

### PWAとしてインストール

1. ブラウザでアプリにアクセス
2. アドレスバーの「インストール」ボタン、またはメニューから「ホーム画面に追加」を選択

## ⚙️ Google同期の設定

Googleアカウントでのデータ同期を有効にするには、Firebaseの設定が必要です。

詳細は [FIREBASE_SETUP.md](FIREBASE_SETUP.md) を参照してください。

## 📁 ファイル構成

```
project-manager/
├── index.html          # メインHTML
├── manifest.json       # PWAマニフェスト
├── sw.js              # Service Worker
├── css/
│   ├── styles.css     # メインスタイル
│   ├── gantt.css      # ガントチャート用
│   └── mobile.css     # モバイル対応
├── js/
│   ├── app.js         # メインアプリ
│   ├── storage.js     # ローカルストレージ
│   ├── firebase.js    # Firebase連携
│   ├── gantt.js       # ガントチャート
│   ├── ui.js          # UI操作
│   └── export.js      # エクスポート/インポート
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 📝 ライセンス

MIT License
