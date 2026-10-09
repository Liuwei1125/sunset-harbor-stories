using UnityEngine;
namespace CoastRush {
 [RequireComponent(typeof(Camera))] public sealed class RacerPost : MonoBehaviour {
  public bool bloom = true; Material material;
  void OnRenderImage(RenderTexture source, RenderTexture target) {
   if(material==null) material=new Material(Shader.Find("Hidden/CoastRush/Finish"));
   material.SetFloat("_Bloom",bloom ? .13f : 0); Graphics.Blit(source,target,material);
  }
  void OnDestroy(){if(material!=null)Destroy(material);}
 }
}
