/* [JST 2026-01-25 10:00]  05_summary_export.js v20260125-01
   [CSV-01] CSV出力（合計一切なし）
   - UTF-8 BOM
   - 品目別 / 入札者別
*/
(function(){
  "use strict";
  var FILE="05_summary_export.js", VER="v20260125-01", TS=new Date().toISOString();
  if(!window.__APP_VER__){ window.__APP_VER__=[]; }
  window.__APP_VER__.push({ ts: TS, file: FILE, ver: VER });

  function L(tag,msg){
    try{ if(window.SummaryLog && window.SummaryLog.write) return window.SummaryLog.write(tag,msg); }catch(e){}
  }
  function escCsv(s){
    var v = (s==null) ? "" : (""+s);
    if(/[",\n\r]/.test(v)){
      return '"' + v.replace(/"/g,'""') + '"';
    }
    return v;
  }
  function dlText(filename, text){
    // [CSV-02] Edge95: Blob + msSaveBlob fallback
    var bom = "\uFEFF";
    var blob = new Blob([bom + text], { type:"text/csv;charset=utf-8" });
    if(window.navigator && window.navigator.msSaveOrOpenBlob){
      window.navigator.msSaveOrOpenBlob(blob, filename);
      return;
    }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      try{ URL.revokeObjectURL(a.href); }catch(e){}
      document.body.removeChild(a);
    }, 200);
  }

  function makeFileName(prefix){
    var S = window.SummaryState.get();
    var bidNo = S.bidNo || "bid";
    return prefix + "_" + bidNo + ".csv";
  }

  // [CSV-03] 品目別CSV
  function exportItem(){
    var S = window.SummaryState.get();
    var items = S.items || [];
    var bidders = S.bidders || [];
    var pm = S.priceMap || {};
    var disp = (window.SummaryRender && window.SummaryRender.bidderDisplay) ? window.SummaryRender.bidderDisplay : function(b){ return b.bidderId; };

    // ヘッダ：品目情報 + 入札者列 + 最安情報（合計なし）
    var cols = ["番号","品名","規格","予定数量","単位","備考"];
    for(var i=0;i<bidders.length;i++){
      cols.push(disp(bidders[i]));
    }
    cols.push("最安入札者（同額最安含む）");
    cols.push("最安（比較数値）");
    cols.push("入力（raw非空）");

    var lines = [];
    lines.push(cols.map(escCsv).join(","));

    for(var r=0;r<items.length;r++){
      var it = items[r] || {};
      var seq = (it.seq==null) ? "" : (""+it.seq);
      if(!seq) continue;

      var row = [
        seq,
        it.name||"",
        it.spec||"",
        (it.qty==null)?"":(""+it.qty),
        it.unit||"",
        it.note||""
      ];

      // 最安判定（数値化できたものだけ）
      var min=null, minIds=[], filled=0;
      for(var b=0;b<bidders.length;b++){
        var bidderId = bidders[b].bidderId;
        var cell = (pm[bidderId] && pm[bidderId][seq]) ? pm[bidderId][seq] : null;
        var raw = cell ? (""+(cell.raw||"")).trim() : "";
        if(raw!=="") filled++;
        row.push(raw); // rawそのまま（空は空）

        var num = (cell && typeof cell.num==="number") ? cell.num : null;
        if(num==null) continue;
        if(min==null || num<min){ min=num; minIds=[bidderId]; }
        else if(num===min){ minIds.push(bidderId); }
      }

      var minNames="";
      if(min!=null && minIds.length){
        var arr=[];
        for(var t=0;t<minIds.length;t++){
          var id = minIds[t];
          for(var u=0;u<bidders.length;u++){
            if(bidders[u].bidderId===id){ arr.push(disp(bidders[u])); break; }
          }
        }
        minNames = arr.join(" / ");
      }

      row.push(minNames);
      row.push(min==null?"":(""+min));
      row.push(filled+"/"+bidders.length);

      lines.push(row.map(escCsv).join(","));
    }

    var text = lines.join("\r\n");
    var fn = makeFileName("summary_item");
    dlText(fn, text);
    L("csv","export item OK rows="+(lines.length-1));
  }

  // [CSV-04] 入札者別CSV
  function exportBidder(){
    var S = window.SummaryState.get();
    var items = S.items || [];
    var bidders = S.bidders || [];
    var pm = S.priceMap || {};
    var disp = (window.SummaryRender && window.SummaryRender.bidderDisplay) ? window.SummaryRender.bidderDisplay : function(b){ return b.bidderId; };

    var cols = ["入札者","bidderId"];
    for(var i=0;i<items.length;i++){
      var seq = (items[i] && items[i].seq!=null) ? (""+items[i].seq) : "";
      if(!seq) continue;
      cols.push(seq);
    }
    cols.push("入力（raw非空）");

    var lines=[];
    lines.push(cols.map(escCsv).join(","));

    for(var b=0;b<bidders.length;b++){
      var bd = bidders[b];
      var id = bd.bidderId;
      var row = [ disp(bd), id ];

      var filled=0, total=0;
      var map = pm[id] || {};
      for(var k=0;k<items.length;k++){
        var seq2 = (items[k] && items[k].seq!=null) ? (""+items[k].seq) : "";
        if(!seq2) continue;
        total++;
        var cell = map[seq2];
        var raw = cell ? (""+(cell.raw||"")).trim() : "";
        if(raw!=="") filled++;
        row.push(raw);
      }
      row.push(filled+"/"+total);
      lines.push(row.map(escCsv).join(","));
    }

    var text = lines.join("\r\n");
    var fn = makeFileName("summary_bidder");
    dlText(fn, text);
    L("csv","export bidder OK rows="+(lines.length-1));
  }

  window.SummaryExport = {
    exportItem: exportItem,
    exportBidder: exportBidder
  };

  L("ver", TS+" "+FILE+" "+VER);
})();
