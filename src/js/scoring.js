// ====== 评分计算核心逻辑 ======

function compWeight(id){if(id.indexOf('P&KU')===0||id.indexOf('CCBC')===0)return 1;return 0.8;}
function isMajor(id){return id.indexOf('P&KU')===0||id.indexOf('CCBC')===0;}
function esc(s){if(!s)return'';return s.replace(/&/g,'&amp;').replace(/</g,'&lt;');}
function boldComp(id){return isMajor(id)?'<b>'+esc(id)+'</b>':esc(id);}
function decayCoeff(compId,w){var days=(epochs[compId]-refDate)/86400000;return Math.exp(days/365/2)*w;}
function decayCoeffAt(compId,w,refEpoch){var days=(epochs[compId]-refEpoch)/86400000;return Math.exp(days/365/2)*w;}

function rankScore(r){
  if(r===null||r===undefined||r==='')return 0;
  if(typeof r==='object'&&r!==null)r=r.rank;
  var n=parseInt(r,10);if(isNaN(n))return 0;
  return 100/Math.exp((n-1)/6);
}
function getRank(r){if(r===null||r===undefined||r==='')return null;if(typeof r==='object'&&r!==null)return r.rank;return r;}
function getTime(r){if(r===null||r===undefined)return null;if(typeof r==='object'&&r!==null)return r.time||null;return null;}
function hasRank(r){var v=getRank(r);return v!==null&&v!==undefined&&v!=='';}
function parseRank(r){var v=getRank(r);if(v===null)return null;if(typeof v==='string'&&v.indexOf('50+')!==-1)return 50;var n=parseInt(v,10);return isNaN(n)?null:n;}
function fmtTime(t){
  if(!t)return'-';
  if(/^\d+:\d{2}(:\d{2})?$/.test(t)){
    var parts=t.split(':');var h=parseInt(parts[0]),m=parseInt(parts[1]);
    if(parts.length>2)m+=Math.round(parseInt(parts[2])/60);
    if(m>=60){h+=Math.floor(m/60);m=m%60;}
    return h+':'+(m<10?'0':'')+m;
  }
  if(/^\d+\.\d+$/.test(t)){
    var d=parseFloat(t);var h=Math.floor(d);var m=Math.round((d-h)*60);
    if(m>=60){h+=Math.floor(m/60);m=m%60;}
    return h+':'+(m<10?'0':'')+m;
  }
  return t;
}
function parseDuration(t){
  if(!t)return null;
  if(/^\d+:\d{2}(:\d{2})?$/.test(t)){
    var parts=t.split(':');return parseInt(parts[0])*60+parseInt(parts[1])+(parts.length>2?Math.round(parseInt(parts[2])/60):0);
  }
  if(/^\d+\.\d+$/.test(t)){var d=parseFloat(t);return Math.round(d*60);}
  return null;
}
function calcFinish(dateStr, timeStr, durationStr){
  if(!timeStr||!durationStr)return'-';
  var mins=parseDuration(durationStr);if(mins===null)return'-';
  var parts=dateStr.split('-');
  var h=0,m=0;if(timeStr){var tp=timeStr.split(':');h=parseInt(tp[0]);m=parseInt(tp[1]||'0');}
  var dt=new Date(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2]),h,m);
  dt.setMinutes(dt.getMinutes()+mins);
  var fy=dt.getFullYear(),fm=dt.getMonth()+1,fd=dt.getDate();
  return fy+'-'+(fm<10?'0':'')+fm+'-'+(fd<10?'0':'')+fd+' '+
    (dt.getHours()<10?'0':'')+dt.getHours()+':'+(dt.getMinutes()<10?'0':'')+dt.getMinutes();
}

// 并队检测
var mergedMap={},rankBuckets={};
for(var tn in rankings){for(var cid in rankings[tn]){var r=getRank(rankings[tn][cid]);if(r===null||typeof r==='string')continue;var n=parseInt(r,10);if(!isNaN(n)){var key=cid+'_'+n;if(!rankBuckets[key])rankBuckets[key]=[];rankBuckets[key].push(tn);}}}
for(var key in rankBuckets){if(rankBuckets[key].length>1){var cid=key.split('_')[0];rankBuckets[key].forEach(function(tn){mergedMap[tn+'_'+cid]=true;});}}
function isMerged(teamName,compId){return !!mergedMap[teamName+'_'+compId];}

function rankCls(r){var n=parseInt(r,10);if(isNaN(n))return'cr-mid';if(n===1)return'cr-1';if(n<=3)return'cr-2';if(n<=6)return'cr-4';if(n<=10)return'cr-7';if(n<=20)return'cr-11';return'cr-mid';}

function computeScores(tr,tname,compsList){
  compsList=compsList||comps;
  var fs=0,ss=0,sw=0;
  for(var i=0;i<compsList.length;i++){var c=compsList[i],r=tr[c.id],rs=rankScore(r);if(tname&&isMerged(tname,c.id))rs/=2;var dc=decayCoeff(c.id,compWeight(c.id)),rd=decayCoeff(c.id,1);fs+=dc*rs;if(hasRank(r)){ss+=rd*rs;sw+=rd;}}
  var sa=sw>0?ss/sw:0;
  return{total:fs+sa,frontSum:fs,stableAvg:sa};
}

var HIDDEN_TEAMS=['喵喵喵'];
function isLocalEnv(){var p=window.location.protocol,h=window.location.hostname;return p==='file:'||h==='localhost'||h==='127.0.0.1';}
var teams=[];
var teamAch={};
function recomputeTeams(compsList){
  compsList=compsList||comps;
  teams=TEAMS.map(function(t){
    var s=computeScores(rankings[t.name]||{},t.name,compsList);
    var count=0,tw=0;
    for(var i=0;i<compsList.length;i++){var r=rankings[t.name][compsList[i].id];if(hasRank(r)){count++;tw+=decayCoeff(compsList[i].id,compWeight(compsList[i].id));}}
    return{name:t.name,origName:t.name,total:s.total,frontSum:s.frontSum,stableAvg:s.stableAvg,count:count,tw:tw,achCount:(teamAch[t.name]||[]).length};
  });
  teams=teams.filter(function(t){return t.count>0;});
  if(!isLocalEnv())teams=teams.filter(function(t){return HIDDEN_TEAMS.indexOf(t.origName)===-1;});
  teams.sort(function(a,b){return b.total-a.total;});
  teams.forEach(function(t,i){t.rank=i+1;t.tier=t.total>=500?'tw':t.total>=300?'t0':t.total>=200?'t1':t.total>=100?'t2':t.total>=25?'t3':'t4';});
}

function totalScoreAt(tr,tname,compsList,refEpoch){
  var fs=0,ss=0,sw=0;
  for(var i=0;i<compsList.length;i++){var c=compsList[i],r=tr[c.id],rs=rankScore(r);if(tname&&isMerged(tname,c.id))rs/=2;var dc=decayCoeffAt(c.id,compWeight(c.id),refEpoch),rd=decayCoeffAt(c.id,1,refEpoch);fs+=dc*rs;if(hasRank(r)){ss+=rd*rs;sw+=rd;}}
  return sw>0?fs+ss/sw:fs;
}

// 历史排名（按时间排序的比赛列表）
var chronoComps=comps.slice().sort(function(a,b){return epochs[a.id]-epochs[b.id];});
var histRankings={};var prevComps=[];
chronoComps.forEach(function(c){
  var refEp=epochs[c.id],scores={};
  for(var tn in rankings){scores[tn]=totalScoreAt(rankings[tn],tn,prevComps,refEp);}
  var ranked=Object.keys(scores).sort(function(a,b){return scores[b]-scores[a];});
  histRankings[c.id]={scores:scores,ranked:ranked,comp:c};
  prevComps.push(c);
});
