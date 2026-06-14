// ====== 图表渲染 ======

var barCanvas=document.getElementById('barChart');

function drawBarChart(){
  var showSim=document.getElementById('simToggle').checked;
  var fcomps=getFilteredComps();
  var all=(showSim?simTeams.map(function(st){var tr=simRanksToObj(st.ranks||[]),s=computeScores(tr,null,fcomps);return{name:st.name,total:s.total,frontSum:s.frontSum,stableAvg:s.stableAvg,_ranks:tr,_sim:true,rank:0,tier:'tsim',count:Object.values(tr).filter(function(v){return v!==null&&v!==undefined&&v!=='';}).length,tw:0};}).concat(teams):teams);
  all.sort(function(a,b){var va=a[sortBy]||0,vb=b[sortBy]||0;if(vb!==va)return vb-va;if(sortBy==='count')return (b.tw||0)-(a.tw||0);return 0;});
  all.forEach(function(t,i){t.rank=i+1;});

  var canvas=barCanvas,ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1;
  var minW=window.innerWidth<=768?280:560;
  var cssW=Math.max(canvas.parentElement.clientWidth-20,minW),cssH=250;
  canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';
  canvas.width=cssW*dpr;canvas.height=cssH*dpr;ctx.scale(dpr,dpr);

  var ceilY=sortBy==='stableAvg'?100:sortBy==='count'||sortBy==='achCount'?30:500;
  var isMob=window.innerWidth<=768;
  var pad=isMob?{top:44,right:10,bottom:20,left:35}:{top:44,right:16,bottom:56,left:50};
  var pw=cssW-pad.left-pad.right,ph=cssH-pad.top-pad.bottom;
  var n=all.length,colW=isMob?Math.max(6,Math.min(20,pw/(n*1.3+1))):20,gap=(pw-colW*n)/(n+1);

  ctx.clearRect(0,0,cssW,cssH);

  var labels={total:'总分',frontSum:'累积分',stableAvg:'稳定分',count:'参赛数',achCount:'成就数'};
  ctx.fillStyle='#888';ctx.font='12px sans-serif';ctx.textAlign='left';
  ctx.fillText(labels[sortBy]||'',8,18);

  var step=sortBy==='stableAvg'?20:sortBy==='count'||sortBy==='achCount'?5:100;
  ctx.setLineDash([4,3]);ctx.strokeStyle='#e0e0e0';ctx.lineWidth=1;
  for(var v=step;v<=ceilY;v+=step){
    var gy=pad.top+ph*(1-v/ceilY);
    ctx.beginPath();ctx.moveTo(pad.left,gy);ctx.lineTo(cssW-pad.right,gy);ctx.stroke();
    ctx.fillStyle='#ccc';ctx.font='10px sans-serif';ctx.textAlign='right';
    ctx.fillText(v,pad.left-4,gy+4);
  }
  ctx.setLineDash([]);

  ctx.strokeStyle='#ccc';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pad.left,pad.top-8);ctx.lineTo(pad.left,cssH-pad.bottom);ctx.stroke();

  var prevTier='';
  all.forEach(function(t,i){
    var x=pad.left+gap+i*(colW+gap);
    var val=t[sortBy]||0;
    var h=Math.max(2,val/ceilY*ph);
    var isSim=!!t._sim;
    var color;if(isSim)color='#ccc';else if(t.tier==='tw')color='#333';else if(t.tier==='t0')color='#E74C3C';else if(t.tier==='t1')color='#F0A030';else if(t.tier==='t2')color='#9B7CB8';else if(t.tier==='t3')color='#5B9BD5';else color='#5DA85D';
    ctx.fillStyle=color;ctx.fillRect(x,pad.top+ph-h,colW,h);

    if(isMob){
      var curTier=t.tier||(isSim?'tsim':'t4');
      if(curTier!==prevTier){
        ctx.fillStyle='#444';ctx.font='bold 9px sans-serif';ctx.textAlign='left';
        var ny=pad.top+ph-h-4;if(ny<pad.top-8)ny=pad.top-8;
        ctx.fillText(val.toFixed(1),x,ny);
        prevTier=curTier;
      }
    }else{
      ctx.fillStyle='#444';ctx.font='bold 10px sans-serif';ctx.textAlign='center';
      var ny2=pad.top+ph-h-4;if(ny2<pad.top-8)ny2=pad.top-8;
      ctx.fillText(val.toFixed(1),x+colW/2,ny2);
      ctx.fillStyle='#333';ctx.font='10px sans-serif';ctx.textAlign='right';
      ctx.save();ctx.translate(x+colW/2+8,cssH-pad.bottom+10);ctx.rotate(-0.4);
      ctx.fillText(t.name||'',0,0);ctx.restore();
    }
  });
}

// 队伍图表
function chartY(r,ph,pad){return pad.top+ph*Math.pow((r-1)/49,0.4);}

function drawChart(tname){
  var canvas=tchart,ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1;
  var cssH=280;
  requestAnimationFrame(function(){
  var cssW=thist.clientWidth;var minW=window.innerWidth<=768?280:500;if(!cssW||cssW<minW)cssW=minW;
  canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';
  canvas.width=cssW*dpr;canvas.height=cssH*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  var isSim=tname.indexOf('__sim__')===0;var simName=isSim?tname.slice(7):'';
  var tr=isSim?simRanksToObj((simTeams.find(function(st){return st.name===simName;})||{}).ranks||[]):(rankings[tname]||{});
  var pad={top:22,right:50,bottom:40,left:34};
  var fcomps=getFilteredComps();
  var pw=cssW-pad.left-pad.right,ph=cssH-pad.top-pad.bottom,maxR=50,maxScore=500;

  ctx.clearRect(0,0,cssW,cssH);

  ctx.setLineDash([4,3]);ctx.strokeStyle='#f0e0d0';ctx.lineWidth=1;
  ctx.fillStyle='#d4a080';ctx.font='10px sans-serif';ctx.textAlign='left';
  for(var s=100;s<=500;s+=100){
    var gy=pad.top+ph*(1-s/maxScore);
    ctx.beginPath();ctx.moveTo(pad.left,gy);ctx.lineTo(cssW-pad.right,gy);ctx.stroke();
    ctx.fillText(s,cssW-pad.right+4,gy+4);
  }
  ctx.setLineDash([]);

  ctx.strokeStyle='#eee';ctx.lineWidth=1;
  [1,10,20,30,40,50].forEach(function(r){var gy=chartY(r,ph,pad);ctx.beginPath();ctx.moveTo(pad.left,gy);ctx.lineTo(cssW-pad.right,gy);ctx.stroke();});
  ctx.strokeStyle='#ccc';ctx.beginPath();ctx.moveTo(pad.left,pad.top);ctx.lineTo(pad.left,cssH-pad.bottom);ctx.stroke();
  ctx.beginPath();ctx.moveTo(pad.left,cssH-pad.bottom);ctx.lineTo(cssW-pad.right,cssH-pad.bottom);ctx.stroke();
  ctx.fillStyle='#bbb';ctx.font='11px sans-serif';ctx.textAlign='right';
  [1,10,20,30,40,50].forEach(function(r){ctx.fillText(r,pad.left-4,chartY(r,ph,pad)+4);});
  ctx.textAlign='right';ctx.fillStyle='#bbb';ctx.font='10px sans-serif';
  var fcompsSorted=fcomps.slice().sort(function(a,b){return epochs[a.id]-epochs[b.id];});
  var tMin=epochs[fcompsSorted[0].id],tMax=Date.now(),tSpan=Math.max(tMax-tMin,1);
  function tX(ep){return pad.left+(ep-tMin)/tSpan*pw;}
  fcompsSorted.forEach(function(c){ctx.save();ctx.translate(tX(epochs[c.id]),cssH-pad.bottom+8);ctx.rotate(-0.6);ctx.fillText(c.id,0,0);ctx.restore();});

  var scoreCurve=[],acc=[];
  var tierFill={tw:'rgba(51,51,51,0.35)',t0:'rgba(231,76,60,0.35)',t1:'rgba(240,160,48,0.35)',t2:'rgba(155,124,184,0.35)',t3:'rgba(91,155,213,0.35)',t4:'rgba(93,168,93,0.35)'};
  var tierStroke={tw:'rgba(51,51,51,0.5)',t0:'rgba(231,76,60,0.5)',t1:'rgba(240,160,48,0.5)',t2:'rgba(155,124,184,0.5)',t3:'rgba(91,155,213,0.5)',t4:'rgba(93,168,93,0.5)'};
  function tierOf(s){return s>=500?'tw':s>=300?'t0':s>=200?'t1':s>=100?'t2':s>=25?'t3':'t4';}
  for(var ci=0;ci<fcompsSorted.length;ci++){
    var c=fcompsSorted[ci],curEp=epochs[c.id],r=tr[c.id];
    if(r!==null&&r!==undefined&&r!=='')acc.push(c);
    var nextEp=ci+1<fcompsSorted.length?epochs[fcompsSorted[ci+1].id]:tMax;
    var steps=Math.max(4,Math.ceil((nextEp-curEp)/(20*86400000)));
    for(var s=0;s<=steps;s++){
      var t=curEp+(nextEp-curEp)*s/steps;
      var score=totalScoreAt(tr,tname,acc.slice(),t);
      scoreCurve.push({x:tX(t),y:pad.top+ph*(1-Math.min(score,maxScore)/maxScore),score:score,tier:tierOf(score)});
    }
  }

  if(scoreCurve.length>1){
    var segStart=0;
    for(var i=1;i<=scoreCurve.length;i++){
      if(i===scoreCurve.length||scoreCurve[i].tier!==scoreCurve[segStart].tier){
        var seg=scoreCurve.slice(segStart,i+1);
        var tc=scoreCurve[segStart].tier;
        var minY=Math.min.apply(null,seg.map(function(p){return p.y;}));
        var grad=ctx.createLinearGradient(0,minY,0,pad.top+ph);
        grad.addColorStop(0,tierFill[tc]||'rgba(153,153,153,0.35)');grad.addColorStop(1,'rgba(255,255,255,0)');
        ctx.beginPath();ctx.moveTo(seg[0].x,seg[0].y);
        for(var j=1;j<seg.length;j++)ctx.lineTo(seg[j].x,seg[j].y);
        ctx.lineTo(seg[seg.length-1].x,pad.top+ph);ctx.lineTo(seg[0].x,pad.top+ph);ctx.closePath();
        ctx.fillStyle=grad;ctx.fill();
        ctx.beginPath();ctx.moveTo(seg[0].x,seg[0].y);
        for(var j=1;j<seg.length;j++)ctx.lineTo(seg[j].x,seg[j].y);
        ctx.strokeStyle=tierStroke[tc]||'rgba(153,153,153,0.5)';ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
        segStart=i;
      }
    }
  }

  var pts=[];
  fcompsSorted.forEach(function(c){
    if(!hasRank(tr[c.id]))return;
    var raw=getRank(tr[c.id]),is50=typeof raw==='string'&&raw.indexOf('50+')!==-1;
    var n=is50?50:parseInt(raw,10);if(isNaN(n))return;
    if(n>maxR)n=maxR;pts.push({x:tX(epochs[c.id]),y:chartY(n,ph,pad),r:n,raw:raw,is50:is50});
  });

  if(pts.length>1){
    ctx.strokeStyle='#3A6EA5';ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    for(var i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
    ctx.stroke();
  }
  ctx.font='bold 10px sans-serif';ctx.textAlign='center';
  for(var i=0;i<pts.length;i++){var p=pts[i],n=p.r,lbl=p.is50?'50+':String(n);
    ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);
    if(n===1)ctx.fillStyle='#E74C3C';else if(n<=3)ctx.fillStyle='#F0A030';else if(n<=6)ctx.fillStyle='#9B7CB8';else if(n<=10)ctx.fillStyle='#2471A3';else if(n<=20)ctx.fillStyle='#4CAF50';else ctx.fillStyle='#7F8C8D';
    ctx.fill();
    var above=false;
    if(i===0){above=pts.length>1&&pts[1].y>p.y;}
    else if(i===pts.length-1){above=pts[i-1].y>p.y;}
    else{var ly1=pts[i-1].y,ly2=pts[i+1].y;above=(ly1>=p.y&&ly2>=p.y)?true:(ly1<=p.y&&ly2<=p.y)?false:p.y<pad.top+ph/2;}
    var ly=above?p.y-10:p.y+14;if(above&&ly<pad.top+4)ly=p.y+14;if(!above&&ly>pad.top+ph-4)ly=p.y-10;
    ctx.fillStyle='#333';ctx.fillText(lbl,p.x,ly);
  }
  });
}
