/* [JST 2026-01-25 12:55]  09_summary_render.js v20260125-01
   [RENDER] 集計テーブル描画（単価契約：合計は一切出さない）
   要件:
     - 行：品目（seq / 品名+規格 2段表示 / 予定数量 / 単位 / 備考）
     - 列：入札者（bidderId + companyName）
     - セル：入札単価（raw文字列を表示。数値化できたものだけ最安判定）
     - 最安ハイライト（同額最安は全員ハイライト）
     - 空欄/文字は通常表示（比較対象外）
     - 表示は重くなる可能性があるので innerHTML で一括描画（Edge95想定）

   期待HTML要素:
     - #tbodySummary    : 集計テーブル tbody
     - #lblLoadedBidNo  : 読込対象bidNo
     - #lblLoadedStatus : status
     - #lblCounts       : 件数表示（items/offers）
     - CSSは index 側で用意（minセル背景など）

   公開API:
     - window.SummaryRender.renderAll(model)
       model = { bid, items, offers, calc }
*/

(function(){
  "use strict";

  // ============================================================================
  // [RENDER-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "09_summary_render.js";
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

  function setText(id, txt){
    try{
      if(window.SummaryDOM && window.SummaryDOM.setText) return window.SummaryDOM.setText(id, txt);
    }catch(e){}
    var el = $(id);
    if(el) el.textContent = (txt == null ? "" : ("" + txt));
  }

  function esc(s){
    try{ return (window.SummaryDOM && window.SummaryDOM.esc) ? window.SummaryDOM.esc(s) : (""+s); }
    catch(e){ return ("" + (s == null ? "" : s)); }
  }

  function _seqStr(x){
    if(x == null) return "";
    return ("" + x).trim();
  }

  // ============================================================================
  // [RENDER-01] ヘッダ（入札者列）
  // ============================================================================
  function _buildHeaderHtml(bidders){
    // theadは index.html で固定しても良いが、ここでは動的ヘッダを返す
    // 返却: <tr>...</tr>
    var h = "";
    h += "<tr>";
    h += "<th style='width:70px;'>番号</th>";
    h += "<th>品名／規格</th>";
    h += "<th style='width:120px;'>予定数量</th>";
    h += "<th style='width:140px;'>備考</th>";

    for(var i=0;i<bidders.length;i++){
      var b = bidders[i] || {};
      var title = (b.bidderId || "-");
      var sub = (b.companyName || "");
      var cell = esc(title);
      if(sub){
        cell += "<div style='margin-top:3px;font-size:12px;color:#6b7280;'>" + esc(sub) + "</div>";
      }
      h += "<th style='min-width:160px;'>" + cell + "</th>";
    }

    h += "</tr>";
    return h;
  }

  // ============================================================================
  // [RENDER-02] 本体（tbody）
  // ============================================================================
  function _buildBodyHtml(items, bidders, calc){
    var itemSeqs = (calc && calc.itemSeqs) ? calc.itemSeqs : [];
    var cells = (calc && calc.cells) ? calc.cells : {};

    // items を seq -> item で引けるように
    var itemMap = {};
    for(var i=0;i<items.length;i++){
      var it = items[i] || {};
      var seq = _seqStr(it.seq);
      if(seq) itemMap[seq] = it;
    }

    var html = "";
    if(!itemSeqs.length){
      html = "<tr><td colspan='" + (4 + bidders.length) + "' style='color:#6b7280;'>品目なし</td></tr>";
      return html;
    }

    for(var r=0;r<itemSeqs.length;r++){
      var seq2 = itemSeqs[r];
      var it2 = itemMap[seq2] || {};

      var name = it2.name || "";
      var spec = it2.spec || "";
      var qty  = (it2.qty == null ? "" : ("" + it2.qty));
      var unit = it2.unit || "";
      var note = it2.note || "";

      html += "<tr>";
      html += "<td>" + esc(seq2) + "</td>";

      // 品名/規格 2段
      html += "<td class='td2line'>" + esc(name)
           +  "<span class='sub'>" + esc(spec) + "</span></td>";

      // 予定数量（単位は数量に付ける）
      html += "<td>" + esc(qty) + (unit ? (" " + esc(unit)) : "") + "</td>";

      // 備考（品目備考）
      html += "<td>" + esc(note) + "</td>";

      // bidder列（単価セル）
      var row = cells[seq2] || {};
      for(var c=0;c<bidders.length;c++){
        var b2 = bidders[c] || {};
        var bidId = b2.bidderId || "";
        var cellInfo = row[bidId] || null;

        var raw = (cellInfo && cellInfo.raw != null) ? ("" + cellInfo.raw) : "";
        var isMin = !!(cellInfo && cellInfo.isMin);
        var tie = (cellInfo && cellInfo.minTieCount) ? cellInfo.minTieCount : 0;

        // class: 最安なら highlight
        // 同額最安の場合も同じ highlight（必要なら tie 表示を追加）
        var cls = isMin ? "minCell" : "";

        // 表示文字：そのまま（ただし改行は潰す）
        raw = raw.replace(/\r\n/g," ").replace(/\r/g," ").replace(/\n/g," ").replace(/\t/g," ").replace(/ +/g," ").trim();

        var disp = raw ? esc(raw) : "";
        if(isMin){
          // 同額最安が複数なら小さく注記
          if(tie >= 2){
            disp += "<div style='margin-top:3px;font-size:12px;color:#065f46;'>同額最安</div>";
          }else{
            disp += "<div style='margin-top:3px;font-size:12px;color:#065f46;'>最安</div>";
          }
        }

        html += "<td class='" + cls + "'>" + disp + "</td>";
      }

      html += "</tr>";
    }

    return html;
  }

  // ============================================================================
  // [RENDER-03] 反映
  // ============================================================================
  function renderAll(model){
    model = model || {};
    var bid = model.bid || {};
    var items = model.items || [];
    var offers = model.offers || [];
    var calc = model.calc || {};

    // 上部表示
    setText("lblLoadedBidNo", bid.bidNo || "-");
    setText("lblLoadedStatus", bid.status || "-");
    setText("lblCounts", "items=" + items.length + " / offers=" + offers.length);

    // ヘッダ差し替え（thead）
    var thead = $("theadSummary");
    if(thead){
      thead.innerHTML = _buildHeaderHtml(calc.bidders || []);
    }

    // ボディ差し替え（tbody）
    var tb = $("tbodySummary");
    if(tb){
      tb.innerHTML = _buildBodyHtml(items, calc.bidders || [], calc);
    }

    L("render", "renderAll OK");
  }

  // ============================================================================
  // [RENDER-04] 公開
  // ============================================================================
  window.SummaryRender = {
    FILE: FILE, VER: VER, TS: TS,
    renderAll: renderAll
  };

  // ============================================================================
  // [RENDER-05] 起動ログ
  // ============================================================================
  try{
    L("ver", TS + " " + FILE + " " + VER);
  }catch(e){}

})();
