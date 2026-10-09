"""Create original offline racing UI textures; runtime redraws from telemetry."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
HERE=Path(__file__).resolve().parent
def build(layout):
    W,H=(1536,960) if layout=='landscape' else (960,1536)
    im=Image.new('RGB',(W,H),'#111C25');d=ImageDraw.Draw(im)
    def text(s,xy,size,fill='#ECF3F8'):
        font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',size);d.text(xy,str(s),font=font,fill=fill)
    text('HARBOR / CIRCUIT',(55,48),33);text('PIT READY',(W-185,52),28,'#77C8C0')
    if layout=='landscape':
        d.line([(510,155),(510,805)],fill='#31414F',width=2);text('0',(180,210),196);text('km/h',(193,423),34,'#94A9B8');text('P   R   N   D',(124,530),32);text('FUEL  86%',(117,660),32);text('0 kW',(175,740),35)
        text('LAP 01',(570,170),32,'#94A9B8');text('0:00.000',(570,225),93);text('DELTA  0.000',(576,365),35,'#77C8C0');points=[(.07,.64),(.15,.18),(.45,.07),(.55,.38),(.80,.19),(.94,.36),(.84,.80),(.60,.91),(.41,.68),(.18,.93),(.07,.64)];d.line([(570+x*870,465+y*290) for x,y in points],fill='#64838E',width=10,joint='curve')
    else:
        text('0',(371,192),200);text('km/h',(395,415),34,'#94A9B8');text('P     R     N     D',(258,520),38);d.line([(65,625),(W-65,625)],fill='#31414F',width=2)
        text('CURRENT LAP 01',(75,680),32,'#94A9B8');text('0:00.000',(75,760),125);text('DELTA   0.000 s',(75,965),48,'#77C8C0');text('FUEL  86%',(75,1090),36);text('POWER    0 kW',(75,1180),36)
    text('ORIGINAL RACING UI / DEMO INPUT AVAILABLE',(55,H-80),23,'#94A9B8')
    (HERE/'textures').mkdir(exist_ok=True);im.save(HERE/'textures'/('display-'+layout+'.png'))
if __name__=='__main__':
    for layout in ['landscape','portrait']:build(layout)
