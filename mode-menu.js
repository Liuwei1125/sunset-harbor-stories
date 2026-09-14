/* The campaign and Harbor Club share a renderer, not a session or save slot. */
const initBeforeModeMenu10=init;
init=function(){initBeforeModeMenu10();
 if(!renderer||$('arcade-open'))return;
 const link=document.createElement('a');link.id='arcade-open';link.href='arcade.html?v=6.4.0';link.className='secondary';link.textContent='休闲竞技 / HARBOR CLUB';link.style.cssText='display:inline-flex;align-items:center;justify-content:center;text-decoration:none;min-height:46px;padding:12px 18px;font-size:12px';
 document.querySelector('.startrow')?.appendChild(link);
 const play=document.createElement('button');play.id='arcade-toolbar';play.className='tiny';play.textContent='休闲模式';play.onclick=()=>{if(state.started)saveProgress();location.href=link.href;};document.querySelector('.topbtns')?.appendChild(play);
};
