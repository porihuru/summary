/* [JST 2026-01-25 13:05]  10_summary_csv.js v20260125-01
   [CSV] 集計結果CSV出力（単価契約：合計は一切出さない）
   要件:
     - 表示中のモデル（items/offers/calc）からCSVを生成
     - UTF-8 BOM付き
     - 1セルの改行はスペースに潰して1行化
     - 文字列はダブルクォートで囲み、内部の " は "" にエスケープ
     - ダウンロードは a[download] + Blob URL（Edge95想定）

   CSV列構成（固定）:
     1) seq
     2) name
     3) spec
     4) qty
     5) unit
     6) note
     7) bidder1_price
     8) bidder2_price ...
   ヘッダ行:
     seq,name,spec,qty,unit,note,入札者:bidderId(会社名),...

   公開API:
     - window.SummaryCSV.buildCsv(model) -> string
     - window.SummaryCSV.download(model, filenameOpt)
*/

(function(){
  "use strict";

  // ============================================================================
  // [CSV-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "10_summary_csv.js";
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

  function _trim(s){ return (s == null) ? "" : ("" + s).replace(/^\s+|\s+$/g, ""); }

  function _oneLine(s){
    var t = _trim(s);
    if(!t) return "";
    t = t.replace(/\r\n/g," ").replace(/\r/g," ").replace(/\n/g," ").replace(/\t/g," ");
    t = t.replace(/ +/g," ").trim();
    return t;
  }

  function _csvCell(s){
    var t = _oneLine(s);
    // CSVは基本全てクォート
    t = t.replace(/"/g, '""');
    return '"' + t + '"';
  }

  function _seqStr(x){
    if(x == null) return "";
    return ("" + x).trim();
  }

  function _itemMap(items){
    var map = {};
    for(var i=0;i<items.length;i++){
      var it = items[i] || {};
      var seq = _seqStr(it.seq);
      if(seq) map[seq] = it;
    }
    return map;
  }

  // ============================================================================
  // [CSV-01] CSV生成
  // ============================================================================
  function buildCsv(model){
    model = model || {};
    var items = model.items || [];
    var calc = model.calc || {};
    var bidders = calc.bidders || [];
    var itemSeqs = calc.itemSeqs || [];
    var cells = calc.cells || {};

    var map = _itemMap(items);

    var lines = [];

    // header
    var header = [];
    header.push("seq","name","spec","qty","unit","note");
    for(var b=0;b<bidders.length;b++){
      var bd = bidders[b] || {};
      var h = "入札者:" + (bd.bidderId || "-");
      if(bd.companyName){
        h += "(" + bd.companyName + ")";
      }
      header.push(h);
    }
    lines.push(header.map(_csvCell).join(","));

    // rows
    for(var r=0;r<itemSeqs.length;r++){
      var seq = itemSeqs[r];
      var it = map[seq] || {};

      var row = [];
      row.push(seq);
      row.push(it.name || "");
      row.push(it.spec || "");
      row.push(it.qty == null ? "" : ("" + it.qty));
      row.push(it.unit || "");
      row.push(it.note || "");

      var rowCells = cells[seq] || {};
      for(var b2=0;b2<bidders.length;b2++){
        var bidId = bidders[b2].bidderId || "";
        var c = rowCells[bidId];
        var raw = (c && c.raw != null) ? ("" + c.raw) : "";
        row.push(raw);
      }

      lines.push(row.map(_csvCell).join(","));
    }

    var csv = lines.join("\r\n");
    return csv;
  }

  // ============================================================================
  // [CSV-02] ダウンロード
  // ============================================================================
  function download(model, filename){
    var csv = buildCsv(model);

    // BOM付き
    var bom = "\uFEFF";
    var content = bom + csv;

    var fn = filename || "summary.csv";
    fn = _oneLine(fn) || "summary.csv";

    try{
      var blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);

      var a = document.createElement("a");
      a.href = url;
      a.download = fn;

      document.body.appendChild(a);
      a.click();

      setTimeout(function(){
        try{
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }catch(e){}
      }, 0);

      L("csv", "download OK " + fn);
      return true;
    }catch(e2){
      L("csv", "download FAILED " + (e2 && e2.message ? e2.message : String(e2)));
      throw e2;
    }
  }

  // ============================================================================
  // [CSV-03] 公開
  // ============================================================================
  window.SummaryCSV = {
    FILE: FILE, VER: VER, TS: TS,
    buildCsv: buildCsv,
    download: download
  };

  // ============================================================================
  // [CSV-04] 起動ログ
  // ============================================================================
  try{
    L("ver", TS + " " + FILE + " " + VER);
  }catch(e){}

})();
