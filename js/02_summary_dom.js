/* [JST 2026-01-25 11:50]  02_summary_dom.js v20260125-01
   [DOM] DOMユーティリティ（Edge95想定の安全実装）
   目的:
     - document.getElementById の短縮
     - textContent/disabled/表示切替などの共通化
     - HTMLエスケープ（innerHTML使用箇所の安全確保）
     - URLパラメータ取得（URL API無しでも動くフォールバック）

   公開API:
     - window.SummaryDOM.$(id)
     - window.SummaryDOM.setText(id, txt)
     - window.SummaryDOM.setHTML(id, html)   // 基本は避ける。使う場合はescとセットで。
     - window.SummaryDOM.esc(str)
     - window.SummaryDOM.show(id, true/false)
     - window.SummaryDOM.setDisabled(id, true/false)
     - window.SummaryDOM.getUrlParam(name)
     - window.SummaryDOM.nowIso()
*/

(function(){
  "use strict";

  // ============================================================================
  // [DOM-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "02_summary_dom.js";
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

  // ============================================================================
  // [DOM-01] 基本DOM
  // ============================================================================
  function $(id){
    return document.getElementById(id);
  }

  function setText(id, txt){
    var el = $(id);
    if(!el) return;
    el.textContent = (txt == null) ? "" : ("" + txt);
  }

  function setHTML(id, html){
    var el = $(id);
    if(!el) return;
    el.innerHTML = (html == null) ? "" : ("" + html);
  }

  function show(id, on){
    var el = $(id);
    if(!el) return;
    el.style.display = on ? "block" : "none";
  }

  function setDisabled(id, dis){
    var el = $(id);
    if(!el) return;
    el.disabled = !!dis;
  }

  // ============================================================================
  // [DOM-02] HTMLエスケープ（innerHTMLを使う時の安全策）
  // ============================================================================
  function esc(s){
    return ("" + (s == null ? "" : s))
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  // ============================================================================
  // [DOM-03] 時刻
  // ============================================================================
  function nowIso(){
    try{ return new Date().toISOString(); }catch(e){ return ""; }
  }

  // ============================================================================
  // [DOM-04] URLパラメータ取得（古い環境でも動く）
  // ============================================================================
  function getUrlParam(name){
    // 1) URL API が使えるならそれを使う
    try{
      if(typeof URL !== "undefined"){
        var u = new URL(location.href);
        return u.searchParams.get(name);
      }
    }catch(e){}

    // 2) フォールバック: location.search を手パース
    try{
      var q = location.search || "";
      q = q.replace(/^\?/,"");
      if(!q) return null;

      var parts = q.split("&");
      for(var i=0;i<parts.length;i++){
        var kv = parts[i].split("=");
        var k = decodeURIComponent(kv[0] || "");
        if(k === name){
          return decodeURIComponent(kv[1] || "");
        }
      }
    }catch(ex){}
    return null;
  }

  // ============================================================================
  // [DOM-05] 公開
  // ============================================================================
  window.SummaryDOM = {
    FILE: FILE, VER: VER, TS: TS,
    $: $,
    setText: setText,
    setHTML: setHTML,
    esc: esc,
    show: show,
    setDisabled: setDisabled,
    getUrlParam: getUrlParam,
    nowIso: nowIso
  };

  // ============================================================================
  // [DOM-06] 起動ログ
  // ============================================================================
  try{
    L("ver", TS + " " + FILE + " " + VER);
  }catch(e){}

})();
