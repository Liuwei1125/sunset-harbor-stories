import bpy,json,sys
from pathlib import Path
H=Path(__file__).resolve().parent
for key in sys.argv[sys.argv.index('--')+1:]:
 bpy.ops.wm.open_mainfile(filepath=str(H/'models'/key/'source/normalized.blend'))
 rows=[]
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  a=o.data.color_attributes.active_color
  if key=='bugatti-veyron' or key=='amg-gt':
   lo=[min(v.co[i] for v in o.data.vertices) for i in range(3)];hi=[max(v.co[i] for v in o.data.vertices) for i in range(3)]
   colors=[]
   if a:
    for i in range(0,len(a.data),max(1,len(a.data)//10)):colors.append(tuple(round(c,2) for c in a.data[i].color))
   rows.append({'name':o.name,'material':[m.name for m in o.data.materials],'lo':lo,'hi':hi,'colors':colors})
 print('DATA',key,json.dumps(rows))
