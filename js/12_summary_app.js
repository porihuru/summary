/* [JST 2026-01-25 13:30]  12_summary_app.js v20260125-01
   [APP] summary アプリ本体（結線・制御）
   要件:
     - admin/ope ログイン（匿名なし）
     - ログイン後に users/{uid}.role を取得し admin/ope のみ許可
     - 許可OKなら bids/items/offers を読込
     - 単価の最安判定（同額最安対応）→ 表に描画
     - CSV出力（BOM付き）・印刷
     - ログは細かく（SummaryLog）・メッセージも出す（SummaryMsg）

   期待依存:
     00_summary_env.js
     01_summary_dom.js
     02_summary_log.js
     03_summary_msg.js
     04_summary_auth.js
     05_summary_role.js
     06_summary_fs.js
     07_summary_parse.js
     08_summary_calc.js
     09_summary_render.js
     10_summary_csv.js
     11_summary_print.js

   期待HTML:
     - 入札番号: #txtBidNo
     - ボタン: #btnLogin #btnLogout #btnLoad #btnCsv #btnPrint
     - ログUI: #txtLog #btnLogClear #btnLogPause #btnLogCopy
     - ラベル: #lblUser #lblRole #lblAuthz #lblLoadedBidNo #lblLoadedStatus #lblCounts
*/

(function(){
  "use strict";

  // ============================================================================
  // [APP-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "12_summary_app.js";
  var VER  = "v20260125-01";
  var TS   = (function(){ try{ return new Date().toISOString(); }catch(e){ return ""; } })();

  if(!window.__APP_VER__){ window.__APP_VER__ = []; }
  window.__APP_VER__.push({ ts: TS, file: FILE, ver: VER });

  // ============================================================================
  // [APP-01] ユーティリティ
  // ============================================================================
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
  function msg(kind, title, detail){
    try{
      if(window.SummaryMsg && window.SummaryMsg.show) return window.SummaryMsg.show(kind, title, detail);
    }catch(e){}
    L("msg", kind + " " + title + " " + (detail || ""));
  }
  function hideMsg(){
    try{
      if(window.SummaryMsg && window.SummaryMsg.hide) return window.SummaryMsg.hide();
    }catch(e){}
  }
  function val(id){
    var el = $(id);
    if(!el) return "";
    return (el.value || "").replace(/^\s+|\s+$/g,"");
  }

  // ============================================================================
  // [APP-02] モデル（現在表示中）
  // ============================================================================
  var MODEL = {
    bid: null,
    items: [],
    offers: [],
    calc: null
  };

  // ============================================================================
  // [APP-03] UI制御（許可前は安全に無効化）
  // ============================================================================
  function lockAll(){
    setDisabled("btnLoad", true);
    setDisabled("btnCsv", true);
    setDisabled("btnPrint", true);
  }

  function unlockOps(){
    // role判定により 05 が制御するが、ここでも最小保険
    var st = (window.SummaryRole && window.SummaryRole.getState) ? window.SummaryRole.getState() : { allowed:false };
    var ok = !!st.allowed;
    setDisabled("btnLoad", !ok);
    setDisabled("btnCsv", !ok);
    setDisabled("btnPrint", !ok);
  }

  // ============================================================================
  // [APP-04] ログUI（停止/コピー/クリア）
  // ============================================================================
  var logPaused = false;

  function hookLog(){
    try{
      if(window.SummaryLog && window.SummaryLog.bindTextArea){
        window.SummaryLog.bindTextArea($("txtLog"));
      }
    }catch(e){}
  }

  function setLogPaused(v){
    logPaused = !!v;
    try{
      if(window.SummaryLog && window.SummaryLog.setPaused) window.SummaryLog.setPaused(logPaused);
    }catch(e){}
    var btn = $("btnLogPause");
    if(btn) btn.textContent = logPaused ? "ログ再開" : "ログ停止";
  }

  function bindLogButtons(){
    function on(id, fn){
      var el = $(id);
      if(!el) return;
      el.addEventListener("click", function(){
        try{ fn(); }catch(e){ L("err", id + " " + toStr(e)); }
      });
    }
    on("btnLogClear", function(){
      try{ if(window.SummaryLog && window.SummaryLog.clear) window.SummaryLog.clear(); }catch(e){}
    });
    on("btnLogPause", function(){
      setLogPaused(!logPaused);
    });
    on("btnLogCopy", function(){
      try{
        if(window.SummaryLog && window.SummaryLog.copyAll){
          window.SummaryLog.copyAll().then(function(ok){
            if(ok) msg("ok","コピー完了","ログをコピーしました。");
            else msg("err","コピー失敗","コピーできませんでした。");
          });
        }
      }catch(e){
        msg("err","コピー失敗",toStr(e));
      }
    });

    // ログ欄タップで自動停止
    var ta = $("txtLog");
    if(ta){
      ta.addEventListener("pointerdown", function(){ setLogPaused(true); });
      ta.addEventListener("touchstart", function(){ setLogPaused(true); });
    }
  }

  // ============================================================================
  // [APP-05] 認証状態反映
  // ============================================================================
  function refreshAuthUI(){
    var user = null;
    try{ user = (window.SummaryAuth && window.SummaryAuth.getUser) ? window.SummaryAuth.getUser() : null; }catch(e){}
    if(user && user.uid){
      setText("lblUser", user.email || user.uid);
    }else{
      setText("lblUser", "SIGNED-OUT");
      setText("lblRole", "-");
      setText("lblAuthz", "NG");
    }
    unlockOps();
  }

  // ============================================================================
  // [APP-06] role確認（ログイン後に必ず実行）
  // ============================================================================
  function checkRole(){
    var user = null;
    try{ user = (window.SummaryAuth && window.SummaryAuth.getUser) ? window.SummaryAuth.getUser() : null; }catch(e){}
    return window.SummaryRole.fetchMyRole(user).then(function(res){
      refreshAuthUI();
      return res;
    });
  }

  // ============================================================================
  // [APP-07] 読み込み→集計→描画
  // ============================================================================
  function loadAndRender(){
    hideMsg();

    var st = (window.SummaryRole && window.SummaryRole.getState) ? window.SummaryRole.getState() : { allowed:false };
    if(!st.allowed){
      throw new Error("権限がありません（admin/opeのみ）");
    }

    var bidNo = val("txtBidNo");
    if(!bidNo){
      // 既定値がenvにあれば拾う
      try{
        if(window.SummaryEnv && window.SummaryEnv.BID_NO_DEFAULT) bidNo = window.SummaryEnv.BID_NO_DEFAULT;
      }catch(e){}
    }
    if(!bidNo) throw new Error("入札番号が空です");

    L("ui", "load start bidNo=" + bidNo);

    return window.SummaryFS.loadAll(bidNo).then(function(all){
      MODEL.bid = all.bid;
      MODEL.items = all.items || [];
      MODEL.offers = all.offers || [];

      // calc
      MODEL.calc = window.SummaryCalc.build(MODEL.items, MODEL.offers);

      // render
      window.SummaryRender.renderAll({
        bid: MODEL.bid,
        items: MODEL.items,
        offers: MODEL.offers,
        calc: MODEL.calc
      });

      msg("ok", "読み込み完了", "集計を更新しました。");
      L("ui", "load OK");
      return true;
    }).catch(function(e){
      msg("err", "読み込み失敗", toStr(e));
      L("ui", "load FAILED " + toStr(e));
      throw e;
    });
  }

  // ============================================================================
  // [APP-08] ボタン結線
  // ============================================================================
  function bindButtons(){
    function on(id, fn){
      var el = $(id);
      if(!el) return;
      el.addEventListener("click", function(){
        try{
          Promise.resolve().then(fn).catch(function(e){
            L("err", id + " " + toStr(e));
          });
        }catch(ex){
          L("err", id + " " + toStr(ex));
          msg("err","処理失敗", toStr(ex));
        }
      });
    }

    on("btnLogin", function(){
      hideMsg();
      lockAll();
      return window.SummaryAuth.signIn().then(function(){
        msg("ok","ログイン成功","ログインしました。");
        return checkRole();
      }).then(function(res){
        if(res && res.allowed){
          msg("ok","権限OK","role=" + (res.role||"-"));
          unlockOps();
        }else{
          // role NG
          lockAll();
        }
        refreshAuthUI();
        return true;
      }).catch(function(e){
        msg("err","ログイン失敗", toStr(e));
        lockAll();
        refreshAuthUI();
        throw e;
      });
    });

    on("btnLogout", function(){
      hideMsg();
      return window.SummaryAuth.signOut().then(function(){
        msg("ok","ログアウト","ログアウトしました。");
        lockAll();
        refreshAuthUI();
        return true;
      }).catch(function(e){
        msg("err","ログアウト失敗", toStr(e));
        throw e;
      });
    });

    on("btnLoad", function(){
      return loadAndRender();
    });

    on("btnCsv", function(){
      var st = (window.SummaryRole && window.SummaryRole.getState) ? window.SummaryRole.getState() : { allowed:false };
      if(!st.allowed) throw new Error("権限がありません（admin/opeのみ）");
      if(!MODEL || !MODEL.calc) throw new Error("まだ読み込みされていません（先に読み込み）");
      var fn = "summary_" + (MODEL.bid && MODEL.bid.bidNo ? MODEL.bid.bidNo : "bid") + ".csv";
      window.SummaryCSV.download(MODEL, fn);
      msg("ok","CSV出力","CSVを出力しました。");
      return true;
    });

    on("btnPrint", function(){
      var st = (window.SummaryRole && window.SummaryRole.getState) ? window.SummaryRole.getState() : { allowed:false };
      if(!st.allowed) throw new Error("権限がありません（admin/opeのみ）");
      if(!MODEL || !MODEL.calc) throw new Error("まだ読み込みされていません（先に読み込み）");
      window.SummaryPrint.doPrint(MODEL);
      return true;
    });
  }

  // ============================================================================
  // [APP-09] 起動
  // ============================================================================
  function bootstrap(){
    L("ver", TS + " " + FILE + " " + VER);

    // 基本はロック（ログイン&role OK まで）
    lockAll();

    // ログ結線
    hookLog();
    bindLogButtons();

    // auth監視（04が提供）
    try{
      if(window.SummaryAuth && window.SummaryAuth.watchAuthState){
        window.SummaryAuth.watchAuthState(function(user){
          // 状態変化のたびにrole再確認（安全側）
          refreshAuthUI();
          if(user && user.uid){
            checkRole().then(function(res){
              if(res && res.allowed){
                unlockOps();
              }else{
                lockAll();
              }
            });
          }else{
            lockAll();
          }
        });
      }
    }catch(e){
      L("auth", "watchAuthState FAILED " + toStr(e));
    }

    // ボタン
    bindButtons();

    // 初期表示
    refreshAuthUI();

    // 既にログイン済みならrole確認だけ実行（自動読込はしない）
    try{
      var u = (window.SummaryAuth && window.SummaryAuth.getUser) ? window.SummaryAuth.getUser() : null;
      if(u && u.uid){
        checkRole().then(function(res){
          if(res && res.allowed){
            unlockOps();
            msg("ok","ログイン済","role=" + (res.role||"-") + "。読み込みを押してください。");
          }else{
            lockAll();
          }
        });
      }else{
        msg("err","未ログイン","ログインしてください。");
      }
    }catch(e2){}
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bootstrap);
  }else{
    bootstrap();
  }

})();
