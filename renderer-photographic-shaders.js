/* Harbor Radiance: linear lighting, filtered IBL, contact occlusion and AgX.
   AgX matrices/polynomial adapted from Three.js / Filament (MIT / Apache-2.0).
   See NOTICE.md and GRAPHICS_ZH.md for sources and rendering limits. */
const VERTEX_PHOTO_STATIC9=VERTEX_STATIC.replace('varying vec3 vParams;','varying vec3 vParams;varying vec3 vSurface;varying float vKind;').replace('void main(){','void main(){vSurface=aPosition;vKind=0.;');
const VERTEX_PHOTO_INSTANCE9=VERTEX_INSTANCE.replace('varying vec3 vParams;','varying vec3 vParams;varying vec3 vSurface;varying float vKind;').replace('void main(){','void main(){vSurface=aPosition;vKind=aParams.w;');
const SCREEN_VERTEX9=`attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const AGX9=`
vec3 agx9(vec3 c){
 const mat3 to2020=mat3(.6274,.0691,.0164,.3293,.9195,.0880,.0433,.0113,.8956);
 const mat3 from2020=mat3(1.6605,-.1246,-.0182,-.5876,1.1329,-.1006,-.0728,-.0083,1.1187);
 const mat3 inset=mat3(.856627153,.137318973,.111898213,.095121241,.761241991,.076799419,.048251606,.101439036,.811302368);
 const mat3 outset=mat3(1.127100582,-.141329763,-.141329763,-.110606643,1.157823702,-.110606643,-.016493939,-.016493939,1.251936407);
 vec3 x=clamp((log2(max(inset*to2020*c,vec3(1e-9)))+12.47393)/16.5,0.,1.);
 vec3 x2=x*x,x4=x2*x2;x=15.5*x4*x2-40.14*x4*x+31.96*x4-6.868*x2*x+.4298*x2+.1191*x-.00232;
 return clamp(from2020*pow(max(outset*x,vec3(0.)),vec3(2.2)),0.,1.);
}
vec3 srgb9(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
vec3 linear9(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
vec3 display9(vec3 c){
 vec3 rgb=srgb9(agx9(max(c,vec3(0.))));float y=dot(rgb,vec3(.2126,.7152,.0722));
 // A mild display look; preserve neutral values and compress chroma before it
 // leaves the display gamut, rather than clipping individual color channels.
 float contrast=y+.075*(y-.45)*4.*y*(1.-y);vec3 chroma=(rgb-y)*1.22;
 float hi=max(max(chroma.r,chroma.g),chroma.b),lo=min(min(chroma.r,chroma.g),chroma.b);
 float fit=min(1.,min((1.-contrast)/max(hi,.00001),contrast/max(-lo,.00001)));
 return clamp(vec3(contrast)+chroma*fit,0.,1.);
}
`;
const ENVIRONMENT_GLSL9=`
uniform sampler2D uEnvironment9;
vec3 environmentLevel9(vec3 d,float level){
 vec2 uv=vec2(atan(d.z,d.x)/6.283185307+.5,acos(clamp(d.y,-1.,1.))/3.141592654);
 uv.x=(uv.x*254.+1.)/256.;uv.y=(level*128.+.5+uv.y*127.)/1024.;
 vec4 tex=texture2D(uEnvironment9,uv);return tex.rgb*tex.a*8.;
}
vec3 environment9(vec3 d,float rough){float lod=clamp(rough,0.,1.)*5.;return mix(environmentLevel9(d,floor(lod)),environmentLevel9(d,min(5.,floor(lod)+1.)),fract(lod));}
vec2 envBRDF9(float nv,float rough){vec4 r=rough*vec4(-1.,-.0275,-.572,.022)+vec4(1.,.0425,1.04,-.04);float a=min(r.x*r.x,exp2(-9.28*nv))*r.x+r.y;return vec2(-1.04,1.04)*a+r.zw;}
`;
const DEPTH_GLSL9=`
uniform sampler2D uSceneDepth9;uniform mat4 uInverseVP9;uniform mat4 uVP;uniform vec3 uEye;uniform vec3 uViewDirection9;
vec3 worldAt9(vec2 uv){float d=texture2D(uSceneDepth9,uv).r;vec4 p=uInverseVP9*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
float viewDepth9(vec3 p){return dot(p-uEye,uViewDirection9);}
`;
const SURFACE_GLSL9=`
float hash9(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise9(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash9(i),hash9(i+vec3(1,0,0)),f.x),mix(hash9(i+vec3(0,1,0)),hash9(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash9(i+vec3(0,0,1)),hash9(i+vec3(1,0,1)),f.x),mix(hash9(i+vec3(0,1,1)),hash9(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec3 microNormal9(vec3 p,vec3 n,float h){
 #ifdef HAS_DERIVATIVES9
 vec3 dx=dFdx(p),dy=dFdy(p),r1=cross(dy,n),r2=cross(n,dx);float det=dot(dx,r1);
 return normalize(abs(det)*n-sign(det)*(dFdx(h)*r1+dFdy(h)*r2));
 #else
 return n;
 #endif
}
`;
const FRAGMENT_PHOTO9=`precision highp float;
varying vec3 vWorld;varying vec3 vNormal;varying vec4 vColor;varying vec3 vParams;varying vec3 vSurface;varying float vKind;
uniform sampler2D uShadow;uniform sampler2D uNearShadow9;uniform sampler2D uAO9;uniform sampler2D uOpaque9;
uniform mat4 uLightVP;uniform mat4 uNearVP9;uniform vec3 uSun9;uniform vec3 uSunColor9;uniform vec3 uFog;
uniform float uShadowOn;uniform float uNearOn9;uniform float uTexel;uniform float uNearTexel9;uniform float uDetail;uniform float uTime;uniform float uFogRange;
uniform float uExposure9;uniform float uLinearOutput9;uniform float uAOOn9;uniform float uWaterPass9;uniform float uReflection9;uniform vec2 uResolution9;
uniform vec4 uLocalLights9[6];uniform vec3 uLocalColors9[6];uniform float uLocalCount9;
${AGX9}${ENVIRONMENT_GLSL9}${DEPTH_GLSL9}${SURFACE_GLSL9}
float readShadow9(sampler2D map,vec3 sc,vec2 offset,vec2 slope){float z=dot(texture2D(map,sc.xy+offset).rgb,vec3(1.,1./255.,1./65025.));return step(sc.z+dot(slope,offset)-.000045,z);}
float shadowMap9(sampler2D map,mat4 matrix,vec3 n,float texel,float offset){
 vec4 pos=matrix*vec4(vWorld+n*offset,1.);vec3 sc=pos.xyz/pos.w*.5+.5;vec2 slope=vec2(0.);
 #ifdef HAS_DERIVATIVES9
 // Compare each PCF tap on the receiver plane, avoiding concentric self-shadow bands.
 vec3 dx=dFdx(sc),dy=dFdy(sc);float det=dx.x*dy.y-dx.y*dy.x;
 if(abs(det)>1e-12)slope=clamp(vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/det,vec2(-4.),vec2(4.));
 #else
 sc.z-=.00035;
 #endif
 if(sc.x<.002||sc.x>.998||sc.y<.002||sc.y>.998||sc.z<0.||sc.z>1.)return 1.;
 float s=0.;s+=readShadow9(map,sc,vec2(-.72,-.41)*texel*1.8,slope);s+=readShadow9(map,sc,vec2(.68,-.62)*texel*1.8,slope);
 s+=readShadow9(map,sc,vec2(-.39,.83)*texel*1.8,slope);s+=readShadow9(map,sc,vec2(.51,.56)*texel*1.8,slope);
 if(uDetail>.5){s+=readShadow9(map,sc,vec2(.06,-.96)*texel*1.8,slope);s+=readShadow9(map,sc,vec2(-.97,.10)*texel*1.8,slope);s+=readShadow9(map,sc,vec2(.94,.11)*texel*1.8,slope);s+=readShadow9(map,sc,vec2(.12,.21)*texel*1.8,slope);return s*.125;}
 return s*.25;
}
float sunShadow9(vec3 n){if(uShadowOn<.5)return 1.;float far=shadowMap9(uShadow,uLightVP,n,uTexel,.04);if(uNearOn9<.5)return far;
 vec4 q=uNearVP9*vec4(vWorld,1.);float edge=max(abs(q.x/q.w),abs(q.y/q.w));float blend=1.-smoothstep(.72,.96,edge);
 return mix(far,shadowMap9(uNearShadow9,uNearVP9,n,uNearTexel9,.009),blend);
}
vec3 brdf9(vec3 n,vec3 e,vec3 l,vec3 base,float rough,float metal,vec3 incoming){
 float nl=max(dot(n,l),0.),nv=max(dot(n,e),.001);if(nl<=0.)return vec3(0.);vec3 h=normalize(l+e);float nh=max(dot(n,h),0.),vh=max(dot(e,h),0.);
 float a=max(.035,rough*rough),a2=a*a,den=nh*nh*(a2-1.)+1.,D=a2/(3.14159265*den*den);
 float gv=nl*sqrt(nv*nv*(1.-a2)+a2),gl=nv*sqrt(nl*nl*(1.-a2)+a2),visibility=.5/max(gv+gl,.0001);
 vec3 f0=mix(vec3(.04),base,metal),f=f0+(1.-f0)*pow(1.-vh,5.);
 return ((1.-f)*(1.-metal)*base/3.14159265+D*visibility*f)*incoming*nl;
}
vec3 water9(){
 vec2 q=vWorld.xz;float t=uTime;
 vec3 n=normalize(vec3(-.08*cos(q.x*.55+t*.75)-.035*cos(q.x*1.73+q.y*.61-t*.9),1.,-.07*cos(q.y*.63-t*.6)-.04*sin(q.x*.71-q.y*1.44+t*.7)));
 vec3 e=normalize(uEye-vWorld),r=reflect(-e,n);float fresnel=.025+.975*pow(1.-max(dot(n,e),0.),5.);
 vec3 reflection=environment9(r,.11);float foam=0.;
 if(uReflection9>.5){
  float previous=0.;for(int i=0;i<20;i++){
   float distance=.3+float(i)*.42+float(i*i)*.11;vec3 probe=vWorld+n*.08+r*distance;vec4 clip=uVP*vec4(probe,1.);vec2 uv=clip.xy/clip.w*.5+.5;
   if(clip.w<=0.||uv.x<.015||uv.x>.985||uv.y<.015||uv.y>.985)break;
   if(texture2D(uSceneDepth9,uv).r<.99998){vec3 hit=worldAt9(uv);float delta=viewDepth9(probe)-viewDepth9(hit);
    if(delta>.045&&delta<1.+distance*.1&&previous<=.15){float fade=smoothstep(0.,.15,min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y)))*(1.-float(i)/25.);reflection=mix(reflection,texture2D(uOpaque9,uv).rgb,fade*.82);break;}previous=delta;
   }
  }
  vec2 screen=gl_FragCoord.xy/uResolution9;if(texture2D(uSceneDepth9,screen).r<.99998){float thickness=max(0.,viewDepth9(worldAt9(screen))-viewDepth9(vWorld));foam=(1.-smoothstep(.1,1.1,thickness))*(.5+.5*sin(q.x*5.+q.y*3.-t*2.));}
 }
 vec3 body=linear9(vColor.rgb)*.64+vec3(.003,.022,.033);
 vec3 lit=mix(body,reflection,fresnel*.88)+brdf9(n,e,uSun9,vec3(.018),.12,0.,uSunColor9)*.75;
 lit=mix(lit,vec3(.65,.76,.70),foam*.34);
 float fog=1.-exp(-length(uEye-vWorld)/uFogRange*.26);return mix(lit,environmentLevel9(normalize(vWorld-uEye),0.),fog);
}
void main(){
 if(vColor.a<.003)discard;
 if(vParams.x>1.5){if(uWaterPass9<.5&&uWaterPass9>-.5)discard;vec3 w=water9();gl_FragColor=vec4(uLinearOutput9>.5?w:display9(w*uExposure9),vColor.a);return;}
 if(uWaterPass9>.5)discard;
 vec3 n=normalize(vNormal+vec3(.000001)),e=normalize(uEye-vWorld),base=linear9(vColor.rgb);float rough=vParams.y,metal=vParams.z,distance=length(uEye-vWorld);
 if(vParams.x>=0.&&vParams.x<.5){
  bool horizontal=n.y>.7&&vWorld.y<.7;float blue=step(vColor.r*1.18,vColor.b)*step(vColor.r*1.10,vColor.g);
  rough=horizontal?.92:mix(.79,.22,blue);metal=horizontal?0.:blue*.10;
 }
 if(uDetail>.5&&vParams.x<0.){
  float proximity=1.-smoothstep(12.,48.,distance),grain=noise9(vSurface*39.),micro=grain-.5;
  #ifdef HAS_DERIVATIVES9
  float footprint=max(length(dFdx(vSurface)),length(dFdy(vSurface)));
  proximity*=1.-smoothstep(.003,.018,footprint);
  #endif
  float bump=.0016;float tint=.055;
  if(vKind>1.5&&vKind<2.5){float wood=sin(vSurface.z*210.+noise9(vSurface*vec3(13.,9.,2.))*11.);micro=wood*.5;bump=.001;tint=.12;rough=clamp(rough+wood*.035,.18,1.);}
  else if(vKind>.5&&vKind<1.5){micro=sin(vSurface.z*340.)*.18+micro*.4;bump=.00025;tint=.025;}
  else if(vKind>3.5&&vKind<4.5){bump=.00025;tint=.018;}
  else if(vKind>2.5&&vKind<3.5){micro=sin(vSurface.x*180.)*sin(vSurface.z*180.)*.25+micro*.5;bump=.0008;}
  base*=1.+micro*tint*proximity;rough=clamp(rough+micro*.05*proximity,.08,1.);n=microNormal9(vWorld,n,micro*bump*proximity);
 }
 float normalVariance=0.;
 #ifdef HAS_DERIVATIVES9
 vec3 nx=dFdx(n),ny=dFdy(n);normalVariance=min(.2,.5*(dot(nx,nx)+dot(ny,ny)));
 rough=sqrt(min(1.,rough*rough+normalVariance));
 #endif
 float nv=max(dot(n,e),.001);vec3 f0=mix(vec3(.04),base,metal);vec2 ab=envBRDF9(nv,rough);vec3 single=f0*ab.x+ab.y;
 float ess=ab.x+ab.y;vec3 average=f0+(1.-f0)/21.;vec3 multiple=single*average/max(vec3(.02),1.-(1.-ess)*average);
 vec3 specularEnergy=single+multiple*(1.-ess);vec3 indirect=environment9(reflect(-e,n),rough)*specularEnergy;
 vec3 diffuseSky=environmentLevel9(n,6.);float fillEnergy=dot(diffuseSky,vec3(.2126,.7152,.0722));
 // Broad daylight fill keeps its intensity while reducing the blue cast on
 // painted objects and concrete. The sharp reflection still retains sky color.
 diffuseSky=mix(vec3(fillEnergy)*vec3(1.05,1.,.94),diffuseSky,.12);
 indirect+=diffuseSky*2.0*base*(1.-metal)*(1.-specularEnergy);
 float ao=uAOOn9>.5?texture2D(uAO9,gl_FragCoord.xy/uResolution9).r:1.;float specAO=clamp(pow(nv+ao,exp2(-16.*rough-1.))-1.+ao,0.,1.);
 // Occlusion attenuates indirect light only. Direct sunlight/flash light stay independent.
 indirect*=mix(specAO,ao,1.-metal*.6);
 vec3 c=indirect+brdf9(n,e,uSun9,base,rough,metal,uSunColor9)*sunShadow9(n);
 if(vKind>3.5&&vKind<4.5){float coatRough=sqrt(.0225+normalVariance);vec3 coat=brdf9(n,e,uSun9,vec3(0.),coatRough,0.,uSunColor9)*sunShadow9(n);c+=coat*.24+environment9(reflect(-e,n),coatRough)*(.02+.12*pow(1.-nv,5.));}
 for(int i=0;i<6;i++){if(float(i)>=uLocalCount9)break;vec3 v=uLocalLights9[i].xyz-vWorld;float d2=dot(v,v),radius=uLocalLights9[i].w;float fall=clamp(1.-d2/(radius*radius),0.,1.);c+=brdf9(n,e,normalize(v+vec3(.0001)),base,rough,metal,uLocalColors9[i]*fall*fall/(1.+d2*.18));}
 if(vParams.x>.5)c=base*3.8;
 vec3 haze=environmentLevel9(normalize(vWorld-uEye),0.);float fog=(1.-exp(-distance/uFogRange*.40))*smoothstep(55.,210.,distance);
 c=mix(c,haze,fog);gl_FragColor=vec4(uLinearOutput9>.5?c:display9(c*uExposure9),vColor.a);
}`;
const NORMAL_FRAGMENT9=`precision highp float;varying vec3 vNormal;varying vec3 vParams;varying vec4 vColor;void main(){if(vParams.x>.5||vColor.a<.95)discard;gl_FragColor=vec4(normalize(vNormal)*.5+.5,vParams.y);}`;
const SKY_FRAGMENT9=`precision highp float;varying vec2 vUV;uniform mat4 uInverseVP9;uniform vec3 uEye;uniform vec3 uSun9;uniform vec3 uSunColor9;uniform float uLinearOutput9;uniform float uExposure9;${AGX9}${ENVIRONMENT_GLSL9}
void main(){vec4 p=uInverseVP9*vec4(vUV*2.-1.,.9999,1.);vec3 ray=normalize(p.xyz/p.w-uEye);vec3 c=environmentLevel9(ray,0.);float dotSun=dot(ray,uSun9);c+=uSunColor9*(smoothstep(.99993,.999965,dotSun)*3.+pow(max(dotSun,0.),600.)*.025);gl_FragColor=vec4(uLinearOutput9>.5?c:display9(c*uExposure9),1.);}`;
const AO_FRAGMENT9=`precision highp float;varying vec2 vUV;uniform sampler2D uNormal9;uniform vec2 uResolution9;uniform float uSamples9;${DEPTH_GLSL9}
void main(){float depth=texture2D(uSceneDepth9,vUV).r;if(depth>.99998){gl_FragColor=vec4(1.);return;}vec3 p=worldAt9(vUV),n=normalize(texture2D(uNormal9,vUV).xyz*2.-1.);float z=viewDepth9(p);if(z>85.){gl_FragColor=vec4(1.);return;}
 float radius=clamp(z*.04,.17,1.7),angle=fract(sin(dot(floor(vUV*uResolution9),vec2(12.9898,78.233)))*43758.5453)*6.28318;
 vec3 random=vec3(cos(angle),sin(angle),.31),tangent=normalize(random-n*dot(random,n)),bitangent=cross(n,tangent);float occ=0.;
 for(int i=0;i<16;i++){if(float(i)>=uSamples9)break;float f=(float(i)+.5)/uSamples9,a=float(i)*2.399963;vec3 d=tangent*cos(a)*sqrt(f)+bitangent*sin(a)*sqrt(f)+n*sqrt(1.-f);vec3 q=p+d*radius*(.2+.8*f);vec4 clip=uVP*vec4(q,1.);vec2 uv=clip.xy/clip.w*.5+.5;if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.||texture2D(uSceneDepth9,uv).r>.99998)continue;vec3 hit=worldAt9(uv);float dz=viewDepth9(q)-viewDepth9(hit);float range=1.-smoothstep(radius*.3,radius*1.5,length(hit-p));occ+=step(.015+z*.0008,dz)*range;}
 float ao=clamp(1.-occ/uSamples9*1.6,.35,1.);ao=mix(ao,1.,smoothstep(55.,85.,z));gl_FragColor=vec4(vec3(ao),1.);
}`;
const AO_BLUR_FRAGMENT9=`precision highp float;varying vec2 vUV;uniform sampler2D uInput9;uniform vec2 uDirection9;${DEPTH_GLSL9}
void main(){if(texture2D(uSceneDepth9,vUV).r>.99998){gl_FragColor=vec4(1.);return;}float center=viewDepth9(worldAt9(vUV)),sum=0.,weight=0.;for(int i=-2;i<=2;i++){vec2 uv=vUV+float(i)*uDirection9;float z=viewDepth9(worldAt9(uv));float w=exp(-abs(z-center)/(.035+center*.007))*exp(-float(i*i)*.4);sum+=texture2D(uInput9,uv).r*w;weight+=w;}gl_FragColor=vec4(vec3(sum/max(weight,.001)),1.);}`;
const BLOOM_FRAGMENT9=`precision highp float;varying vec2 vUV;uniform sampler2D uInput9;uniform vec2 uDirection9;uniform float uThreshold9;
vec3 sample9(vec2 uv){vec3 c=texture2D(uInput9,uv).rgb;float peak=max(max(c.r,c.g),c.b);return uThreshold9>.5?c*clamp((peak-1.35)/max(peak,.001),0.,1.):c;}
void main(){vec3 c=sample9(vUV)*.227027;c+=(sample9(vUV+uDirection9*1.384615)+sample9(vUV-uDirection9*1.384615))*.316216;c+=(sample9(vUV+uDirection9*3.230769)+sample9(vUV-uDirection9*3.230769))*.070270;gl_FragColor=vec4(c,1.);}`;
const POST_FRAGMENT9=`precision highp float;varying vec2 vUV;uniform sampler2D uInput9;uniform sampler2D uBloom9;uniform vec2 uResolution9;uniform float uLinearOutput9;uniform float uBloomOn9;uniform float uExposure9;${AGX9}
float luma9(vec3 c){return dot(sqrt(max(c,vec3(0.))),vec3(.299,.587,.114));}
void main(){vec2 inv=1./uResolution9;vec3 center=texture2D(uInput9,vUV).rgb,nw=texture2D(uInput9,vUV+vec2(-1.,1.)*inv).rgb,ne=texture2D(uInput9,vUV+vec2(1.,1.)*inv).rgb,sw=texture2D(uInput9,vUV+vec2(-1.,-1.)*inv).rgb,se=texture2D(uInput9,vUV+vec2(1.,-1.)*inv).rgb;
 float a=luma9(nw),b=luma9(ne),c=luma9(sw),d=luma9(se),m=luma9(center);float lo=min(m,min(min(a,b),min(c,d))),hi=max(m,max(max(a,b),max(c,d)));
 vec3 result=center;if(hi-lo>max(.055,hi*.11)){vec2 direction=vec2(-((a+b)-(c+d)),(a+c)-(b+d));float reduce=max((a+b+c+d)*.03125,.0078125);direction=clamp(direction/(min(abs(direction.x),abs(direction.y))+reduce),vec2(-6.),vec2(6.))*inv;
 vec3 aa=.5*(texture2D(uInput9,vUV+direction*(1./3.-.5)).rgb+texture2D(uInput9,vUV+direction*(2./3.-.5)).rgb);vec3 bb=aa*.5+.25*(texture2D(uInput9,vUV+direction*-.5).rgb+texture2D(uInput9,vUV+direction*.5).rgb);float l=luma9(bb);result=l<lo||l>hi?aa:bb;}
 if(uLinearOutput9>.5){result+=texture2D(uBloom9,vUV).rgb*uBloomOn9*.095;result=display9(result*uExposure9);}
 float vignette=1.-.075*smoothstep(.15,.72,dot(vUV-.5,vUV-.5));gl_FragColor=vec4(result*vignette,1.);
}`;
