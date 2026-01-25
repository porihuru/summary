/* [JST 2026-01-25 12:15]  05_summary_role.js v20260125-01
   [ROLE] users/{uid}.role 判定（admin/opeのみ許可）
   目的:
     - ログイン後、Firestore の users/{uid} を参照し role を取得
     - SummaryEnv.ALLOWED_ROLES に含まれる role のみを許可（admin/ope）
     - 許可/不許可をUIへ反映
       - lblRole / lblAuthz
       - btnLoad / btnCsv / btnPrint の disabled を制御（許可で解除）

   前提:
     - SummaryAuth がログイン状態を管理（04）
     - Firebase初期化済み
     - SummaryEnv.COLLECTIONS.users が "users"（00）
     - Edge95前提のES5実装

   公開API:
     - window.SummaryRole.fetchMyRole(user) -> Promise<{role, allowed, docExists}>
     - window.SummaryRole.applyAuthz(allowed, roleText)
     - window.SummaryRole.getState() -> { role, allowed, lastCheckedAt, uid }

   注意:
     - Security Rules で users/{uid} read が許可されている必要がある
*/

(function(){
  "use strict";

  // ============================================================================
  // [ROLE-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "05_summary_role.js";
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

  function setDisabled(id, dis){
    try{
      if(window.SummaryDOM && window.SummaryDOM.setDisabled) return window.SummaryDOM.setDisabled(id, dis);
    }catch(e){}
    var el = $(id);
    if(el) el.disabled = !!dis;
  }

  function showMsg(kind, title, detail){
    try{
      if(window.SummaryMsg && window.SummaryMsg.show) return window.SummaryMsg.show(kind, title, detail);
    }catch(e){}
    L("msg", kind + " " + title + " " + (detail || ""));
  }

  // ============================================================================
  // [ROLE-01] 内部状態
  // ============================================================================
  var _state = {
    uid: "",
    role: "",
    allowed: false,
    docExists: false,
    lastCheckedAt: ""
  };

  function _nowIso(){
    try{ return (window.SummaryDOM && window.SummaryDOM.nowIso) ? window.SummaryDOM.nowIso() : new Date().toISOString(); }
    catch(e){ try{ return new Date().toISOString(); }catch(ex){ return ""; } }
  }

  function _allowedByRole(role){
    try{
      var map = (window.SummaryEnv && window.SummaryEnv.ALLOWED_ROLES) ? window.SummaryEnv.ALLOWED_ROLES : null;
      if(!map) return false;
      return !!map[role];
    }catch(e){
      return false;
    }
  }

  // ============================================================================
  // [ROLE-02] Firestore参照
  // ============================================================================
  function _db(){
    return window.firebase.firestore();
  }

  function _userDocRef(uid){
    var col = "users";
    try{
      if(window.SummaryEnv && window.SummaryEnv.COLLECTIONS && window.SummaryEnv.COLLECTIONS.users){
        col = window.SummaryEnv.COLLECTIONS.users;
      }
    }catch(e){}
    return _db().collection(col).doc(uid);
  }

  // ============================================================================
  // [ROLE-03] 権限反映（UI）
  // ============================================================================
  function applyAuthz(allowed, roleText){
    _state.allowed = !!allowed;
    _state.role = roleText || _state.role || "";
    _state.lastCheckedAt = _nowIso();

    setText("lblRole", _state.role || "-");
    setText("lblAuthz", _state.allowed ? "OK" : "NG");

    // 許可されるまで操作不可（安全）
    setDisabled("btnLoad",  !_state.allowed);
    setDisabled("btnCsv",   !_state.allowed);
    setDisabled("btnPrint", !_state.allowed);

    L("role", "applyAuthz allowed=" + (_state.allowed ? "true" : "false") + " role=" + (_state.role || "-"));
  }

  // ============================================================================
  // [ROLE-04] role取得
  // ============================================================================
  function fetchMyRole(user){
    // userは SummaryAuth.getUser() の値を渡す想定
    try{
      if(!window.SummaryAuth || !window.SummaryAuth.ensureFirebaseInit){
        throw new Error("SummaryAuth not ready");
      }
      window.SummaryAuth.ensureFirebaseInit();
    }catch(e0){
      showMsg("err", "起動失敗", toStr(e0));
      return Promise.reject(e0);
    }

    if(!user || !user.uid){
      // 未ログイン
      _state.uid = "";
      _state.role = "";
      _state.allowed = false;
      _state.docExists = false;
      _state.lastCheckedAt = _nowIso();
      applyAuthz(false, "");
      L("role", "skip (SIGNED-OUT)");
      return Promise.resolve({ role:"", allowed:false, docExists:false });
    }

    var uid = user.uid;
    _state.uid = uid;
    _state.lastCheckedAt = _nowIso();

    L("role", "fetch start uid=" + uid);

    return _userDocRef(uid).get().then(function(snap){
      if(!snap.exists){
        _state.docExists = false;
        _state.role = "";
        _state.allowed = false;

        applyAuthz(false, "");
        showMsg("err", "権限なし", "users/" + uid + " が存在しません（role未設定）");
        L("role", "doc missing users/" + uid);
        return { role:"", allowed:false, docExists:false };
      }

      _state.docExists = true;

      var d = snap.data() || {};
      var role = d.role || ""; // 期待: "admin" / "ope"
      _state.role = role;

      var ok = _allowedByRole(role);
      _state.allowed = ok;

      applyAuthz(ok, role);

      if(ok){
        showMsg("ok", "権限OK", "role=" + role);
        L("role", "allowed role=" + role);
      }else{
        showMsg("err", "権限なし", "role=" + role + " は許可されていません（admin/opeのみ）");
        L("role", "denied role=" + role);
      }

      return { role: role, allowed: ok, docExists: true };
    }).catch(function(e){
      // ルールで read できない等
      var msg = toStr(e);
      _state.role = "";
      _state.allowed = false;
      applyAuthz(false, "");

      showMsg("err", "権限確認 失敗", msg);
      L("role", "fetch FAILED " + msg);
      throw e;
    });
  }

  function getState(){
    return {
      uid: _state.uid,
      role: _state.role,
      allowed: _state.allowed,
      docExists: _state.docExists,
      lastCheckedAt: _state.lastCheckedAt
    };
  }

  // ============================================================================
  // [ROLE-05] 公開
  // ============================================================================
  window.SummaryRole = {
    FILE: FILE, VER: VER, TS: TS,
    fetchMyRole: fetchMyRole,
    applyAuthz: applyAuthz,
    getState: getState
  };

  // ============================================================================
  // [ROLE-06] 起動ログ
  // ============================================================================
  try{
    L("ver", TS + " " + FILE + " " + VER);
    // 初期は未許可（安全）
    applyAuthz(false, "");
  }catch(e){}

})();
