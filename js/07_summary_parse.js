/* [JST 2026-01-25 12:35]  07_summary_parse.js v20260125-01
   [PARSE] 単価の数値化・比較用ユーティリティ
   要件:
     - 数値化できたものだけ比較（文字や空欄は除外）
     - 小数（例：12.5）を許容
     - カンマ区切り（1,234.56）を許容
     - 全角数字/全角小数点/全角マイナスを可能な範囲で吸収
     - 先頭末尾の空白は無視
     - "￥" や "円" 等は除去してよい（比較上の実用優先）

   公開API:
     - window.SummaryParse.toNumber(str) -> { ok:boolean, num:number, norm:string, reason:string }
     - window.SummaryParse.isNumeric(str) -> boolean
     - window.SummaryParse.normalize(str) -> string   // 表示用整形（軽い）
*/

(function(){
  "use strict";

  // ============================================================================
  // [PARSE-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "07_summary_parse.js";
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
  // [PARSE-01] 正規化（全角→半角、記号除去など）
  // ============================================================================
  function _trim(s){
    return (s == null) ? "" : ("" + s).replace(/^\s+|\s+$/g, "");
  }

  function _zenToHan(s){
    // 全角数字・全角英数のうち、数字と記号寄りだけ最小限対応
    // ０-９ → 0-9
    // ． → .
    // ， → ,
    // － → -
    // ￥ → （除去対象で後段）
    var t = s;
    t = t.replace(/[０-９]/g, function(ch){
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
    t = t.replace(/．/g, ".").replace(/，/g, ",").replace(/－/g, "-");
    return t;
  }

  function normalize(str){
    var s = _trim(str);
    if(!s) return "";

    s = _zenToHan(s);

    // 通貨・単位っぽいものを軽く除去（比較用）
    // 例: "1,000円" "￥100" "¥100" " 100 円 " 等
    s = s.replace(/[￥¥]/g, "");
    s = s.replace(/円/g, "");

    // 途中の空白は1個に縮退（ただし数値としては後で弾く）
    s = s.replace(/\s+/g, " ").trim();

    return s;
  }

  // ============================================================================
  // [PARSE-02] 数値化
  // ============================================================================
  function toNumber(str){
    var raw = (str == null) ? "" : ("" + str);
    var s = normalize(raw);

    if(!s){
      return { ok:false, num: NaN, norm:"", reason:"empty" };
    }

    // 空白が混ざる場合は数値扱いしない（例: "12 34"）
    // ※ただし先頭末尾の空白は既にtrim済み
    if(/\s/.test(s)){
      return { ok:false, num: NaN, norm:s, reason:"contains-space" };
    }

    // カンマ除去（千区切り想定）
    var s2 = s.replace(/,/g, "");

    // 数値っぽい形のみ許可
    //  -12
    //  12
    //  12.5
    //  .5 は許可しない（誤入力が多い想定）→必要なら許可に変更
    //  12. は許可しない
    if(!/^-?\d+(\.\d+)?$/.test(s2)){
      return { ok:false, num: NaN, norm:s, reason:"not-numeric" };
    }

    var n = Number(s2);
    if(isNaN(n)){
      return { ok:false, num: NaN, norm:s2, reason:"NaN" };
    }

    return { ok:true, num:n, norm:s2, reason:"" };
  }

  function isNumeric(str){
    return !!toNumber(str).ok;
  }

  // ============================================================================
  // [PARSE-03] 公開
  // ============================================================================
  window.SummaryParse = {
    FILE: FILE, VER: VER, TS: TS,
    normalize: normalize,
    toNumber: toNumber,
    isNumeric: isNumeric
  };

  // ============================================================================
  // [PARSE-04] 起動ログ
  // ============================================================================
  try{
    L("ver", TS + " " + FILE + " " + VER);
  }catch(e){}

})();
