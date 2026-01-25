/* [JST 2026-01-25 10:00]  03_summary_db.js v20260125-01
   [DB-01] Firestore 読み込み（単価契約：合計計算しない）
   - configは BidderConfig.FIREBASE_CONFIG を流用
*/
(function(){
  "use strict";
  var FILE="03_summary_db.js", VER="v20260125-01", TS=new Date().toISOString();
  if(!window.__APP_VER__){ window.__APP_VER__=[]; }
  window.__APP_VER__.push({ ts: TS, file: FILE, ver: VER });

  function L(tag,msg){
    try{ if(window.SummaryLog && window.SummaryLog.write) return window.SummaryLog.write(tag,msg); }catch(e){}
    try{ console.log("["+tag+"] "+msg); }catch(ex){}
  }
  function toStr(e){ try{ return (e&&e.message)?e.message:(""+e); }catch(x){ return ""+e; } }

  // [DB-02] Firebase初期化（既に初期化済みならスキップ）
  function ensureFirebase(){
    if(typeof window.firebase==="undefined" || !window.firebase || !window.firebase.firestore){
      throw new Error("Firebase SDK missing (firebase-*-compat.js)");
    }
    if(!window.BidderConfig || !window.BidderConfig.FIREBASE_CONFIG){
      throw new Error("BidderConfig.FIREBASE_CONFIG not found (../js/01_bidder_config.js)");
    }
    var cfg = window.BidderConfig.FIREBASE_CONFIG || {};
    var raw = JSON.stringify(cfg);
    if(raw.indexOf("YOUR_")>=0){
      throw new Error("Firebase config placeholder (YOUR_...)");
    }
    try{
      if(window.firebase.apps && window.firebase.apps.length){
        return true;
      }
    }catch(e){}
    window.firebase.initializeApp(cfg);
    return true;
  }

  function db(){ return window.firebase.firestore(); }
  function bidDoc(bidNo){ return db().collection("bids").doc(bidNo); }
  function itemsCol(bidNo){ return bidDoc(bidNo).collection("items"); }
  function offersCol(bidNo){ return bidDoc(bidNo).collection("offers"); }

  // [DB-03] 入札・品目・offers 全件ロード
  function loadAll(bidNo){
    ensureFirebase();
    if(!bidNo) throw new Error("bidNo is empty");

    var t0 = new Date().toISOString();
    L("load","start bidNo="+bidNo);

    var out = {
      bidNo: bidNo,
      bidStatus: "",
      lastLoadedAt: t0,
      items: [],
      bidders: [],
      priceMap: {} // bidderId -> seq -> {raw,num}
    };

    // 1) bids/{bidNo}
    return bidDoc(bidNo).get().then(function(snap){
      if(!snap.exists) throw new Error("bids/"+bidNo+" not found");
      var d = snap.data() || {};
      out.bidStatus = d.status || "";
      L("load","status="+out.bidStatus);
      // 2) items
      return itemsCol(bidNo).orderBy("seq").get();
    }).then(function(qs){
      var items=[];
      qs.forEach(function(doc){
        var d=doc.data()||{};
        items.push({
          id: doc.id,
          seq: d.seq,
          name: d.name||"",
          spec: d.spec||"",
          qty: d.qty,
          unit: d.unit||"",
          note: d.note||""
        });
      });
      out.items = items;
      L("load","items="+items.length);
      // 3) offers 全件（単価契約：欠けOK）
      return offersCol(bidNo).get();
    }).then(function(qs2){
      var bidders=[], priceMap={};
      qs2.forEach(function(doc){
        var d=doc.data()||{};
        var bidderId = d.bidderId || doc.id;
        var profile = d.profile || {};
        var companyName = profile.companyName || "";
        bidders.push({
          bidderId: bidderId,
          companyName: companyName
        });

        var lines = d.lines || {};
        if(!priceMap[bidderId]) priceMap[bidderId] = {};

        try{
          for(var k in lines){
            if(Object.prototype.hasOwnProperty.call(lines,k)){
              var raw = (lines[k]==null) ? "" : (""+lines[k]);
              // 数値化は render側で統一（ここでは raw 保存だけ）
              priceMap[bidderId][k] = { raw: raw, num: null };
            }
          }
        }catch(e){}
      });

      out.bidders = bidders;
      out.priceMap = priceMap;
      L("load","offers(bidders)="+bidders.length);
      return out;
    }).catch(function(e){
      L("load","FAILED "+toStr(e));
      throw e;
    });
  }

  window.SummaryDB = {
    loadAll: loadAll
  };
})();
