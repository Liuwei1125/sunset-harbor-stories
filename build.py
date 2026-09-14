"""Build the offline single-file game. Standard-library Python 3 only."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parent
PARTS = ('engine.js','software.js','world.js','details.js','mobile.js','game.js',
         'renderer-v3.js','world-v3.js','simulation-v3.js','gameplay-v3.js','ui-v3.js','runtime-v3.js','assets-v3.js','expedition-world.js','expedition-models.js','expedition-sim.js','expedition-ui.js','expedition-runtime.js','combat-data.js','combat-models.js','combat-sim.js','combat-ui.js','combat-runtime.js','experience-core.js','harbor-world.js','harbor-play.js','experience-input.js','experience-runtime.js','assets/blender/harbor-pack.js','harbor-assets.js','assets/armory/armory-pack.js','armory.js','armory-effects.js','assets/lighting/lighting-pack.js','renderer-photographic-shaders.js','renderer-photographic.js')
def main():
    shell=(ROOT/'shell.html').read_text(encoding='utf-8')
    shell=shell.replace('</style>',(ROOT/'ui-v3.css').read_text(encoding='utf-8')+'\n'+(ROOT/'expedition.css').read_text(encoding='utf-8')+'\n'+(ROOT/'combat.css').read_text(encoding='utf-8')+'\n'+(ROOT/'experience.css').read_text(encoding='utf-8')+'\n</style>')
    shared='\n\n'.join('// FILE: '+p+'\n'+(ROOT/p).read_text(encoding='utf-8') for p in PARTS)
    scripts=shared+'\n\n// FILE: mode-menu.js\n'+(ROOT/'mode-menu.js').read_text(encoding='utf-8')
    output=ROOT/'index.html'
    output.write_text(shell+'\n<script>\n'+scripts.replace('</script','<\\/script')+'\n</script>\n</body>\n</html>\n',encoding='utf-8')
    (ROOT/'bundle.js').write_text(scripts,encoding='utf-8')
    print('Built',output,output.stat().st_size,'bytes')
    arcade_parts=('assets/arcade/arcade-pack.js','arcade-data.js','arcade-world.js','arcade-games.js','arcade-ui.js','arcade-input.js','arcade-bootstrap.js')
    arcade_scripts=shared+'\n\n'+'\n\n'.join('// FILE: '+p+'\n'+(ROOT/p).read_text(encoding='utf-8') for p in arcade_parts)
    arcade_shell=re.sub(r'<title>.*?</title>','<title>Harbor Club · 港湾休闲竞技</title>',shell)
    arcade_shell=arcade_shell.replace('</style>',(ROOT/'arcade.css').read_text(encoding='utf-8')+'\n</style>').replace('<body>','<body class="arcade-page">')
    arcade_shell+='\n'+(ROOT/'arcade-shell.html').read_text(encoding='utf-8')
    arcade_out=ROOT/'arcade.html'
    arcade_out.write_text(arcade_shell+'\n<script>\n'+arcade_scripts.replace('</script','<\\/script')+'\n</script>\n</body>\n</html>\n',encoding='utf-8')
    (ROOT/'arcade-bundle.js').write_text(arcade_scripts,encoding='utf-8')
    print('Built',arcade_out,arcade_out.stat().st_size,'bytes')
if __name__=='__main__':main()
