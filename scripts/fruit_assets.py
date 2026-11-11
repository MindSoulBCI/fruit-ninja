"""Procedural 3D adaptation of the original game.js palette and fruit details."""
from pathlib import Path
from PIL import Image, ImageDraw
import math, random
out=Path('app/src/main/assets/fruit');out.mkdir(parents=True,exist_ok=True)
random.seed(42)
bases=[(233,61,67),(255,152,32),(82,150,70),(40,45,44),(153,119,72),(240,70,99),(148,90,171)]
for kind,base in enumerate(bases):
 im=Image.new('RGB',(512,256));pix=im.load()
 for y in range(256):
  for x in range(512):
   u=x/512;v=y/256;nx=math.sin(math.pi*v)*math.cos(math.tau*u);ny=-math.cos(math.pi*v);nz=math.sin(math.pi*v)*math.sin(math.tau*u)
   light=max(0,-nx*.38+ny*.55+nz*.74);shade=.40+.64*light
   if kind==2:shade*=1.25 if math.sin(u*math.pi*18+.2*math.sin(v*17))>.72 else .88
   noise=random.uniform(-.025,.025)
   highlight=max(0,light)**20*.36
   pix[x,y]=tuple(max(0,min(255,int(c*(shade+noise)+highlight*245))) for c in base)
 d=ImageDraw.Draw(im)
 if kind==4:
  for _ in range(2200):
   x=random.randrange(512);y=random.randrange(256);d.line((x,y,x+2,y-3),fill=(108,82,47),width=1)
 if kind==5:
  for y in range(35,235,28):
   for x in range((y//28)%2*14,512,30):d.ellipse((x,y,x+3,y+7),fill=(255,222,137))
 if kind==6:d.line([(256+int(8*math.sin(y/40)),y) for y in range(256)],fill=(110,57,120),width=2)
 im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).save(out/f'skin{kind}.png')
 if kind==3:continue
 flesh=[(255,245,205),(255,177,49),(246,80,96),None,(151,195,66),(246,107,123),(242,186,99)][kind]
 im=Image.new('RGB',(256,256));p=im.load()
 for y in range(256):
  for x in range(256):
   r=math.hypot(x-128,y-128)/128
   col=((218,237,175) if kind==2 else (255,235,177)) if r>.89 else flesh
   s=.9+.14*(1-(x+y)/512)+random.uniform(-.025,.025)
   p[x,y]=tuple(min(255,int(c*s)) for c in col)
 d=ImageDraw.Draw(im)
 if kind==2:
  for a in range(0,360,30):
   r=75 if a%60 else 90;x=128+r*math.cos(math.radians(a));y=128+r*math.sin(math.radians(a));d.ellipse((x-3,y-6,x+3,y+6),fill=(70,37,32))
 elif kind==1:
  for a in range(0,360,36):d.line((128,128,128+112*math.cos(math.radians(a)),128+112*math.sin(math.radians(a))),fill=(255,236,177),width=3)
  d.ellipse((117,117,139,139),fill=(255,240,187))
 elif kind==4:
  for a in range(0,360,10):
   ca=math.cos(math.radians(a));sa=math.sin(math.radians(a));d.line((128+28*ca,128+36*sa,128+104*ca,128+112*sa),fill=(221,236,144),width=1)
   if a%20==0:
    x=128+57*ca;y=128+65*sa;d.ellipse((x-2,y-4,x+2,y+4),fill=(57,52,33))
  d.ellipse((103,91,153,165),fill=(244,239,194))
 elif kind==6:
  d.ellipse((98,89,158,171),fill=(166,85,46));d.ellipse((106,97,145,157),fill=(201,135,69))
 elif kind==5:d.polygon([(108,35),(148,35),(138,223),(126,192)],fill=(255,218,175))
 else:
  d.ellipse((114,92,142,170),fill=(234,209,146))
  for x in [112,143]:d.ellipse((x-4,119,x+4,137),fill=(107,66,42))
 im.save(out/f'flesh{kind}.png')

def shape(kind,x,y,z):
 scale=[1.03,1,1.13,.96,.95,.92,.96][kind]
 if kind==0:
  x*=1+.10*y;z*=1+.10*y;y*=.90;y-=.13*math.exp(-(x*x+z*z)*18) if y>0 else -.05*math.exp(-(x*x+z*z)*18)
 if kind in (4,6):x*=.88;z*=.88
 if kind==5:x*=.72+.32*y;z*=.72+.32*y;y*=1.03
 return x*.075*scale,y*.075*scale,z*.075*scale

def write_mesh(path,verts,uv,faces):
 # normals are derived by loader; outward winding
 lines=[f'v {x:.6f} {y:.6f} {z:.6f}' for x,y,z in verts]+[f'vt {u:.6f} {v:.6f}' for u,v in uv]+['f '+' '.join(f'{i+1}/{i+1}' for i in f) for f in faces]
 (out/path).write_text('\n'.join(lines))
for kind in range(7):
 for half in (False,True):
  verts=[];uv=[];faces=[];rows=24;cols=48
  for j in range(rows+1):
   lat=math.pi*j/rows
   for i in range(cols+1):
    lon=(math.pi if half else math.tau)*i/cols+(math.pi if half else 0)
    verts.append(shape(kind,math.sin(lat)*math.cos(lon),math.cos(lat),math.sin(lat)*math.sin(lon)));uv.append((lon/math.tau,1-j/rows))
  for j in range(rows):
   for i in range(cols):
    a=j*(cols+1)+i;b=a+cols+1;faces.extend([(a,a+1,b),(a+1,b+1,b)])
  write_mesh(f'{"half" if half else "whole"}{kind}.obj',verts,uv,faces)
 verts=[(0,0,0)];uv=[(.5,.5)]
 for i in range(65):
  a=math.tau*i/64;x=math.cos(a);y=math.sin(a);verts.append(shape(kind,x,y,0));uv.append(((x+1)/2,(y+1)/2))
 write_mesh(f'cap{kind}.obj',verts,uv,[(0,i+1,i+2) for i in range(64)])
# Green curved leaf with front and back faces, and thin stem cylinder.
verts=[(0,0,0),(.018,.018,.005),(.045,.012,0),(.022,-.004,-.003)];uv=[(0,.5),(.4,1),(1,.5),(.4,0)]
write_mesh('leaf.obj',verts,uv,[(0,2,1),(0,3,2),(0,1,2),(0,2,3)])
verts=[];uv=[]
for y in [0,.027]:
 for i in range(9):
  a=math.tau*i/8;verts.append((.003*math.cos(a)+y*.15,y,.003*math.sin(a)));uv.append((i/8,y/.027))
write_mesh('stem.obj',verts,uv,[(i,i+1,i+9) for i in range(8)]+[(i+1,i+10,i+9) for i in range(8)])
print('Generated six fruits, bomb, shaped halves and caps, stems and leaves')
