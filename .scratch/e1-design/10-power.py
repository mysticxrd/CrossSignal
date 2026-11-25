# Section 10 power simulation (simulated, not measured): how well 28 held-out
# cases x 3 runs can tell two harness rungs apart.
# Cases: 30% easy (p=0.95), 40% medium (0.55-0.85), 30% hard (0.10-0.35) per run.
# Each row adds `delta` to every case's per-run pass chance for the higher rung,
# then compares exact two-sided McNemar on pass^3 with a sign-flip test on
# per-case pass counts (0-3), both at p < 0.05. Fixed seed; 300 sims per row.
# Run: python -I .scratch/e1-design/10-power.py   (no model calls, no spend)
import random, itertools
from math import comb
random.seed(7)
N=28; R=3
def mcnemar2(b,c):
    n=b+c
    if n==0: return 1.0
    k=max(b,c)
    p=sum(comb(n,i) for i in range(k,n+1))/2**n
    return min(1,2*p)
def signflip(d, iters=4000):
    obs=abs(sum(d)); nz=[x for x in d if x]
    if not nz: return 1.0
    cnt=0
    for _ in range(iters):
        s=abs(sum(x if random.random()<.5 else -x for x in nz))
        if s>=obs: cnt+=1
    return (cnt+1)/(iters+1)
def cases(base):
    # mixed difficulty: per-case per-run pass prob
    ps=[]
    for i in range(N):
        u=i/N
        if u<0.3: ps.append(0.95)
        elif u<0.7: ps.append(0.55+0.3*random.random())
        else: ps.append(0.1+0.25*random.random())
    return [min(.99,max(.01,p+base)) for p in ps]
def run(ps): return [sum(random.random()<p for _ in range(R)) for p in ps]
def trial(delta, sims=400):
    rows=[]
    for _ in range(sims):
        p0=cases(0); p1=[min(.99,max(.01,p+delta)) for p in p0]
        a=run(p0); b=run(p1)
        A=[x==3 for x in a]; B=[x==3 for x in b]
        bb=sum(1 for x,y in zip(A,B) if y and not x); cc=sum(1 for x,y in zip(A,B) if x and not y)
        d=[y-x for x,y in zip(a,b)]
        rows.append((sum(B)-sum(A), mcnemar2(bb,cc)<.05, signflip(d,1500)<.05, bb+cc, sum(A)/N, sum(a)/(N*R)))
    return rows
for delta in [0,0.05,0.10,0.15,0.20,0.25,0.30]:
    r=trial(delta,300)
    diffs=sorted(x[0] for x in r)
    print(f"per-run +{delta:.2f}: pass^3 base~{sum(x[4] for x in r)/len(r):.2f} pass1 base~{sum(x[5] for x in r)/len(r):.2f} | pass^3 diff median {diffs[len(diffs)//2]} cases, 5-95% [{diffs[int(.05*len(diffs))]},{diffs[int(.95*len(diffs))]}] | discordant mean {sum(x[3] for x in r)/len(r):.1f} | power McNemar(pass^3) {sum(x[1] for x in r)/len(r):.2f} signflip(counts) {sum(x[2] for x in r)/len(r):.2f}")
