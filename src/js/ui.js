// ====== UI 渲染与交互 ======

// 筛选状态
var filterPkCcbc=false;
var refDate=Date.now();
var dateSlider=document.getElementById('dateSlider');
var pkCcbcCheck=document.getElementById('pkCcbcCheck');
var dateLabel=document.getElementById('dateLabel');
var pkCcbcLabel=document.getElementById('pkCcbcLabel');

var allEpochs=comps.map(function(c){return epochs[c.id];});
allEpochs.sort(function(a,b){return a-b;});
var epochMin=allEpochs[0],epochMax=Date.now();
var epochRange=epochMax-epochMin;
function sliderToEpoch(v){return epochMin+(epochRange*v/100);}
dateSlider.value=100;
dateLabel.textContent=fmtDate(new Date());

function fmtDate(d){var mm=d.getMonth()+1,dd=d.getDate();return d.getFullYear()+'-'+(mm<10?'0':'')+mm+'-'+(dd<10?'0':'')+dd;}

function getFilterDateMax(){return sliderToEpoch(parseInt(dateSlider.value,10));}

function getFilteredComps(){
  var dmax=getFilterDateMax(),now=Date.now();
  return comps.filter(function(c){
    if(epochs[c.id]>now)return false;
    if(filterPkCcbc&&!isMajor(c.id))return false;
    if(epochs[c.id]>dmax)return false;
    return true;
  });
}

// Tooltip
var tooltip=document.getElementById('tooltip');
function showTT(e,text,el){tooltip.textContent=text;tooltip.style.left='-999px';tooltip.classList.add('show');var tw=tooltip.offsetWidth,th=tooltip.offsetHeight;var rect=el.getBoundingClientRect();var x=rect.left+rect.width/2-tw/2;var y=rect.top-th-6;if(y<0)y=rect.bottom+6;if(x<4)x=4;if(x+tw>window.innerWidth-4)x=window.innerWidth-tw-4;tooltip.style.left=x+'px';tooltip.style.top=y+'px';}
function hideTT(){tooltip.classList.remove('show');}

// 标签页切换
document.querySelectorAll('.tab-btn').forEach(function(btn){btn.addEventListener('click',function(){
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('.tab-content').forEach(function(c){c.classList.remove('active');});
  btn.classList.add('active');document.getElementById(btn.dataset.tab).classList.add('active');
  document.getElementById('fabBtn').style.display=(btn.dataset.tab==='tab1'||btn.dataset.tab==='tab2')?'':'none';
  var panel=document.getElementById('simPanel');if(btn.dataset.tab!=='tab1')panel.classList.remove('show');
  if(btn.dataset.tab==='tab2')buildTeamHistory(tsel.value);
});});

// 比赛表头
var chead=document.getElementById('compHeads');
function renderCompHeads(){
  chead.innerHTML='';
  var fcomps=getFilteredComps();
  fcomps.forEach(function(c){
    var a=document.createElement('a');a.className='comp-link'+(isMajor(c.id)?' bold-link':'');
    a.textContent=c.id;a.href=links[c.id]||'#';a.target='_blank';a.rel='noopener';
    var dc=decayCoeff(c.id,compWeight(c.id));
    a.addEventListener('mouseenter',function(e){showTT(e,c.id+' | '+c.date+' | 权重 '+dc.toFixed(2),this);});
    a.addEventListener('mouseleave',hideTT);chead.appendChild(a);
  });
}
renderCompHeads();

// 徽章辅助
function badgeCls(r){var n=parseRank(r);if(n===null)return'bg-null';if(n>=1&&n<=20)return'bg-'+n;return'bg-mid';}
function badgeText(r){var v=getRank(r);if(v===null||v===undefined||v==='')return'-';if(typeof v==='number'&&v>50)return'50+';return typeof v==='string'?v:String(v);}

// 自建队伍
var app=document.getElementById('app');
var simTeams=[];
try{var saved=localStorage.getItem('hunt_sim_teams');if(saved)simTeams=JSON.parse(saved);}catch(e){}
function saveSimTeams(){try{localStorage.setItem('hunt_sim_teams',JSON.stringify(simTeams));}catch(e){}populateSimTeams();}
function simRanksToObj(ranks){var o={};ranks.forEach(function(e){o[e.c]=e.r;});return o;}

// 排序
var sortBy='total';
function setSort(metric,el){
  sortBy=metric;
  document.querySelectorAll('.ch-total,.ch-front,.ch-stable,.ch-count,.ch-ach').forEach(function(e){e.classList.remove('sort-active');});
  el.classList.add('sort-active');
  renderAll();
}

function renderAll(){
  recomputeTeams(getFilteredComps());
  renderCompHeads();
  renderLeaderboard();
  drawBarChart();
  populateTeamSelect();
  if(window.innerWidth<=768){buildMobileBoard();}
}

// 排序头部绑定
var sortTotal=document.querySelector('.ch-total');
var sortFront=document.querySelector('.ch-front');
var sortStable=document.querySelector('.ch-stable');
var sortCount=document.querySelector('.ch-count');
var sortAch=document.querySelector('.ch-ach');
sortTotal.classList.add('sort-active');
sortTotal.addEventListener('click',function(){setSort('total',this);});
sortFront.addEventListener('click',function(){setSort('frontSum',this);});
sortStable.addEventListener('click',function(){setSort('stableAvg',this);});
sortCount.addEventListener('click',function(){setSort('count',this);});
sortAch.addEventListener('click',function(){setSort('achCount',this);});
var bmSortBtn=document.getElementById('bmSortBtn'),bmSortMenu=null;
bmSortBtn.addEventListener('click',function(e){
  e.stopPropagation();
  if(!bmSortMenu){
    bmSortMenu=document.createElement('div');bmSortMenu.className='bm-sort-menu';
    document.body.appendChild(bmSortMenu);
    [{v:'total',t:'总分'},{v:'frontSum',t:'累积分'},{v:'stableAvg',t:'稳定分'},{v:'count',t:'参赛数'},{v:'achCount',t:'成就数'}].forEach(function(o){
      var d=document.createElement('div');d.textContent=o.t;
      d.addEventListener('click',function(){bmSortBtn.innerHTML=o.t+' ▾';bmSortMenu.classList.remove('show');setSort(o.v,sortTotal);});
      bmSortMenu.appendChild(d);
    });
  }
  var r=bmSortBtn.getBoundingClientRect();
  bmSortMenu.style.top=r.bottom+'px';bmSortMenu.style.left=(r.right-80)+'px';
  bmSortMenu.classList.toggle('show');
});
document.addEventListener('click',function(){if(bmSortMenu)bmSortMenu.classList.remove('show');});

// 榜单渲染
function renderLeaderboard(){
  app.innerHTML='';
  var showSim=document.getElementById('simToggle').checked;
  var fcomps=getFilteredComps();
  var all=(showSim?simTeams.map(function(st){var tr=simRanksToObj(st.ranks||[]),s=computeScores(tr,null,fcomps);return{name:st.name,total:s.total,frontSum:s.frontSum,stableAvg:s.stableAvg,_ranks:tr,_sim:true,rank:0,tier:'tsim',count:Object.values(tr).filter(function(v){return v!==null&&v!==undefined&&v!=='';}).length,tw:0};}).concat(teams):teams);
  all.sort(function(a,b){var va=a[sortBy]||0,vb=b[sortBy]||0;if(vb!==va)return vb-va;if(sortBy==='count')return (b.tw||0)-(a.tw||0);return 0;});
  all.forEach(function(t,i){t.rank=i+1;});
  all.forEach(function(t){renderCard(t);});
}

function renderCard(team){
  var tr2=team._ranks||rankings[team.origName]||{},isSim=!!team._sim;
  var card=document.createElement('div');  card.className='card '+(isSim?'tsim':team.tier||'t4');
  var strip=document.createElement('div');strip.className='card-strip';card.appendChild(strip);
  var info=document.createElement('div');info.className='card-info';
  var sortVal=team[sortBy]||0;
  var sortValFmt=(sortBy==='count'||sortBy==='achCount')?sortVal:sortVal.toFixed(1);
  [{c:'card-rank',v:team.rank},{c:'card-name',v:team.name},{c:'card-total',v:sortValFmt},{c:'card-front',v:team.frontSum.toFixed(1)},{c:'card-stable',v:team.stableAvg.toFixed(1)},{c:'card-count',v:team.count},{c:'card-ach',v:team.achCount}].forEach(function(it){var s=document.createElement('span');s.className=it.c;s.textContent=it.v;info.appendChild(s);});
  card.appendChild(info);
  var badges=document.createElement('div');badges.className='card-badges';
  var fcomps=getFilteredComps();
  for(var k=0;k<fcomps.length;k++){(function(c){
    var r=tr2[c.id],b=document.createElement('span');
    var isStaff=r&&typeof r==='object'&&r.staff;
    if(isStaff){b.className='badge bg-staff';b.textContent='工';}
    else{var cls=badgeCls(r),merged=!isSim&&isMerged(team.origName||'',c.id);
    b.className='badge '+cls+(merged?' merged':'');
    b.textContent=badgeText(r);}
    var dc=decayCoeff(c.id,compWeight(c.id));
    var alpha=Math.max(0.2,Math.min(1,dc/0.8));
    b.style.opacity=alpha;
    b.addEventListener('mouseenter',function(){this.style.opacity='1';});
    b.addEventListener('mouseleave',function(){this.style.opacity=alpha;});
    if(!isStaff&&hasRank(r)){
      var rs=rankScore(r);if(merged)rs/=2;var contrib=dc*rs;
      var tipText=c.id+' | 得分 '+rs.toFixed(1)+' | 积分 '+contrib.toFixed(1)+(merged?' | 并队':'');
      b.setAttribute('data-tip',tipText);
      b.addEventListener('mouseenter',function(e){showTT(e,tipText,this);});
      b.addEventListener('mouseleave',hideTT);
      b.addEventListener('click',function(){var u=links[c.id+'_rank']||links[c.id];if(u)window.open(u,'_blank');});
    }
    badges.appendChild(b);
  })(fcomps[k]);}
  card.appendChild(badges);app.appendChild(card);
}

// 移动端双面板
function buildMobileBoard(){
  if(window.innerWidth>768)return;
  var bmLeftRows=document.getElementById('bmLeftRows');
  var bmRightInner=document.getElementById('bmRightInner');
  var fcomps=getFilteredComps();

  bmRightInner.innerHTML='';

  var hRow=document.createElement('div');hRow.className='bm-rh-row';
  fcomps.forEach(function(c){
    var link=document.createElement('span');
    link.className='comp-link'+(isMajor(c.id)?' bold-link':'');link.textContent=c.id;
    var dc=decayCoeff(c.id,compWeight(c.id));
    var tipText=c.id+' | '+c.date+' | 权重 '+dc.toFixed(2);
    link.addEventListener('click',function(e){
      var tt=document.getElementById('tooltip');
      if(tt.classList.contains('show')&&tt._bmTarget===link){
        tt.classList.remove('show');tt._bmTarget=null;
      }else{
        if(tt._bmTarget)tt._bmTarget.style.opacity='';
        showTT(e,tipText,link);
        tt._bmTarget=link;
      }
    });
    hRow.appendChild(link);
  });
  var hSpacer=document.createElement('div');
  hSpacer.style.cssText='flex-shrink:0;min-width:4px;height:1px;';
  hRow.appendChild(hSpacer);
  bmRightInner.appendChild(hRow);

  var cards=document.querySelectorAll('#app .card');
  bmLeftRows.innerHTML='';
  cards.forEach(function(card){
    var leftRow=document.createElement('div');leftRow.className='bm-row';
    var left=document.createElement('div');
    var tierCls='';
    card.classList.forEach(function(c){if(c.match(/^t/))tierCls=c;});
    left.className='bm-row-left '+tierCls;

    var strip=document.createElement('div');strip.className='card-strip';
    strip.style.background=card.querySelector('.card-strip').style.background||'';
    left.appendChild(strip);

    ['card-rank','card-name','card-total'].forEach(function(cls){
      var el=document.createElement('span');el.className=cls;
      el.textContent=card.querySelector('.'+cls).textContent;
      left.appendChild(el);
    });
    leftRow.appendChild(left);
    bmLeftRows.appendChild(leftRow);

    var rRow=document.createElement('div');rRow.className='bm-rr-row';
    var badges=card.querySelectorAll('.card-badges .badge');
    badges.forEach(function(b){
      var clone=b.cloneNode(true);
      var tipText=b.getAttribute('data-tip');
      if(tipText){
        clone.addEventListener('click',function(e){
          var tt=document.getElementById('tooltip');
          if(tt.classList.contains('show')&&tt._bmTarget===clone){
            tt.classList.remove('show');tt._bmTarget=null;clone.style.opacity='';
          }else{
            if(tt._bmTarget)tt._bmTarget.style.opacity='';
            showTT(e,tipText,clone);
            tt._bmTarget=clone;clone.style.opacity='1';
          }
        });
      }
      rRow.appendChild(clone);
    });
    var rSpacer=document.createElement('div');
    rSpacer.style.cssText='flex-shrink:0;min-width:4px;height:42px;';
    rRow.appendChild(rSpacer);
    bmRightInner.appendChild(rRow);
  });

  document.addEventListener('click',function(e){
    if(window.innerWidth>768)return;
    var tt=document.getElementById('tooltip');
    if(!tt.classList.contains('show'))return;
    var badgeOrLink=e.target.closest('.bm-rr-row .badge')||e.target.closest('.bm-rh-row .comp-link');
    if(badgeOrLink===tt._bmTarget)return;
    if(tt._bmTarget)tt._bmTarget.style.opacity='';
    tt.classList.remove('show');tt._bmTarget=null;
  });

  var rs=document.getElementById('bmRightScroll');
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      rs.scrollLeft=rs.scrollWidth-rs.clientWidth;
    });
  });
}

// 筛选事件
function onFilterChange(){
  var v=parseInt(dateSlider.value,10);
  if(v>=100){refDate=Date.now();dateLabel.textContent=fmtDate(new Date());playBtn.disabled=true;}
  else{refDate=sliderToEpoch(v);dateLabel.textContent=fmtDate(new Date(refDate));playBtn.disabled=false;}
  renderAll();
  if(document.getElementById('tab2').classList.contains('active')){
    buildTeamHistory(tsel.value);
  }
}
dateSlider.addEventListener('input',function(){
  onFilterChange();
});
pkCcbcCheck.addEventListener('change',function(){
  filterPkCcbc=this.checked;
  pkCcbcLabel.classList.toggle('checked',filterPkCcbc);
  onFilterChange();
});

// 播放按钮
var playBtn=document.getElementById('playBtn'),playAnim=null;
playBtn.addEventListener('click',function(){
  if(parseInt(dateSlider.value,10)>=100)return;
  if(playAnim){cancelAnimationFrame(playAnim);playAnim=null;playBtn.textContent='▶';playBtn.classList.remove('playing');return;}
  var startV=parseInt(dateSlider.value,10),startT=performance.now();
  var duration=Math.max(4000,(100-startV)/100*16000);
  playBtn.textContent='⏸';playBtn.classList.add('playing');
  function step(now){
    var p=Math.min(1,(now-startT)/duration);
    var v=Math.round(startV+(100-startV)*p);
    dateSlider.value=v;onFilterChange();
    if(p<1){playAnim=requestAnimationFrame(step);}
    else{playAnim=null;playBtn.textContent='▶';playBtn.classList.remove('playing');}
  }
  playAnim=requestAnimationFrame(step);
});

// TAB 2: 队伍详情
var tsel=document.getElementById('teamSelect');
var tinfo=document.getElementById('teamInfo'),thist=document.getElementById('teamHistory');
var tchart=document.getElementById('teamChart');

function populateTeamSelect(){
  var opts=tsel.querySelectorAll('option:not(.sim-opt)');for(var i=0;i<opts.length;i++)opts[i].remove();
  teams.forEach(function(t){var o=document.createElement('option');o.value=t.origName;o.textContent=t.name;tsel.appendChild(o);});
  populateSimTeams();
}
function populateSimTeams(){
  var opts=tsel.querySelectorAll('option.sim-opt');for(var i=0;i<opts.length;i++)opts[i].remove();
  if(simTeams.length>0){var sep=document.createElement('option');sep.disabled=true;sep.textContent='── 自建队伍 ──';tsel.appendChild(sep);}
  simTeams.forEach(function(st){var o=document.createElement('option');o.className='sim-opt';o.value='__sim__'+st.name;o.textContent=st.name;tsel.appendChild(o);});
}
populateSimTeams();

var achSection=document.getElementById('achSection'),achGrid=document.getElementById('achGrid');
function renderAchievements(teamName){
  var ach=teamAch[teamName]||[];
  if(ach.length===0){achSection.style.display='none';return;}
  renderAchList(ach);
}
function renderAchList(ach){
  achSection.style.display='block';achGrid.innerHTML='';
  document.getElementById('achTitle').textContent='成就 ('+ach.length+')';
  var tierPriority={platinum:4,gold:3,silver:2,bronze:1};
  ach.sort(function(a,b){var tp=tierPriority[b.tier]-tierPriority[a.tier];if(tp!==0)return tp;var aMax=a.id.indexOf('max_')===0?0:1,bMax=b.id.indexOf('max_')===0?0:1;return aMax-bMax;});
  var tierIcons={platinum:'♦',gold:'★',silver:'◆',bronze:'●'};
  ach.forEach(function(a){
    var item=document.createElement('div');item.className='ach-item '+a.tier;
    var icon=document.createElement('div');icon.className='ach-item-icon '+a.tier;icon.textContent=tierIcons[a.tier]||'';
    var body=document.createElement('div');body.className='ach-item-body';
    var nameEl=document.createElement('div');nameEl.className='ach-item-name';nameEl.textContent=a.name;
    body.appendChild(nameEl);
    var descEl=document.createElement('div');descEl.className='ach-item-desc';descEl.textContent=achDescs[a.id]||'';body.appendChild(descEl);
    if(a.detail){var detEl=document.createElement('div');detEl.className='ach-item-detail';detEl.textContent=a.detail;body.appendChild(detEl);}
    item.appendChild(icon);item.appendChild(body);
    var pct=achPercentages[a.id]||0;if(pct>0){var pctEl=document.createElement('div');pctEl.className='ach-item-pct';pctEl.textContent=pct+'%';item.appendChild(pctEl);}
    var teams=achTeams[a.id]||[];
    if(teams.length>0){item.style.cursor='pointer';
      item.addEventListener('mouseenter',function(e){var t=achTeams[a.id]||[];tooltip.textContent='已获得队伍：'+t.join('、');tooltip.style.left='-999px';tooltip.classList.add('show');var tw=tooltip.offsetWidth,th=tooltip.offsetHeight;var rect=this.getBoundingClientRect();var x=rect.right+10;if(x+tw>window.innerWidth-4)x=rect.left-tw-10;var y=rect.top;if(y+th>window.innerHeight-4)y=window.innerHeight-th-4;tooltip.style.left=x+'px';tooltip.style.top=y+'px';});
      item.addEventListener('mouseleave',hideTT);}
    achGrid.appendChild(item);
  });
}

function buildTeamHistory(tname){
  var isSim=tname.indexOf('__sim__')===0;var simName=isSim?tname.slice(7):'';
  var tr=isSim?simRanksToObj((simTeams.find(function(st){return st.name===simName;})||{}).ranks||[]):(rankings[tname]||{});
  var parts=0,frontSum=0,ss=0,sw=0;thist.innerHTML='';
  var fcomps=getFilteredComps();
  fcomps.forEach(function(c){var r=tr[c.id];if(r===null||r===undefined||r==='')return;parts++;var isStaffEntry=r&&typeof r==='object'&&r.staff;var rs=rankScore(r),merged=!isSim&&isMerged(tname,c.id);if(merged)rs/=2;var dc=decayCoeff(c.id,compWeight(c.id)),rd=decayCoeff(c.id,1),integral=dc*rs;ss+=rd*rs;sw+=rd;frontSum+=integral;
    var card=document.createElement('div');card.className='history-card';var strip=document.createElement('div');strip.className='hcard-strip';
    var n=parseRank(r);if(isStaffEntry)strip.className+=' s-staff';else if(n===null)n=999;if(n===1)strip.className+=' s-1';else if(n<=3)strip.className+=' s-2';else if(n<=6)strip.className+=' s-4';else if(n<=10)strip.className+=' s-top10';else if(n<=20)strip.className+=' s-mid';else if(!isStaffEntry)strip.className+=' s-low';
    if(merged)strip.className+=' sr-merged';
    card.appendChild(strip);var body=document.createElement('div');body.className='hcard-body';
    var nm=document.createElement('a');nm.className='hcard-name';nm.innerHTML=boldComp(c.id);nm.href=links[c.id]||'#';nm.target='_blank';nm.rel='noopener';nm.style.cssText='text-decoration:none;color:inherit;';
    var dt=document.createElement('span');dt.className='hcard-date';dt.textContent=c.date;
    var rk=document.createElement('span');rk.className='hcard-rank';var rn=parseRank(r);
    if(isStaffEntry){rk.className+=' sr-staff';rk.textContent='STAFF';}
    else{if(rn===1)rk.className+=' sr-1';else if(rn<=3)rk.className+=' sr-2';else if(rn<=6)rk.className+=' sr-4';else if(rn<=10)rk.className+=' sr-7';else if(rn<=20)rk.className+=' sr-mid';else rk.className+=' sr-low';
    if(merged)rk.className+=' sr-merged';rk.textContent='#'+badgeText(r);}
    var sc=document.createElement('span');sc.className='hcard-score';sc.textContent=isStaffEntry?'-':rs.toFixed(1);
    var wt=document.createElement('span');wt.className='hcard-weight';wt.textContent=dc.toFixed(2);
    var it=document.createElement('span');it.className='hcard-integral';it.textContent=isStaffEntry?'-':integral.toFixed(1);
    body.appendChild(nm);body.appendChild(dt);var sp=document.createElement('span');sp.className='hh-spacer-right';body.appendChild(sp);body.appendChild(rk);body.appendChild(sc);body.appendChild(wt);body.appendChild(it);card.appendChild(body);thist.appendChild(card);
  });
  var sa=sw>0?ss/sw:0;
  tinfo.innerHTML='参赛 <strong>'+parts+'</strong> / '+fcomps.length+' 场 &nbsp;|&nbsp; 总分 <strong>'+(frontSum+sa).toFixed(1)+'</strong> &nbsp;|&nbsp; 累积分 <strong>'+frontSum.toFixed(1)+'</strong> &nbsp;|&nbsp; 稳定分 <strong>'+sa.toFixed(1)+'</strong>';
  drawChart(tname);
  if(tname.indexOf('__sim__')===0){
    var simTr=simRanksToObj((simTeams.find(function(st){return st.name===simName;})||{}).ranks||[]);
    var simTc=teamCompsForTr(simName,simTr);
    var simAch=[];
    if(simTc.length>0){
      var oldRk=rankings[simName];rankings[simName]=simTr;
      var simMt=maxTierEver(simName),simFe=simTc[0].epoch;
      simAch=computeOneTeamAch(simName,simTr,simTc,simMt,simFe);
      if(oldRk===undefined)delete rankings[simName];else rankings[simName]=oldRk;
    }
    if(simAch.length===0){achSection.style.display='block';achGrid.innerHTML='<div style="font-size:12px;color:#ccc;padding:10px 0;">暂无成就</div>';document.getElementById('achTitle').textContent='成就 (0)';}
    else{achSection.style.display='block';renderAchList(simAch);}
  }
  else renderAchievements(tname);
}
tsel.addEventListener('change',function(){buildTeamHistory(tsel.value);});

// 窗口缩放重绘
var resizeTimer;window.addEventListener('resize',function(){clearTimeout(resizeTimer);resizeTimer=setTimeout(function(){if(document.getElementById('tab2').classList.contains('active'))buildTeamHistory(tsel.value);},200);});

// TAB 3: 比赛详情
var csel=document.getElementById('compSelect');
comps.forEach(function(c){var o=document.createElement('option');o.value=c.id;o.textContent=c.id;csel.appendChild(o);});
var cdetail=document.getElementById('compDetail');
function buildCompDetail(cid){
  var c=null;for(var i=0;i<comps.length;i++){if(comps[i].id===cid){c=comps[i];break;}}if(!c)return;
  var data=[];for(var tn in rankings){var entry=rankings[tn][cid];if(entry&&typeof entry==='object'&&entry.staff)continue;var r=getRank(entry);var t=getTime(entry);if(r===null||typeof r==='string')continue;data.push({team:tn,rank:r,time:t});}
  data.sort(function(a,b){return a.rank-b.rank;});
  var dc=decayCoeff(cid,compWeight(cid)),rawDecay=dc/compWeight(cid),w=compWeight(cid);
  var compRanks={};for(var i=0;i<data.length;i++){var rk=data[i].rank;if(!compRanks[rk])compRanks[rk]=[];compRanks[rk].push(i);}
  var shown={};
  var html='<div class="comp-card"><h3><a href="'+(links[cid]||'#')+'" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">'+cid+'</a><span style="float:right;font-size:13px;font-weight:400;color:#999;">开赛时间：'+c.date+(c.time?' '+c.time:'')+'</span></h3>';
  var totalTeams=0;for(var tn in rankings){totalTeams++;}
  html+='<div class="cmeta"><span>'+data.length+' / '+totalTeams+' 队</span><span style="color:#999;">时延系数 '+rawDecay.toFixed(2)+' × '+w.toFixed(2)+' = 权重 '+dc.toFixed(2)+'</span></div>';
  html+='<table class="comp-table"><thead><tr><th>名次</th><th>队伍</th><th>完赛时间</th><th>用时</th><th>得分</th><th>积分</th></tr></thead><tbody>';
  for(var i=0;i<data.length;i++){if(shown[i])continue;var d=data[i],rs=rankScore(d.rank),integral=dc*rs;
    var mergedTeams=compRanks[d.rank];var teamName=d.team;
    if(mergedTeams&&mergedTeams.length>1){teamName=mergedTeams.map(function(idx){shown[idx]=true;return data[idx].team;}).join(' & ');rs/=2;integral/=2;}
    var timeStr=fmtTime(d.time);var finishStr=calcFinish(c.date,c.time,d.time);if(window.innerWidth<=768)finishStr=finishStr.replace(/^\d{4}-/,'');
    html+='<tr><td class="'+rankCls(d.rank)+'">#'+d.rank+'</td><td>'+esc(teamName)+'</td><td>'+esc(finishStr)+'</td><td>'+esc(timeStr)+'</td><td>'+rs.toFixed(1)+'</td><td>'+integral.toFixed(1)+'</td></tr>';}
  html+='</tbody></table></div>';cdetail.innerHTML=html;
}
csel.addEventListener('change',function(){buildCompDetail(csel.value);});buildCompDetail(csel.value);

// 自建队伍面板
document.getElementById('simToggle').addEventListener('change',function(){renderAll();try{localStorage.setItem('hunt_sim_show',this.checked);}catch(e){}});
document.getElementById('fabBtn').addEventListener('click',function(){
  document.getElementById('simPanel').classList.toggle('show');
  if(document.getElementById('simPanel').classList.contains('show'))renderSimPanel();
});
document.getElementById('simPanelClose').addEventListener('click',function(){
  document.getElementById('simPanel').classList.remove('show');
});

function renderSimPanel(){
  var body=document.getElementById('simPanelBody');body.innerHTML='';
  simTeams.forEach(function(st,i){
    var card=document.createElement('div');card.className='sim-team-card';
    var hdr=document.createElement('div');hdr.className='sim-team-header';
    var nm=document.createElement('span');nm.className='sim-team-name';nm.textContent=st.name||'未命名';
    nm.addEventListener('click',function(){
      var inp=document.createElement('input');inp.className='sim-team-name-edit';inp.value=st.name;
      nm.replaceWith(inp);inp.focus();inp.select();
      inp.addEventListener('blur',function(){saveName();});
      inp.addEventListener('keydown',function(e){if(e.key==='Enter')saveName();});
      function saveName(){var v=inp.value.trim();if(v)st.name=v;saveSimTeams();renderSimPanel();renderAll();}
    });
    var del=document.createElement('button');del.className='sim-team-del';del.textContent='✕';
    del.addEventListener('click',function(){simTeams.splice(i,1);saveSimTeams();renderSimPanel();renderAll();});
    hdr.appendChild(nm);hdr.appendChild(del);card.appendChild(hdr);

    (st.ranks||[]).forEach(function(e,j){
      var row=document.createElement('div');row.className='sim-result-row';
      row.innerHTML='<span class="sr-comp">'+e.c+'</span><span class="sr-rank">#'+badgeText(e.r)+'</span>';
      var rd=document.createElement('button');rd.className='sr-del';rd.textContent='✕';
      rd.addEventListener('click',function(){simTeams[i].ranks.splice(j,1);saveSimTeams();renderSimPanel();renderAll();});
      row.appendChild(rd);card.appendChild(row);
    });

    var addRow=document.createElement('div');addRow.className='sim-add-row';
    var sel=document.createElement('select');
    sel.innerHTML='<option value="">+</option>';
    comps.forEach(function(c){sel.innerHTML+='<option value="'+c.id+'">'+c.id+'</option>';});
    var inp=document.createElement('input');inp.type='text';inp.placeholder='名次';inp.style.width='48px';
    inp.addEventListener('input',function(){this.value=this.value.replace(/[^0-9]/g,'');});
    var btn=document.createElement('button');btn.textContent='添加';
    btn.addEventListener('click',function(){
      var cid=sel.value,rn=parseInt(inp.value,10);if(!cid||isNaN(rn))return;
      if(!simTeams[i].ranks)simTeams[i].ranks=[];
      simTeams[i].ranks=simTeams[i].ranks.filter(function(e){return e.c!==cid;});
      simTeams[i].ranks.push({c:cid,r:rn});saveSimTeams();renderSimPanel();renderAll();
    });
    addRow.appendChild(sel);addRow.appendChild(inp);addRow.appendChild(btn);card.appendChild(addRow);
    body.appendChild(card);
  });

  var addTeamBtn=document.createElement('button');addTeamBtn.className='sim-add-team-btn';addTeamBtn.textContent='+ 添加队伍';
  var addTeamForm=document.createElement('div');addTeamForm.className='sim-add-team-form';
  var addTeamInp=document.createElement('input');addTeamInp.placeholder='队名';
  var addTeamSubmit=document.createElement('button');addTeamSubmit.textContent='创建';
  addTeamSubmit.addEventListener('click',function(){
    var nm=addTeamInp.value.trim();if(!nm)return;
    simTeams.push({name:nm,ranks:[]});saveSimTeams();
    addTeamInp.value='';addTeamForm.classList.remove('show');addTeamBtn.style.display='';
    renderSimPanel();renderAll();
  });
  addTeamForm.appendChild(addTeamInp);addTeamForm.appendChild(addTeamSubmit);
  addTeamBtn.addEventListener('click',function(){
    addTeamBtn.style.display='none';addTeamForm.classList.add('show');addTeamInp.focus();
  });
  body.appendChild(addTeamBtn);body.appendChild(addTeamForm);
}
