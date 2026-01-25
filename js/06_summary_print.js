/* [JST 2026-01-25 10:00]  06_summary_print.js v20260125-01
   [PRINT-01] 印刷（window.print）
*/
(function(){
  "use strict";
  var FILE="06_summary_print.js", VER="v20260125-01", TS=new Date().toISOString();
  if(!window.__APP_VER__){ window.__APP_VER__=[]; }
  window.__APP_VER__.push({ ts: TS, file: FILE, ver: VER });

  function L(tag,msg){
    try{ if(window.SummaryLog && window.SummaryLog.write) return window.SummaryLog.write(tag,msg); }catch(e){}
  }

  function doPrint(){
    try{
      window.print();
      L("print","OK");
    }catch(e){
      L("print","FAILED "+(e&&e.message?e.message:(""+e)));
      throw e;
    }
  }

  window.SummaryPrint = { doPrint: doPrint };
  L("ver", TS+" "+FILE+" "+VER);
})();
