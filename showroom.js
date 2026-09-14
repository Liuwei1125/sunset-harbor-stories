'use strict';
(() => {
  const viewer = document.getElementById('weapon-viewer');
  const status = document.getElementById('view-status');
  const error = document.getElementById('viewer-error');
  const errorMessage = document.getElementById('error-message');
  const exposure = document.getElementById('exposure');
  const shadow = document.getElementById('shadow');
  const tone = document.getElementById('tone');
  const rotate = document.getElementById('rotate');
  const presets = {
    hero: {orbit: '75deg 70deg 2.65m', target: '0m -0.027m -0.267m'},
    side: {orbit: '90deg 90deg 2.65m', target: '0m -0.027m -0.267m'},
    detail: {orbit: '72deg 65deg 0.85m', target: '0m 0.035m -0.18m'}
  };
  const environments = {studio:'assets/showroom/studio.hdr', neutral:'neutral', sunset:'assets/showroom/sunset.hdr'};
  let ready = false, rotating = false, timer, framing = 1, selectedView = 'hero';
  const failure = message => {
    clearTimeout(timer);errorMessage.textContent = message;error.hidden = false;
    status.textContent = '加载失败';ready = false;setDisabled(true);
  };
  function setDisabled(value) {
    document.querySelectorAll('.inspector input,.inspector select,.inspector button,.camera-bar button,#restore-comparison').forEach(el => { el.disabled = value; });
  }
  function setRotation(value) {
    rotating = value;
    viewer.toggleAttribute('auto-rotate', ready && rotating && !document.hidden);
    rotate.setAttribute('aria-pressed', String(rotating));
  }
  function setView(name) {
    selectedView = name;
    setRotation(false);
    viewer.resetTurntableRotation?.();
    const [theta, phi, radius] = presets[name].orbit.split(' ');
    viewer.setAttribute('camera-orbit', `${theta} ${phi} ${parseFloat(radius)*framing}m`);
    viewer.setAttribute('camera-target', presets[name].target);
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === name)));
  }
  function fitViewport() {
    if (!ready) return;
    const aspect = viewer.clientWidth/viewer.clientHeight;
    // model-viewer adjusts vertical FOV on narrow screens. Match the reference's
    // horizontal coverage using the actual FOV, rather than assuming it stays 30°.
    const next = Math.max(1, 1.6*Math.tan(Math.PI/12)/(aspect*Math.tan(viewer.getFieldOfView()*Math.PI/360)));
    if (Math.abs(next-framing)<.005) return;
    const orbit=viewer.getCameraOrbit(),previous=framing;framing=next;
    viewer.setAttribute('min-camera-orbit',`auto 15deg ${.5*framing}m`);
    viewer.setAttribute('max-camera-orbit',`auto 165deg ${4*framing}m`);
    if (selectedView) setView(selectedView);
    else viewer.setAttribute('camera-orbit',`${orbit.theta}rad ${orbit.phi}rad ${orbit.radius*framing/previous}m`);
    viewer.jumpCameraToGoal();
  }
  function syncSettings() {
    viewer.setAttribute('exposure', exposure.value);
    viewer.setAttribute('tone-mapping', tone.value);
    viewer.setAttribute('shadow-intensity', shadow.value);
    document.getElementById('exposure-value').value = Number(exposure.value).toFixed(2);
    document.getElementById('shadow-value').value = Number(shadow.value).toFixed(2);
  }
  function reset() {
    document.querySelector('[name="lighting"][value="studio"]').checked = true;
    viewer.setAttribute('environment-image', environments.studio);
    exposure.value = '1';shadow.value = '1';tone.value = 'agx';syncSettings();setView('hero');
  }
  setDisabled(true);
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  document.querySelectorAll('[name="lighting"]').forEach(input => input.addEventListener('change', () => viewer.setAttribute('environment-image', environments[input.value])));
  [exposure, shadow].forEach(input => input.addEventListener('input', syncSettings));
  tone.addEventListener('change', syncSettings);
  rotate.addEventListener('click', () => setRotation(!rotating));
  document.getElementById('reset').addEventListener('click', reset);
  document.getElementById('restore-comparison').addEventListener('click', () => {reset();viewer.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});});
  document.getElementById('retry').addEventListener('click', () => location.reload());
  document.addEventListener('visibilitychange', () => viewer.toggleAttribute('auto-rotate', ready && rotating && !document.hidden));
  new ResizeObserver(() => requestAnimationFrame(() => requestAnimationFrame(fitViewport))).observe(viewer);
  viewer.addEventListener('camera-change', event => {
    if (event.detail.source === 'user-interaction') {
      selectedView = null;
      setRotation(false);
      document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed','false'));
    }
  });
  viewer.addEventListener('progress', event => {document.getElementById('load-progress').style.width = Math.round(event.detail.totalProgress*100)+'%';});
  viewer.addEventListener('load', () => {
    clearTimeout(timer);ready = true;error.hidden = true;status.textContent = '可交互 · 3D';
    document.querySelector('.loading-strip').hidden = true;setDisabled(false);syncSettings();
    requestAnimationFrame(() => requestAnimationFrame(fitViewport));
  });
  viewer.addEventListener('error', () => failure('请检查浏览器硬件加速是否开启，以及本地模型和灯光资源是否完整，然后重新加载。'));
  if (location.protocol === 'file:') {
    failure('请通过本地服务器打开此页面：在项目目录运行 python3 -m http.server 8000，然后访问 http://localhost:8000/showroom.html。展示资源均保存在本地，无需联网。');
    return;
  }
  timer = setTimeout(() => failure('模型加载时间较长。请确认浏览器支持 WebGL 2，并重新加载。'), 45000);
  import('./assets/vendor/model-viewer/model-viewer.min.js').catch(() => failure('展示组件未能加载，请检查 assets/vendor/model-viewer 文件夹是否完整。'));
})();
