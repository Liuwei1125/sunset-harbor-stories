from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'babylon/index.html').read_text()
html=html.replace('· Babylon.js','· Unity WebGL').replace('BABYLON.JS <i>','UNITY 6 <i>')
config='''<script>
window.coastUnityConfig={version:"{{{ UNITY_VERSION }}}",loaderUrl:"Build/{{{ LOADER_FILENAME }}}",config:{
 dataUrl:"Build/{{{ DATA_FILENAME }}}",frameworkUrl:"Build/{{{ FRAMEWORK_FILENAME }}}",codeUrl:"Build/{{{ CODE_FILENAME }}}",
 streamingAssetsUrl:"StreamingAssets",companyName:"Harbor Workshop",productName:"Coast Rush",productVersion:"1.0"
}};
</script><script type="module" src="../unity/bridge.js"></script>'''
html=html.replace('<script src="vendor/babylon.js"></script><script type="module" src="game.js"></script>',config)
(root/'unity/Assets/WebGLTemplates/Coast/index.html').write_text(html)
print('Unity WebGL shell synchronized with Babylon HUD')
