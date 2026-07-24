// ====== 成就系统 ======

function maxTierEver(teamName){
  var tr=rankings[teamName];if(!tr)return't4';
  var acc=[],maxT='t4',maxScore=0;
  chronoComps.forEach(function(c){
    var r=tr[c.id];if(hasRank(r))acc.push(c);
    var s=totalScoreAt(tr,teamName,acc,epochs[c.id]);
    if(s>maxScore){maxScore=s;maxT=s>=500?'tw':s>=300?'t0':s>=200?'t1':s>=100?'t2':s>=25?'t3':'t4';}
  });
  return {tier:maxT,score:maxScore};
}

function teamComps(teamName){
  var tr=rankings[teamName];if(!tr)return[];
  return chronoComps.filter(function(c){return hasRank(tr[c.id]);}).map(function(c){return{compId:c.id,rank:getRank(tr[c.id]),epoch:epochs[c.id]};});
}

function compYears(){var yrs={};comps.forEach(function(c){yrs[new Date(epochs[c.id]).getFullYear()]=true;});return Object.keys(yrs).map(Number).sort();}

function fullYearYears(teamName){
  var tr=rankings[teamName],yrs=compYears(),result=[];
  yrs.forEach(function(y){
    var allInYear=comps.filter(function(c){return new Date(epochs[c.id]).getFullYear()===y;});
    if(allInYear.length===0)return;
    var joined=allInYear.filter(function(c){return hasRank(tr[c.id]);});
    if(joined.length===allInYear.length)result.push(String(y));
  });
  return result;
}

function fullYearYearsFromTr(tr){
  var yrs=compYears(),result=[];
  yrs.forEach(function(y){
    var allInYear=comps.filter(function(c){return new Date(epochs[c.id]).getFullYear()===y;});
    if(allInYear.length===0)return;
    var joined=allInYear.filter(function(c){return hasRank(tr[c.id]);});
    if(joined.length===allInYear.length)result.push(String(y));
  });
  return result;
}

function teamCompsForTr(tn,tr){
  return chronoComps.filter(function(c){return hasRank(tr[c.id]);}).map(function(c){return{compId:c.id,rank:getRank(tr[c.id]),epoch:epochs[c.id]};});
}

// 冠军队伍列表
var compChampions={};
for(var ctn in rankings){var ctr=rankings[ctn];if(!compChampions[ctn])compChampions[ctn]=[];}
chronoComps.forEach(function(c){
  for(var ctn in rankings){if(parseInt(rankings[ctn][c.id],10)===1)compChampions[ctn].push(c.id);}
});
var championList=[];for(var ctn in compChampions){if(compChampions[ctn].length>0)championList.push(ctn);}

// 最高梯队预计算
var teamMaxTier={};for(var tmn in rankings){teamMaxTier[tmn]=maxTierEver(tmn).tier;}

// 计算单个队伍成就
function computeOneTeamAch(tn,tr,tc,mt,firstEpoch){
  var ach=[];
  // 钻石
  (function(){var cover={r1:false,r2:false,r3:false,r4:false};tc.forEach(function(e){var n=parseInt(e.rank,10);if(isNaN(n))return;if(n<=3)cover.r1=true;else if(n<=10)cover.r2=true;else if(n<=20)cover.r3=true;else cover.r4=true;});if(cover.r1&&cover.r2&&cover.r3&&cover.r4)ach.push({id:'fullspectrum',tier:'diamond',name:'雨露均沾',detail:''});})();
  if(mt.tier==='tw')ach.push({id:'max_tw',tier:'diamond',name:'恭喜爹可以称帝了',detail:''});
  if(mt.tier==='t0')ach.push({id:'max_t0',tier:'diamond',name:'冠绝一时',detail:''});
  // 金
  (function(){var has=tc.some(function(e){return parseInt(e.rank,10)===1;});if(has)ach.push({id:'champion',tier:'gold',name:'我们是冠军！',detail:''});})();
  (function(){var streak=0,maxStreak=0;tc.forEach(function(e){var n=parseInt(e.rank,10);if(!isNaN(n)&&n<=10){streak++;if(streak>maxStreak)maxStreak=streak;}else streak=0;});if(maxStreak>=5)ach.push({id:'top10_streak5',tier:'gold',name:'前十钉子户',detail:maxStreak+'次'});})();
  (function(){var pk=false,cc=false;tc.forEach(function(e){var n=parseInt(e.rank,10);if(isNaN(n))return;if(e.compId.indexOf('P&KU')===0&&n<=3)pk=true;if(e.compId.indexOf('CCBC')===0&&n<=3)cc=true;});if(pk&&cc)ach.push({id:'mini_slam',tier:'diamond',name:'小满贯',detail:''});})();
  (function(){var rivals=[];for(var otn in rankings){if(otn===tn)continue;var tro=rankings[otn];var wins=0,losses=0,total=0;tc.forEach(function(e){var orn=getRank(tro[e.compId]);if(orn===null||orn===undefined||orn==='')return;var rn=parseInt(e.rank,10);orn=parseInt(orn,10);if(isNaN(rn)||isNaN(orn))return;if(rn>20||orn>20)return;if(rn<orn)wins++;else if(orn<rn)losses++;});if(wins+losses>=8&&Math.abs(wins-losses)<=2)rivals.push('对'+otn+' '+wins+':'+losses);}if(rivals.length>0)ach.push({id:'rival',tier:'silver',name:'宿敌',detail:rivals.join('\n')});})();
  (function(){var results=[];chronoComps.forEach(function(c){if(c===chronoComps[0])return;var hr=histRankings[c.id];if(!hr||!hr.ranked||hr.ranked.length===0)return;var prev1=hr.ranked[0];if(prev1===tn)return;var mn=getRank(tr[c.id]),pn=getRank(rankings[prev1][c.id]);if(mn===null||mn===undefined||mn===''||pn===null||pn===undefined||pn==='')return;mn=parseInt(mn,10);pn=parseInt(pn,10);if(isNaN(mn)||isNaN(pn))return;if(mn<pn)results.push(c.id+' 超越'+prev1);});if(results.length>0)ach.push({id:'dragonslayer',tier:'gold',name:'屠龙勇士',detail:results.join('\n')});})();
  if(mt.tier==='t1')ach.push({id:'max_t1',tier:'gold',name:'登堂入室',detail:''});
  // 银
  (function(){if(tc.length>0){var n=parseInt(tc[0].rank,10);if(!isNaN(n)&&n<=10)ach.push({id:'debut_top10',tier:'silver',name:'出道即巅峰',detail:tc[0].compId+' #'+tc[0].rank});}})();
  (function(){var c10=tc.filter(function(e){return parseInt(e.rank,10)===10;}).length;if(c10>=2)ach.push({id:'gold_line',tier:'silver',name:'金牌线',detail:c10+'次'});})();
  (function(){var start=0,segs=[];for(var i=1;i<=tc.length;i++){var ok=i<tc.length;if(ok){var r1=parseInt(tc[i-1].rank,10),r2=parseInt(tc[i].rank,10);ok=!isNaN(r1)&&!isNaN(r2)&&Math.abs(r1-r2)<=2;}if(!ok){if(i-start>=3){var s=[];for(var j=start;j<i;j++)s.push(tc[j].compId+'#'+tc[j].rank);segs.push(s.join(' → '));}start=i;}}if(segs.length>0)ach.push({id:'hattrick',tier:'silver',name:'帽子戏法',detail:segs.join('\n')});})();
  (function(){var start=0,segs=[];for(var i=1;i<=tc.length;i++){var ok=i<tc.length;if(ok){var r1=parseInt(tc[i-1].rank,10),r2=parseInt(tc[i].rank,10);ok=!isNaN(r1)&&!isNaN(r2)&&r2<r1;}if(!ok){if(i-start>=3){var s=[];for(var j=start;j<i;j++)s.push(tc[j].compId+'#'+tc[j].rank);segs.push(s.join(' → '));}start=i;}}if(segs.length>0)ach.push({id:'rising',tier:'silver',name:'节节高',detail:segs.join('\n')});})();
  (function(){for(var i=1;i<tc.length;i++){var r1=parseInt(tc[i-1].rank,10),r2=parseInt(tc[i].rank,10);if(!isNaN(r1)&&!isNaN(r2)&&r1-r2>=30){ach.push({id:'comeback',tier:'silver',name:'逆袭',detail:tc[i-1].compId+' #'+r1+' → '+tc[i].compId+' #'+r2});break;}}})();
  (function(){var beaten=[];championList.forEach(function(ch){if(ch===tn)return;var chFirstEpoch=null;compChampions[ch].forEach(function(cid){var ep=epochs[cid];if(chFirstEpoch===null||ep<chFirstEpoch)chFirstEpoch=ep;});var bc=[];tc.forEach(function(e){if(e.epoch<=chFirstEpoch)return;var cn=getRank(rankings[ch][e.compId]);if(cn===null||cn===undefined||cn==='')return;if(typeof cn==='string'&&cn.indexOf('50+')!==-1)return;var mn=parseInt(e.rank,10);cn=parseInt(cn,10);if(isNaN(mn)||isNaN(cn))return;if(mn>20||cn>20)return;if(typeof e.rank==='string'&&e.rank.indexOf('50+')!==-1)return;if(mn<cn)bc.push(e.compId);});if(bc.length>0)beaten.push(ch+': '+bc.join('、'));});if(beaten.length>=5)ach.push({id:'guillotine',tier:'silver',name:'断头台',detail:beaten.join('\n')});})();
  (function(){var results=[];chronoComps.forEach(function(c){var hr=histRankings[c.id];if(!hr||!hr.ranked)return;var myRank=getRank(tr[c.id]);if(myRank===null||myRank===undefined||myRank===''||epochs[c.id]===firstEpoch)return;var mn=parseInt(myRank,10);if(isNaN(mn))return;var myIdx=-1;for(var ri=0;ri<hr.ranked.length;ri++){if(hr.ranked[ri]===tn){myIdx=ri;break;}}if(myIdx===-1)return;var beaten=[];for(var ri=0;ri<myIdx;ri++){var otn=hr.ranked[ri],or=getRank(rankings[otn][c.id]);if(or===null||or===undefined||or==='')continue;var os=hr.scores[otn]||0,ot=os>=500?'tw':os>=300?'t0':os>=200?'t1':os>=100?'t2':os>=25?'t3':'t4';if(ot!=='tw'&&ot!=='t0'&&ot!=='t1')continue;var on=parseInt(or,10);if(!isNaN(on)&&on<=20&&mn<on)beaten.push(otn);}if(beaten.length>=3)results.push(c.id+': '+beaten.join('、'));});if(results.length>0)ach.push({id:'onetouchfive',tier:'gold',name:'一穿三',detail:results.join('\n')});})();
  if(mt.tier==='t2')ach.push({id:'max_t2',tier:'silver',name:'崭露头角',detail:''});
  // 铜
  (function(){var has=tc.some(function(e){var n=parseInt(e.rank,10);if(isNaN(n)){if(typeof e.rank==='string'&&e.rank.indexOf('50')!==-1)return true;return false;}return n>=50;});if(has)ach.push({id:'backrow',tier:'bronze',name:'后排俱乐部',detail:''});})();
  if(tc.length>=10)ach.push({id:'ten_battles',tier:'bronze',name:'十役',detail:tc.length+'场'});
  (function(){var pastComps=chronoComps.filter(function(c){return epochs[c.id]<=Date.now();});var firstIdx=-1;for(var i=0;i<pastComps.length;i++){if(hasRank(tr[pastComps[i].id])){firstIdx=i;break;}}if(firstIdx===-1)return;var maxMiss=0,curMiss=0;for(var i=firstIdx;i<pastComps.length;i++){var r=tr[pastComps[i].id];if(!hasRank(r)){curMiss++;if(curMiss>maxMiss)maxMiss=curMiss;}else curMiss=0;}if(maxMiss<=1)ach.push({id:'follow_group',tier:'bronze',name:'有团必跟',detail:''});})();
  (function(){var merged=false;tc.forEach(function(e){if(isMerged(tn,e.compId))merged=true;});if(merged)ach.push({id:'merge_happy',tier:'bronze',name:'合作愉快',detail:''});})();
  (function(){var hasStaff=false;for(var cid in tr){if(tr[cid]&&typeof tr[cid]==='object'&&tr[cid].staff){hasStaff=true;break;}}if(hasStaff)ach.push({id:'staff_duty',tier:'silver',name:'因公缺席',detail:''});})();
  (function(){var yrs=fullYearYearsFromTr(tr);if(yrs.length>0)ach.push({id:'full_year',tier:'bronze',name:'全年无休',detail:yrs.join('、')});})();
  (function(){var results=[];chronoComps.forEach(function(c){var hr=histRankings[c.id];if(!hr||!hr.ranked)return;var myRank=getRank(tr[c.id]);if(myRank===null||myRank===undefined||myRank===''||epochs[c.id]===firstEpoch)return;var mn=parseInt(myRank,10);if(isNaN(mn))return;var myIdx=-1;for(var ri=0;ri<hr.ranked.length;ri++){if(hr.ranked[ri]===tn){myIdx=ri;break;}}if(myIdx===-1)return;for(var ri=0;ri<myIdx;ri++){var otn=hr.ranked[ri],or=getRank(rankings[otn][c.id]);if(or===null||or===undefined||or==='')continue;var on=parseInt(or,10);if(!isNaN(on)&&on-mn===1)results.push(c.id+' 超越'+otn+' (#'+mn+' vs #'+on+')');}});if(results.length>0)ach.push({id:'sniper',tier:'bronze',name:'狙击手',detail:results.join('\n')});})();
  if(mt.tier==='t3')ach.push({id:'max_t3',tier:'bronze',name:'脱颖而出',detail:''});
  var seen={},dedup=[];ach.forEach(function(a){if(!seen[a.id]){seen[a.id]=true;dedup.push(a);}});
  return dedup;
}

// 计算所有队伍成就
for(var tn in rankings){
  var tr=rankings[tn],tc=teamCompsForTr(tn,tr);
  if(tc.length===0){teamAch[tn]=[];continue;}
  var mt=maxTierEver(tn),firstEpoch=tc[0].epoch;
  teamAch[tn]=computeOneTeamAch(tn,tr,tc,mt,firstEpoch);
}

// 成就比例统计
var achPercentages={},achCounts={},activeTeams=0;
for(var tmn in teamAch){
  var has=false;for(var cid in rankings[tmn]){if(hasRank(rankings[tmn][cid])){has=true;break;}}
  if(has)activeTeams++;
  teamAch[tmn].forEach(function(a){achCounts[a.id]=(achCounts[a.id]||0)+1;});
}
for(var id in achCounts){achPercentages[id]=Math.round(achCounts[id]/activeTeams*100);}

// 反向索引
var achTeams={};
for(var tmn in teamAch){teamAch[tmn].forEach(function(a){if(!achTeams[a.id])achTeams[a.id]=[];achTeams[a.id].push(tmn);});}

// 成就描述
var achDescs={
  fullspectrum:'名次分布覆盖过1~3、4~10、11~20、20+四个区间',
  max_tw:'最高曾进入过论外梯队',max_t0:'最高曾进入过T0梯队',max_t1:'最高曾进入过T1梯队',
  max_t2:'最高曾进入过T2梯队',max_t3:'最高曾进入过T3梯队',
  champion:'获得过第1名',top10_streak5:'连续5次获得前10名',
  mini_slam:'在CCBC与P&KU中均获得过前3名',
  rival:'与另一支队伍交手至少8次且胜负相差不大于2（仅计算前二十名内的胜负）',
  dragonslayer:'在一场比赛中超越了此前总分排名第1的队伍',
  debut_top10:'首次参赛便获得前10名',gold_line:'至少获得过2次第10名',
  hattrick:'至少连续三场比赛之间排名变动不超过2',
  rising:'至少连续三场比赛之间排名连续上升',
  comeback:'两场比赛之间排名上升至少30名',
  guillotine:'超越过至少5支曾获得过比赛第1名的队伍（仅计算前二十名内的胜负）',
  onetouchfive:'在一场比赛中超越了至少3支此前总分排名更高的T1及以上队伍（仅计算前二十名内的胜负）',
  backrow:'获得过50名开外的名次',ten_battles:'参与过至少10场比赛',
  follow_group:'自第一次参赛以来最多只连续1次不参赛',
  merge_happy:'并队参与过比赛',full_year:'在某自然年内参加了该年所有比赛',staff_duty:'因担任STAFF从参赛队伍中缺席',
  sniper:'在一场比赛中超越了此前总分排名更高的队伍恰好1名'
};
