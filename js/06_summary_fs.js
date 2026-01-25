/* [JST 2026-01-25 12:25]  06_summary_fs.js v20260125-01
   [FS] Firestore 読み込みAPI（summary用）
   目的:
     - bids/{bidNo} を取得（status等）
     - bids/{bidNo}/items を取得（seq,name,spec,qty,unit,note）
     - bids/{bidNo}/offers を取得（bidderId, profile.companyName, lines）
       ※単価契約：合計は計算しない。linesの単価のみ扱う。

   読込方針:
     - role許可されている場合のみ呼び出す（05で制御）
     - offer の lines は "seq文字列 -> 単価文字列" を想定
     - bidderは全単価を入れていない想定（欠損OK）

   公開API:
     - window.SummaryFS.loadAll(bidNo) -> Promise<{bid, items, offers}>
     - window.SummaryFS.loadBid(bidNo)
     - window.SummaryFS.loadItems(bidNo)
     - window.SummaryFS.loadOffers(bidNo)

   返却データ:
     bid: { bidNo, status, raw }
     items: [{ seq, name, spec, qty, unit, note, raw }]
     offers: [{
       bidderId,
       companyName,        // profile.companyName (無ければ "")
       lines,              // { seqStr: unitPriceStr }
       raw
     }]

   注意:
     - Firestore ルールで summary(admin/ope) が参照できる必要がある
*/

(function(){
  "use strict";

  // ============================================================================
  // [FS-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "06_summary_fs.js";
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

  function toStr(x){
    try{ return (x && x.message) ? x.message : ("" + x); }catch(e){ return "" + x; }
  }

  function ensureInit(){
    if(!window.SummaryAuth || !window.SummaryAuth.ensureFirebaseInit){
      throw new Error("SummaryAuth not ready");
    }
    window.SummaryAuth.ensureFirebaseInit();
    if(!window.firebase || !window.firebase.firestore){
      throw new Error("firebase.firestore not available");
    }
  }

  function _db(){
    return window.firebase.firestore();
  }

  function _colName(name, fallback){
    try{
      if(window.SummaryEnv && window.SummaryEnv.COLLECTIONS && window.SummaryEnv.COLLECTIONS[name]){
        return window.SummaryEnv.COLLECTIONS[name];
      }
    }catch(e){}
    return fallback;
  }

  function _bidDocRef(bidNo){
    var bids = _colName("bids", "bids");
    return _db().collection(bids).doc(bidNo);
  }

  function _itemsColRef(bidNo){
    return _bidDocRef(bidNo).collection("items");
  }

  function _offersColRef(bidNo){
    return _bidDocRef(bidNo).collection("offers");
  }

  // ============================================================================
  // [FS-01] bids/{bidNo}
  // ============================================================================
  function loadBid(bidNo){
    ensureInit();

    if(!bidNo) return Promise.reject(new Error("bidNo が空です"));

    L("fs", "loadBid start bidNo=" + bidNo);

    return _bidDocRef(bidNo).get().then(function(snap){
      if(!snap.exists){
        throw new Error("bids/" + bidNo + " が存在しません");
      }
      var d = snap.data() || {};
      var status = d.status || "";
      L("fs", "loadBid OK status=" + status);

      return {
        bidNo: bidNo,
        status: status,
        raw: d
      };
    }).catch(function(e){
      L("fs", "loadBid FAILED " + toStr(e));
      throw e;
    });
  }

  // ============================================================================
  // [FS-02] bids/{bidNo}/items
  // ============================================================================
  function loadItems(bidNo){
    ensureInit();

    if(!bidNo) return Promise.reject(new Error("bidNo が空です"));

    L("fs", "loadItems start bidNo=" + bidNo);

    return _itemsColRef(bidNo).orderBy("seq").get().then(function(qs){
      var arr = [];
      qs.forEach(function(doc){
        var d = doc.data() || {};
        arr.push({
          id: doc.id,
          seq: d.seq,
          name: d.name || "",
          spec: d.spec || "",
          qty: d.qty,
          unit: d.unit || "",
          note: d.note || "",
          raw: d
        });
      });
      L("fs", "loadItems OK count=" + arr.length);
      return arr;
    }).catch(function(e){
      L("fs", "loadItems FAILED " + toStr(e));
      throw e;
    });
  }

  // ============================================================================
  // [FS-03] bids/{bidNo}/offers
  // ============================================================================
  function loadOffers(bidNo){
    ensureInit();

    if(!bidNo) return Promise.reject(new Error("bidNo が空です"));

    L("fs", "loadOffers start bidNo=" + bidNo);

    return _offersColRef(bidNo).get().then(function(qs){
      var arr = [];
      qs.forEach(function(doc){
        var d = doc.data() || {};
        var bidderId = d.bidderId || doc.id || "";
        var prof = d.profile || {};
        var companyName = prof.companyName || "";

        // lines: seqStr -> unitPriceStr
        var lines = {};
        try{
          var l = d.lines || {};
          for(var k in l){
            if(Object.prototype.hasOwnProperty.call(l, k)){
              lines[k] = l[k];
            }
          }
        }catch(e){}

        arr.push({
          id: doc.id,
          bidderId: bidderId,
          companyName: companyName,
          lines: lines,
          raw: d
        });
      });

      L("fs", "loadOffers OK count=" + arr.length);
      return arr;
    }).catch(function(e){
      L("fs", "loadOffers FAILED " + toStr(e));
      throw e;
    });
  }

  // ============================================================================
  // [FS-04] 全部まとめて取得
  // ============================================================================
  function loadAll(bidNo){
    ensureInit();

    // bids → items/offers の順で読みやすくログ
    return loadBid(bidNo).then(function(bid){
      return loadItems(bidNo).then(function(items){
        return loadOffers(bidNo).then(function(offers){
          return { bid: bid, items: items, offers: offers };
        });
      });
    });
  }

  // ============================================================================
  // [FS-05] 公開
  // ============================================================================
  window.SummaryFS = {
    FILE: FILE, VER: VER, TS: TS,
    loadBid: loadBid,
    loadItems: loadItems,
    loadOffers: loadOffers,
    loadAll: loadAll
  };

  // ============================================================================
  // [FS-06] 起動ログ
  // ============================================================================
  try{
    L("ver", TS + " " + FILE + " " + VER);
  }catch(e){}

})();
