/* [JST 2026-01-25 10:00]  02_summary_log.js v20260125-01
   [LOG-01] append-only ログ（Edge95想定）
*/
(function(){
  "use strict";
  var FILE="02_summary_log.js", VER="v20260125-01", TS=new Date().toISOString();
  if(!window.__APP_VER__){ window.__APP_VER__=[]; }
  window.__APP_VER__.push({ ts: TS, file: FILE, ver: VER });

  var _ta=null, _paused=false, _lines=[], _max=5000;

  function pad2(n){ return (n<10)?("0"+n):(""+n); }
  function nowJst(){
    var d=new Date();
    return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate())+" "
      +pad2(d.getHours())+":"+pad2(d.getMinutes())+":"+pad2(d.getSeconds())+"."
      +("00"+d.getMilliseconds()).slice(-3);
  }

  function write(tag,msg){
    var line="["+nowJst()+"] ["+tag+"] "+msg;
    _lines.push(line);
    if(_lines.length>_max){ _lines.shift(); }
    try{ console.log(line); }catch(e){}
    if(_ta && !_paused){
      try{
        _ta.value += line + "\n";
        _ta.scrollTop = _ta.scrollHeight;
      }catch(ex){}
    }
  }

  function bind(ta){
    _ta=ta;
    write("ver", TS+" "+FILE+" "+VER);
  }
  function clear(){
    _lines=[];
    if(_ta){ try{ _ta.value=""; }catch(e){} }
    write("log","cleared");
  }
  function setPaused(v){
    _paused=!!v;
    write("log", _paused?"paused":"resumed");
  }
  function togglePaused(){
    setPaused(!_paused);
    return _paused;
  }
  function getText(){ return _lines.join("\n"); }

  function copyAll(){
    var text = getText();
    if(!text){ write("copy","no log"); return Promise.resolve(false); }

    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text).then(function(){
        write("copy","OK (clipboard)");
        return true;
      }).catch(function(e){
        return fallbackCopy(text,e);
      });
    }
    return fallbackCopy(text,null);
  }

  function fallbackCopy(text, err){
    try{
      var tmp=document.createElement("textarea");
      tmp.value=text;
      tmp.setAttribute("readonly","readonly");
      tmp.style.position="fixed";
      tmp.style.left="-9999px";
      tmp.style.top="0";
      document.body.appendChild(tmp);
      tmp.select();
      tmp.setSelectionRange(0,tmp.value.length);
      var ok=false;
      try{ ok=document.execCommand("copy"); }catch(ex){ ok=false; }
      document.body.removeChild(tmp);
      write("copy", ok?"OK (execCommand)":"FAILED (execCommand)");
      if(!ok && err){ write("copy","reason="+(err&&err.message?err.message:(""+err))); }
      return Promise.resolve(ok);
    }catch(e){
      write("copy","FAILED "+(e&&e.message?e.message:(""+e)));
      return Promise.resolve(false);
    }
  }

  window.SummaryLog = {
    bind: bind,
    write: write,
    clear: clear,
    setPaused: setPaused,
    togglePaused: togglePaused,
    copyAll: copyAll
  };
})();
