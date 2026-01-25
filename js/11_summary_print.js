/* [JST 2026-01-25 13:15]  11_summary_print.js v20260125-01
   [PRINT] 印刷（単価契約：合計は一切出さない）
   要件:
     - 現在表示中の集計表をそのまま印刷（最安ハイライト維持）
     - ヘッダに bidNo / status / 印刷日時（JST想定）を表示
     - 余計なUI（ボタン/ログ）は印刷に出さない
     - Edge95想定：window.print() を使用

   方式:
     - print専用CSS（@media print）で非表示制御
     - ここでは「印刷用ヘッダ」領域に文言を入れるだけ（DOM最小）
     - 具体的な印刷CSSは index.html 側で定義（次の index で用意）

   期待HTML:
     - #printHeader : 印刷時にだけ表示するヘッダ領域（通常は非表示）
     - #lblLoadedBidNo / #lblLoadedStatus を参照して文言生成

   公開API:
     - window.SummaryPrint.doPrint(modelOpt)
*/

(function(){
  "use strict";

  // ============================================================================
  // [PRINT-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "11_summary_print.js";
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

  function $(id){
    try{ return (window.SummaryDOM && window.SummaryDOM.$) ? window.SummaryDOM.$(id) : document.getElementById(id); }
    catch(e){ return document.getElementById(id); }
  }

  function _pad2(n){ return (n<10) ? ("0"+n) : (""+n); }

  function _nowJstStamp(){
    // 端末TZに依存（JST運用前提）
    var d = new Date();
    return d.getFullYear() + "-" + _pad2(d.getMonth()+1) + "-" + _pad2(d.getDate())
      + " " + _pad2(d.getHours()) + ":" + _pad2(d.getMinutes()) + ":" + _pad2(d.getSeconds());
  }

  function _text(id){
    var el = $(id);
    if(!el) return "";
    return (el.textContent || "").trim();
  }

  // ============================================================================
  // [PRINT-01] 印刷
  // ============================================================================
  function doPrint(model){
    // model が渡されなくても、画面ラベルから拾う
    var bidNo = "";
    var status = "";

    try{
      if(model && model.bid){
        bidNo = model.bid.bidNo || "";
        status = model.bid.status || "";
      }
    }catch(e){}

    if(!bidNo) bidNo = _text("lblLoadedBidNo");
    if(!status) status = _text("lblLoadedStatus");

    var stamp = _nowJstStamp();

    // 印刷ヘッダ反映
    var ph = $("printHeader");
    if(ph){
      ph.innerHTML = ""
        + "<div style='font-size:16px;font-weight:700;'>入札 集計（単価）</div>"
        + "<div style='margin-top:4px;font-size:12px;color:#374151;'>"
        +   "入札番号: <b>" + (bidNo || "-") + "</b>"
        +   "　状態: <b>" + (status || "-") + "</b>"
        +   "　印刷: <b>" + stamp + "</b>"
        + "</div>";
    }

    L("print", "start bidNo=" + (bidNo||"-") + " status=" + (status||"-"));

    try{
      window.print();
      L("print", "window.print called");
      return true;
    }catch(e2){
      L("print", "FAILED " + (e2 && e2.message ? e2.message : String(e2)));
      throw e2;
    }
  }

  // ============================================================================
  // [PRINT-02] 公開
  // ============================================================================
  window.SummaryPrint = {
    FILE: FILE, VER: VER, TS: TS,
    doPrint: doPrint
  };

  // ============================================================================
  // [PRINT-03] 起動ログ
  // ============================================================================
  try{
    L("ver", TS + " " + FILE + " " + VER);
  }catch(e){}

})();
