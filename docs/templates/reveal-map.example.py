# 공개 지도(reveal-map.svg) 만드는 방법의 실제 예시 — scenarios/001/reveal-map.svg를 만든 스크립트.
# 새 판에서는 복사해서 Panel(경위도 범위)·다각형·경로·라벨만 바꾼다. docs/EPISODE_GUIDE.md 7.2.
#   python3 docs/templates/reveal-map.example.py > scenarios/<id>/reveal-map.svg
# 원칙: 손으로 단순화한 위경도 다각형(해안선 점 10~40개), 정거원통 투영(경도 × cos 중심위도),
#       팔레트 고정, 플레이어 나라만 형광, 나라 이름 옆에 원래 기호 첨자.
import math, sys
INK='#1f2733'; INK2='#57616d'; SEA='#cfd8dc'; LAND='#f3f5f2'; LAND2='#e6eae7'; SELF='#f2b530'; FRAME='#c3cac6'

class Panel:
    def __init__(s, x, y, w, lon0, lon1, lat0, lat1, cos=True):
        s.x, s.y, s.lon0, s.lon1, s.lat0, s.lat1 = x, y, lon0, lon1, lat0, lat1
        k = math.cos(math.radians((lat0+lat1)/2)) if cos else 1
        s.sx = w/((lon1-lon0)*k); s.k = k
        s.w = w; s.h = (lat1-lat0)*s.sx
    def p(s, lon, lat):
        return (s.x + (lon-s.lon0)*s.k*s.sx, s.y + (s.lat1-lat)*s.sx)
    def path(s, pts, close=True):
        d = ' '.join(('M' if i==0 else 'L') + f'{x:.1f} {y:.1f}' for i,(x,y) in enumerate(s.p(*q) for q in pts))
        return d + (' Z' if close else '')

out=[]
W=640
L = Panel(16, 40, 384, -15.0, 9.5, 35.0, 53.0)   # 유럽 상세
R = Panel(420, 40, 204, -52.0, 2.0, -26.0, 46.0, cos=False)  # 대서양 개관
H = int(max(L.h, R.h) + 40 + 34)
out.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" font-family="\'IBM Plex Sans KR\', sans-serif" aria-label="실제 지도: 프랑스군은 바욘에서 스페인을 지나 아브란트스를 거쳐 리스본으로 진군했고, 영국 함대는 테주강 어귀를 봉쇄했다. 포르투갈 왕실은 리스본에서 대서양을 건너 바이아를 거쳐 리우데자네이루로 갔다.">')
out.append('<title>실제 지도</title>')
out.append(f'<defs><marker id="rh" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="{INK}"/></marker>'
           f'<clipPath id="cl"><rect x="{L.x}" y="{L.y}" width="{L.w:.1f}" height="{L.h:.1f}"/></clipPath>'
           f'<clipPath id="cr"><rect x="{R.x}" y="{R.y}" width="{R.w:.1f}" height="{R.h:.1f}"/></clipPath></defs>')
out.append(f'<rect width="{W}" height="{H}" fill="#eef1ee"/>')

# ---- 왼쪽: 유럽 상세 ----
portugal=[(-8.87,41.87),(-8.1,42.0),(-6.6,41.95),(-6.2,41.6),(-6.9,41.0),(-6.8,40.3),(-7.0,39.7),(-7.5,39.6),(-7.0,39.0),(-7.3,38.4),(-7.0,38.0),(-7.5,37.5),(-7.4,37.2),
          (-8.0,37.0),(-8.9,37.0),(-8.8,38.0),(-9.2,38.7),(-9.5,38.8),(-9.0,39.5),(-8.9,40.2),(-8.65,41.15)]
spain=[(-9.3,43.0),(-8.0,43.7),(-5.8,43.6),(-3.8,43.45),(-1.8,43.4),(-0.7,42.8),(0.7,42.8),(1.7,42.5),(3.2,42.4),(3.2,41.9),(2.2,41.4),(0.9,41.0),(-0.4,39.5),(0.2,38.8),(-0.5,38.3),(-0.8,37.6),(-1.6,37.2),
       (-2.1,36.7),(-4.4,36.7),(-5.6,36.0),(-6.3,36.5),(-6.9,37.2),(-7.4,37.2),(-7.5,37.5),(-7.0,38.0),(-7.3,38.4),(-7.0,39.0),(-7.5,39.6),(-7.0,39.7),(-6.8,40.3),(-6.9,41.0),(-6.2,41.6),(-6.6,41.95),(-8.1,42.0),(-8.87,41.87),(-9.3,42.4)]
france=[(-1.8,43.4),(-1.2,44.6),(-1.2,46.0),(-2.2,47.1),(-4.5,47.8),(-4.7,48.4),(-3.0,48.8),(-1.6,48.6),(-1.9,49.7),(-1.2,49.4),(0.1,49.5),(1.6,50.2),(2.5,51.1),(4.8,50.0),(8.2,49.0),(7.6,47.6),(6.1,46.2),(7.0,45.0),(7.5,43.8),
        (6.0,43.1),(4.8,43.4),(3.0,43.3),(3.2,42.4),(1.7,42.5),(0.7,42.8),(-0.7,42.8)]
europe_rest=[(2.5,51.1),(4.3,51.9),(4.8,53.2),(10.5,53.5),(10.5,43.9),(8.9,44.4),(7.5,43.8),(7.0,45.0),(6.1,46.2),(7.6,47.6),(8.2,49.0),(4.8,50.0)]
britain=[(-5.7,50.1),(-4.2,50.35),(-3.4,50.6),(-1.9,50.6),(-0.8,50.75),(0.3,50.8),(1.4,51.15),(1.4,51.4),(0.6,51.55),(1.3,51.9),(1.75,52.5),(1.7,53.4),(-3.0,53.4),(-4.6,52.8),(-4.1,52.3),(-5.3,51.85),(-4.3,51.65),(-3.2,51.45),(-3.0,51.2),(-4.2,51.2),(-5.1,50.7)]
ireland=[(-10.2,51.6),(-8.5,51.6),(-6.4,52.2),(-6.0,53.4),(-10.2,53.4),(-10.4,52.6)]
africa=[(-16,35.0),(-6.2,35.5),(-5.9,35.8),(-5.3,35.9),(-2.9,35.3),(-1.0,35.7),(1.0,36.5),(3.0,36.8),(10.5,37.2),(10.5,34.5),(-16,34.5)]

out.append(f'<g clip-path="url(#cl)"><rect x="{L.x}" y="{L.y}" width="{L.w:.1f}" height="{L.h:.1f}" fill="{SEA}"/>')
for poly,fill in [(europe_rest,LAND2),(africa,LAND2),(ireland,LAND2),(britain,LAND),(france,LAND),(spain,LAND),(portugal,SELF)]:
    out.append(f'<path d="{L.path(poly)}" fill="{fill}" stroke="{INK}" stroke-width="0.9" stroke-linejoin="round"/>')
out.append('</g>')
out.append(f'<rect x="{L.x}" y="{L.y}" width="{L.w:.1f}" height="{L.h:.1f}" fill="none" stroke="{FRAME}"/>')

def dot(P, lon, lat, r=2.6, fill=INK):
    x,y=P.p(lon,lat); return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{fill}"/>'
def text(P, lon, lat, s, size=10, anchor='start', weight=400, fill=INK, dx=0, dy=0):
    x,y=P.p(lon,lat); return f'<text x="{x+dx:.1f}" y="{y+dy:.1f}" font-size="{size}" text-anchor="{anchor}" font-weight="{weight}" fill="{fill}">{s}</text>'
def sub(s, letter):  # 이름 + 원래 기호 첨자
    return f'{s}<tspan font-size="0.62em" dy="-0.45em" fill="{INK2}" font-weight="600">{letter}</tspan>'

# 쥐노 진격로 (Oman: 바욘 → 비다소아 → 살라망카 → 알칸타라 → 아브란트스 → 리스본)
junot=[(-1.47,43.49),(-1.78,43.35),(-3.7,42.3),(-5.66,40.97),(-6.88,39.72),(-8.2,39.46),(-9.0,38.78)]
out.append(f'<path d="{L.path(junot, close=False)}" fill="none" stroke="{INK}" stroke-width="2.4" stroke-dasharray="6 4" stroke-linejoin="round" marker-end="url(#rh)"/>')
for name,lon,lat,dx,dy,anc in [('바욘',-1.47,43.49,6,-4,'start'),('살라망카',-5.66,40.97,6,-3,'start'),('알칸타라',-6.88,39.72,6,10,'start'),('아브란트스',-8.2,39.46,-2,-7,'end')]:
    out.append(dot(L,lon,lat,2.2,INK2)); out.append(text(L,lon,lat,name,8.5,anc,400,INK2,dx,dy))
out.append(dot(L,-9.14,38.72,3.6,INK)); out.append(text(L,-9.14,38.72,'리스본',10,'start',600,INK,7,14))
# 영국 함대 봉쇄, 러시아 함대 정박
bx,by=L.p(-10.0,38.6)
out.append(f'<g transform="translate({bx:.1f} {by:.1f})" fill="{INK}"><path d="M-7 2 L7 2 L4.5 6 L-4.5 6 Z"/><path d="M0 -8 L0 2 M0 -7 L5.5 0 L0 0" fill="none" stroke="{INK}" stroke-width="1.2"/></g>')
out.append(text(L,-10.0,38.6,sub('영국 함대 봉쇄','C'),8.5,'end',600,INK,-10,4))
out.append(text(L,-14.6,37.75,sub('강 안에 러시아 함대','F'),8,'start',400,INK2,0,0))
# 나라 이름 (기호 병기)
for s,l,lon,lat,size in [('포르투갈','A',-11.6,40.5,11),('스페인','D',-2.4,40.0,13),('프랑스','B',2.2,46.6,13),('영국','C',-1.6,52.15,11)]:
    out.append(text(L,lon,lat,sub(s,l),size,'middle',600))
out.append(text(L,-3.4,41.75,'프랑스군 진격로',8.5,'start',600,INK,8,0))

# ---- 오른쪽: 대서양 개관 ----
iberia_r=[(-1.8,43.4),(-8.0,43.7),(-9.3,43.0),(-8.9,41.9),(-9.5,38.8),(-8.9,37.0),(-6.3,36.5),(-5.6,36.0),(-2.1,36.7),(-0.4,38.5),(2.5,41.3),(2.5,46.5),(-1.2,46.5),(-1.2,44.6)]
africa_r=[(2.5,36.6),(-1.0,35.7),(-5.9,35.8),(-9.6,30.4),(-13.0,27.8),(-16.0,24.0),(-17.0,21.0),(-17.1,14.7),(-15.0,11.0),(-13.0,8.5),(-8.0,4.5),(-4.0,5.2),(2.5,6.0)]
brazil=[(-53,-1.5),(-50,0.5),(-48.5,-1.3),(-44,-2.5),(-38.5,-3.7),(-35.2,-5.8),(-34.8,-7.1),(-35.0,-9.0),(-37.0,-11.0),(-38.5,-13.0),(-39.0,-15.0),(-39.7,-19.5),(-41.0,-22.0),(-43.2,-22.9),(-45.0,-23.6),(-48.5,-26.5),(-53,-26.5)]
out.append(f'<g clip-path="url(#cr)"><rect x="{R.x}" y="{R.y}" width="{R.w:.1f}" height="{R.h:.1f}" fill="{SEA}"/>')
for poly,fill in [(africa_r,LAND2),(brazil,LAND),(iberia_r,LAND)]:
    out.append(f'<path d="{R.path(poly)}" fill="{fill}" stroke="{INK}" stroke-width="0.8" stroke-linejoin="round"/>')
# 포르투갈 표시
px,py=R.p(-8.4,39.5)
out.append(f'<path d="{R.path([(-8.9,41.9),(-6.8,41.9),(-7.3,37.2),(-8.9,37.0),(-9.5,38.8)])}" fill="{SELF}" stroke="{INK}" stroke-width="0.8"/>')
out.append('</g>')
out.append(f'<rect x="{R.x}" y="{R.y}" width="{R.w:.1f}" height="{R.h:.1f}" fill="none" stroke="{FRAME}"/>')
# 왕실 항로 리스본 → 바이아 → 리우
route=[(-9.14,38.72),(-16,30),(-24,16),(-31,0),(-36.5,-10),(-38.5,-12.97)]
def curve(P, pts):
    q=[P.p(*a) for a in pts]
    d=f'M{q[0][0]:.1f} {q[0][1]:.1f}'
    for i in range(1,len(q)):
        x0,y0=q[i-1]; x1,y1=q[i]; mx,my=(x0+x1)/2,(y0+y1)/2
        d+=f' Q{x0:.1f} {y0:.1f} {mx:.1f} {my:.1f}' if i>1 else f' L{mx:.1f} {my:.1f}'
    d+=f' L{q[-1][0]:.1f} {q[-1][1]:.1f}'
    return d
out.append(f'<path d="{curve(R,route)}" fill="none" stroke="{INK}" stroke-width="2" marker-end="url(#rh)"/>')
out.append(f'<path d="{R.path([(-38.5,-12.97),(-40.6,-18),(-43.2,-22.9)],close=False)}" fill="none" stroke="{INK}" stroke-width="2" marker-end="url(#rh)"/>')
for name,lon,lat,dx,dy,anc,w in [('리스본',-9.14,38.72,-5,-6,'end',600),('바이아',-38.5,-12.97,5,4,'start',600),('리우데자네이루',-43.2,-22.9,-4,14,'start',600)]:
    out.append(dot(R,lon,lat,2.8)); out.append(text(R,lon,lat,name,8.5,anc,w,INK,dx,dy))
out.append(text(R,-44,-6.5,sub('브라질','E'),12,'middle',600))
out.append(text(R,-42,12,'왕실 함대 항로',8.5,'start',600,INK,0,0))
out.append(text(R,-33,40,'대서양',10,'middle',400,INK2))

# 제목·주석
out.append(f'<text x="{L.x}" y="26" font-size="12" font-weight="600" fill="{INK}">이베리아반도, 1807년 11월</text>')
out.append(f'<text x="{R.x}" y="26" font-size="12" font-weight="600" fill="{INK}">대서양 건너, 1807~1808년</text>')
out.append(f'<text x="{L.x}" y="{H-10}" font-size="9" fill="{INK2}">해안선은 단순화했다. 점선은 프랑스군, 실선은 왕실 함대. 이름 옆 작은 글자는 게임 속 기호.</text>')
out.append('</svg>')
sys.stdout.write('\n'.join(out)+'\n')
