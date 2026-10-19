# Builds assets/js/data.js, optimised images, grid.html and static pieces/*.html (the crawlable layer).
import json, os, html
from PIL import Image, ImageFilter, ImageStat
R='/workspace/craftstales-swipe'; C='/workspace/craftstales-collections'; PR='/workspace/craftstales-prototype'
COLL={'moti':('Moti Mahal','Mother-of-pearl inlay','L1_moti_mahal_mother_of_pearl.jpg'),'kohl':('Kohl & Ivory','Black & white bone inlay','L2_kohl_ivory_bone_inlay.jpg'),
 'sang':('Sangmarmar','Marble, glass & brass','L3_sangmarmar_marble_glass_brass.jpg'),'mandore':('Mandore','Mango wood, ribbed metal & cane','L4_mandore_mango_ribbed_metal.jpg'),
 'trav':('Travertine','Travertine & turned wood',None)}
# id, name, collection, src, source(kind), materials, shape, rooms, type, size(small|large), est height, line
S=[
('chandni-low','Chandni Low','sang','studio/ST01_noir_glass_short.jpg','ai',['glass','brass','marble'],'round',['living','bedroom'],'side table','small','~54 cm','Smoked glass on a single line of brass.'),
('chandni-tall','Chandni Tall','sang','studio/ST02_noir_glass_tall.jpg','ai',['glass','brass','marble'],'round',['living'],'side table','small','~63 cm','A tall perch for the armchair.'),
('kohl-hoop','Kohl Hoop','kohl','studio/ST03_bone_inlay_hoop.jpg','ai',['bone','iron'],'round',['living','bedroom'],'side table','small','~50 cm','Bone vines drawn like kohl.'),
('moti-trio','Moti Trio','moti','studio/ST04_mop_spindle_MA9316.jpg','ai',['pearl','mango'],'round',['living','bedroom'],'side table','small','~48 cm','Shell laid leaf by leaf.'),
('moti-perch','Moti Perch','moti','studio/ST05_mop_pedestal_brass.jpg','ai',['pearl','brass'],'round',['living','bedroom'],'side table','small','~60 cm','Pearl on a brass stem.'),
('moti-drum','Moti Drum','moti','studio/ST06_mop_drum.jpg','ai',['pearl','brass'],'drum',['living','bedroom'],'side table','small','~46 cm','Inlaid all the way round.'),
('moti-nest','Moti Nest, set of 2','moti','studio/ST07_mop_kidney_nesting.jpg','ai',['pearl','brass'],'kidney',['living'],'side tables','small','~50 cm','Two that tuck into one.'),
('moti-tray','Moti Tray C','moti','studio/ST08_cframe_tray_brass.jpg','ai',['pearl','brass','mango'],'rectangle',['living','bedroom'],'side table','small','~58 cm','A tray that slides over the sofa.'),
('moti-urn','Moti Urn','moti','studio/ST09_mop_brass_urn_pedestal.jpg','ai',['pearl','brass'],'round',['living','entry'],'side table','small','~52 cm','Pearl on a turned brass urn.'),
('moti-wire','Moti Wire, pair','moti','studio/ST10_mop_wire_stands.jpg','ai',['pearl','brass'],'round',['living'],'side tables','small','~60 / 75 cm','Two heights, one flared line.'),
('badal-1','Badal Kidney I','sang','studio/ST11_kidney_marble_mango_A.jpg','ai',['marble','mango','steel'],'kidney',['living'],'side table','small','~62 cm','A cloud of marble on turned mango.'),
('badal-2','Badal Kidney II','sang','studio/ST12_kidney_marble_mango_B.jpg','ai',['marble','mango','steel'],'kidney',['living'],'side table','small','~64 cm','A heavier stem, the same cloud.'),
('sang-slim','Sangmarmar Slim','sang','studio/ST13_marble_steel_cylinder.jpg','ai',['marble','steel'],'round',['living','bedroom'],'side table','small','~55 cm','Veined marble, one thin stem.'),
('kaali-ring','Kaali Ring','sang','studio/ST14_black_marble_ring_inlay.jpg','ai',['marble','brass'],'round',['living'],'side table','small','~60 cm','Black marble, a white ring.'),
('kaali-square','Kaali Square','sang','studio/ST15_black_marble_square_inlay.jpg','ai',['marble','iron'],'square',['living','entry'],'side table','small','~56 cm','A square inside a square.'),
('chhatri','Chhatri','sang','studio/ST16_white_marble_mushroom.jpg','ai',['marble'],'round',['living','bedroom'],'side table','small','~45 cm','A marble parasol, low and calm.'),
('aam-perch','Aam Perch','sang','studio/ST17_mango_top_brass_marble.jpg','ai',['mango','brass','marble'],'round',['living'],'side table','small','~60 cm','Mango wood on a leaning brass line.'),
('moti-console','Moti Console, 3 drawers','moti','crops/p4_mop_console.jpg','real',['pearl','mango','brass'],'rectangle',['entry','living'],'console','large','~78 cm est.','One vine across three drawers.'),
('moti-console-2','Moti Console, brass legs','moti','crops/p6_mop_console_brass.jpg','real',['pearl','brass'],'rectangle',['entry'],'console','large','',"Two drawers on brass-finish legs."),
('moti-cabinet','Moti Tall Cabinet','moti','crops/p4_mop_armoire.jpg','real',['pearl','mango'],'rectangle',['bedroom','living'],'cabinet','large','','Pearl on the door, mango on the sides.'),
('moti-chest','Moti 3-drawer Chest','moti','crops/p4_mop_chest3.jpg','real',['pearl','iron'],'rectangle',['bedroom'],'chest','large','','Three drawers of shell on a metal frame.'),
('moti-bedside','Moti Bedside','moti','crops/p5_mop_nightstand.jpg','real',['pearl','mango'],'rectangle',['bedroom'],'bedside','large','','Two drawers by the bed.'),
('moti-round-mirror','Moti Round Mirror','moti','crops/p5_mop_round_mirror.jpg','real',['pearl','mango'],'round',['entry','bedroom'],'mirror','small','','A ring of pearl around the light.'),
('moti-mirror','Moti Mirror','moti','crops/p4_mop_mirror.jpg','real',['pearl'],'rectangle',['entry','bedroom'],'mirror','large','','A wide frame of shell.'),
('moti-coffee','Moti Round Coffee Table','moti','crops/p4_mop_coffee.jpg','real',['pearl','mango'],'round',['living'],'coffee table','large','','Shell top on turned mango legs.'),
('moti-drum-big','Moti Drum Coffee Table','moti','crops/p6_mop_drum_big.jpg','real',['pearl','brass'],'drum',['living'],'coffee table','large','','A drum of pearl on a brass ring.'),
('moti-bench','Moti Bench','moti','crops/p5_mop_bench.jpg','real',['pearl','mango'],'rectangle',['living','entry'],'bench','large','','Pearl on wooden trestles.'),
('kohl-coffee','Kohl Coffee Table','kohl','crops/p3_bone_coffee.jpg','real',['bone','iron'],'round',['living'],'coffee table','large','','Black and bone on three legs.'),
('kohl-dining','Kohl Dining Table','kohl','crops/p3_bone_dining.jpg','real',['bone','iron'],'round',['dining'],'dining table','large','','Bone inlay to gather around.'),
('kohl-cabinet','Kohl Triangle Cabinet','kohl','crops/p5_bone_geo_cabinet.jpg','real',['bone'],'rectangle',['living','dining'],'cabinet','large','','Triangles in black and bone.'),
('mandore-chest','Mandore Chest','mandore','crops/p2_chest.jpg','real',['mango','iron'],'rectangle',['bedroom'],'chest','large','','Six ribbed drawers, honest mango.'),
('mandore-console','Mandore Console','mandore','crops/p2_console.jpg','real',['mango','iron'],'rectangle',['entry','living'],'console','large','','Six drawers and a shelf below.'),
('mandore-cabinet','Mandore Cabinet','mandore','crops/p2_sideboard.jpg','real',['mango','iron'],'rectangle',['dining','living'],'cabinet','large','','Ribbed diagonals on mango.'),
('mandore-mirror','Mandore Cane Mirror','mandore','crops/p2_cane_mirror.jpg','real',['cane','mango'],'rectangle',['entry','bedroom'],'mirror','small','','Hand-woven cane around the glass.'),
('trav-sphere-coffee','Sphere-leg Travertine Coffee Table','trav','P:9176667193556-0.webp','product',['travertine','mango'],'round',['living'],'coffee table','large','45 cm','Travertine on four wooden spheres.'),
('trav-sphere-side','Sphere-leg Travertine Side Table','trav','P:9176666996948-0.webp','product',['travertine','mango'],'round',['living','dining'],'side table','small','50 cm','The small one, same spheres.'),
('trav-end','Travertine End Table, brass rod','trav','P:9176667324628-0.webp','product',['travertine','brass'],'round',['living','entry'],'side table','small','55 cm','Stone on a single brass rod.'),
('trav-accent','Travertine Accent Table','trav','P:9176667291860-0.webp','product',['travertine','brass'],'round',['entry','living'],'side table','small','60 cm','A slim perch for the hallway.'),
('ring-clock','Wood & Brass Ring Clock','trav','P:9176615583956-0.webp','product',['mango','brass'],'round',['living','dining'],'clock','small','28 cm','Time in a ring of brass.'),
]
os.makedirs(f'{R}/assets/img/cards',exist_ok=True); os.makedirs(f'{R}/assets/img/rooms',exist_ok=True)
def edge_colour(im):
    w,h=im.size; px=[im.getpixel((x,y)) for x in range(0,w,max(1,w//40)) for y in (2,h-3)]+[im.getpixel((x,y)) for y in range(0,h,max(1,h//40)) for x in (2,w-3)]
    r=sorted(px); m=r[len(r)//2]; return '#%02x%02x%02x'%m[:3]
items=[]
for (i,n,c,src,kind,mat,shape,rooms,typ,size,h,line) in S:
    p=f'{PR}/assets/img/products/{src[2:]}' if src.startswith('P:') else f'{C}/{src}'
    im=Image.open(p).convert('RGB'); im.thumbnail((1000,1250),Image.LANCZOS)
    im.save(f'{R}/assets/img/cards/{i}.jpg',quality=80,optimize=True,progressive=True)
    bg=edge_colour(im); asp=im.width/im.height
    def row(y): 
        px=sorted(im.getpixel((x,y)) for x in range(0,im.width,max(1,im.width//50))); return '#%02x%02x%02x'%px[len(px)//2][:3]
    bgt,bgb=row(3),row(im.height-4)
    # blurred backdrop for real photos
    if kind!='ai':
        b=im.copy(); b.thumbnail((120,160)); b=b.filter(ImageFilter.GaussianBlur(6)); b.save(f'{R}/assets/img/cards/{i}-bg.jpg',quality=60)
    items.append(dict(id=i,name=n,coll=c,collName=COLL[c][0],craft=COLL[c][1],img=f'assets/img/cards/{i}.jpg',bg=bg,bgt=bgt,bgb=bgb,blur=kind!='ai',kind=kind,
      mat=mat,shape=shape,rooms=rooms,type=typ,size=size,h=h,line=line,room=f'assets/img/rooms/{c}.jpg'))
for c,(n,cr,f) in COLL.items():
    p=f'{C}/lifestyle/{f}' if f else f'{PR}/assets/img/scenes/living-day-p.webp'
    im=Image.open(p).convert('RGB'); im.thumbnail((900,1600)); im.save(f'{R}/assets/img/rooms/{c}.jpg',quality=78,optimize=True,progressive=True)

# ---------- profile: frames, tagline, bio, facts, pairs ----------
os.makedirs(f'{R}/assets/img/frames',exist_ok=True)
SHOW={'chandni-low':'p1_noir_short','chandni-tall':'p1_noir_tall','kohl-hoop':'p3_bone_side','moti-trio':'p6_mop_spindle','moti-perch':'p4_mop_pedestal',
 'moti-drum':'p6_mop_drum_small','moti-nest':'p3_mop_kidney','moti-tray':'p4_mop_tray','moti-urn':'p6_bg_tables','moti-wire':'p6_bg_tables','badal-1':'p8_kidney_left',
 'badal-2':'p8_kidney_right','sang-slim':'p9_marble_steel','kaali-ring':'p10_black_round_inlay','kaali-square':'p10_black_square_inlay','chhatri':'p10_mushroom','aam-perch':'p10_mango_top_brass'}
PID={'trav-sphere-coffee':'9176667193556','trav-sphere-side':'9176666996948','trav-end':'9176667324628','trav-accent':'9176667291860','ring-clock':'9176615583956'}
MATN={'pearl':'mother-of-pearl','bone':'bone inlay','marble':'marble','glass':'smoked glass','brass':'brass','mango':'mango wood','iron':'iron','steel':'steel','cane':'cane','travertine':'travertine'}
TAGM={'pearl':'pearl','bone':'bone','marble':'marble','glass':'glass','brass':'brass','mango':'mango wood','iron':'iron','steel':'steel','cane':'cane','travertine':'travertine'}
ROOMN={'living':'living room','bedroom':'bedroom','dining':'dining room','entry':'entrance'}
def jn(xs): return xs[0] if len(xs)==1 else ', '.join(xs[:-1])+' and '+xs[-1]
def img_save(im,out,maxs=1000,q=78):
    im=im.convert('RGB'); im.thumbnail((maxs,maxs),Image.LANCZOS); im.save(out,quality=q,optimize=True,progressive=True); return im
def frame(it,n,im,label,fit='cover'):
    out=f'{R}/assets/img/frames/{it["id"]}-{n}.jpg'; im=img_save(im,out)
    return dict(src=f'assets/img/frames/{it["id"]}-{n}.jpg',label=label,fit=fit,bg=edge_colour(im))
def closeup(im,box=(.18,.16,.82,.6)):
    w,h=im.size; c=im.crop((int(w*box[0]),int(h*box[1]),int(w*box[2]),int(h*box[3])))
    if c.width<700: c=c.resize((700,round(700*c.height/c.width)),Image.LANCZOS)
    return c
BIO={'moti':"My shell was laid leaf by leaf, by hand, so I catch the light like a jharokha at dusk.",
 'kohl':"I'm drawn in black and bone, Rajasthan's oldest contrast, inlaid by hand.",
 'sang':"I'm {mats}, kept to a single quiet line.",
 'mandore':"I'm honest {mats}, made for every day, named for the old garden capital north of Jodhpur.",
 'trav':"Every slab of travertine carries its own pattern, so I'm not quite like any other."}
ROOMLINE={'side table':"Give me a cup, a lamp and the end of the day.",'side tables':"Give me a cup, a lamp and the end of the day.",
 'console':"I'll keep the keys and greet whoever comes in.",'mirror':"Hang me where the light comes in.",'cabinet':"I'll keep things safe, and quiet.",
 'chest':"I'll keep things safe, and quiet.",'bedside':"I'd like to keep you company by the bed.",'coffee table':"Gather around me.",
 'dining table':"Gather around me for long meals.",'bench':"Sit on me, or set things down.",'clock':"I'll keep the time."}
SHAPEN={'round':'Round','kidney':'Kidney','drum':'Drum','rectangle':'Rectangular','square':'Square'}
CARE={'moti':'Dust with a dry, soft cloth. No sprays on the shell. Coasters for hot cups.','kohl':'Dry, soft cloth only. Keep standing water off the bone.',
 'sang':'Wipe the stone with a damp cloth and dry it. Coasters stop rings.','mandore':'Dry cloth for the wood. A little wax twice a year.','trav':'Wipe the travertine and dry it. Coasters stop rings.'}
for it in items:
    i=it['id']; fr=[]
    room_im=Image.open(f'{R}/assets/img/rooms/{it["coll"]}.jpg')
    fr.append(dict(src=it['room'],label='In a room · concept image',fit='cover',bg='#2a2522'))
    card=Image.open(f'{R}/{it["img"]}')
    fr.append(dict(src=it['img'],label={'ai':'The piece · concept image','real':'The piece · showroom photo','product':'The piece · product photo'}[it['kind']],fit='contain',bg=it['bg']))
    if it['kind']=='ai':
        sc=Image.open(f'{C}/crops/{SHOW[i]}.jpg'); fr.append(frame(it,3,sc,'In our showroom · photo'))
        if i=='moti-trio': fr.append(frame(it,4,Image.open(f'{C}/crops/p7_mop_top_MA9316.jpg'),'Close-up · showroom photo'))
        else: fr.append(frame(it,4,closeup(card,(.14,.12,.86,.62)),'Close-up · concept image'))
    elif it['kind']=='real':
        src=S[[x[0] for x in S].index(i)][3]; n=src.split('/')[1].split('_')[0][1:]
        fr.append(frame(it,3,Image.open(f'{C}/src/photo{n}.jpg'),'In our showroom · photo'))
        fr.append(frame(it,4,closeup(card,(.2,.1,.8,.5)),'Close-up · showroom photo'))
    else:
        for k in (1,2):
            fp=f'{PR}/assets/img/products/{PID[i]}-{k}.webp'
            if os.path.exists(fp): fr.append(frame(it,2+k,Image.open(fp),'Product photo','contain'))
    it['frames']=fr
    mats=[MATN[m] for m in it['mat']]
    it['tagline']=f"{it['name'].split(',')[0]}, {jn([TAGM[m] for m in it['mat'][:2]])}"
    bio=BIO[it['coll']].format(mats=jn(mats))+' '+ROOMLINE.get(it['type'],"I'd look well in your home.")
    if 'pair' in it['name'].lower() or 'set of' in it['name'].lower():
        for a,b in [("My ","Our "),("I'm ","We're "),(" I "," we "),(" me."," us."),(" me "," us "),("so I catch","so we catch")]: bio=bio.replace(a,b)
    if it['id']=='ring-clock': bio="I'm mango wood held in a ring of brass. I'll keep the time."
    it['bio']=bio
    it['facts']=[jn(mats).capitalize(),SHAPEN[it['shape']]]+([f"{it['h'].replace(' est.','')} high · estimate" if '~' in it['h'] else f"{it['h']} high"] if it['h'] else [])+['Made in Jodhpur']
    it['care']=CARE[it['coll']]
for it in items:
    others=[o for o in items if o['id']!=it['id'] and o['type']!=it['type'] and set(o['rooms'])&set(it['rooms'])]
    others.sort(key=lambda o:(-(o['coll']==it['coll'])-len(set(o['mat'])&set(it['mat']))*.5,o['id']))
    it['pairs']=[o['id'] for o in others[:3]]
open(f'{R}/assets/js/data.js','w').write('/* Catalogue for the swipe prototype. Names are working names; prices are placeholders; heights are estimates. kind: ai = Gemini concept image, real = showroom photo crop, product = Craftstales Shopify product photo. */\nwindow.CT='+json.dumps(items,indent=0)+';\n')
# ---- crawlable layer: grid.html + pieces/*.html (no JS needed) ----
E=html.escape
LBL={'ai':'Concept image (AI)','real':'Showroom photo','product':'Product photo'}
CSS='''@font-face{font-family:'Cormorant Garamond';src:url(FONT/cormorant.woff2)}@font-face{font-family:Jost;src:url(FONT/jost.woff2)}
body{margin:0;background:#F6F0E4;color:#2A2522;font-family:Jost,sans-serif}a{color:inherit;text-decoration:none}
header{padding:28px 24px 8px;display:flex;justify-content:space-between;align-items:baseline}header b{font-family:'Cormorant Garamond';font-weight:500;letter-spacing:.2em;font-size:20px}
header a.s{font-size:13px;border-bottom:1px solid #B08D57}
h1{font-family:'Cormorant Garamond';font-weight:400;font-size:40px;margin:8px 24px 4px}p.l{margin:0 24px 20px;color:#6f655d;font-size:14px}
nav{display:flex;gap:16px;padding:0 24px 18px;font-size:13px;color:#6f655d;flex-wrap:wrap}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:18px 12px;padding:0 24px 60px}
.g figure{margin:0}.g .im{aspect-ratio:4/5;border-radius:4px;overflow:hidden;background:#e9dcc6}.g img{width:100%;height:100%;object-fit:cover;display:block}
.g figcaption{font-family:'Cormorant Garamond';font-size:19px;margin-top:6px;line-height:1.1}.g small{display:block;font-family:Jost;font-size:11px;color:#8a7d70;margin-top:3px}'''
cards=''.join(f'<a href="pieces/{it["id"]}.html"><figure><div class="im"><img src="{it["img"]}" alt="{E(it["name"])}, {E(it["craft"].lower())}" loading="lazy"></div><figcaption>{E(it["name"])}<small>{E(it["collName"])} · {E(it["type"])} · Price · {LBL[it["kind"]]}</small></figcaption></figure></a>' for it in items)
open(f'{R}/grid.html','w').write(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>All pieces · Craftstales, handmade in Jodhpur</title><meta name="description" content="Every Craftstales piece in one plain grid: mother-of-pearl, bone inlay, marble and mango-wood furniture handmade in Jodhpur.">
<style>{CSS.replace('FONT','assets/fonts')}</style></head><body><header><b>CRAFTSTALES</b><a class="s" href="index.html">Swipe instead</a></header>
<h1>All pieces</h1><p class="l">{len(items)} pieces, handmade in Jodhpur. Prices are placeholders in this prototype.</p>
<nav>{''.join(f'<span>{E(v[0])}</span>' for v in COLL.values())}</nav><div class="g">{cards}</div></body></html>''')
for it in items:
    ld={"@context":"https://schema.org","@type":"Product","name":it['name'],"image":[it['img']]+[f['src'] for f in it['frames']],"description":it['bio'],"material":", ".join(it['mat']),"brand":{"@type":"Brand","name":"Craftstales"},"category":it['type']}
    byid={o['id']:o for o in items}
    strip=''.join(f'<figure><img src="../{f["src"]}" alt="{E(it["name"])}: {E(f["label"])}" loading="lazy" style="object-fit:{f["fit"]};background:{f["bg"]}"><figcaption>{E(f["label"])}</figcaption></figure>' for f in it['frames'])
    pairs=''.join(f'<a href="{o}.html"><img src="../{byid[o]["img"]}" alt="{E(byid[o]["name"])}" loading="lazy"><span>{E(byid[o]["name"])}</span></a>' for o in it['pairs'])
    open(f'{R}/pieces/{it["id"]}.html','w').write(f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(it["tagline"])} · Craftstales, Jodhpur</title>
<meta name="description" content="{E(it["bio"])}"><link rel="canonical" href="https://craftstales.example/pieces/{it["id"]}">
<script type="application/ld+json">{json.dumps(ld)}</script><style>{CSS.replace('FONT','../assets/fonts')}
.st{{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:6px}}.st figure{{flex:0 0 88%;margin:0;scroll-snap-align:center;position:relative}}.st img{{width:100%;aspect-ratio:4/5;display:block}}
.st figcaption{{position:absolute;left:12px;top:10px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.6)}}
.t{{padding:0 24px 60px;max-width:640px}}.t .tag{{font-family:'Cormorant Garamond';font-style:italic;font-size:20px;color:#6f655d;margin:0 0 14px}}.t .bio{{font-family:'Cormorant Garamond';font-size:21px;line-height:1.35;margin:0 0 16px}}
.ch{{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:22px}}.ch span{{font-size:12px;padding:6px 12px;border:1px solid rgba(42,37,34,.18);border-radius:99px}}
.pw{{display:flex;gap:10px}}.pw a{{width:96px;font-size:12px}}.pw img{{width:96px;height:120px;object-fit:cover;border-radius:6px;display:block;margin-bottom:4px}}
h3{{font-family:'Cormorant Garamond';font-weight:500;font-size:20px;margin:24px 0 8px}}.t p.k{{font-size:12px;color:#8a7d70}}
.t a.b{{display:inline-block;margin-top:18px;background:#6B1E24;color:#fff;padding:14px 26px;border-radius:99px}}</style></head><body>
<header><b>CRAFTSTALES</b><a class="s" href="../grid.html">All pieces</a></header><div class="st">{strip}</div>
<div class="t"><h1 style="margin:18px 0 2px">{E(it["name"])}</h1><p class="tag">{E(it["tagline"].split(", ",1)[1].capitalize())}</p><p class="bio">{E(it["bio"])}</p>
<div class="ch">{''.join(f'<span>{E(f)}</span>' for f in it['facts'])}</div><p>Price (placeholder)</p>
<h3>Pairs well with</h3><div class="pw">{pairs}</div>
<h3>Care</h3><p>{E(it["care"])}</p><h3>Delivery &amp; returns</h3><p>India only. Leaves Jodhpur in {'7–15' if it['size']=='large' else '3–7'} business days. 7-day returns; report any damage within 48 hours.</p>
<p class="k">Concept images are AI-generated placeholders; showroom and product photos are real. Handmade, so each piece varies slightly.</p><a class="b" href="../index.html#{it["id"]}">Open in swipe view</a></div></body></html>""")
print(len(items),'items')
