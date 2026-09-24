(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sourceId = Number(new URL(location.href).searchParams.get('source'));
  const canvas = $('protected'), ctx = canvas.getContext('2d',{alpha:false});
  const editor = $('editor'), ec = editor.getContext('2d');
  const video = $('source');
  const snapshot = document.createElement('canvas'), snapshotCtx = snapshot.getContext('2d',{alpha:false});
  const sanitized = document.createElement('canvas'), sanitizedCtx = sanitized.getContext('2d',{alpha:false});
  let raw=null, safe=null, safeTrack=null, recorder=null, chunks=[];
  let active=false, epoch=0, readyFrame=false, mode='', drawing=null, manual=[], loopPromise=null;
  let navigationPending=false;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const errorText=e=>String(e?.message || e).slice(0,170);
  const setting=()=>({passwords:$('passwords').checked,tokens:$('tokens').checked,cards:$('cards').checked});
  function message(txt) {
    $('status').textContent = txt;
    $('status').title = txt;
  }
  function showError(txt) {
    const box = $('errorDetails');
    box.textContent = txt;
    box.hidden = false;
  }
  function clearError() { $('errorDetails').hidden = true; $('errorDetails').textContent = ''; }
  function hold(txt='Checking this frame…'){
    ctx.fillStyle='#111927';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#cad7eb';ctx.font=`${Math.max(14,Math.round(canvas.width/72))}px system-ui`;
    ctx.fillText(txt,Math.max(18,canvas.width*.035),Math.max(40,canvas.height*.08));
    safeTrack?.requestFrame?.();
  }
  function resize(w,h){
    if (w<2||h<2||w*h>9_000_000) throw new Error('Unsupported capture dimensions');
    if(canvas.width===w&&canvas.height===h)return;
    for(const c of [canvas,editor,snapshot,sanitized]){c.width=w;c.height=h;}
    $('surface').style.aspectRatio=`${w} / ${h}`;
    manual=[];readyFrame=false;mode='';drawing=null;refreshEditor();hold('Display size changed · rechecking…');
  }
  function mask(c,r,sx=1,sy=1){
    const {x,y,w,h}=r;
    if (![x,y,w,h,sx,sy].every(Number.isFinite)||w<=0||h<=0) throw new Error('Invalid detection bounds');
    const left=Math.max(0,Math.floor(x*sx)-3),top=Math.max(0,Math.floor(y*sy)-2);
    const right=Math.min(c.canvas.width,Math.ceil((x+w)*sx)+3),bottom=Math.min(c.canvas.height,Math.ceil((y+h)*sy)+2);
    c.fillStyle='#121923';c.fillRect(left,top,Math.max(0,right-left),Math.max(0,bottom-top));
  }
  function publish(){
    if(!readyFrame||!active)return;
    ctx.drawImage(sanitized,0,0);
    for(const r of manual)mask(ctx,r);
    safeTrack?.requestFrame?.();
  }
  function startUI(){
    $('hint').hidden=true;$('stop').disabled=false;
    for(const name of ['record','fullscreen','add','remove'])$(name).disabled=false;
    $('liveDot').classList.add('active');$('stateIndicator').classList.add('active');
    $('protectionTitle').textContent='Protected stream on';
    $('protectionSubtitle').textContent='Share this preview, not your original tab.';
    $('start').disabled=true;$('pick').disabled=true;
  }
  function stopUI(){
    $('start').disabled=false;$('pick').disabled=false;
    for(const name of ['stop','record','fullscreen','add','remove','undo','clear'])$(name).disabled=true;
    $('hint').hidden=false;$('liveDot').classList.remove('active');$('stateIndicator').classList.remove('active');
    $('protectionTitle').textContent='Protection is off';
    $('protectionSubtitle').textContent='Start to create an audience view.';
    $('record').textContent='● Record';$('counter').textContent='No video is being shared';
  }
  function stop(messageText='Stopped'){
    if (/failed|error|cannot|unavailable|stopped:|privacy hold/i.test(messageText)) showError(messageText);
    active=false;epoch++;readyFrame=false;navigationPending=false;
    void chrome.runtime.sendMessage({type:'STOP_CAPTURE'}).catch(()=>{});
    if(recorder?.state==='recording')recorder.stop();
    for(const stream of [raw,safe])stream?.getTracks().forEach(t=>t.stop());
    raw=null;safe=null;safeTrack=null;video.srcObject=null;
    manual=[];mode='';drawing=null;refreshEditor();stopUI();hold('ShareGuard · stopped');message(messageText);
  }
  async function scan(){
    const answer=await chrome.runtime.sendMessage({type:'SCAN',sourceId,categories:setting()});
    if(!answer?.ok)throw new Error(answer?.error||'Cannot scan source tab');
    if(answer.navigating)return {navigating:true};
    if(answer.unavailable)return {unavailable:true,reason:answer.reason};
    const d=answer.data;
    if(d?.complete!==true||!Array.isArray(d.areas)||!d.viewport?.width||!d.viewport?.height)throw new Error(d?.reason||'Source scan incomplete');
    if(d.areas.length>6000)throw new Error('Too many sensitive regions');
    return d;
  }
  async function loop(id){
    let errors=0;
    while(active&&id===epoch){
      const begin=performance.now();
      try{
        if(video.readyState<2||!video.videoWidth)throw new Error('Capture not ready');
        const w=video.videoWidth,h=video.videoHeight;
        resize(w,h);
        snapshotCtx.drawImage(video,0,0,w,h);
        const result=await scan();
        if(!active||id!==epoch)break;
        if(result.navigating||result.unavailable){
          navigationPending=true;readyFrame=false;
          hold(result.unavailable?'Page cannot be protected':'Opening the next page…');
          $('counter').textContent=result.unavailable
            ? 'This browser page is unsupported · return to a website'
            : 'Navigating · waiting for the new page';
          message(result.unavailable ? result.reason : 'Protected stream paused · reconnecting automatically…');
          errors=0;
        }else{
          sanitizedCtx.drawImage(snapshot,0,0);
          for(const r of result.areas)mask(sanitizedCtx,r,w/result.viewport.width,h/result.viewport.height);
          if(!active||id!==epoch)break;
          navigationPending=false;readyFrame=true;publish();errors=0;
          $('counter').textContent=`${result.areas.length} automatically hidden · ${manual.length} manually hidden`;
          $('speed').textContent=`Checked in ${Math.round(performance.now()-begin)} ms`;
          message('Protected preview active · DOM-only proof of concept');
        }
      }catch(e){
        errors++;readyFrame=false;hold('Privacy hold · checking the new page');
        $('counter').textContent='No new source frame released';
        message(`Privacy hold · ${errorText(e)}`);
      }
      if(active&&id===epoch)await sleep(navigationPending||errors ? 280 : 120);
    }
  }
  async function attach(stream){
    raw=stream;
    const track=raw.getVideoTracks()[0];
    if(!track)throw new Error('No video track selected');
    track.addEventListener('ended',()=>{if(active)stop('Source tab capture ended. Click Start protection to reconnect, or Choose a tab if Chrome asks for permission.');},{once:true});
    video.srcObject=raw;
    await video.play();
    if(!video.videoWidth)await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Tab video did not start')),5000);
      video.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve();},{once:true});
    });
    resize(video.videoWidth,video.videoHeight);
    hold('Checking your screen…');
    safe=canvas.captureStream(0);
    safeTrack=safe.getVideoTracks()[0];
    if(typeof safeTrack?.requestFrame!=='function')throw new Error('Manual frame capture unsupported');
    safeTrack.requestFrame();
    active=true;const id=++epoch;
    startUI();
    loopPromise=loop(id);
  }
  async function startAutomatic(){
    if(active)return;
    clearError();$('start').disabled=true;message('Checking the source tab…');
    try{
      if(!Number.isSafeInteger(sourceId)||sourceId<1)throw new Error('Open ShareGuard by clicking its icon on the source tab');
      const response=await chrome.runtime.sendMessage({type:'START_CAPTURE',sourceId,categories:setting()});
      if(!response?.ok||!response.streamId)throw new Error(response?.error||'Chrome did not provide a capture stream');
      const stream=await navigator.mediaDevices.getUserMedia({video:{mandatory:{chromeMediaSource:'tab',chromeMediaSourceId:response.streamId}},audio:false});
      await attach(stream);
    }catch(e){stop(`Automatic capture failed: ${errorText(e)}. Try “Choose a tab…”`);}
  }
  async function chooseTab(){
    if(active)return;
    clearError();
    let promise;
    try{
      promise=navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'browser'},audio:false,preferCurrentTab:false});
    }catch(e){message(`Cannot open tab picker: ${errorText(e)}`);return;}
    $('pick').disabled=true;message('Choose the ORIGINAL browser tab, not the Studio window…');
    try{
      const stream=await promise;
      if(stream.getVideoTracks()[0]?.getSettings().displaySurface!=='browser'){
        stream.getTracks().forEach(t=>t.stop());
        throw new Error('Choose a browser TAB rather than a window or entire screen');
      }
      await attach(stream);
      message('Tab selected · confirm it matches the tab where ShareGuard was opened');
    }catch(e){stop(`Tab picker failed: ${errorText(e)}`);}
  }
  function point(e){const box=editor.getBoundingClientRect();return {x:Math.max(0,Math.min(editor.width,(e.clientX-box.left)*editor.width/box.width)),y:Math.max(0,Math.min(editor.height,(e.clientY-box.top)*editor.height/box.height))};}
  function refreshEditor(){
    ec.clearRect(0,0,editor.width,editor.height);
    editor.style.pointerEvents=active&&mode?'auto':'none';
    editor.style.cursor=mode==='add'?'crosshair':mode==='remove'?'pointer':'default';
    $('editHint').hidden=!mode;
    $('add').classList.toggle('selected',mode==='add');$('remove').classList.toggle('selected',mode==='remove');
    $('add').textContent=mode==='add'?'✕ Cancel':'＋ Add blackout';
    $('remove').textContent=mode==='remove'?'✕ Cancel':'− Remove';
    if(mode==='remove')for(const b of manual){ec.strokeStyle='#fca5a5';ec.lineWidth=3;ec.strokeRect(b.x,b.y,b.w,b.h);}
    if(drawing){ec.fillStyle='#12192399';ec.fillRect(drawing.x,drawing.y,drawing.w,drawing.h);ec.strokeStyle='#76a4ff';ec.lineWidth=2;ec.strokeRect(drawing.x,drawing.y,drawing.w,drawing.h);}
    $('manualCount').textContent=String(manual.length);
    $('undo').disabled=$('clear').disabled=!active||manual.length===0;
    $('maskList').replaceChildren();
    if(!manual.length){const p=document.createElement('p');p.textContent='No custom blackouts yet.';$('maskList').append(p);}
    for(const [index] of manual.entries()){
      const row=document.createElement('div');row.className='mask-entry';
      const name=document.createElement('span');name.textContent=`Blackout ${index+1}`;
      const button=document.createElement('button');button.textContent='Remove';
      button.onclick=()=>{manual.splice(index,1);refreshEditor();publish();};
      row.append(name,button);$('maskList').append(row);
    }
  }
  function editing(next){if(!active)return;mode=mode===next?'':next;drawing=null;$('editHint').textContent=mode==='remove'?'Click an outlined blackout to remove it · Esc to cancel':'Drag over the protected preview · Esc to cancel';refreshEditor();}
  editor.addEventListener('pointerdown',e=>{
    if(!active||!mode)return;
    const p=point(e);
    if(mode==='remove'){
      for(let i=manual.length-1;i>=0;i--){const r=manual[i];if(p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h){manual.splice(i,1);break;}}
      refreshEditor();publish();return;
    }
    drawing={x:p.x,y:p.y,w:0,h:0,startX:p.x,startY:p.y};editor.setPointerCapture(e.pointerId);
  });
  editor.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);drawing={...drawing,x:Math.min(p.x,drawing.startX),y:Math.min(p.y,drawing.startY),w:Math.abs(p.x-drawing.startX),h:Math.abs(p.y-drawing.startY)};refreshEditor();});
  editor.addEventListener('pointerup',()=>{
    if(!drawing)return;
    if(drawing.w>4&&drawing.h>4)manual.push({x:drawing.x,y:drawing.y,w:drawing.w,h:drawing.h});
    drawing=null;mode='';refreshEditor();publish();
  });
  editor.addEventListener('pointercancel',()=>{drawing=null;mode='';refreshEditor();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){mode='';drawing=null;refreshEditor();}});
  $('start').addEventListener('click',()=>{void startAutomatic();});
  $('pick').addEventListener('click',()=>{void chooseTab();});
  $('stop').addEventListener('click',()=>stop());
  $('add').addEventListener('click',()=>editing('add'));
  $('remove').addEventListener('click',()=>editing('remove'));
  $('undo').addEventListener('click',()=>{manual.pop();refreshEditor();publish();});
  $('clear').addEventListener('click',()=>{manual=[];refreshEditor();publish();});
  $('fullscreen').addEventListener('click',()=>{mode='';refreshEditor();void $('surface').requestFullscreen().catch(e=>message(errorText(e)));});
  $('record').addEventListener('click',()=>{
    if(recorder?.state==='recording'){recorder.stop();$('record').textContent='● Record';return;}
    if(!active||!safe||typeof MediaRecorder==='undefined')return;
    const format=['video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
    if(!format){message('WebM recording unsupported in this browser');return;}
    chunks=[];recorder=new MediaRecorder(safe,{mimeType:format});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=()=>{
      const blob=new Blob(chunks,{type:format});chunks=[];if(!blob.size)return;
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`shareguard-protected-${Date.now()}.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    };
    recorder.start(500);$('record').textContent='■ Stop recording';
  });
  chrome.runtime.onMessage.addListener(messageEvent=>{
    if(Number(messageEvent?.sourceId)!==sourceId||!active)return;
    if(messageEvent.type==='SOURCE_NAVIGATING'){
      navigationPending=true;readyFrame=false;hold('Opening the next page…');
      $('counter').textContent='Navigating · keeping the audience view private';
      message('Protected stream paused · reconnecting automatically…');
    }else if(messageEvent.type==='SOURCE_CLOSED'){
      stop('Original tab closed. Open ShareGuard from another website.');
    }
  });
  window.addEventListener('beforeunload',()=>stop());
  hold('ShareGuard · preview ready');
  if(!Number.isSafeInteger(sourceId)||sourceId<1){message('Open ShareGuard using the toolbar icon on your source tab.');showError('This Studio was opened without a source tab. Close it, open the webpage you want to protect and click the ShareGuard toolbar icon.');}
})();
