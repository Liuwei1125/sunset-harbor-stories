Shader "Hidden/CoastRush/Finish" {
 Properties { _MainTex("Source",2D)="white"{} _Bloom("Bloom",Float)=0.13 }
 SubShader { Cull Off ZWrite Off ZTest Always Pass { CGPROGRAM
 #pragma vertex vert_img
 #pragma fragment frag
 #include "UnityCG.cginc"
 sampler2D _MainTex; float4 _MainTex_TexelSize; float _Bloom;
 float3 aces(float3 x){return saturate((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14));}
 fixed4 frag(v2f_img i):SV_Target {
  float3 c=tex2D(_MainTex,i.uv).rgb;float3 glow=0;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)glow+=max(0,tex2D(_MainTex,i.uv+float2(x,y)*_MainTex_TexelSize.xy*5).rgb-.92);
  c=aces((c+glow*(_Bloom/9))*1.10);c=saturate((c-.5)*1.05+.5);
  return fixed4(c,1);
 }
 ENDCG } } }
