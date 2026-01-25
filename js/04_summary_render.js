/* [JST 2026-01-25 10:00]  04_summary_render.js v20260125-01
   [RENDER-01] 表描画（品目別/入札者別）
   - 合計一切なし
   - 最安: 数値化できたもののみ（小数OK）
*/
(function(){
  "use strict";
  var FILE="04_summary_render.js", VER="v20260125-01", TS=new Date().toISOString();
  if(!window.__APP_VER__){ window.__APP_VER__=[]; }
  window.__APP_VER__.push({ ts: TS, file: FILE, ver: VER });

  function $(id){ return document.getElementById(id); }
  function L(tag,msg){
    try{ if(window.SummaryLog && window.SummaryLog.write) return window.SummaryLog.write(tag,msg); }catch(e){}
  }
  function esc(s){
    return (""+(s==null?"":s))
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  // [RENDER-02] 全角→半角（数字・小数点・カンマ）
  function z2hNum(s){
    var out = "";
    for(var i=0;i<s.length;i++){
      var c = s.charCodeAt(i);
      // ０(FF10)～９(FF19)
      if(c>=0xFF10 && c<=0xFF19){
        out += String.fromCharCode(c - 0xFF10 + 0x30);
      }else if(c===0xFF0E){ // ．
        out += ".";
      }else if(c===0xFF0C){ // ，
        out += ",";
      }else{
        out += s.charAt(i);
      }
    }
    return out;
  }

  // [RENDER-03] 単価文字列→数値（比較用）。変換不能は null
  function toNum(raw){
    if(raw==null) return null;
    var s = (""+raw).trim();
    if(!s) return null;
    s = z2hNum(s);
    // カンマ除去
    s = s.replace(/,/g,"");
    // 通貨記号等を軽く除去（残ってparseFloat不可ならnull）
    s = s.replace(/[￥¥\s]/g,"");
    // 先頭に文字がある場合は parseFloat が落ちやすいので、数字/./- 以外を除去（過剰変換は避ける）
    // 例: "単価12.5" のようなケースは想定外だが、数値だけ拾うより安全にnullにするため、ここでは厳しめにする
    // → 厳しすぎる場合は運用で調整
    if(!/^-?\d+(\.\d+)?$/.test(s)) return null;
    var n = parseFloat(s);
    if(!isFinite(n)) return null;
    return n;
  }

  // [RENDER-04] bidder表示名
  function bidderDisplay(b){
    var c = (b && b.companyName) ? (""+b.companyName).trim() : "";
    var id = (b && b.bidderId) ? (""+b.bidderId).trim() : "";
    if(c && id) return c + "（" + id + "）";
    if(c) return c;
    return id || "-";
  }

  // [RENDER-05] 状態欄
  function renderHeader(){
    var S = window.SummaryState.get();
    if($("lblBidNo")) $("lblBidNo").textContent = S.bidNo || "-";
    if($("lblBidStatus")) $("lblBidStatus").textContent = S.bidStatus || "-";
    if($("lblLastLoadedAt")) $("lblLastLoadedAt").textContent = S.lastLoadedAt || "-";
  }

  // [RENDER-06] オプション読み取り（DOM→state）
  function readOptionsFromDom(){
    var S = window.SummaryState.get();
    if($("chkHighlightMin")) S.optHighlightMin = !!$("chkHighlightMin").checked;
    if($("chkHideEmptyBidders")) S.optHideEmptyBidders = !!$("chkHideEmptyBidders").checked;
    if($("chkHideEmptyRows")) S.optHideEmptyRows = !!$("chkHideEmptyRows").checked;
    window.SummaryState.set(S);
  }

  // [RENDER-07] priceMap に num を埋める（raw → num）
  function computeNums(){
    var S = window.SummaryState.get();
    var pm = S.priceMap || {};
    for(var bidderId in pm){
      if(!Object.prototype.hasOwnProperty.call(pm,bidderId)) continue;
      var row = pm[bidderId] || {};
      for(var seq in row){
        if(!Object.prototype.hasOwnProperty.call(row,seq)) continue;
        var cell = row[seq] || {};
        cell.num = toNum(cell.raw);
        row[seq] = cell;
      }
      pm[bidderId] = row;
    }
    S.priceMap = pm;
    window.SummaryState.set(S);
  }

  // [RENDER-08] 「全品目未入力の入札者」判定（rawが全て空なら未入力とする）
  function isEmptyBidder(bidderId){
    var S = window.SummaryState.get();
    var pm = S.priceMap || {};
    var row = pm[bidderId] || {};
    // itemsのseq集合でチェック（価格が入っているものだけではなく、全品目に対して空かを判定）
    var items = S.items || [];
    for(var i=0;i<items.length;i++){
      var seq = (items[i] && items[i].seq!=null) ? (""+items[i].seq) : "";
      if(!seq) continue;
      var cell = row[seq];
      if(cell && (""+(cell.raw||"")).trim()!=="") return false;
    }
    return true;
  }

  // [RENDER-09] 「すべて未入力の品目行」判定（全入札者の raw が空）
  function isEmptyItemRow(seq){
    var S = window.SummaryState.get();
    var bidders = S.bidders || [];
    var pm = S.priceMap || {};
    for(var i=0;i<bidders.length;i++){
      var id = bidders[i].bidderId;
      var row = pm[id] || {};
      var cell = row[seq];
      if(cell && (""+(cell.raw||"")).trim()!=="") return false;
    }
    return true;
  }

  // [RENDER-10] 品目別描画
  function renderItemView(){
    readOptionsFromDom();
    computeNums();

    var S = window.SummaryState.get();
    var items = S.items || [];
    var biddersAll = S.bidders || [];
    var pm = S.priceMap || {};

    // 入札者列のフィルタ（全品目未入力を隠す）
    var bidders = [];
    for(var b=0;b<biddersAll.length;b++){
      var bi = biddersAll[b];
      if(S.optHideEmptyBidders && isEmptyBidder(bi.bidderId)) continue;
      bidders.push(bi);
    }

    // ヘッダ
    var thead = $("theadItem");
    if(!thead) return;
    var h = "<tr>"
      + "<th style='width:70px;'>番号</th>"
      + "<th style='min-width:220px;'>品名／規格</th>"
      + "<th style='width:120px;'>予定数量</th>"
      + "<th style='width:120px;'>備考</th>";

    for(var j=0;j<bidders.length;j++){
      h += "<th style='min-width:160px;'>" + esc(bidderDisplay(bidders[j])) + "</th>";
    }

    h += "<th style='min-width:160px;'>最安（同額最安含む）</th>"
      + "<th style='width:90px;'>入力</th>"
      + "</tr>";
    thead.innerHTML = h;

    // 本文
    var tbody = $("tbodyItem");
    if(!tbody) return;

    if(!items.length){
      tbody.innerHTML = "<tr><td colspan='"+(6+bidders.length)+"' class='empty'>品目なし</td></tr>";
      return;
    }

    var rowsHtml = "";
    for(var i=0;i<items.length;i++){
      var it = items[i] || {};
      var seq = (it.seq==null) ? "" : (""+it.seq);
      if(!seq) continue;

      if(S.optHideEmptyRows && isEmptyItemRow(seq)) continue;

      var name = it.name || "";
      var spec = it.spec || "";
      var qty  = (it.qty==null) ? "" : (""+it.qty);
      var unit = it.unit || "";
      var note = it.note || "";

      // 最安判定（numがあるものだけ）
      var min = null;
      var minIds = []; // bidderId
      var filled = 0;

      // 1) min探索
      for(var k=0;k<bidders.length;k++){
        var bidderId = bidders[k].bidderId;
        var cell = (pm[bidderId] && pm[bidderId][seq]) ? pm[bidderId][seq] : null;

        var raw = cell ? (cell.raw||"") : "";
        if((""+raw).trim()!=="") filled++;

        var n = cell ? cell.num : null;
        if(n==null) continue;
        if(min==null || n<min){
          min = n;
          minIds = [bidderId];
        }else if(n===min){
          minIds.push(bidderId);
        }
      }

      // 2) 行出力
      rowsHtml += "<tr>";
      rowsHtml += "<td>"+esc(seq)+"</td>";
      rowsHtml += "<td class='td2line'>"+esc(name)+"<span class='sub'>"+esc(spec)+"</span></td>";
      rowsHtml += "<td>"+esc(qty)+(unit?(" "+esc(unit)):"")+"</td>";
      rowsHtml += "<td>"+esc(note)+"</td>";

      // 3) セル（最安ハイライト）
      for(var m=0;m<bidders.length;m++){
        var bidderId2 = bidders[m].bidderId;
        var cell2 = (pm[bidderId2] && pm[bidderId2][seq]) ? pm[bidderId2][seq] : null;
        var raw2 = cell2 ? (""+(cell2.raw||"")).trim() : "";
        var disp = raw2 ? raw2 : "—";

        var cls = "";
        if(S.optHighlightMin && min!=null && cell2 && cell2.num!=null && cell2.num===min){
          cls = "mincell" + (minIds.length>1 ? " tie" : "");
        }
        rowsHtml += "<td class='"+cls+"'>"+esc(disp)+"</td>";
      }

      // 4) 最安入札者表示（同額最安は列挙）
      var minText = "—";
      if(min!=null && minIds.length){
        var names=[];
        for(var t=0;t<minIds.length;t++){
          // bidderId→表示名
          var bid = minIds[t];
          for(var u=0;u<bidders.length;u++){
            if(bidders[u].bidderId===bid){ names.push(bidderDisplay(bidders[u])); break; }
          }
        }
        // minの数値は“比較用”。表示は運用誤解を避けるため「最安入札者」を主にし、数値は括弧で補助表示
        minText = names.join(" / ") + "（最安=" + min + "）";
      }

      rowsHtml += "<td>"+esc(minText)+"</td>";
      rowsHtml += "<td>"+esc(filled)+"/"+esc(bidders.length)+"</td>";
      rowsHtml += "</tr>";
    }

    if(!rowsHtml){
      rowsHtml = "<tr><td colspan='"+(6+bidders.length)+"' class='empty'>表示対象なし（フィルタ条件で全て除外）</td></tr>";
    }
    tbody.innerHTML = rowsHtml;
  }

  // [RENDER-11] 入札者別描画
  function renderBidderView(){
    readOptionsFromDom();
    computeNums();

    var S = window.SummaryState.get();
    var items = S.items || [];
    var biddersAll = S.bidders || [];
    var pm = S.priceMap || {};

    // biddersフィルタ
    var bidders = [];
    for(var b=0;b<biddersAll.length;b++){
      var bi = biddersAll[b];
      if(S.optHideEmptyBidders && isEmptyBidder(bi.bidderId)) continue;
      bidders.push(bi);
    }

    // ヘッダ：入札者 + 各品目seq + 入力率
    var thead = $("theadBidder");
    if(!thead) return;

    var h = "<tr>"
      + "<th style='min-width:220px;'>入札者</th>";
    for(var i=0;i<items.length;i++){
      var seq = (items[i] && items[i].seq!=null) ? (""+items[i].seq) : "";
      if(!seq) continue;
      if(S.optHideEmptyRows && isEmptyItemRow(seq)) continue;
      h += "<th style='min-width:120px;'>"+esc(seq)+"</th>";
    }
    h += "<th style='width:90px;'>入力</th></tr>";
    thead.innerHTML = h;

    var tbody = $("tbodyBidder");
    if(!tbody) return;

    if(!bidders.length){
      tbody.innerHTML = "<tr><td colspan='3' class='empty'>入札者なし（またはフィルタで除外）</td></tr>";
      return;
    }

    // 本文
    var rowsHtml = "";
    for(var j=0;j<bidders.length;j++){
      var bd = bidders[j];
      var id = bd.bidderId;
      var row = pm[id] || {};

      var filled=0, total=0;

      rowsHtml += "<tr>";
      rowsHtml += "<td>"+esc(bidderDisplay(bd))+"</td>";

      for(var k=0;k<items.length;k++){
        var seq2 = (items[k] && items[k].seq!=null) ? (""+items[k].seq) : "";
        if(!seq2) continue;
        if(S.optHideEmptyRows && isEmptyItemRow(seq2)) continue;

        total++;
        var cell = row[seq2];
        var raw = cell ? (""+(cell.raw||"")).trim() : "";
        if(raw!=="") filled++;

        rowsHtml += "<td>"+esc(raw!==""?raw:"—")+"</td>";
      }

      rowsHtml += "<td>"+filled+"/"+total+"</td>";
      rowsHtml += "</tr>";
    }

    tbody.innerHTML = rowsHtml;
  }

  // [RENDER-12] ビュー切替
  function setView(mode){
    var S = window.SummaryState.get();
    S.viewMode = mode;
    window.SummaryState.set(S);

    var cardItem = $("cardItemView");
    var cardBid  = $("cardBidderView");
    if(cardItem) cardItem.style.display = (mode==="item") ? "block" : "none";
    if(cardBid)  cardBid.style.display  = (mode==="bidder") ? "block" : "none";

    // ボタン見た目
    var b1=$("btnViewItem"), b2=$("btnViewBidder");
    if(b1 && b2){
      if(mode==="item"){
        b1.className="";
        b2.className="secondary";
      }else{
        b1.className="secondary";
        b2.className="";
      }
    }

    renderCurrent();
  }

  function renderCurrent(){
    renderHeader();
    var S = window.SummaryState.get();
    if(S.viewMode==="bidder") renderBidderView();
    else renderItemView();
  }

  window.SummaryRender = {
    renderAll: renderCurrent,
    setView: setView,
    // export用に公開
    bidderDisplay: bidderDisplay,
    toNum: toNum
  };

  L("ver", TS+" "+FILE+" "+VER);
})();
