Shader "CoastRush/Surface" {
 Properties {
  _Color ("Color", Color) = (1,1,1,1)
  _MainTex ("Albedo", 2D) = "white" {}
  _BumpMap ("Normal", 2D) = "bump" {}
  _BumpScale ("Normal scale", Range(0,1)) = 0
  _Metallic ("Metallic", Range(0,1)) = 0
  _Glossiness ("Smoothness", Range(0,1)) = 0.2
  _EmissionColor ("Emission", Color) = (0,0,0,1)
 }
 SubShader {
  Tags { "RenderType"="Opaque" }
  LOD 250
  CGPROGRAM
  #pragma surface surf Standard fullforwardshadows vertex:vert addshadow
  #pragma target 3.0
  #pragma multi_compile_instancing
  #include "UnityCG.cginc"
  sampler2D _MainTex, _BumpMap;
  fixed4 _Color, _EmissionColor; half _Metallic, _Glossiness, _BumpScale;
  struct Input { float2 uv_MainTex; float2 uv_BumpMap; float4 color : COLOR; };
  void vert(inout appdata_full v, out Input o) { UNITY_INITIALIZE_OUTPUT(Input,o); o.color = v.color; }
  void surf(Input IN, inout SurfaceOutputStandard o) {
   fixed4 c=tex2D(_MainTex,IN.uv_MainTex)*_Color*IN.color;
   o.Albedo=c.rgb; o.Metallic=_Metallic; o.Smoothness=_Glossiness; o.Alpha=1;
   half3 n=UnpackNormal(tex2D(_BumpMap,IN.uv_BumpMap));n.xy*=_BumpScale;o.Normal=normalize(n);
   o.Emission=_EmissionColor.rgb;
  }
  ENDCG
 }
 FallBack "Standard"
}
