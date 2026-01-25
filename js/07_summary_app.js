/* [JST 2026-01-25 10:00]  07_summary_app.js v20260125-01
   [APP-01] 起動・イベント結線・読込・メッセージ
   - 合計は一切表示しない（render/export側も合計なし）
*/
(function(){
  "use strict";
  var FILE="07_summary_app.js", VER="v20260125-01", TS=new Date().toISOString();
  if(!window.__APP_VER__){ window.__APP_VER__=[]; }
  window.__APP_VER__.push({ ts: TS, file: FILE, ver: VER });

  function $(id){ return document.getElementById(id); }
  function toStr(e){ try{ return (e&&e.message)?e.message:(""+e); }catch(x){ return ""+e; } }
  function L(tag,msg){
    try{ if(window.SummaryLog && window.SummaryLog.write) return window.SummaryLog.write(tag,msg); }catch(e){}
  }
  function esc(s){
    return (""+(s==null?"":s))
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  // [APP-02] msgBox
  function showMsg(kind, title, detail){
    var box = $("msgBox");
    if(!box) return;
    box.style.display = "block";
    box.className = "card " + (kind==="ok" ? "ok" : "err");
    var t = "<b>" + esc(title||"") + "</b>";
    var d = detail ? ("<div style='margin-top:6px;white-space:pre-wrap;'>" + esc(detail) + "</div>") : "";
    box.innerHTML = t + d;
  }
  function hideMsg(){
    var box = $("msgBox");
    if(!box) return;
    box.style.display = "none";
    box.innerHTML = "";
  }

  // [APP-03] URL param（古い環境対応）
  function getUrlParam(name){
    try{
      var u = new URL(location.href);
      return u.searchParams.get(name);
    }catch(e){
      try{
        var q = location.search || "";
        q = q.replace(/^\?/,"");
        var parts = q.split("&");
        for(var i=0;i<parts.length;i++){
          var kv = parts[i].split("=");
          if(decodeURIComponent(kv[0]||"")===name){
            return decodeURIComponent(kv[1]||"");
          }
        }
      }catch(ex){}
      return null;
    }
  }

  // [APP-04] バージョン表示
  function renderVerList(){
    var pre = $("preVerList");
    if(!pre) return;
    var arr = window.__APP_VER__ || [];
    var lines = [];
    for(var i=0;i<arr.length;i++){
      var o = arr[i] || {};
      lines.push((o.ts||"") + "  " + (o.file||"") + "  " + (o.ver||""));
    }
    pre.textContent = lines.join("\n");
  }

  // [APP-05] 入札番号決定
  function resolveBidNo(){
    var b = ($("txtBidNo") && $("txtBidNo").value) ? $("txtBidNo").value.trim() : "";
    if(!b){
      b = getUrlParam("bidNo") || "";
    }
    if(!b && window.BidderConfig && window.BidderConfig.BID_NO_DEFAULT){
      b = window.BidderConfig.BID_NO_DEFAULT;
    }
    return b;
  }

  // [APP-06] 読込
  function load(){
    hideMsg();

    var bidNo = resolveBidNo();
    if($("txtBidNo")) $("txtBidNo").value = bidNo;

    if(!bidNo){
      showMsg("err","再読込 失敗","bidNo が空です。URL ?bidNo=XXXX または入力欄に入札番号を指定してください。");
      return Promise.resolve(false);
    }

    var S = window.SummaryState.get();
    S.bidNo = bidNo;
    window.SummaryState.set(S);
    if(window.SummaryRender) window.SummaryRender.renderAll();

    L("ui","load clicked bidNo="+bidNo);

    if(!window.SummaryDB || !window.SummaryDB.loadAll){
      showMsg("err","起動失敗","SummaryDB.loadAll が見つかりません（03_summary_db.js を確認）");
      return Promise.resolve(false);
    }

    return window.SummaryDB.loadAll(bidNo).then(function(data){
      // stateへ反映
      var S2 = window.SummaryState.get();
      S2.bidNo = data.bidNo;
      S2.bidStatus = data.bidStatus;
      S2.lastLoadedAt = data.lastLoadedAt;
      S2.items = data.items || [];
      S2.bidders = (data.bidders || []).map(function(b){
        b.displayName = ""; // renderで組み立て
        return b;
      });
      S2.priceMap = data.priceMap || {};
      window.SummaryState.set(S2);

      // 画面反映
      if(window.SummaryRender) window.SummaryRender.renderAll();
      renderVerList();

      showMsg("ok","再読込 完了","入札データを読み込みました。");
      return true;
    }).catch(function(e){
      var msg = toStr(e);
      showMsg("err","再読込 失敗", msg);
      L("load","FAILED "+msg);
      renderVerList();
      return false;
    });
  }

  // [APP-07] ビュー切替
  function setView(mode){
    if(window.SummaryRender && window.SummaryRender.setView){
      window.SummaryRender.setView(mode);
      L("ui","view="+mode);
    }
  }

  // [APP-08] イベント結線
  function bind(){
    function on(id, ev, fn){
      var el = $(id);
      if(!el) return;
      el.addEventListener(ev, function(){
        try{
          Promise.resolve().then(fn).catch(function(e){
            L("err", id+" "+toStr(e));
          });
        }catch(ex){
          L("err", id+" "+toStr(ex));
        }
      });
    }

    // ログ
    if(window.SummaryLog && window.SummaryLog.bind){
      window.SummaryLog.bind($("txtLog"));
    }

    on("btnLogClear","click", function(){ if(window.SummaryLog) window.SummaryLog.clear(); });
    on("btnLogPause","click", function(){
      var p = (window.SummaryLog) ? window.SummaryLog.togglePaused() : false;
      var btn = $("btnLogPause");
      if(btn) btn.textContent = p ? "ログ再開" : "ログ停止";
    });
    on("btnLogCopy","click", function(){
      if(!window.SummaryLog) return;
      return window.SummaryLog.copyAll().then(function(ok){
        if(ok) showMsg("ok","コピー完了","ログをコピーしました。");
        else showMsg("err","コピー失敗","ブラウザ制限で自動コピーできません。ログを手動で選択→コピーしてください。");
      });
    });

    // 操作
    on("btnLoad","click", function(){ return load(); });
    on("btnViewItem","click", function(){ setView("item"); });
    on("btnViewBidder","click", function(){ setView("bidder"); });

    // オプション変更で再描画
    on("chkHighlightMin","change", function(){ if(window.SummaryRender) window.SummaryRender.renderAll(); });
    on("chkHideEmptyBidders","change", function(){ if(window.SummaryRender) window.SummaryRender.renderAll(); });
    on("chkHideEmptyRows","change", function(){ if(window.SummaryRender) window.SummaryRender.renderAll(); });

    // 印刷/CSV
    on("btnPrint","click", function(){
      if(window.SummaryPrint && window.SummaryPrint.doPrint) window.SummaryPrint.doPrint();
      else showMsg("err","未実装","SummaryPrint.doPrint が見つかりません（06_summary_print.js を確認）");
    });

    on("btnCsvItem","click", function(){
      if(window.SummaryExport && window.SummaryExport.exportItem) window.SummaryExport.exportItem();
      else showMsg("err","未実装","SummaryExport.exportItem が見つかりません（05_summary_export.js を確認）");
    });

    on("btnCsvBidder","click", function(){
      if(window.SummaryExport && window.SummaryExport.exportBidder) window.SummaryExport.exportBidder();
      else showMsg("err","未実装","SummaryExport.exportBidder が見つかりません（05_summary_export.js を確認）");
    });

    renderVerList();
    L("ui","events bound");
  }

  // [APP-09] 起動
  function bootstrap(){
    bind();

    // URL優先で入札番号を入力欄に反映して初回ロード
    var b = getUrlParam("bidNo") || "";
    if(!b && window.BidderConfig && window.BidderConfig.BID_NO_DEFAULT) b = window.BidderConfig.BID_NO_DEFAULT;
    if($("txtBidNo")) $("txtBidNo").value = b;

    // 初回ロード
    load();
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded", bootstrap);
  }else{
    bootstrap();
  }

  L("ver", TS+" "+FILE+" "+VER);
})();
