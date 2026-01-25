/* [JST 2026-01-25 11:55]  03_summary_msg.js v20260125-01
   [MSG] メッセージボックス制御（#msgBox）
   目的:
     - 画面上部の #msgBox に、成功/失敗/理由を必ず表示する
     - テキストは原則「1行表示」（改行を入れない運用）
       ※詳細が必要な場合のみ detail を別行で表示（ただし今回は基本OFF）
     - 表示/非表示の制御を統一する

   公開API:
     - window.SummaryMsg.show(kind, title, detailOpt)
     - window.SummaryMsg.hide()
     - window.SummaryMsg.setOneLine(true/false)

   kind:
     - "ok"  -> 緑系
     - "err" -> 赤系
     - その他は err 扱い
*/

(function(){
  "use strict";

  // ============================================================================
  // [MSG-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "03_summary_msg.js";
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
  // [MSG-01] 設定
  // ============================================================================
  var _oneLine = true; // デフォルト：1行運用

  function _$(id){
    try{ return (window.SummaryDOM && window.SummaryDOM.$) ? window.SummaryDOM.$(id) : document.getElementById(id); }
    catch(e){ return document.getElementById(id); }
  }

  function _esc(s){
    try{ return (window.SummaryDOM && window.SummaryDOM.esc) ? window.SummaryDOM.esc(s) : (""+s); }
    catch(e){ return ("" + (s == null ? "" : s)); }
  }

  // 改行・タブを「スペース1つ」に寄せる（1行表示用）
  function _toOneLine(s){
    var t = (s == null) ? "" : ("" + s);
    // CR/LF/TAB をスペースへ
    t = t.replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ").replace(/\t/g, " ");
    // 連続スペースを縮退
    t = t.replace(/ +/g, " ").trim();
    return t;
  }

  // ============================================================================
  // [MSG-02] 表示
  // ============================================================================
  function show(kind, title, detail){
    var box = _$("#msgBox");
    if(!box) return;

    var k = (kind === "ok") ? "ok" : "err";

    // 1行運用：title/detail ともに改行を潰す
    var t = _oneLine ? _toOneLine(title) : (title == null ? "" : ("" + title));
    var d = (detail == null) ? "" : (_oneLine ? _toOneLine(detail) : ("" + detail));

    box.style.display = "block";
    box.className = "card " + (k === "ok" ? "ok" : "err");

    // titleは太字
    var html = "<b>" + _esc(t) + "</b>";

    // detailは原則使わないが、必要時だけ追加
    if(d){
      // detailは見やすさ優先で別ブロック（ただし1行化済み）
      html += "<div style='margin-top:6px;'>" + _esc(d) + "</div>";
    }

    box.innerHTML = html;

    L("msg", (k === "ok" ? "OK " : "ERR ") + t + (d ? (" / " + d) : ""));
  }

  function hide(){
    var box = _$("#msgBox");
    if(!box) return;
    box.style.display = "none";
    box.innerHTML = "";
  }

  function setOneLine(v){
    _oneLine = (v !== false); // undefined は true
    L("msg", "oneLine=" + (_oneLine ? "true" : "false"));
  }

  // ============================================================================
  // [MSG-03] 公開
  // ============================================================================
  window.SummaryMsg = {
    FILE: FILE, VER: VER, TS: TS,
    show: show,
    hide: hide,
    setOneLine: setOneLine
  };

  // ============================================================================
  // [MSG-04] 起動ログ
  // ============================================================================
  try{
    L("ver", TS + " " + FILE + " " + VER);
    // 常に1行運用で開始
    setOneLine(true);
  }catch(e){}

})();
