/* Page geometry only: the source website is never modified.
   Detection stays local to the browser extension. */
(() => {
  'use strict';
  if (window.__shareGuardScannerV5) return;
  window.__shareGuardScannerV5=true;
  const D=globalThis.ShareGuardDetector;
  const DEFAULTS={passwords:true,tokens:true,cards:true};
  const FIELD_NAMES={
    passwords:/\b(?:password|passcode|passwd|pwd|current-password|new-password)\b/i,
    tokens:/\b(?:api[_ -]?key|access[_ -]?token|auth[_ -]?token|client[_ -]?secret|secret[_ -]?key|bearer)\b/i,
    cards:/\b(?:cc-number|card[_ -]?number|credit[_ -]?card|debit[_ -]?card|cvv|cvc|security[_ -]?code|cc-csc)\b/i
  };
  function visible(el) {
    const b=el.getBoundingClientRect();
    if(b.width<1||b.height<1||b.right<=0||b.bottom<=0||b.left>=innerWidth||b.top>=innerHeight)return false;
    const style=getComputedStyle(el);
    return style.display!=='none'&&style.visibility==='visible'&&Number(style.opacity)>0.01;
  }
  function scan({categories=DEFAULTS}={}) {
    const started=performance.now(),areas=[],dedup=new Set();
    let elements=0,seen=0,id=0;
    const settings=categories||DEFAULTS;
    const opts={passwords:settings.passwords!==false,tokens:settings.tokens!==false,cards:settings.cards!==false};
    function add(rect,kind) {
      if(!rect)return;
      const x=Math.max(0,rect.left),y=Math.max(0,rect.top);
      const right=Math.min(innerWidth,rect.right),bottom=Math.min(innerHeight,rect.bottom);
      if(right<=x||bottom<=y)return;
      const r={x,y,w:right-x,h:bottom-y,kind};
      const key=[x,y,right,bottom].map(v=>Math.round(v)).join(':');
      if(!dedup.has(key)){dedup.add(key);areas.push(r);}
    }
    const roots=[document];
    while(roots.length) {
      const root=roots.pop();
      const els=root.querySelectorAll('*');elements+=els.length;
      if(elements>18000||performance.now()-started>500)return {complete:false,reason:'Page scan limit reached'};
      for(const el of els) {
        if(!visible(el))continue;
        if(el.shadowRoot)roots.push(el.shadowRoot);
        if(!el.matches('input,textarea,select,[contenteditable="true"],[role="textbox"]'))continue;
        const type=(el.getAttribute('type')||'').toLowerCase();
        const descriptor=[type,el.getAttribute('name'),el.id,el.getAttribute('autocomplete'),el.getAttribute('aria-label'),el.getAttribute('placeholder')].filter(Boolean).join(' ');
        let kind=null;
        for(const entry of Object.entries(FIELD_NAMES))if(opts[entry[0]]&&entry[1].test(descriptor)){kind=entry[0];break;}
        if(!kind&&(type==='password')&&opts.passwords)kind='passwords';
        if(!kind&&'value' in el&&typeof el.value==='string'&&D.spans(el.value,opts).length)kind='recognized secret in input';
        if(kind)add(el.getBoundingClientRect(),kind);
      }
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let node;
      while((node=walker.nextNode())) {
        if(++seen>16000||performance.now()-started>500)return {complete:false,reason:'Text scan limit reached'};
        const value=node.nodeValue||'',el=node.parentElement;
        if(!value.trim()||!el||!visible(el)||el.closest('script,style,noscript,template,textarea,input,[contenteditable],svg'))continue;
        if(value.length>8000)return {complete:false,reason:'Oversized visible text block'};
        for(const hit of D.spans(value,opts)) {
          const range=document.createRange();range.setStart(node,hit.start);range.setEnd(node,hit.end);
          for(const rect of range.getClientRects())add(rect,hit.kind);
          if(areas.length>6000)return {complete:false,reason:'Mask limit reached'};
        }
      }
    }
    return {complete:true,areas,viewport:{width:innerWidth,height:innerHeight}};
  }
  chrome.runtime.onMessage.addListener((m,_sender,reply)=>{
    if(m?.type!=='SCAN_NOW')return;
    try{reply(scan({categories:m.categories,allText:m.allText===true,includeCandidates:m.includeCandidates===true}));}
    catch(error){console.error('ShareGuard DOM scan:',error);reply({complete:false,reason:'Page scan failed: '+String(error?.message||error)});}
  });
})();
