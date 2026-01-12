# Firebaseセットアップガイド

このプロジェクト管理ツールでGoogleアカウント連携を使用するには、Firebase プロジェクトのセットアップが必要です。

## 1. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例：`project-manager`）
4. Google Analytics は任意（無効でOK）
5. 「プロジェクトを作成」をクリック

## 2. Authentication の設定

1. 左メニューから「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブを選択
4. 「Google」をクリックして有効化
5. プロジェクトのサポートメール（自分のアドレス）を設定
6. 「保存」をクリック

## 3. Firestore Database の作成

1. 左メニューから「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. 「テストモードで開始」を選択（30日間のテスト用）
4. ロケーションを選択（例：`asia-northeast1` - 東京）
5. 「有効にする」をクリック

## 4. Webアプリの登録

1. プロジェクト概要ページで「ウェブ」(`</>`)アイコンをクリック
2. アプリのニックネームを入力（例：`project-manager-web`）
3. 「Firebase Hosting もこのアプリのセットアップ」はチェック不要
4. 「アプリを登録」をクリック
5. 表示される **設定オブジェクト** をコピー

## 5. 設定の適用

`js/firebase.js` ファイルを開き、`firebaseConfig` を以下のように書き換えてください：

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",           // ← コピーした値
    authDomain: "xxx.firebaseapp.com",
    projectId: "xxx",
    storageBucket: "xxx.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:xxx"
};
```

## 6. 動作確認

1. ブラウザでアプリをリロード
2. 右上のユーザーアイコンをクリック
3. 「Googleでログイン」をクリック
4. Googleアカウントでログイン
5. 「同期済み」と表示されれば成功！

## トラブルシューティング

### ポップアップがブロックされる
- ブラウザのポップアップブロッカーを無効にしてください

### 認証エラーが発生する
- Firebase Console で「Authentication」→「Settings」→「承認済みドメイン」に `localhost` が含まれているか確認

### Firestoreの書き込みエラー
- Firestore のルールがテストモードになっているか確認
- 本番運用時は適切なセキュリティルールを設定してください

---

## ⚠️ 重要な注意事項

**GitHub Pagesへのデプロイ時：**
- Firebase Console の「承認済みドメイン」にGitHub Pagesのドメイン（`your-username.github.io`）を追加してください
