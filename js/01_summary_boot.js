/* [JST 2026-01-25 11:45]  01_summary_boot.js v20260125-01
   [BOOT] 最速ロガー（外部JSが途中で死んでも必ずログが残る）
   目的:
     - ログを最優先で確立し、以後すべてのJSから同じAPIでログを出せるようにする
     - window.onerror / unhandledrejection を捕捉してログに出す
     - 画面の #txtLog に「追記」表示（append-only）する

   公開API:
     - window.SummaryLog.write(tag,msg)
     - window.SummaryLog.clear()
     - window.SummaryLog.setPaused(true/false)
     - window.SummaryLog.togglePaused()
     - window.SummaryLog.copyAll()   // Edge95/IEモード等フォールバック有り
     - window.SummaryLog.bindTextArea(textareaEl)

   運用:
     - index.html の txtLog は常設
     - ログ欄を触ったら自動停止（選択/コピーを邪魔しない）
*/

(function(){
  "use strict";

  // ============================================================================
  // [BOOT-00] ファイル情報（バージョン一覧用）
  // ============================================================================
  var FILE = "01_summary_boot.js";
  var VER  = "v20260125-01";
  var TS   = (function(){ try{ return new Date().toISOString(); }catch(e){ return ""; } })();

  if(!window.__APP_VER__){ window.__APP_VER__ = []; }
  window.__APP_VER__.push({ ts: TS, file: FILE, ver: VER });

  // ============================================================================
  // [BOOT-01] 内部状態
  // ============================================================================
  var _ta = null;       // textarea element (#txtLog)
  var _lines = [];      // すべてのログ行（内部保持）
  var _paused = false;  // 表示停止フラグ（ログ保持は継続）
  var _maxLines = 5000; // 無限増殖防止
  var _lastLine = "";   // 完全一致連打の抑制

  // ============================================================================
  // [BOOT-02] ユーティリティ
  // ============================================================================
  function _pad2(n){ return (n < 10) ? ("0" + n) : ("" + n); }

  function _nowJstStamp(){
    // 表示は端末時刻（JST運用前提）にする：現場で見やすい
    var d = new Date();
    return d.getFullYear() + "-" + _pad2(d.getMonth() + 1) + "-" + _pad2(d.getDate())
      + " " + _pad2(d.getHours()) + ":" + _pad2(d.getMinutes()) + ":" + _pad2(d.getSeconds())
      + "." + ("00" + d.getMilliseconds()).slice(-3);
  }

  function _appendToTextarea(line){
    if(!_ta) return;
    if(_paused) return;

    try{
      if(_ta.value){
        _ta.value += "\n" + line;
      }else{
        _ta.value = line;
      }
      _ta.scrollTop = _ta.scrollHeight;
    }catch(e){
      try{ console.log(line); }catch(ex){}
    }
  }

  function _pushLine(line){
    _lines.push(line);
    if(_lines.length > _maxLines){
      _lines.shift();
      // textarea再構築は重いので、ここでは内部だけ切り詰める（必要なら後日改善）
    }
  }

  // ============================================================================
  // [BOOT-03] 公開ログAPI
  // ============================================================================
  function write(tag, msg){
    var line = "[" + _nowJstStamp() + "] [" + tag + "] " + (msg == null ? "" : ("" + msg));

    // 完全一致の連打だけ抑制（必要最低限）
    if(line === _lastLine){
      return;
    }
    _lastLine = line;

    _pushLine(line);
    _appendToTextarea(line);

    try{ console.log(line); }catch(e){}
  }

  function clear(){
    _lines = [];
    _lastLine = "";
    if(_ta){
      try{ _ta.value = ""; }catch(e){}
    }
    // clear自体もログに残す（停止中でも内部保持される）
    _pushLine("[" + _nowJstStamp() + "] [log] cleared");
  }

  function setPaused(flag){
    _paused = !!flag;
    write("log", _paused ? "paused" : "resumed");
  }

  function togglePaused(){
    _paused = !_paused;
    write("log", _paused ? "paused" : "resumed");
    return _paused;
  }

  function getAllText(){
    return _lines.join("\n");
  }

  // ============================================================================
  // [BOOT-04] コピー（Edge95/IEモード対策で execCommand fallback）
  // ============================================================================
  function copyAll(){
    var text = getAllText();
    if(!text){
      write("copy", "no log to copy");
      return Promise.resolve(false);
    }

    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text).then(function(){
        write("copy", "OK (clipboard)");
        return true;
      }).catch(function(e){
        return _fallbackCopy(text, e);
      });
    }
    return _fallbackCopy(text, null);
  }

  function _fallbackCopy(text, err){
    try{
      var tmp = document.createElement("textarea");
      tmp.value = text;
      tmp.setAttribute("readonly", "readonly");
      tmp.style.position = "fixed";
      tmp.style.left = "-9999px";
      tmp.style.top = "0";
      document.body.appendChild(tmp);
      tmp.select();
      tmp.setSelectionRange(0, tmp.value.length);

      var ok = false;
      try{
        ok = document.execCommand("copy");
      }catch(ex){
        ok = false;
      }
      document.body.removeChild(tmp);

      write("copy", ok ? "OK (execCommand)" : "FAILED (execCommand)");
      if(!ok && err){
        write("copy", "reason=" + (err && err.message ? err.message : err));
      }
      return Promise.resolve(ok);
    }catch(e){
      write("copy", "FAILED (fallback) " + (e && e.message ? e.message : e));
      return Promise.resolve(false);
    }
  }

  // ============================================================================
  // [BOOT-05] ログ欄の接続
  //  - txtLog を bind するのは 12_summary_app.js でも実施するが、
  //    ここでも「最速」で接続できるよう用意しておく
  // ============================================================================
  function bindTextArea(textareaEl){
    _ta = textareaEl;

    if(_ta){
      // ログ欄を触ったら自動停止（選択/コピーを邪魔しない）
      _ta.addEventListener("focus", function(){
        _paused = true;
        _pushLine("[" + _nowJstStamp() + "] [log] auto-paused (textarea focused)");
      });

      _ta.addEventListener("blur", function(){
        _pushLine("[" + _nowJstStamp() + "] [log] textarea blurred (still paused until resumed)");
      });
    }
  }

  // ============================================================================
  // [BOOT-06] グローバル例外フック（途中で死んでも原因を残す）
  // ============================================================================
  function installGlobalErrorHook(){
    window.addEventListener("error", function(ev){
      try{
        var msg = ev && ev.message ? ev.message : "script error";
        var src = ev && ev.filename ? ev.filename : "";
        var ln  = ev && ev.lineno ? ev.lineno : "";
        var cn  = ev && ev.colno ? ev.colno : "";
        write("error", msg + " @" + src + ":" + ln + ":" + cn);
      }catch(e){}
    });

    window.addEventListener("unhandledrejection", function(ev){
      try{
        var r = ev && ev.reason ? ev.reason : "";
        var msg2 = (r && r.message) ? r.message : ("" + r);
        write("reject", msg2);
      }catch(e){}
    });
  }

  // ============================================================================
  // [BOOT-07] 公開
  // ============================================================================
  window.SummaryLog = {
    write: write,
    clear: clear,
    setPaused: setPaused,
    togglePaused: togglePaused,
    copyAll: copyAll,
    getAllText: getAllText,
    bindTextArea: bindTextArea,
    installGlobalErrorHook: installGlobalErrorHook
  };

  // ============================================================================
  // [BOOT-08] 起動ログ
  // ============================================================================
  try{
    write("ver", TS + " " + FILE + " " + VER);
    installGlobalErrorHook();
  }catch(e){}

})();
