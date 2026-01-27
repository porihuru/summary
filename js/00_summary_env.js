 
/* [JST 2026-01-25 11:40]  00_summary_env.js v20260125-01
   [ENV] summary側 Firebase設定（この1ファイルに集約）
   目的:
     - summary側は bidder側と別フォルダ運用のため、Firebase設定もsummary側に持つ
     - JSバージョン一覧（window.__APP_VER__）に確実に出す
   重要:
     - YOUR_... のままだと起動で止める（安全）
     - bidder側の設定を「コピー」して使ってよい（bidder側は触らない）
*/

(function(){
  "use strict";

  // ============================================================================
  // [ENV-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "00_summary_env.js";
  var VER  = "v20260125-01";
  var TS   = (function(){ try{ return new Date().toISOString(); }catch(e){ return ""; } })();

  if(!window.__APP_VER__){ window.__APP_VER__ = []; }
  window.__APP_VER__.push({ ts: TS, file: FILE, ver: VER });

  // ============================================================================
  // [ENV-01] Firebase設定（summary専用）
  //  - bidder側の FIREBASE_CONFIG をそのままコピーして貼り付けてOK
  //  - 「環境を分ける」必要があるなら、ここだけ差し替えればよい
  // ============================================================================
  var FIREBASE_CONFIG = {
    // ★ここを実値に差し替え★
    // apiKey: "AIza....",
    // authDomain: "xxxxx.firebaseapp.com",
    // projectId: "xxxxx",
    // storageBucket: "xxxxx.appspot.com",
    // messagingSenderId: "1234567890",
    // appId: "1:1234567890:web:abcdef..."
  apiKey: "AIzaSyAAinuBPDNjxQ63TEgDnRjP2pfWIXRBrQ0",
  authDomain: "bidding-920b8.firebaseapp.com",
  projectId: "bidding-920b8",
  storageBucket: "bidding-920b8.firebasestorage.app",
  messagingSenderId: "554171859200",
  appId: "1:554171859200:web:1b1412a6a8c57fc9a4f3e5",
  measurementId: "G-HC01P1974L"
  };

  // ============================================================================
  // [ENV-02] コレクション名（将来変わっても1箇所で対応）
  // ============================================================================
  var COLLECTIONS = {
    bids: "bids",
    users: "users"
    // offers/items は bids/{bidNo}/offers , bids/{bidNo}/items のサブコレで固定想定
  };

  // ============================================================================
  // [ENV-03] role定義（summary閲覧を許可するrole）
  //  - 05_summary_role.js が参照する
  // ============================================================================
  var ALLOWED_ROLES = {
    admin: true,
    ope: true
    operator: true   // ★追加：既存運用（operator）を許可
  };

  // ============================================================================
  // [ENV-04] 画面動作オプション
  // ============================================================================
  var OPTIONS = {
    // statusが open でも集計表示するか（true=表示、false=禁止）
    // 迷う場合は true 推奨（ただし画面に警告表示する）
    allowOpenStatus: true,

    // CSVはUTF-8 BOM付きで出力（Excel対策）
    csvWithBom: true
  };

  // ============================================================================
  // [ENV-05] 公開（他JSは window.SummaryEnv を参照）
  // ============================================================================
  window.SummaryEnv = {
    FILE: FILE,
    VER: VER,
    TS: TS,

    FIREBASE_CONFIG: FIREBASE_CONFIG,
    COLLECTIONS: COLLECTIONS,
    ALLOWED_ROLES: ALLOWED_ROLES,
    OPTIONS: OPTIONS
  };

})();
