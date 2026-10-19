# Builds the swipe prototype from the REAL Craftstales catalogue (read-only export; nothing is written to Shopify).
# Inputs: /workspace/craftstales-catalog/products.json, curated.json (display order, best image first), generated/<handle>/meta.json (approved copy, alt text)
# Outputs: assets/js/data.js, assets/img/p/<id>/NN.webp (<=1200 px wide), assets/img/t/<id>.webp (thumbs), grid.html, pieces/<id>.html
import json, os, re, html, shutil, unicodedata
from PIL import Image
R='/workspace/craftstales-swipe'; CAT='/workspace/craftstales-catalog'
P=json.load(open(f'{CAT}/products.json')); CUR=json.load(open(f'{CAT}/curated.json'))['products']
# duplicate listings (same piece listed twice, checked visually): keep the first, leave out the rest
DUP_DROP={'handcrafted-iron-decorative-boxes-set-of-3-antique-nickel-finish-hand-cut-hand-punched-engraved-1':'duplicate of handcrafted-iron-decorative-boxes-set-of-3-antique-nickel-finish-hand-cut-hand-punched-engraved (same piece, shorter description)',
 'reclaimed-wood-serving-tray-set-of-3':'duplicate of reclaimed-wood-serving-tray-set-of-2 (same two trays; handle says set of 3, title says set of 2)',
 'round-travertine-top-end-table-with-wooden-base-brass-finish-rod':'duplicate of no-data-ma9027 (same table, same price; only 2 photos)'}
# short display names (full Shopify title is kept as "title"); distinguishing words come from each description
NAME={
'handcrafted-iron-oval-storage-boxes-set-of-2-antique-nickel-finish-hand-punched':'Oval Iron Boxes, set of 2',
'handcrafted-iron-oval-storage-boxes-set-of-2-antique-brass-finish-hand-punched-copy':'Oval Iron Boxes, set of 2',
'handcrafted-iron-storage-box-with-partition-antique-brass-finish-hand-punched':'Iron Box with Partition',
'handcrafted-iron-storage-box-antique-brass-finish-hand-punched':'Iron Storage Box',
'handcrafted-iron-storage-boxes-set-of-2-antique-brass-finish-hand-punched':'Round Iron Boxes, set of 2',
'handcrafted-iron-storage-boxes-set-of-2-antique-brass-finish-hand-punched-copy':'Round Iron Boxes, set of 2',
'handcrafted-iron-storage-boxes-set-of-3-antique-brass-finish-hand-punched':'Iron Canisters, set of 3',
'handcrafted-iron-storage-boxes-set-of-3-antique-brass-finish-hand-punched-copy':'Iron Canisters, set of 3',
'handcrafted-iron-lanterns-set-of-3-antique-brass-finish-hand-cut-hand-punched-engraved':'Iron Lanterns, set of 3',
'handcrafted-iron-lanterns-set-of-3-antique-nickel-finish-hand-cut-hand-punched-engraved':'Iron Lanterns, set of 3',
'drafts':'Round Iron Lanterns, set of 2',
'handcrafted-iron-storage-boxes-set-of-2-antique-brass-finish-hand-punched-1':'Sloped-lid Iron Boxes, set of 2',
'handcrafted-iron-storage-boxes-set-of-2-antique-nickel-finish-hand-punched':'Sloped-lid Iron Boxes, set of 2',
'handcrafted-iron-storage-boxes-set-of-2-antique-brass-finish-hand-hammered-design':'Hammered Iron Boxes, set of 2',
'handcrafted-iron-storage-boxes-set-of-2-antique-nickel-finish-hand-hammered-design':'Hammered Iron Boxes, set of 2',
'handcrafted-iron-storage-boxes-set-of-3-antique-brass-finish-hand-punched-1':'Latched Iron Boxes, set of 3',
'handcrafted-iron-storage-boxes-set-of-3-antique-nickle-finish-hand-punched':'Latched Iron Boxes, set of 3',
'handcrafted-iron-storage-boxes-set-of-3-antique-brass-finish-hand-punched-2':'Oval Iron Boxes, set of 3',
'handcrafted-iron-decorative-boxes-set-of-3-antique-nickel-finish-hand-cut-hand-punched-engraved':'Cut-work Iron Boxes, set of 3',
'handcrafted-iron-lanterns-set-of-2-antique-nickel-finish-hand-cut-hand-punched-engraved':'Iron Lanterns, set of 2',
'handcrafted-iron-storage-boxes-set-of-2-antique-brass-finish-hand-punched-design':'Domed Iron Boxes, set of 2',
'handcrafted-iron-storage-boxes-set-of-2-antique-nickel-finish-hand-punched-design':'Domed Iron Boxes, set of 2',
'handcrafted-iron-storage-boxes-set-of-3-antique-brass-finish-hand-punched-design-with-ring-lid':'Ring-lid Iron Boxes, set of 3',
'handcrafted-oval-iron-storage-boxes-set-of-3-nickel-finish-hand-punched-design':'Oval Iron Boxes, set of 3',
'handcrafted-iron-storage-boxes-with-tray-antique-brass-finish-hand-punched-design':'Iron Boxes with Tray',
'handcrafted-iron-storage-boxes-with-tray-nickel-finish-hand-punched-design':'Iron Boxes with Tray',
'handcrafted-iron-serving-trays-set-of-2-nickel-finish-hand-cut-perforated-design':'Iron Serving Trays, set of 2',
'handcrafted-iron-serving-trays-set-of-2-antique-brass-finish-hand-cut-perforated-design':'Iron Serving Trays, set of 2',
'reclaimed-wood-serving-tray-set-of-2':'Reclaimed Wood Trays, set of 2',
'no-data-draft':'Wood & Iron Clock on Stand',
'no-data-draft-1':'Round Wood Clock, iron base',
'no-data-draft-2':'Double-sided Wall Clock',
'reclaimed-wood-hexagonal-wall-mirror':'Hexagonal Wall Mirror',
'reclaimed-wood-rectangular-tray-table-with-folding-iron-stand':'Rectangular Tray Table',
'reclaimed-wood-rectangular-wall-mirror':'Rectangular Wall Mirror',
'reclaimed-wood-keepsake-box-with-iron-latch':'Reclaimed Wood Keepsake Box',
'reclaimed-wood-round-tray-table-with-folding-iron-stand':'Round Tray Table',
'reclaimed-wood-cart-valet-tray-desk-organizer':'Cart Valet Tray',
'reclaimed-wood-iron-2-tier-round-bar-trolley-on-wheels':'Two-tier Bar Trolley',
'reclaimed-wood-bird-sculptures-set-of-2':'Bird Sculptures, set of 2',
'reclaimed-wood-iron-elephant-sculptures-set-of-2':'Elephant Sculptures, set of 2',
'reclaimed-wood-iron-horse-sculptures-set-of-2':'Horse Sculptures, set of 2',
'reclaimed-wood-iron-crane-sculptures-set-of-2':'Crane Sculptures, set of 2',
'no-data-ma7925-ma7926':'Floral Round Trays, set of 2',
'no-data-ma4449-ma4450':'Geometric Square Trays, brass handles',
'no-data-ma5088-ma5089':'Geometric Photo Frames, set of 2',
'no-data-ma3810-ma3811':'Maze Rectangular Trays, set of 2',
'no-data-ma5082-ma5083':'Floral Square Trays, set of 2',
'no-data-ma4451-ma4445':'Round Inlay Trays, brass handles',
'no-data-ma9025':'Travertine Side Table, sphere legs',
'no-data-ma5753-ma5754':'Floral Vine Photo Frames, set of 2',
'no-data-ma4447-ma4448':'Striped Trays, brass handles',
'no-data-ma3812-ma3813':'Star Rectangular Trays, set of 2',
'no-data-ma4752-ma10243':'Floral Rectangular Trays, set of 2',
'no-data-ma9024':'Travertine Coffee Table, sphere legs',
'no-data-ma3808-ma3809':'Geometric Round Trays, set of 2',
'no-data-ma9036':'Travertine Accent Table, brass rod',
'no-data-ma9027':'Travertine End Table, brass rod',
}
COLL={'iron':('Hand-punched iron','Hand-punched iron'),'bone':('Bone inlay','Bone inlay on wood'),'wood':('Reclaimed wood','Reclaimed wood & iron'),
      'clock':('Wood & iron clocks','Mango wood & iron'),'trav':('Travertine','Travertine & turned wood')}
def low(p): return (p['title']+' '+p['descriptionText']).lower()
def coll(p):
    t=p['title'].lower()
    if 'clock' in t: return 'clock'
    if 'travertine' in t: return 'trav'
    if 'bone inlay' in t: return 'bone'
    if 'reclaimed' in t: return 'wood'
    return 'iron'
def mats(p,c):
    t=p['title'].lower(); d=low(p); m=[]
    if c=='iron':
        m.append('nickel' if 'nickel' in t or 'nickle' in t else 'brass'); m.append('iron')
    elif c=='bone': m+=['bone','wood']+(['brass'] if 'brass' in t else [])
    elif c=='wood': m+=['reclaimed']+(['iron'] if 'iron' in d else [])
    elif c=='clock': m+=['mango' if 'mango' in d else 'wood','iron']
    elif c=='trav': m+=['travertine','wood']+(['brass'] if 'brass' in t else [])
    return m
def typ(p):
    t=p['title'].lower()
    for k,v in [('lantern','lanterns'),('canister','canisters'),('serving tray','serving trays'),('tray table','tray table'),('valet','valet tray'),('trolley','bar trolley'),
                ('mirror','mirror'),('clock','clock'),('sculpture','sculptures'),('photo frame','photo frames'),('coffee table','coffee table'),('side table','side table'),
                ('end table','end table'),('keepsake','keepsake box'),('tray','trays'),('box','storage boxes')]:
        if k in t: return v
    return 'decor'
def shape(p,n):
    if 'frame' in p['title'].lower(): return 'rectangle'
    s=(n+' '+p['title']).lower()
    for k in ['oval','hexagonal','square','rectangular','round']:
        if k in s: return {'rectangular':'rectangle','hexagonal':'hexagon'}.get(k,k)
    d=p['descriptionText'].lower()
    for k in ['oval','square','rectangular','round','cylindrical']:
        if k in d: return {'rectangular':'rectangle','cylindrical':'round'}.get(k,k)
    return 'round'
ROOMS={'lanterns':['living','entry'],'canisters':['dining','living'],'storage boxes':['dining','living','bedroom'],'serving trays':['dining','living'],'trays':['dining','living'],
 'tray table':['living'],'valet tray':['bedroom','entry'],'bar trolley':['dining','living'],'mirror':['entry','bedroom'],'clock':['living','bedroom'],
 'sculptures':['living','entry'],'photo frames':['living','bedroom'],'coffee table':['living'],'side table':['living','bedroom'],'end table':['living','bedroom'],'keepsake box':['bedroom','living']}
def dims(p):
    m=re.search(r'(\d+(?:\.\d+)?\s*[x×X]\s*\d+(?:\.\d+)?(?:\s*[x×X]\s*\d+(?:\.\d+)?)?\s*(?:cm|cms)\b)',p['descriptionText'])
    return m.group(1).replace('X','x').replace('×','x') if m else ''
def care(p,c):
    for s in re.split(r'(?<=[.!])\s+|\n|•|(?<=[a-z])(?=[A-Z])',p['descriptionText']):
        s=re.sub(r'^[\W_]+','',s.strip())
        if re.match(r'(wipe|dust|clean (gently |with|using|only)|clean with|gently wipe)',s,re.I) and 10<len(s)<200: return s.rstrip('.')+'.'
    return {'iron':'Wipe with a soft, dry cloth. Keep away from water.','bone':'Wipe with a soft, dry cloth.','wood':'Dust with a dry cloth.','clock':'Dust with a soft, dry cloth.','trav':'Wipe the stone and dry it. Coasters stop rings.'}[c]
def slug(s): s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower(); return re.sub(r'[^a-z0-9]+','-',s).strip('-')
def inr(v): 
    v=int(round(float(v))); s=str(v)
    if len(s)>3: h=s[:-3]; s=re.sub(r'(\d)(?=(\d\d)+$)',r'\1,',h)+','+s[-3:]
    return '₹'+s
# ---- fresh image folders
for d in ['assets/img/p','assets/img/t','assets/img/cards','assets/img/frames','assets/img/rooms','pieces']:
    shutil.rmtree(f'{R}/{d}',ignore_errors=True)
os.makedirs(f'{R}/assets/img/p',exist_ok=True); os.makedirs(f'{R}/assets/img/t',exist_ok=True); os.makedirs(f'{R}/pieces',exist_ok=True)
def edge(im):
    w,h=im.size; px=sorted(im.getpixel((x,y)) for x in range(0,w,max(1,w//30)) for y in (2,h-3)); m=px[len(px)//2]; return '#%02x%02x%02x'%m[:3]
MAXF=8
items=[]; used=set(); left_out=[]
for p in P:
    h=p['handle']
    if p['status']!='ACTIVE': left_out.append((h,'draft (status %s)'%p['status'])); continue
    if h in DUP_DROP: left_out.append((h,DUP_DROP[h])); continue
    c=coll(p); n=NAME[h]; t=typ(p); m=mats(p,c)
    fin={'brass':'antique brass finish','nickel':'nickel finish'}.get(m[0]) if c=='iron' else None
    if c=='iron' and 'antique' not in p['title'].lower() and fin: fin='nickel finish' if m[0]=='nickel' else 'brass finish'
    sid=slug(n+(' '+m[0] if c=='iron' else '')); k=2
    while sid in used: sid=slug(n)+f'-{k}'; k+=1
    used.add(sid)
    meta=json.load(open(f'{CAT}/generated/{h}/meta.json')); cp=meta['copy']
    os.makedirs(f'{R}/assets/img/p/{sid}',exist_ok=True)
    cur=CUR[h]['images']; photos=[x for x in cur if x.get('role')!='diagram']; diag=[x for x in cur if x.get('role')=='diagram'][:1]
    chosen=photos[:MAXF-len(diag)]+diag
    frames=[]
    for j,x in enumerate(chosen):
        im=Image.open(f"{CAT}/{x['file']}").convert('RGB')
        if im.width>1200: im=im.resize((1200,round(im.height*1200/im.width)),Image.LANCZOS)
        if im.height>1600: im=im.resize((round(im.width*1600/im.height),1600),Image.LANCZOS)
        out=f'assets/img/p/{sid}/{j+1:02d}.webp'; im.save(f'{R}/{out}','WEBP',quality=72,method=6)
        a=im.width/im.height; gen=x['source']=='generated'; dg=x.get('role')=='diagram'
        frames.append(dict(src=out,label='Dimensions' if dg else ('Concept image' if gen else 'Product photo'),
            fit='contain' if dg or not (0.6<=a<=0.86) else 'cover',a=round(a,3),bg='#ffffff' if dg else edge(im),
            alt=(x.get('alt') or f"{n}").replace(' (concept visual)',''),kind='ai' if gen else 'product'))
        if j==0:
            th=im.copy(); th.thumbnail((480,600),Image.LANCZOS); th.save(f'{R}/assets/img/t/{sid}.webp','WEBP',quality=70,method=6)
    v=p['variants'][0]; price=float(v['price']); cmp=float(v['compareAtPrice']) if v.get('compareAtPrice') else None
    facts=[f.rstrip('.') for f in cp['quick_facts']]
    if fin and not any('finish' in f.lower() for f in facts): facts.append(fin.capitalize())
    dm=dims(p)
    if dm: facts.append(f'{dm}')
    facts.append('Large piece · delivery planned by call' if p['sizeClass']=='large' else 'Ships as a parcel')
    items.append(dict(id=sid,handle=h,title=p['title'],name=n,fin=fin or '',coll=c,collName=COLL[c][0],craft=COLL[c][1],
        img=frames[0]['src'],thumb=f'assets/img/t/{sid}.webp',bg=frames[0]['bg'],kind=frames[0]['kind'],alt=frames[0]['alt'],
        mat=m,shape=shape(p,n),rooms=ROOMS.get(t,['living']),type=t,size='large' if p['sizeClass']=='large' else 'small',
        h=dm,diagram=bool(diag),price=price,priceText=inr(price),compareAt=cmp,compareText=inr(cmp) if cmp else '',
        tagline=cp['tagline'],bio=cp['about_me'],facts=facts,care=care(p,c),frames=frames,url=p.get('onlineStoreUrl') or ''))
for it in items:
    others=[o for o in items if o['id']!=it['id'] and o['type']!=it['type'] and set(o['rooms'])&set(it['rooms'])]
    others.sort(key=lambda o:(-(o['coll']==it['coll'])*1.0-len(set(o['mat'])&set(it['mat']))*.5,abs(o['price']-it['price']),o['id']))
    it['pairs']=[o['id'] for o in others[:3]]
open(f'{R}/assets/js/data.js','w').write('/* Craftstales catalogue (real): built by src/catalogue.py from the read-only Shopify export. Titles, prices and photos are real; taglines, about-me and facts are reviewed drafts; rooms are proposed. kind: product = Shopify photo, ai = AI concept image (reviewed for fidelity). */\nwindow.CT='+json.dumps(items,ensure_ascii=False,separators=(',',':'))+';\n')
json.dump(dict(count=len(items),left_out=left_out),open(f'{R}/src/catalogue_report.json','w'),indent=1)
# ---- crawlable layer: grid.html + pieces/*.html (no JS) ----
E=html.escape
CSS='''@font-face{font-family:'Cormorant Garamond';src:url(FONT/cormorant.woff2)}@font-face{font-family:Jost;src:url(FONT/jost.woff2)}
:root{--bg:#FAF7F2;--stone:#EEE8DF;--line:#E3DCD1;--ink:#2A2522;--mut:#6F675F;--ox:#6B1E24;--brass:#B08D57}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Jost,sans-serif}a{color:inherit;text-decoration:none}
header{padding:22px 24px 8px;display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--line)}header b{font-family:'Cormorant Garamond';font-weight:600;letter-spacing:.24em;font-size:17px}
header a.s{font-size:13px;text-decoration:underline;text-underline-offset:4px}
h1{font-family:'Cormorant Garamond';font-weight:400;font-size:40px;margin:22px 24px 4px}p.l{margin:0 24px 20px;color:var(--mut);font-size:14px}
nav{display:flex;gap:16px;padding:0 24px 18px;font-size:13px;color:var(--mut);flex-wrap:wrap}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:22px 12px;padding:0 24px 60px}
.g figure{margin:0}.g .im{aspect-ratio:4/5;border-radius:10px;overflow:hidden;background:var(--stone)}.g img{width:100%;height:100%;object-fit:cover;display:block}
.g figcaption{font-size:15px;margin-top:8px;line-height:1.25}.g small{display:block;font-size:13px;color:var(--mut);margin-top:3px}'''
cards=''.join(f'<a href="pieces/{it["id"]}.html"><figure><div class="im"><img src="{it["thumb"]}" alt="{E(it["alt"])}" loading="lazy"></div><figcaption>{E(it["name"])}{(" · "+E(it["fin"])) if it["fin"] else ""}<small>{it["priceText"]}{" · Large piece" if it["size"]=="large" else ""}</small></figcaption></figure></a>' for it in items)
open(f'{R}/grid.html','w').write(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>All pieces · Craftstales, handmade in Jodhpur</title><meta name="description" content="Every Craftstales piece in one plain grid: hand-punched iron, bone inlay, reclaimed wood, travertine and clocks, handmade in Jodhpur.">
<style>{CSS.replace('FONT','assets/fonts')}</style></head><body><header><b>CRAFTSTALES</b><a class="s" href="index.html">Swipe instead</a></header>
<h1>All pieces</h1><p class="l">{len(items)} pieces, handmade in Jodhpur.</p>
<nav>{''.join(f'<span>{E(v[0])}</span>' for v in COLL.values())}</nav><div class="g">{cards}</div></body></html>''')
byid={o['id']:o for o in items}
for it in items:
    ld={"@context":"https://schema.org","@type":"Product","name":it['title'],"image":[f['src'] for f in it['frames']],"description":it['bio'],"material":", ".join(it['mat']),
        "brand":{"@type":"Brand","name":"Craftstales"},"category":it['type'],"offers":{"@type":"Offer","priceCurrency":"INR","price":f"{it['price']:.2f}","availability":"https://schema.org/InStock","url":it['url']}}
    strip=''.join(f'<figure><img src="../{f["src"]}" alt="{E(f["alt"])}" loading="lazy" style="object-fit:{f["fit"]};background:{f["bg"]}"><figcaption>{E(f["label"])}</figcaption></figure>' for f in it['frames'])
    pairs=''.join(f'<a href="{o}.html"><img src="../{byid[o]["thumb"]}" alt="{E(byid[o]["name"])}" loading="lazy"><span>{E(byid[o]["name"])}</span></a>' for o in it['pairs'])
    canon=it['url'] or f'https://craftstales.in/products/{it["handle"]}'
    open(f'{R}/pieces/{it["id"]}.html','w').write(f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(it["title"])} · Craftstales</title>
<meta name="description" content="{E(it["bio"])}"><link rel="canonical" href="{E(canon)}">
<script type="application/ld+json">{json.dumps(ld,ensure_ascii=False)}</script><style>{CSS.replace('FONT','../assets/fonts')}
.st{{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:6px;padding:12px 0 0}}.st figure{{flex:0 0 86%;margin:0;scroll-snap-align:center;position:relative}}.st img{{width:100%;aspect-ratio:4/5;display:block;border-radius:10px}}
.st figcaption{{position:absolute;left:12px;top:10px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;background:rgba(250,247,242,.94);padding:3px 8px;border-radius:99px}}
.t{{padding:0 24px 60px;max-width:640px}}.t .tag{{font-family:'Cormorant Garamond';font-style:italic;font-size:21px;color:var(--mut);margin:0 0 14px}}.t .bio{{font-family:'Cormorant Garamond';font-size:21px;line-height:1.35;margin:0 0 16px}}
.ch{{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:22px}}.ch span{{font-size:12px;padding:6px 12px;border:1px solid var(--line);border-radius:99px;background:#fff}}
.pw{{display:flex;gap:10px}}.pw a{{width:96px;font-size:12px}}.pw img{{width:96px;height:120px;object-fit:cover;border-radius:8px;display:block;margin-bottom:4px}}
h3{{font-family:'Cormorant Garamond';font-weight:500;font-size:21px;margin:24px 0 8px}}.t p.k{{font-size:12px;color:var(--mut)}}.pr{{font-size:18px}}.pr s{{color:var(--mut);font-size:14px;margin-left:8px}}
.t a.b{{display:inline-block;margin-top:18px;background:var(--ox);color:#fff;padding:14px 26px;border-radius:99px}}</style></head><body>
<header><b>CRAFTSTALES</b><a class="s" href="../grid.html">All pieces</a></header><div class="st">{strip}</div>
<div class="t"><h1 style="margin:18px 0 2px;font-size:34px">{E(it["title"])}</h1><p class="tag">{E(it["tagline"])}</p><p class="pr">{it["priceText"]}{f'<s>{it["compareText"]}</s>' if it["compareText"] else ''}</p><p class="bio">{E(it["bio"])}</p>
<div class="ch">{''.join(f'<span>{E(f)}</span>' for f in it['facts'])}</div>
<h3>Pairs well with</h3><div class="pw">{pairs}</div>
<h3>Care</h3><p>{E(it["care"])}</p><h3>Delivery &amp; returns</h3><p>India only. Leaves Jodhpur in {'7–15' if it['size']=='large' else '3–7'} business days.{" Large piece: we'll call to plan delivery." if it['size']=='large' else ''} 7-day returns; report any damage within 48 hours.</p>
<p class="k">Photos marked Concept image are AI-generated from the real product photos and checked for accuracy. Handmade, so each piece varies slightly.</p><a class="b" href="../index.html#{it["id"]}">Open in swipe view</a></div></body></html>""")
print(len(items),'items; left out',len(left_out))
