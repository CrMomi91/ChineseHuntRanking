import json, re, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(SCRIPT_DIR, 'data', 'rankings.json'), 'r', encoding='utf-8') as f:
    rankings = json.load(f)

def parse_minutes(t):
    if not t: return None
    if re.match(r'^\d+:\d{2}:\d{2}$', t):
        h, m, s = map(int, t.split(':'))
        return h * 60 + m + s / 60
    if re.match(r'^\d+:\d{2}$', t):
        parts = t.split(':')
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
    if re.match(r'^\d+\.\d+$', t):
        return float(t) * 60
    return None

def get_top_n(cid, n=10):
    data = []
    for name, entry in rankings.items():
        r = entry.get(cid)
        if not r or not isinstance(r, dict) or r.get('staff'): continue
        rank = r.get('rank')
        if rank is None or isinstance(rank, str): continue
        rank = int(rank)
        minutes = parse_minutes(r.get('time'))
        if minutes is None: continue
        data.append((rank, name, minutes))
    data.sort(key=lambda x: x[0])
    return data[:n]

c16 = get_top_n('CCBC16')
pkub = get_top_n('P&KU3b')

print("=== CCBC16 Top 10 ===")
for r, name, m in c16:
    hh = int(m // 60); mm = int(m % 60); ss = int((m % 1) * 60)
    print(f"  #{r} {name:25s} {hh}:{mm:02d}:{ss:02d}  ({m:.1f} min)")

print("\n=== P&KU3b Top 10 ===")
for r, name, m in pkub:
    hh = int(m // 60); mm = int(m % 60); ss = int((m % 1) * 60)
    print(f"  #{r} {name:25s} {hh}:{mm:02d}:{ss:02d}  ({m:.1f} min)")

plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'PingFang SC', 'Noto Sans CJK SC', 'sans-serif']
plt.rcParams['axes.unicode_minus'] = False

fig, ax = plt.subplots(figsize=(12, 7))

x = np.arange(1, 11)

c16_hrs = [t[2] / 60 for t in c16]
pkub_hrs = [t[2] / 60 for t in pkub]

color_c16 = '#2471A3'
color_pkub = '#C0392B'

ax.plot(x, c16_hrs, 'o-', color=color_c16, linewidth=2.5, markersize=8, label='CCBC16')
ax.plot(x, pkub_hrs, 's--', color=color_pkub, linewidth=2.5, markersize=8, label='P&KU3b')

for i, (rank, name, mins) in enumerate(c16):
    hh = int(mins // 60); mm = int(mins % 60)
    label = f'{hh}:{mm:02d}'
    ax.annotate(label, (x[i], c16_hrs[i]), textcoords="offset points", xytext=(0, 12),
                 ha='center', fontsize=9, color=color_c16, fontweight='bold')

for i, (rank, name, mins) in enumerate(pkub):
    hh = int(mins // 60); mm = int(mins % 60)
    label = f'{hh}:{mm:02d}'
    ax.annotate(label, (x[i], pkub_hrs[i]), textcoords="offset points", xytext=(0, -16),
                 ha='center', fontsize=9, color=color_pkub, fontweight='bold')

ax.set_xlabel('排名', fontsize=14)
ax.set_ylabel('完赛时长 (小时)', fontsize=14)
ax.set_xticks(x)
ax.set_xlim(0.5, 10.5)
ax.set_ylim(0, None)
ax.legend(fontsize=13)
ax.grid(True, alpha=0.3)

plt.title('CCBC16 vs P&KU3b 前十完赛时长对比', fontsize=16, fontweight='bold', pad=20)
plt.tight_layout()

outpath = os.path.join(SCRIPT_DIR, 'comparison.png')
plt.savefig(outpath, dpi=150, bbox_inches='tight')
print(f'\n图片已保存: {outpath}')
