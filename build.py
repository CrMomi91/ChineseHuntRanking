import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import datetime

DATA_DIR = r'D:\工作\华Hunt队伍强度表\华hunt-ranking\data'
HTML_PATH = r'D:\工作\华Hunt队伍强度表\华hunt-ranking\index.html'
README_PATH = r'D:\工作\华Hunt队伍强度表\说明.txt'

with open(f'{DATA_DIR}/teams.json', 'r', encoding='utf-8') as f: teams_json = f.read()
with open(f'{DATA_DIR}/competitions.json', 'r', encoding='utf-8') as f: comps_json = f.read()
with open(f'{DATA_DIR}/rankings.json', 'r', encoding='utf-8') as f: rankings_json = f.read()
with open(f'{DATA_DIR}/comp_results.json', 'r', encoding='utf-8') as f: comp_results_json = f.read()

links = {}
for c in json.loads(comps_json):
    links[c['id']] = c.get('url', '')
    if c.get('rankingUrl'):
        links[c['id']+'_rank'] = c['rankingUrl']
links_json = json.dumps(links, ensure_ascii=False)

comps = json.loads(comps_json)
comp_epochs = {}
for c in comps:
    p = c['date'].split('-')
    y, m, d = int(p[0]), int(p[1]), int(p[2])
    dt = datetime.datetime(y, m, d, 12, 0, 0)
    comp_epochs[c['id']] = int((dt - datetime.datetime(1970, 1, 1)).total_seconds() * 1000)
epochs_json = json.dumps(comp_epochs, ensure_ascii=False)

with open(README_PATH, 'r', encoding='utf-8') as f: raw = f.read()
raw = raw.replace('@榆木华', '<a href="https://space.bilibili.com/3663104" target="_blank">@榆木华</a>')
raw = raw.replace('voilern 的网站', '<a href="https://stats.voilern.cn/" target="_blank">voilern 的网站</a>')
raw = raw.replace('个人娱乐', '<b>个人娱乐</b>')
raw = raw.replace('无科学依据', '<b>无科学依据</b>')
readme_html = '<p><b class="sec-title">网站说明</b></p>' + ''.join(f'<p>{l.strip()}</p>' for l in raw.split('\n') if l.strip())

score_doc = r'''
<p><b class="sec-title">分数说明</b></p>

<p><b class="sub-title">排名得分</b></p>
<p>排名得分由指数公式给出，名次越靠前得分越高，靠后平滑趋近于 0。未参赛为 0。若同一比赛出现重复名次（并队），得分减半。</p>
<p class="formula" data-latex="\text{得分} = \frac{100}{e^{\frac{\text{rank} - 1}{6}}}"></p>
<p>例：#1 → <b>100.00</b>，#3 → <b>71.65</b>，#10 → <b>22.31</b>，#20 → <b>4.21</b>，#50 → <b>0.03</b></p>

<p><b class="sub-title">比赛权重</b></p>
<p>每场比赛有一个随时间衰减的权重：</p>
<p class="formula" data-latex="\text{时延系数} = e^{\frac{\text{开赛日期} - \text{今天}}{365 \times 2}}"></p>
<p class="formula" data-latex="\text{比赛系数} = \begin{cases} 1 & \text{PKU / CCBC} \\ 0.8 & \text{其余赛事} \end{cases}"></p>
<p class="formula" data-latex="\text{权重} = \text{时延系数} \times \text{比赛系数}"></p>
<p>越新的比赛权重越大。距今 2 年 → 时延系数 ≈ <b>0.37</b>，1 年 → <b>0.61</b>，6 个月 → <b>0.78</b>。</p>

<p><b class="sub-title">总分计算</b></p>
<p class="formula" data-latex="\text{累积分} = \sum (\text{权重} \times \text{排名得分})"></p>
<p class="formula" data-latex="\text{稳定分} = \frac{\sum (\text{时延系数} \times \text{得分})}{\sum \text{时延系数}}"></p>
<p class="formula" data-latex="\text{总分} = \text{累积分} + \text{稳定分}"></p>
<p>按总分降序排名。梯队：≥500 → 论外，≥300 → T0，≥200 → T1，≥100 → T2，≥25 → T3。</p>
'''
readme_html = readme_html + score_doc

HTML = r'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>中华 Puzzle Hunt 队伍数据统计</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js"></script>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { overflow-y: scroll; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #f5f5f7; color: #1a1a1a; line-height: 1.4; -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: #aaa; }

.wrap { padding: 48px 36px 60px; }
.center-col { display: flex; flex-direction: column; align-items: center; }

.page-header { margin-bottom: 20px; text-align: center; }
.page-header h1 { font-size: 30px; font-weight: 600; color: #111; }
.page-header .subtitle { font-size: 14px; color: #ccc; margin-top: 4px; }

.tab-bar { display: flex; gap: 0; margin-bottom: 28px; }
.tab-btn {
  padding: 8px 24px; font-size: 15px; font-weight: 500; font-family: inherit;
  border: none; background: transparent; color: #999; cursor: pointer;
  border-bottom: 2px solid transparent; transition: all 0.15s;
}
.tab-btn:hover { color: #555; }
.tab-btn.active { color: #111; border-bottom-color: #333; }
.tab-content { display: none; }
.tab-content.active { display: block; }

/* Bar chart */
.bar-chart-wrap { margin-bottom: 20px; background: #fff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 16px 10px 10px; overflow: visible; }
.bar-chart-wrap canvas { display: block; }

/* Leaderboard */
.col-heads {
  display: inline-flex; align-items: flex-end;
  padding: 0 0 10px 0; font-size: 14px; color: #aaa; font-weight: 500;
}
.col-heads .ch-spacer { width: 6px; flex-shrink: 0; }
.col-heads .ch-rank   { width: 44px; flex-shrink: 0; text-align: center; }
.col-heads .ch-name   { width: 214px; flex-shrink: 0; text-align: center; }
.col-heads .ch-total,
.col-heads .ch-front,
.col-heads .ch-stable { width: 68px; flex-shrink: 0; text-align: center; cursor: pointer; user-select: none; }
.col-heads .ch-count  { width: 52px; flex-shrink: 0; text-align: center; cursor: pointer; user-select: none; }
.col-heads .ch-total:hover,
.col-heads .ch-front:hover,
.col-heads .ch-stable:hover,
.col-heads .ch-count:hover { color: #555; }
.col-heads .sort-active { color: #333; font-weight: 600; }

.comp-heads {
  display: flex; gap: 10px; overflow-x: auto; flex-shrink: 0; padding: 0 10px;
}
.comp-link {
  display: block; width: 40px; min-width: 40px; text-align: center;
  font-size: 12px; color: #aaa; text-decoration: none; cursor: pointer;
  transition: color 0.15s; font-weight: 500;
}
.comp-link.bold-link { font-weight: 700; }
.comp-link:hover { color: #555; }

.card {
  display: inline-flex; align-items: stretch; height: 60px;
  background: #fff; border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  margin-bottom: 4px; overflow: hidden; transition: box-shadow 0.15s;
}
.card:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.10); }

.card-strip { width: 6px; flex-shrink: 0; }
.t0 .card-strip { background: #E74C3C; }
.t1 .card-strip { background: #F0A030; }
.t2 .card-strip { background: #9B7CB8; }
.t3 .card-strip { background: #5B9BD5; }
.t4 .card-strip { background: #5DA85D; }
.tw .card-strip { background: #222; }
.tsim .card-strip { background: #bbb; }

.card-info { display: flex; align-items: stretch; flex-shrink: 0; }
.t0 .card-info { background: #FDEDEC; }
.t1 .card-info { background: #FEF2E4; }
.t2 .card-info { background: #F4EEF8; }
.t3 .card-info { background: #EEF2F8; }
.t4 .card-info { background: #EEF5EE; }
.tw .card-info { background: #333; }
.tsim .card-info { background: #f5f5f5; }

.card-info span { display: flex; align-items: center; justify-content: center; }
.tw .card-rank,
.tw .card-name,
.tw .card-total { color: #fff; }
.tw .card-front { color: #ccc; }
.tw .card-stable { color: #ccc; }
.card-rank  { width: 44px; font-size: 17px; font-weight: 700; color: #333; }
.card-name  { width: 214px; font-size: 15px; font-weight: 500; color: #1a1a1a;
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 8px; }
.card-total { width: 68px; font-size: 15px; font-weight: 600; color: #111; }
.card-front { width: 68px; font-size: 15px; font-weight: 500; color: #999; }
.card-stable{ width: 68px; font-size: 15px; font-weight: 500; color: #999; }
.card-count { width: 52px; font-size: 15px; font-weight: 500; color: #555; }

.card-badges {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0; padding: 0 10px;
  overflow-x: auto;
}

.badge {
  width: 40px; height: 40px; min-width: 40px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 5px; font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums;
  cursor: pointer; transition: transform 0.12s, box-shadow 0.12s; position: relative;
}
.badge:hover { transform: scale(1.12); box-shadow: 0 2px 8px rgba(0,0,0,0.18); z-index: 5; }
.badge.merged { font-style: italic; font-weight: 400; }

.bg-1  { background: #FADBD8; color: #C0392B; }
.bg-2  { background: #FDEBD0; color: #D68910; }
.bg-3  { background: #FDEBD0; color: #D68910; }
.bg-4  { background: #E8DAEF; color: #7D3C98; }
.bg-5  { background: #E8DAEF; color: #7D3C98; }
.bg-6  { background: #E8DAEF; color: #7D3C98; }
.bg-7  { background: #D4E6F1; color: #2471A3; }
.bg-8  { background: #D4E6F1; color: #2471A3; }
.bg-9  { background: #D4E6F1; color: #2471A3; }
.bg-10 { background: #D4E6F1; color: #2471A3; }
.bg-11 { background: #E0F0E0; color: #2E7D32; }
.bg-12 { background: #E0F0E0; color: #2E7D32; }
.bg-13 { background: #E0F0E0; color: #2E7D32; }
.bg-14 { background: #E0F0E0; color: #2E7D32; }
.bg-15 { background: #E0F0E0; color: #2E7D32; }
.bg-16 { background: #E0F0E0; color: #2E7D32; }
.bg-17 { background: #E0F0E0; color: #2E7D32; }
.bg-18 { background: #E0F0E0; color: #2E7D32; }
.bg-19 { background: #E0F0E0; color: #2E7D32; }
.bg-20 { background: #E0F0E0; color: #2E7D32; }
.bg-mid  { background: #fff; color: #333; font-weight: 400; border: 1px solid #eee; }
.bg-mid.merged { font-weight: 400; }
.bg-null { background: #f5f5f5; color: #ccc; font-weight: 400; }

#tooltip {
  position: fixed; pointer-events: none; z-index: 1000;
  background: #333; color: #fff; font-size: 13px; font-weight: 400;
  padding: 5px 12px; border-radius: 5px; white-space: nowrap;
  opacity: 0; transition: opacity 0.12s; top: 0; left: 0;
}
#tooltip.show { opacity: 1; }

/* Floating panel */
.fab {
  position: fixed; bottom: 28px; right: 28px; z-index: 100;
  width: 48px; height: 48px; border-radius: 50%; background: #333; color: #fff;
  border: none; font-size: 22px; cursor: pointer; box-shadow: 0 3px 12px rgba(0,0,0,0.18);
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
}
.fab:hover { transform: scale(1.08); box-shadow: 0 5px 16px rgba(0,0,0,0.22); }

.sim-panel {
  position: fixed; bottom: 90px; right: 28px; z-index: 99;
  width: 400px; max-height: 70vh; background: #fff; border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12); overflow: hidden;
  display: none; flex-direction: column;
}
.sim-panel.show { display: flex; }

.sim-panel-header {
  padding: 14px 18px; border-bottom: 1px solid #eee;
  font-size: 16px; font-weight: 600; color: #111;
  display: flex; justify-content: space-between; align-items: center;
}
.sim-panel-close { background: none; border: none; font-size: 18px; color: #aaa; cursor: pointer; }
.sim-panel-close:hover { color: #333; }

.sim-panel-body { padding: 14px 18px; overflow-y: auto; flex: 1; }

.sim-team-card {
  background: #f9f9f9; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px;
}
.sim-team-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.sim-team-name { font-weight: 600; font-size: 15px; cursor: pointer; }
.sim-team-name:hover { color: #3A6EA5; }
.sim-team-name-edit { font-size: 14px; padding: 2px 6px; border: 1px solid #ddd; border-radius: 3px; font-family: inherit; width: 120px; outline: none; }
.sim-team-del { background: none; border: none; color: #ccc; cursor: pointer; font-size: 16px; }
.sim-team-del:hover { color: #e55; }

.sim-result-row {
  display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 13px;
}
.sim-result-row .sr-comp { width: 65px; color: #888; }
.sim-result-row .sr-rank { width: 36px; text-align: center; font-weight: 600; color: #333; }
.sim-result-row .sr-del { background: none; border: none; color: #ddd; cursor: pointer; font-size: 12px; padding: 2px; }
.sim-result-row .sr-del:hover { color: #e55; }

.sim-add-row { display: flex; gap: 6px; align-items: center; margin-top: 6px; }
.sim-add-row select, .sim-add-row input {
  font-size: 12px; padding: 3px 6px; border: 1px solid #ddd; border-radius: 3px;
  background: #fff; font-family: inherit; outline: none;
}
.sim-add-row select { width: 75px; }
.sim-add-row input { width: 48px; }
.sim-add-row button {
  font-size: 12px; padding: 3px 10px; border: 1px solid #ccc; border-radius: 3px;
  background: #fff; cursor: pointer; color: #555;
}
.sim-add-row button:hover { border-color: #333; color: #333; }

.sim-add-team-btn {
  display: block; width: 100%; padding: 8px; margin-top: 8px; border: 1px dashed #ddd;
  border-radius: 6px; background: transparent; color: #aaa; font-size: 14px; cursor: pointer;
}
.sim-add-team-btn:hover { border-color: #999; color: #555; }

.sim-add-team-form { margin-top: 8px; display: flex; gap: 6px; display: none; }
.sim-add-team-form.show { display: flex; }
.sim-add-team-form input { flex: 1; font-size: 13px; padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; outline: none; }
.sim-add-team-form button { font-size: 13px; padding: 5px 14px; border: 1px solid #333; border-radius: 4px; background: #333; color: #fff; cursor: pointer; }

.sim-switch { position: relative; display: inline-block; width: 28px; height: 16px; }
.sim-switch input { opacity: 0; width: 0; height: 0; }
.sim-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #ccc; border-radius: 16px; transition: 0.2s; }
.sim-slider::before { content: ''; position: absolute; height: 12px; width: 12px; left: 2px; bottom: 2px; background: #fff; border-radius: 50%; transition: 0.2s; }
.sim-switch input:checked + .sim-slider { background: #555; }
.sim-switch input:checked + .sim-slider::before { transform: translateX(12px); }

/* Tab 2 */
.tab2-wrap, .tab3-wrap { max-width: 900px; margin: 0 auto; }
.sel-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.sel-row label { font-size: 15px; color: #666; white-space: nowrap; }
.sel-row select {
  font-size: 15px; padding: 6px 12px; border: 1px solid #ddd; border-radius: 5px;
  background: #fff; font-family: inherit; min-width: 200px; outline: none;
}
.info-bar { font-size: 14px; color: #888; margin-bottom: 16px; }
.info-bar span { margin-right: 20px; }
.info-bar strong { color: #555; }

.chart-wrap { margin-bottom: 20px; background: #fff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 16px 10px 10px; }
.chart-wrap canvas { display: block; width: 100%; }

.history-header {
  display: flex; align-items: center; padding: 0 18px 6px; font-size: 12px; color: #bbb; font-weight: 500;
}
.history-header .hh-spacer { width: 4px; flex-shrink: 0; }
.history-header span { flex-shrink: 0; }
.hh-name { width: 130px; }
.hh-date { width: 90px; }
.hh-rank { width: 60px; text-align: center; }
.hh-score { width: 55px; text-align: right; }
.hh-weight{ width: 62px; text-align: right; }
.hh-integral { width: 62px; text-align: right; }

.history-card {
  background: #fff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  margin-bottom: 4px; overflow: hidden;
  display: flex; align-items: stretch; min-height: 46px;
  transition: box-shadow 0.15s;
}
.history-card:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.10); }
.hcard-strip { width: 4px; flex-shrink: 0; }
.hcard-strip.s-1 { background: #E74C3C; }
.hcard-strip.s-2 { background: #F0A030; }
.hcard-strip.s-3 { background: #F0A030; }
.hcard-strip.s-top10 { background: #2471A3; }
.hcard-strip.s-mid { background: #9B7CB8; }
.hcard-strip.s-low { background: #ccc; }

.hcard-body { display: flex; align-items: center; flex: 1; padding: 0 14px; gap: 0; }
.hcard-name { width: 130px; font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hcard-name:hover { color: #3A6EA5 !important; }
.hcard-name b { font-weight: 700; }
.hcard-date { width: 90px; font-size: 13px; color: #888; }
.hcard-rank { width: 48px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-size: 13px; font-weight: 700; margin: 0 6px; }
.hcard-rank.sr-1 { background: #FADBD8; color: #C0392B; }
.hcard-rank.sr-2 { background: #FDEBD0; color: #D68910; }
.hcard-rank.sr-3 { background: #FDEBD0; color: #D68910; }
.hcard-rank.sr-4, .hcard-rank.sr-5, .hcard-rank.sr-6 { background: #E8DAEF; color: #7D3C98; }
.hcard-rank.sr-7, .hcard-rank.sr-8, .hcard-rank.sr-9, .hcard-rank.sr-10 { background: #D4E6F1; color: #2471A3; }
.hcard-rank.sr-mid { background: #E0F0E0; color: #2E7D32; }
.hcard-rank.sr-low { background: #f5f5f5; color: #999; font-weight: 400; }
.hcard-rank.sr-merged { font-style: italic; font-weight: 400; }
.hcard-score { width: 55px; text-align: right; font-size: 14px; font-weight: 500; color: #555; }
.hcard-weight{ width: 62px; text-align: right; font-size: 13px; color: #999; font-weight: 400; }
.hcard-integral { width: 62px; text-align: right; font-size: 14px; font-weight: 500; color: #333; }

.comp-card {
  background: #fff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  margin-bottom: 4px; overflow: hidden; padding: 14px 20px;
}
.comp-card h3 { font-size: 17px; font-weight: 600; margin-bottom: 4px; }
.comp-card h3 a:hover { color: #3A6EA5; }
.comp-card .cmeta { font-size: 13px; color: #888; margin-bottom: 12px; }

.comp-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.comp-table th { background: #f3f3f3; padding: 8px 10px; text-align: center; font-weight: 500; color: #666; border-bottom: 2px solid #e0e0e0; }
.comp-table td { padding: 8px 10px; text-align: center; border-bottom: 1px solid #eee; }
.comp-table td:nth-child(3) { text-align: left; font-weight: 500; }
.comp-table td:nth-child(4) { text-align: left; font-size: 12px; color: #888; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.comp-table td.cr-1 { color: #C0392B; background: #FADBD8; font-weight: 700; }
.comp-table td.cr-2, .comp-table td.cr-3 { color: #D68910; background: #FDEBD0; font-weight: 700; }
.comp-table td.cr-4, .comp-table td.cr-5, .comp-table td.cr-6 { color: #7D3C98; background: #E8DAEF; font-weight: 700; }
.comp-table td.cr-7, .comp-table td.cr-8, .comp-table td.cr-9, .comp-table td.cr-10 { color: #2471A3; background: #D4E6F1; font-weight: 700; }
.comp-table td.cr-mid { font-weight: 400; }
.comp-table td.merged { font-style: italic; font-weight: 400 !important; }

.tab4-wrap { max-width: 700px; margin: 0 auto; }
.readme { font-size: 15px; line-height: 1.8; color: #555; }
.readme p { margin-bottom: 12px; }
.readme a { color: #3A6EA5; text-decoration: none; }
.readme a:hover { text-decoration: underline; }
.readme b { color: #333; }
.readme .sec-title { font-size: 18px; color: #111; display: block; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 16px; }
.readme .sub-title { font-size: 16px; color: #333; display: block; margin-top: 24px; margin-bottom: 8px; }
.readme .formula { text-align: center; font-size: 16px; background: #f8f8f8; padding: 8px 0; border-radius: 4px; margin: 8px 0; }
.readme .formula .katex { font-size: 1.1em; }

#app { display: flex; flex-direction: column; align-items: center; }
</style>
</head>
<body>
<div class="wrap">
  <div class="center-col">
    <div class="page-header"><h1>中华 Puzzle Hunt 队伍数据统计</h1><div class="subtitle">野榜，纯属娱乐，可能存在误导</div></div>

    <div class="tab-bar">
      <button class="tab-btn active" data-tab="tab1">总榜</button>
      <button class="tab-btn" data-tab="tab2">队伍</button>
      <button class="tab-btn" data-tab="tab3">比赛</button>
      <button class="tab-btn" data-tab="tab4">说明</button>
    </div>

    <div class="tab-content active" id="tab1">
      <div class="bar-chart-wrap"><canvas id="barChart"></canvas></div>
      <div class="col-heads">
        <span class="ch-spacer"></span>
        <span class="ch-rank">排名</span><span class="ch-name">队伍</span>
        <span class="ch-total">总分</span><span class="ch-front">累积分</span><span class="ch-stable">稳定分</span><span class="ch-count">次数</span>
        <div class="comp-heads" id="compHeads"></div>
      </div>
      <div id="app"></div>
    </div>

    <div class="tab-content" id="tab2">
      <div class="tab2-wrap">
        <div class="sel-row"><label>选择队伍：</label><select id="teamSelect"></select></div>
        <div class="info-bar" id="teamInfo"></div>
        <div class="chart-wrap"><canvas id="teamChart"></canvas></div>
        <div class="history-header"><span class="hh-spacer"></span><span class="hh-name">比赛</span><span class="hh-date">日期</span><span class="hh-rank">名次</span><span class="hh-score">得分</span><span class="hh-weight">权重</span><span class="hh-integral">积分</span></div>
        <div id="teamHistory"></div>
      </div>
    </div>

    <div class="tab-content" id="tab3">
      <div class="tab3-wrap">
        <div class="sel-row"><label>选择比赛：</label><select id="compSelect"></select></div>
        <div id="compDetail"></div>
      </div>
    </div>

    <div class="tab-content" id="tab4">
      <div class="tab4-wrap"><div class="readme">__README__</div></div>
    </div>
  </div>
  <div id="tooltip"></div>
</div>

<button class="fab" id="fabBtn" title="管理自建队伍">+</button>
<div class="sim-panel" id="simPanel">
  <div class="sim-panel-header">
    <span>自建队伍</span>
    <div style="display:flex;align-items:center;gap:10px;">
      <label class="sim-switch" title="显示自建队伍">
        <input type="checkbox" id="simToggle">
        <span class="sim-slider"></span>
      </label>
      <button class="sim-panel-close" id="simPanelClose">&times;</button>
    </div>
  </div>
  <div class="sim-panel-body" id="simPanelBody"></div>
</div>

<script>
var TEAMS = __TEAMS__;
var COMPETITIONS = __COMPETITIONS__;
var RANKINGS = __RANKINGS__;
var COMP_RESULTS = __COMP_RESULTS__;
var LINKS = __LINKS__;
var COMP_EPOCHS = __EPOCHS__;

(function() {
var comps=COMPETITIONS,rankings=RANKINGS,links=LINKS,compResults=COMP_RESULTS,epochs=COMP_EPOCHS;

function compWeight(id){if(id.indexOf('P&KU')===0||id.indexOf('CCBC')===0)return 1;return 0.8;}
function isMajor(id){return id.indexOf('P&KU')===0||id.indexOf('CCBC')===0;}
function esc(s){if(!s)return'';return s.replace(/&/g,'&amp;').replace(/</g,'&lt;');}
function boldComp(id){return isMajor(id)?'<b>'+esc(id)+'</b>':esc(id);}
function decayCoeff(compId,w){var days=(epochs[compId]-Date.now())/86400000;return Math.exp(days/365/2)*w;}
function rankScore(r){
  if(r===null||r===undefined||r==='')return 0;
  var n=parseInt(r,10);if(isNaN(n))return 0;
  return 100/Math.exp((n-1)/6);
}

var mergedMap={},rankBuckets={};
for(var tn in rankings){for(var cid in rankings[tn]){var r=rankings[tn][cid];if(r!==null&&r!==undefined&&r!==''&&typeof r==='number'){var key=cid+'_'+r;if(!rankBuckets[key])rankBuckets[key]=[];rankBuckets[key].push(tn);}}}
for(var key in rankBuckets){if(rankBuckets[key].length>1){var cid=key.split('_')[0];rankBuckets[key].forEach(function(tn){mergedMap[tn+'_'+cid]=true;});}}
function isMerged(teamName,compId){return !!mergedMap[teamName+'_'+compId];}

function rankCls(r){var n=parseInt(r,10);if(isNaN(n))return'cr-mid';if(n===1)return'cr-1';if(n<=3)return'cr-2';if(n<=6)return'cr-4';if(n<=10)return'cr-7';return'cr-mid';}

function computeScores(tr,tname){
  var fs=0,ss=0,sw=0;
  for(var i=0;i<comps.length;i++){var c=comps[i],r=tr[c.id],rs=rankScore(r);if(tname&&isMerged(tname,c.id))rs/=2;var dc=decayCoeff(c.id,compWeight(c.id)),rd=decayCoeff(c.id,1);fs+=dc*rs;if(r!==null&&r!==undefined&&r!==''){ss+=rd*rs;sw+=rd;}}
  var sa=sw>0?ss/sw:0;
  return{total:fs+sa,frontSum:fs,stableAvg:sa};
}

var teams=TEAMS.map(function(t){
  var s=computeScores(rankings[t.name]||{},t.name);
  var count=0,tw=0;
  for(var i=0;i<comps.length;i++){var r=rankings[t.name][comps[i].id];if(r!==null&&r!==undefined&&r!==''){count++;tw+=decayCoeff(comps[i].id,compWeight(comps[i].id));}}
  return{name:t.name,origName:t.name,total:s.total,frontSum:s.frontSum,stableAvg:s.stableAvg,count:count,tw:tw};
});
teams.sort(function(a,b){return b.total-a.total;});
teams.forEach(function(t,i){t.rank=i+1;t.tier=t.total>=500?'tw':t.total>=300?'t0':t.total>=200?'t1':t.total>=100?'t2':t.total>=25?'t3':'t4';});

var tooltip=document.getElementById('tooltip');
function showTT(e,text,el){tooltip.textContent=text;tooltip.style.left='-999px';tooltip.classList.add('show');var tw=tooltip.offsetWidth,th=tooltip.offsetHeight;var rect=el.getBoundingClientRect();var x=rect.left+rect.width/2-tw/2;var y=rect.top-th-6;if(y<0)y=rect.bottom+6;if(x<4)x=4;if(x+tw>window.innerWidth-4)x=window.innerWidth-tw-4;tooltip.style.left=x+'px';tooltip.style.top=y+'px';}
function hideTT(){tooltip.classList.remove('show');}

document.querySelectorAll('.tab-btn').forEach(function(btn){btn.addEventListener('click',function(){
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('.tab-content').forEach(function(c){c.classList.remove('active');});
  btn.classList.add('active');document.getElementById(btn.dataset.tab).classList.add('active');
  document.getElementById('fabBtn').style.display=btn.dataset.tab==='tab1'?'':'none';
  var panel=document.getElementById('simPanel');if(btn.dataset.tab!=='tab1')panel.classList.remove('show');
});});

// TAB 1
var chead=document.getElementById('compHeads');
comps.forEach(function(c){
  var a=document.createElement('a');a.className='comp-link'+(isMajor(c.id)?' bold-link':'');
  a.textContent=c.id;a.href=links[c.id+'_rank']||links[c.id]||'#';a.target='_blank';a.rel='noopener';
  var dc=decayCoeff(c.id,compWeight(c.id));
  a.addEventListener('mouseenter',function(e){showTT(e,c.id+' | '+c.date+' | \u6743\u91CD '+dc.toFixed(2),this);});
  a.addEventListener('mouseleave',hideTT);chead.appendChild(a);
});

function badgeCls(r){if(r===null||r===undefined||r==='')return'bg-null';var n=parseInt(r,10);if(isNaN(n))return'bg-mid';if(n>=1&&n<=20)return'bg-'+n;return'bg-mid';}
function badgeText(r){if(r===null||r===undefined||r==='')return'-';if(typeof r==='number'&&r>50)return'50+';return typeof r==='string'?r:String(r);}

var app=document.getElementById('app');
var simTeams=[];
try{var saved=localStorage.getItem('hunt_sim_teams');if(saved)simTeams=JSON.parse(saved);}catch(e){}
function saveSimTeams(){try{localStorage.setItem('hunt_sim_teams',JSON.stringify(simTeams));}catch(e){}}

function simRanksToObj(ranks){var o={};ranks.forEach(function(e){o[e.c]=e.r;});return o;}

var sortBy='total';
function setSort(metric,el){
  sortBy=metric;
  document.querySelectorAll('.ch-total,.ch-front,.ch-stable,.ch-count').forEach(function(e){e.classList.remove('sort-active');});
  el.classList.add('sort-active');
  renderAll();
}

function renderAll(){
  renderLeaderboard();
  drawBarChart();
}

// Bar chart
var barCanvas=document.getElementById('barChart');

function drawBarChart(){
  var showSim=document.getElementById('simToggle').checked;
  var all=(showSim?simTeams.map(function(st){var tr=simRanksToObj(st.ranks||[]),s=computeScores(tr);return{name:st.name,total:s.total,frontSum:s.frontSum,stableAvg:s.stableAvg,_ranks:tr,_sim:true,rank:0,tier:'tsim',count:Object.values(tr).filter(function(v){return v!==null&&v!==undefined&&v!=='';}).length,tw:0};}).concat(teams):teams);
  all.sort(function(a,b){var va=a[sortBy]||0,vb=b[sortBy]||0;if(vb!==va)return vb-va;if(sortBy==='count')return (b.tw||0)-(a.tw||0);return 0;});
  all.forEach(function(t,i){t.rank=i+1;});

  var canvas=barCanvas,ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1;
  var cssW=Math.max(canvas.parentElement.clientWidth-20,560),cssH=250;
  canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';
  canvas.width=cssW*dpr;canvas.height=cssH*dpr;ctx.scale(dpr,dpr);

  var ceilY=sortBy==='stableAvg'?100:sortBy==='count'?20:500;
  var pad={top:44,right:16,bottom:56,left:50};
  var pw=cssW-pad.left-pad.right,ph=cssH-pad.top-pad.bottom;
  var n=all.length,colW=20,gap=(pw-colW*n)/(n+1);

  ctx.clearRect(0,0,cssW,cssH);

  // Title
  var labels={total:'\u603B\u5206',frontSum:'\u7D2F\u79EF\u5206',stableAvg:'\u7A33\u5B9A\u5206',count:'\u53C2\u8D5B\u6B21\u6570'};
  ctx.fillStyle='#888';ctx.font='12px sans-serif';ctx.textAlign='left';
  ctx.fillText(labels[sortBy]||'',8,18);

  // Grid lines at 100 (or 20 for stable)
  var step=sortBy==='stableAvg'?20:sortBy==='count'?5:100;
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

  all.forEach(function(t,i){
    var x=pad.left+gap+i*(colW+gap);
    var val=t[sortBy]||0;
    var h=Math.max(2,val/ceilY*ph);
    var isSim=!!t._sim;
    var color;if(isSim)color='#ccc';else if(t.tier==='tw')color='#333';else if(t.tier==='t0')color='#E74C3C';else if(t.tier==='t1')color='#F0A030';else if(t.tier==='t2')color='#9B7CB8';else if(t.tier==='t3')color='#5B9BD5';else color='#5DA85D';
    ctx.fillStyle=color;ctx.fillRect(x,pad.top+ph-h,colW,h);

    // Number above bar
    ctx.fillStyle='#444';ctx.font='bold 10px sans-serif';ctx.textAlign='center';
    var ny=pad.top+ph-h-4;if(ny<pad.top-8)ny=pad.top-8;
    ctx.fillText(val.toFixed(1),x+colW/2,ny);

    // Label below - more horizontal
  ctx.fillStyle='#333';ctx.font='10px sans-serif';ctx.textAlign='right';
    ctx.save();ctx.translate(x+colW/2+8,cssH-pad.bottom+10);ctx.rotate(-0.4);
    ctx.fillText(t.name||'',0,0);ctx.restore();
  });
}

var sortTotal=document.querySelector('.ch-total');
var sortFront=document.querySelector('.ch-front');
var sortStable=document.querySelector('.ch-stable');
var sortCount=document.querySelector('.ch-count');
sortTotal.classList.add('sort-active');
sortTotal.addEventListener('click',function(){setSort('total',this);});
sortFront.addEventListener('click',function(){setSort('frontSum',this);});
sortStable.addEventListener('click',function(){setSort('stableAvg',this);});
sortCount.addEventListener('click',function(){setSort('count',this);});

function renderLeaderboard(){
  app.innerHTML='';
  var showSim=document.getElementById('simToggle').checked;
  var all=(showSim?simTeams.map(function(st){var tr=simRanksToObj(st.ranks||[]),s=computeScores(tr);return{name:st.name,total:s.total,frontSum:s.frontSum,stableAvg:s.stableAvg,_ranks:tr,_sim:true,rank:0,tier:'tsim',count:Object.values(tr).filter(function(v){return v!==null&&v!==undefined&&v!=='';}).length,tw:0};}).concat(teams):teams);
  all.sort(function(a,b){var va=a[sortBy]||0,vb=b[sortBy]||0;if(vb!==va)return vb-va;if(sortBy==='count')return (b.tw||0)-(a.tw||0);return 0;});
  all.forEach(function(t,i){t.rank=i+1;});
  all.forEach(function(t){renderCard(t);});
}

function renderCard(team){
  var tr2=team._ranks||rankings[team.origName]||{},isSim=!!team._sim;
  var card=document.createElement('div');  card.className='card '+(isSim?'tsim':team.tier||'t4');
  var strip=document.createElement('div');strip.className='card-strip';card.appendChild(strip);
  var info=document.createElement('div');info.className='card-info';
  [{c:'card-rank',v:team.rank},{c:'card-name',v:team.name},{c:'card-total',v:team.total.toFixed(1)},{c:'card-front',v:team.frontSum.toFixed(1)},{c:'card-stable',v:team.stableAvg.toFixed(1)},{c:'card-count',v:team.count}].forEach(function(it){var s=document.createElement('span');s.className=it.c;s.textContent=it.v;info.appendChild(s);});
  card.appendChild(info);
  var badges=document.createElement('div');badges.className='card-badges';
  for(var k=0;k<comps.length;k++){(function(c){
    var r=tr2[c.id],b=document.createElement('span');
    var cls=badgeCls(r),merged=!isSim&&isMerged(team.origName||'',c.id);
    b.className='badge '+cls+(merged?' merged':'');
    b.textContent=badgeText(r);
    var dc=decayCoeff(c.id,compWeight(c.id));
    var alpha=Math.max(0.2,Math.min(1,dc/0.8));
    b.style.opacity=alpha;
    b.addEventListener('mouseenter',function(){this.style.opacity='1';});
    b.addEventListener('mouseleave',function(){this.style.opacity=alpha;});
    if(r!==null&&r!==undefined&&r!==''){
      var rs=rankScore(r);if(merged)rs/=2;var contrib=dc*rs;
      b.addEventListener('mouseenter',function(e){showTT(e,c.id+' | \u5F97\u5206 '+rs.toFixed(1)+' | \u79EF\u5206 '+contrib.toFixed(1)+(merged?' | \u5E76\u961F':''),this);});
      b.addEventListener('mouseleave',hideTT);
      b.addEventListener('click',function(){var u=links[c.id+'_rank']||links[c.id];if(u)window.open(u,'_blank');});
    }
    badges.appendChild(b);
  })(comps[k]);}
  card.appendChild(badges);app.appendChild(card);
}

// Restore toggle + initial render
(function(){var v=localStorage.getItem('hunt_sim_show');document.getElementById('simToggle').checked=v==='true';})();
renderAll();

// TAB 2
var tsel=document.getElementById('teamSelect');
teams.forEach(function(t){var o=document.createElement('option');o.value=t.origName;o.textContent=t.name;tsel.appendChild(o);});
var tinfo=document.getElementById('teamInfo'),thist=document.getElementById('teamHistory');
var tchart=document.getElementById('teamChart');

function chartY(r,ph,pad){return pad.top+ph*Math.pow((r-1)/49,0.4);}

function drawChart(tname){
  var canvas=tchart,ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1;
  var cssW=canvas.parentElement.clientWidth-20,cssH=220;
  if(cssW<500)cssW=500;
  canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';
  canvas.width=cssW*dpr;canvas.height=cssH*dpr;ctx.scale(dpr,dpr);
  var tr=rankings[tname]||{},pad={top:22,right:16,bottom:40,left:34};
  var pw=cssW-pad.left-pad.right,ph=cssH-pad.top-pad.bottom,stepX=pw/15,maxR=50;

  ctx.clearRect(0,0,cssW,cssH);
  ctx.strokeStyle='#eee';ctx.lineWidth=1;
  [1,10,20,30,40,50].forEach(function(r){var gy=chartY(r,ph,pad);ctx.beginPath();ctx.moveTo(pad.left,gy);ctx.lineTo(cssW-pad.right,gy);ctx.stroke();});
  ctx.strokeStyle='#ccc';ctx.beginPath();ctx.moveTo(pad.left,pad.top);ctx.lineTo(pad.left,cssH-pad.bottom);ctx.stroke();
  ctx.beginPath();ctx.moveTo(pad.left,cssH-pad.bottom);ctx.lineTo(cssW-pad.right,cssH-pad.bottom);ctx.stroke();
  ctx.fillStyle='#bbb';ctx.font='11px sans-serif';ctx.textAlign='right';
  [1,10,20,30,40,50].forEach(function(r){ctx.fillText(r,pad.left-4,chartY(r,ph,pad)+4);});
  ctx.textAlign='right';ctx.fillStyle='#bbb';ctx.font='10px sans-serif';
  comps.forEach(function(c,i){ctx.save();ctx.translate(pad.left+i*stepX,cssH-pad.bottom+8);ctx.rotate(-0.6);ctx.fillText(c.id,0,0);ctx.restore();});

  var pts=[];
  comps.forEach(function(c,i){
    var r=tr[c.id];if(r===null||r===undefined||r==='')return;
    var raw=r,is50=typeof r==='string'&&r.indexOf('50')!==-1;
    var n=is50?50:parseInt(r,10);if(isNaN(n))return;
    if(n>maxR)n=maxR;pts.push({x:pad.left+i*stepX,y:chartY(n,ph,pad),r:n,raw:raw,is50:is50,i:i});
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
    ctx.fill();var ly=n<=3?p.y+14:p.y-10;ctx.fillStyle='#333';ctx.fillText(lbl,p.x,ly);
  }
}

function buildTeamHistory(tname){
  var tr=rankings[tname]||{};var parts=0,frontSum=0,ss=0,sw=0;thist.innerHTML='';
  comps.forEach(function(c){var r=tr[c.id];if(r===null||r===undefined||r==='')return;parts++;var rs=rankScore(r),merged=isMerged(tname,c.id);if(merged)rs/=2;var dc=decayCoeff(c.id,compWeight(c.id)),rd=decayCoeff(c.id,1),integral=dc*rs;ss+=rd*rs;sw+=rd;frontSum+=integral;
    var card=document.createElement('div');card.className='history-card';var strip=document.createElement('div');strip.className='hcard-strip';
    var n=parseInt(r,10);if(n===1)strip.className+=' s-1';else if(n<=3)strip.className+=' s-2';else if(n<=10)strip.className+=' s-top10';else if(n<=20)strip.className+=' s-mid';else strip.className+=' s-low';
    if(merged)strip.className+=' sr-merged';
    card.appendChild(strip);var body=document.createElement('div');body.className='hcard-body';
    var nm=document.createElement('a');nm.className='hcard-name';nm.innerHTML=boldComp(c.id);nm.href=links[c.id]||'#';nm.target='_blank';nm.rel='noopener';nm.style.cssText='text-decoration:none;color:inherit;';
    var dt=document.createElement('span');dt.className='hcard-date';dt.textContent=c.date;
    var rk=document.createElement('span');rk.className='hcard-rank';var rn=parseInt(r,10);
    if(rn===1)rk.className+=' sr-1';else if(rn<=3)rk.className+=' sr-2';else if(rn<=6)rk.className+=' sr-4';else if(rn<=10)rk.className+=' sr-7';else if(rn<=20)rk.className+=' sr-mid';else rk.className+=' sr-low';
    if(merged)rk.className+=' sr-merged';rk.textContent='#'+badgeText(r);
    var sc=document.createElement('span');sc.className='hcard-score';sc.textContent=rs.toFixed(1);
    var wt=document.createElement('span');wt.className='hcard-weight';wt.textContent=dc.toFixed(2);
    var it=document.createElement('span');it.className='hcard-integral';it.textContent=integral.toFixed(1);
    body.appendChild(nm);body.appendChild(dt);body.appendChild(rk);body.appendChild(sc);body.appendChild(wt);body.appendChild(it);card.appendChild(body);thist.appendChild(card);
  });
  var sa=sw>0?ss/sw:0;
  tinfo.innerHTML='\u53C2\u8D5B <strong>'+parts+'</strong> / '+comps.length+' \u573A &nbsp;|&nbsp; \u603B\u5206 <strong>'+(frontSum+sa).toFixed(1)+'</strong> &nbsp;|&nbsp; \u7D2F\u79EF\u5206 <strong>'+frontSum.toFixed(1)+'</strong> &nbsp;|&nbsp; \u7A33\u5B9A\u5206 <strong>'+sa.toFixed(1)+'</strong>';
  drawChart(tname);
}
tsel.addEventListener('change',function(){buildTeamHistory(tsel.value);});setTimeout(function(){buildTeamHistory(tsel.value);},100);

// TAB 3
var csel=document.getElementById('compSelect');
comps.forEach(function(c){var o=document.createElement('option');o.value=c.id;o.textContent=c.id;csel.appendChild(o);});
var cdetail=document.getElementById('compDetail');
function buildCompDetail(cid){
  var c=null;for(var i=0;i<comps.length;i++){if(comps[i].id===cid){c=comps[i];break;}}if(!c)return;
  var data=compResults[cid]||[];data.sort(function(a,b){var ra=typeof a.rank==='number'?a.rank:999,rb=typeof b.rank==='number'?b.rank:999;return ra-rb;});
  var dc=decayCoeff(cid,compWeight(cid)),rawDecay=dc/compWeight(cid),w=compWeight(cid);
  var compRanks={};for(var i=0;i<data.length;i++){var rk=data[i].rank;if(typeof rk==='number'){if(!compRanks[rk])compRanks[rk]=[];compRanks[rk].push(i);}}
  var compMerged={};for(var rk in compRanks){if(compRanks[rk].length>1)compRanks[rk].forEach(function(idx){compMerged[idx]=true;});}
  var html='<div class="comp-card"><h3><a href="'+(links[cid]||'#')+'" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">'+cid+'</a></h3>';
  html+='<div class="cmeta">\u5F00\u8D5B\u65F6\u95F4\uff1a'+c.date+' &nbsp;|&nbsp; \u65F6\u5EF6\u7CFB\u6570 '+rawDecay.toFixed(2)+' \u00D7 '+w.toFixed(2)+' = \u6743\u91CD '+dc.toFixed(2)+'</div>';
  html+='<table class="comp-table"><thead><tr><th>\u540D\u6B21</th><th>\u961F\u4F0D</th><th>\u961F\u5458</th><th>\u7528\u65F6</th><th>\u5F97\u5206</th><th>\u79EF\u5206</th></tr></thead><tbody>';
  for(var i=0;i<Math.min(data.length,10);i++){var d=data[i],rs=rankScore(d.rank),integral=dc*rs,mrg=compMerged[i];if(mrg){rs/=2;integral/=2;}
    html+='<tr><td class="'+rankCls(d.rank)+(mrg?' merged':'')+'">#'+d.rank+(mrg?'\u5E76':'')+'</td><td>'+esc(d.cleanName)+'</td><td>'+esc(d.members.join(', '))+'</td><td>'+esc(d.time)+'</td><td>'+rs.toFixed(1)+'</td><td>'+integral.toFixed(1)+'</td></tr>';}
  html+='</tbody></table><p style="font-size:12px;color:#bbb;margin-top:12px;text-align:center;">\u961F\u5458\u7559\u7A7A\u4EE3\u8868\u4FE1\u606F\u7F3A\u5931\uFF0C\u4E0D\u4EE3\u8868\u771F\u5B9E\u6210\u5458\u6570\u91CF\u3002\u524D\u5341\u540D\u4EE5\u5916\u7684\u8BE6\u7EC6\u4FE1\u606F\u6682\u4E0D\u6536\u5F55\u3002</p></div>';cdetail.innerHTML=html;
}
csel.addEventListener('change',function(){buildCompDetail(csel.value);});buildCompDetail(csel.value);

// SIM PANEL
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
    var nm=document.createElement('span');nm.className='sim-team-name';nm.textContent=st.name||'\u672A\u547D\u540D';
    nm.addEventListener('click',function(){
      var inp=document.createElement('input');inp.className='sim-team-name-edit';inp.value=st.name;
      nm.replaceWith(inp);inp.focus();inp.select();
      inp.addEventListener('blur',function(){saveName();});
      inp.addEventListener('keydown',function(e){if(e.key==='Enter')saveName();});
      function saveName(){var v=inp.value.trim();if(v)st.name=v;saveSimTeams();renderSimPanel();renderAll();}
    });
    var del=document.createElement('button');del.className='sim-team-del';del.textContent='\u2715';
    del.addEventListener('click',function(){simTeams.splice(i,1);saveSimTeams();renderSimPanel();renderAll();});
    hdr.appendChild(nm);hdr.appendChild(del);card.appendChild(hdr);

    (st.ranks||[]).forEach(function(e,j){
      var row=document.createElement('div');row.className='sim-result-row';
      row.innerHTML='<span class="sr-comp">'+e.c+'</span><span class="sr-rank">#'+badgeText(e.r)+'</span>';
      var rd=document.createElement('button');rd.className='sr-del';rd.textContent='\u2715';
      rd.addEventListener('click',function(){simTeams[i].ranks.splice(j,1);saveSimTeams();renderSimPanel();renderAll();});
      row.appendChild(rd);card.appendChild(row);
    });

    var addRow=document.createElement('div');addRow.className='sim-add-row';
    var sel=document.createElement('select');
    sel.innerHTML='<option value="">+</option>';
    comps.forEach(function(c){sel.innerHTML+='<option value="'+c.id+'">'+c.id+'</option>';});
    var inp=document.createElement('input');inp.type='text';inp.placeholder='名次';inp.style.width='48px';
    inp.addEventListener('input',function(){this.value=this.value.replace(/[^0-9]/g,'');});
    var btn=document.createElement('button');btn.textContent='\u6DFB\u52A0';
    btn.addEventListener('click',function(){
      var cid=sel.value,rn=parseInt(inp.value,10);if(!cid||isNaN(rn))return;
      if(!simTeams[i].ranks)simTeams[i].ranks=[];
      simTeams[i].ranks=simTeams[i].ranks.filter(function(e){return e.c!==cid;});
      simTeams[i].ranks.push({c:cid,r:rn});saveSimTeams();renderSimPanel();renderAll();
    });
    addRow.appendChild(sel);addRow.appendChild(inp);addRow.appendChild(btn);card.appendChild(addRow);
    body.appendChild(card);
  });

  var addTeamBtn=document.createElement('button');addTeamBtn.className='sim-add-team-btn';addTeamBtn.textContent='+ \u6DFB\u52A0\u961F\u4F0D';
  var addTeamForm=document.createElement('div');addTeamForm.className='sim-add-team-form';
  var addTeamInp=document.createElement('input');addTeamInp.placeholder='\u961F\u540D';
  var addTeamSubmit=document.createElement('button');addTeamSubmit.textContent='\u521B\u5EFA';
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
})();
</script>
<script>document.querySelectorAll('.formula[data-latex]').forEach(function(el){try{katex.render(el.dataset.latex,el,{throwOnError:false})}catch(e){}});</script>
</body>
</html>'''

html = HTML.replace('__README__', readme_html)
html = html.replace('__TEAMS__', teams_json)
html = html.replace('__COMPETITIONS__', comps_json)
html = html.replace('__RANKINGS__', rankings_json)
html = html.replace('__COMP_RESULTS__', comp_results_json)
html = html.replace('__LINKS__', links_json)
html = html.replace('__EPOCHS__', epochs_json)

with open(HTML_PATH, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'Generated {HTML_PATH} ({len(html)} bytes)')
