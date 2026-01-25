/* [JST 2026-01-25 11:05]  summary/js/00_summary_env.js v20260125-01
   summary側だけで Firebase設定を保持（bidder側は変更しない）
*/
(function(){
  "use strict";

  // ★ここだけあなたの Firebase プロジェクト実値に差し替え★
  window.SummaryEnv = {
    FIREBASE_CONFIG: {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      appId: "YOUR_APP_ID"
      // 必要なら: storageBucket, messagingSenderId などを追加
    }
  };
})();

