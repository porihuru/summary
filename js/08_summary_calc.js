/* [JST 2026-01-25 12:45]  08_summary_calc.js v20260125-01
   [CALC] 最安判定ロジック（単価契約：合計は一切出さない）
   要件:
     - 最安ハイライト（品目ごと）
     - 同額最安対応（同じ最安値が複数なら全員最安扱い）
     - 比較対象は「数値化できた単価のみ」（空欄/文字は除外）
     - 小数OK（07_parseの toNumber に従う）
     - 入札者は全部の単価を入れない（欠損OK）

   入力:
     items: [{ seq, name, spec, ... }]
     offers: [{
       bidderId,
       companyName,
       lines: { seqStr: unitPriceStr }
     }]

   出力:
     result = {
       itemSeqs: ["1","2",...],        // 文字列
       bidders: [{ bidderId, companyName }],  // 表示用
       cells: {                         // cells[seq][bidderId] = cellInfo
         "1": {
           "332b001": { raw:"12.5", ok:true, num:12.5, isMin:true, minTieCount:2 },
           ...
         }
       },
       mins: {                          // mins[seq] = { hasMin:boolean, minValue:number, winners:[bidderId...] }
         "1": { hasMin:true, minValue:12.5, winners:["332b001","332b009"] }
       }
     }

   公開API:
     - window.SummaryCalc.build(items, offers) -> result
*/

(function(){
  "use strict";

  // ============================================================================
  // [CALC-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "08_summary_calc.js";
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
  // [CALC-01] ヘルパー
  // ============================================================================
  function _seqStr(x){
    if(x == null) return "";
    return ("" + x).trim();
  }

  function _parsePrice(raw){
    // 07_summary_parse.js に委譲（無い場合は簡易）
    try{
      if(window.SummaryParse && window.SummaryParse.toNumber){
        return window.SummaryParse.toNumber(raw);
      }
    }catch(e){}
    // fallback
    var s = (raw == null) ? "" : ("" + raw).replace(/,/g,"").trim();
    if(!s) return { ok:false, num:NaN, norm:"", reason:"empty" };
    var n = Number(s);
    if(isNaN(n)) return { ok:false, num:NaN, norm:s, reason:"NaN" };
    return { ok:true, num:n, norm:s, reason:"" };
  }

  // ============================================================================
  // [CALC-02] 主要処理
  // ============================================================================
  function build(items, offers){
    items = items || [];
    offers = offers || [];

    // bidder一覧
    var bidders = [];
    for(var i=0;i<offers.length;i++){
      var o = offers[i] || {};
      bidders.push({
        bidderId: o.bidderId || "",
        companyName: o.companyName || ""
      });
    }

    // seq一覧（文字列で統一）
    var itemSeqs = [];
    for(var j=0;j<items.length;j++){
      var it = items[j] || {};
      var seq = _seqStr(it.seq);
      if(seq) itemSeqs.push(seq);
    }

    // cells 初期化
    var cells = {}; // cells[seq][bidderId] = cellInfo
    for(var a=0;a<itemSeqs.length;a++){
      cells[itemSeqs[a]] = {};
    }

    // 各セルの解析（raw/ok/num）
    for(var bi=0;bi<offers.length;bi++){
      var off = offers[bi] || {};
      var bidderId = off.bidderId || "";
      var lines = off.lines || {};

      for(var si=0;si<itemSeqs.length;si++){
        var seq2 = itemSeqs[si];
        var raw = (lines && Object.prototype.hasOwnProperty.call(lines, seq2)) ? lines[seq2] : "";
        var parsed = _parsePrice(raw);

        if(!cells[seq2]) cells[seq2] = {};
        cells[seq2][bidderId] = {
          raw: (raw == null ? "" : ("" + raw)),
          ok: !!parsed.ok,
          num: parsed.ok ? parsed.num : NaN,
          norm: parsed.norm || "",
          reason: parsed.reason || "",
          isMin: false,
          minTieCount: 0
        };
      }
    }

    // 最安判定（品目ごと）
    var mins = {}; // mins[seq] = { hasMin, minValue, winners[] }
    for(var si2=0;si2<itemSeqs.length;si2++){
      var seq3 = itemSeqs[si2];
      var row = cells[seq3] || {};

      var minVal = null;
      var winners = [];

      // 1) 最小値探索（okのみ）
      for(var b2=0;b2<bidders.length;b2++){
        var bidId = bidders[b2].bidderId;
        var c = row[bidId];
        if(!c || !c.ok) continue;

        if(minVal === null || c.num < minVal){
          minVal = c.num;
        }
      }

      // 2) 同値最安抽出
      if(minVal !== null){
        for(var b3=0;b3<bidders.length;b3++){
          var bidId2 = bidders[b3].bidderId;
          var c2 = row[bidId2];
          if(!c2 || !c2.ok) continue;

          // 浮動小数誤差対策：小数許容なので完全一致ではなく差で判定
          // ただし入力値は通常 "文字→Number" なので誤差は限定的
          if(Math.abs(c2.num - minVal) < 1e-9){
            winners.push(bidId2);
          }
        }
      }

      mins[seq3] = {
        hasMin: (minVal !== null),
        minValue: (minVal !== null) ? minVal : NaN,
        winners: winners
      };

      // 3) cellsへ反映
      var tieCount = winners.length;
      if(tieCount){
        for(var w=0;w<winners.length;w++){
          var wid = winners[w];
          if(row[wid]){
            row[wid].isMin = true;
            row[wid].minTieCount = tieCount;
          }
        }
      }
    }

    var result = {
      itemSeqs: itemSeqs,
      bidders: bidders,
      cells: cells,
      mins: mins
    };

    L("calc", "build OK items=" + itemSeqs.length + " bidders=" + bidders.length);
    return result;
  }

  // ============================================================================
  // [CALC-03] 公開
  // ============================================================================
  window.SummaryCalc = {
    FILE: FILE, VER: VER, TS: TS,
    build: build
  };

  // ============================================================================
  // [CALC-04] 起動ログ
  // ============================================================================
  try{
    L("ver", TS + " " + FILE + " " + VER);
  }catch(e){}

})();
