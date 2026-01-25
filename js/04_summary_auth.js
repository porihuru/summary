/* [JST 2026-01-25 12:05]  04_summary_auth.js v20260125-01
   [AUTH] Firebase Auth（admin/opeログイン）
   目的:
     - summary側でログイン必須（ログイン無しで読込不可）
     - ログイン状態をUIに反映（lblLoginState）
     - onAuthStateChanged で state を更新し、後続（ROLE判定）へ通知

   前提:
     - Firebase compat SDK 読込済み（index.html）
     - SummaryEnv.FIREBASE_CONFIG が実値（YOUR_...はNG）
     - SummaryLog / SummaryDOM / SummaryMsg が先に読み込まれている（01〜03）

   公開API:
     - window.SummaryAuth.ensureFirebaseInit()
     - window.SummaryAuth.signIn(email, pass)
     - window.SummaryAuth.signOut()
     - window.SummaryAuth.watchAuthState(onChangedFn)  // user or null
     - window.SummaryAuth.getUser()                    // current user or null

   通知:
     - watchAuthState の callback に user を渡す
*/

(function(){
  "use strict";

  // ============================================================================
  // [AUTH-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "04_summary_auth.js";
  var VER  = "v20260125-01";
  var TS   = (function(){ try{ return new Date().toISOString(); }catch(e){ return ""; } })();

  if(!window.__APP_VER__){ window.__APP_VER__ = []; }
  window.__APP_VER__.push({ ts: TS, file: FILE, ver: VER });

  function L(tag, msg){
    try{
      if(window.SummaryLog && window.SummaryLog.write) return window.SummaryLog.write(tag, msg);
      console.log("[" + tag + "] " + msg);
    }catch(e){}
  }

  function toStr(x){
    try{ return (x && x.message) ? x.message : ("" + x); }catch(e){ return "" + x; }
  }

  function $(id){
    try{ return (window.SummaryDOM && window.SummaryDOM.$) ? window.SummaryDOM.$(id) : document.getElementById(id); }
    catch(e){ return document.getElementById(id); }
  }

  function setText(id, txt){
    try{
      if(window.SummaryDOM && window.SummaryDOM.setText) return window.SummaryDOM.setText(id, txt);
    }catch(e){}
    var el = $(id);
    if(el) el.textContent = (txt == null ? "" : ("" + txt));
  }

  function showMsg(kind, title, detail){
    try{
      if(window.SummaryMsg && window.SummaryMsg.show) return window.SummaryMsg.show(kind, title, detail);
    }catch(e){}
    // fallback: ログだけ
    L("msg", kind + " " + title + " " + (detail || ""));
  }

  // ============================================================================
  // [AUTH-01] Firebase初期化（summary側）
  // ============================================================================
  function firebaseReady(){
    return (typeof window.firebase !== "undefined"
      && window.firebase
      && window.firebase.apps
      && window.firebase.auth
      && window.firebase.firestore);
  }

  function ensureFirebaseInit(){
    // [AUTH-01-01] SDK無し
    if(!firebaseReady()){
      L("fatal", "Firebase SDK が読み込まれていません（firebase-*-compat.js）");
      throw new Error("Firebase SDK missing");
    }

    // [AUTH-01-02] Env無し
    if(!window.SummaryEnv || !window.SummaryEnv.FIREBASE_CONFIG){
      L("fatal", "SummaryEnv.FIREBASE_CONFIG が見つかりません（00_summary_env.js）");
      throw new Error("Missing SummaryEnv");
    }

    var cfg = window.SummaryEnv.FIREBASE_CONFIG || {};
    var raw = "";
    try{ raw = JSON.stringify(cfg); }catch(e){ raw = ""; }
    if(raw.indexOf("YOUR_") >= 0){
      L("fatal", "Firebase設定がプレースホルダ（YOUR_...）のままです。00_summary_env.js を実値に差し替えてください。");
      throw new Error("Firebase config placeholder");
    }

    // [AUTH-01-03] 初期化済みならスキップ
    try{
      if(window.firebase.apps && window.firebase.apps.length){
        L("fb", "firebase already initialized (apps=" + window.firebase.apps.length + ")");
        return true;
      }
    }catch(e){}

    // [AUTH-01-04] 初期化
    try{
      window.firebase.initializeApp(cfg);
      L("fb", "firebase initialized");
      return true;
    }catch(e2){
      L("fatal", "firebase.initializeApp FAILED: " + toStr(e2));
      throw e2;
    }
  }

  // ============================================================================
  // [AUTH-02] Auth操作
  // ============================================================================
  var _currentUser = null;
  var _watching = false;
  var _watchCbs = []; // 複数登録可

  function signIn(email, pass){
    ensureFirebaseInit();

    if(!email) throw new Error("メールアドレスが空です");
    if(!pass) throw new Error("パスワードが空です");

    L("auth", "signIn start email=" + email);

    return window.firebase.auth().signInWithEmailAndPassword(email, pass).then(function(cred){
      var u = cred ? cred.user : null;
      _currentUser = u;
      L("auth", "signIn OK uid=" + (u && u.uid ? u.uid : ""));
      showMsg("ok", "ログイン 成功", "SIGNED-IN");
      // UIは onAuthStateChanged でも更新されるが、即時反映しておく
      setText("lblLoginState", "SIGNED-IN");
      return u;
    }).catch(function(e){
      var msg = toStr(e);
      L("auth", "signIn FAILED " + msg);
      showMsg("err", "ログイン 失敗", msg);
      throw e;
    });
  }

  function signOut(){
    ensureFirebaseInit();

    L("auth", "signOut start");
    return window.firebase.auth().signOut().then(function(){
      _currentUser = null;
      L("auth", "signOut OK");
      showMsg("ok", "ログアウト", "SIGNED-OUT");
      setText("lblLoginState", "SIGNED-OUT");
      return true;
    }).catch(function(e){
      var msg = toStr(e);
      L("auth", "signOut FAILED " + msg);
      showMsg("err", "ログアウト 失敗", msg);
      throw e;
    });
  }

  function watchAuthState(onChanged){
    ensureFirebaseInit();

    if(typeof onChanged === "function"){
      _watchCbs.push(onChanged);
    }

    if(_watching){
      L("auth", "watchAuthState already set");
      return true;
    }
    _watching = true;

    window.firebase.auth().onAuthStateChanged(function(user){
      _currentUser = user || null;

      if(user){
        L("auth", "onAuthStateChanged SIGNED-IN uid=" + (user.uid || ""));
        setText("lblLoginState", "SIGNED-IN");
      }else{
        L("auth", "onAuthStateChanged SIGNED-OUT");
        setText("lblLoginState", "SIGNED-OUT");
      }

      // コールバック通知（ROLE判定など）
      try{
        for(var i=0;i<_watchCbs.length;i++){
          try{ _watchCbs[i](_currentUser); }catch(ex){}
        }
      }catch(e){}
    });

    L("auth", "watchAuthState set");
    return true;
  }

  function getUser(){
    try{
      return window.firebase && window.firebase.auth ? window.firebase.auth().currentUser : _currentUser;
    }catch(e){
      return _currentUser;
    }
  }

  // ============================================================================
  // [AUTH-03] 公開
  // ============================================================================
  window.SummaryAuth = {
    FILE: FILE, VER: VER, TS: TS,
    ensureFirebaseInit: ensureFirebaseInit,
    signIn: signIn,
    signOut: signOut,
    watchAuthState: watchAuthState,
    getUser: getUser
  };

  // ============================================================================
  // [AUTH-04] 起動ログ
  // ============================================================================
  try{
    L("ver", TS + " " + FILE + " " + VER);
    // ここで勝手にwatchしない（12_appでUI結線後に開始する）
  }catch(e){}

})();
