import json, sys, io, os, datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, 'data')
SRC_DIR = os.path.join(SCRIPT_DIR, 'src')
HTML_PATH = os.path.join(SCRIPT_DIR, 'index.html')
README_PATH = os.path.join(SCRIPT_DIR, '..', '说明.txt')

# 加载数据
with open(os.path.join(DATA_DIR, 'competitions.json'), 'r', encoding='utf-8') as f:
    comps = json.load(f)
with open(os.path.join(DATA_DIR, 'rankings.json'), 'r', encoding='utf-8') as f:
    rankings = json.load(f)

# 从 rankings.json 生成 TEAMS（仅包含 name，分数在 JS 端计算）
teams_list = [{"name": name, "tier": "", "rank": "", "score": 0} for name in rankings.keys()]

# 生成 LINKS
links = {}
for c in comps:
    links[c['id']] = c.get('url', '')
    if c.get('rankingUrl'):
        links[c['id'] + '_rank'] = c['rankingUrl']

# 生成 COMP_EPOCHS
comp_epochs = {}
for c in comps:
    p = c['date'].split('-')
    y, m, d = int(p[0]), int(p[1]), int(p[2])
    dt = datetime.datetime(y, m, d, 12, 0, 0)
    comp_epochs[c['id']] = int((dt - datetime.datetime(1970, 1, 1)).total_seconds() * 1000)

# 读取说明文件并转为 HTML
with open(README_PATH, 'r', encoding='utf-8') as f:
    raw = f.read()
raw = raw.replace('@榆木华', '<a href="https://space.bilibili.com/3663104" target="_blank">@榆木华</a>')
raw = raw.replace('voilern 的网站', '<a href="https://stats.voilern.cn/" target="_blank">voilern 的网站</a>')
raw = raw.replace('个人娱乐', '<b>个人娱乐</b>')
raw = raw.replace('无科学依据', '<b>无科学依据</b>')
readme_html = '<p><b class="sec-title">网站说明</b></p>' + ''.join(f'<p>{l.strip()}</p>' for l in raw.split('\n') if l.strip())

# 分数说明
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

# 读取 JS 模块并拼接
js_modules = []
js_dir = os.path.join(SRC_DIR, 'js')
for fname in ['scoring.js', 'achievements.js', 'charts.js', 'ui.js', 'main.js']:
    fpath = os.path.join(js_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        js_modules.append(f.read())
js_all = '\n\n'.join(js_modules)

# 读取模板
template_path = os.path.join(SRC_DIR, 'template.html')
with open(template_path, 'r', encoding='utf-8') as f:
    template = f.read()

# 替换占位符
html = template.replace('__README__', readme_html)
html = html.replace('__TEAMS__', json.dumps(teams_list, ensure_ascii=False, indent=2))
html = html.replace('__COMPETITIONS__', json.dumps(comps, ensure_ascii=False))
html = html.replace('__RANKINGS__', json.dumps(rankings, ensure_ascii=False))
html = html.replace('__LINKS__', json.dumps(links, ensure_ascii=False))
html = html.replace('__EPOCHS__', json.dumps(comp_epochs, ensure_ascii=False))
html = html.replace('__JS_MODULES__', js_all)

# 写入输出文件
with open(HTML_PATH, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'Generated {HTML_PATH} ({len(html):,} bytes)')
print(f'  Teams: {len(teams_list)}')
print(f'  Competitions: {len(comps)}')
print(f'  JS modules: {len(js_modules)} files')
