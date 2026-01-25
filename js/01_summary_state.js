/* [JST 2026-01-25 10:00]  01_summary_state.js v20260125-01
   [ST-01] 集計ページ状態（単価契約：合計禁止）
*/
(function(){
  "use strict";
  var FILE="01_summary_state.js", VER="v20260125-01", TS=new Date().toISOString();
  if(!window.__APP_VER__){ window.__APP_VER__=[]; }
  window.__APP_VER__.push({ ts: TS, file: FILE, ver: VER });

  // [ST-02] アプリ状態（最小）
  var S = {
    bidNo: "",
    bidStatus: "",
    lastLoadedAt: "",
    // items: [{seq,name,spec,qty,unit,note}]
    items: [],
    // bidders: [{bidderId, companyName, displayName}]
    bidders: [],
    // priceMap[bidderId][seq] = { raw: string, num: number|null }
    priceMap: {},
    // view
    viewMode: "item", // "item" | "bidder"
    // options
    optHighlightMin: true,
    optHideEmptyBidders: false,
    optHideEmptyRows: false
  };

  window.SummaryState = {
    get: function(){ return S; },
    set: function(p){
      if(p && typeof p==="object"){
        for(var k in p){ if(Object.prototype.hasOwnProperty.call(p,k)) S[k]=p[k]; }
      }
    }
  };
})();
