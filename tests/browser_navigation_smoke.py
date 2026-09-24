"""Chromium Studio rendering regression: source navigation is a temporary privacy hold, not a stopped session."""
from pathlib import Path
import os
import re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]/'extension'
html=re.sub(r'<script\b[^>]*></script>', '', (ROOT/'studio.html').read_text())
html=html.replace('<link rel="stylesheet" href="studio.css">','')
js=(ROOT/'studio.js').read_text().replace(
    "const sourceId = Number(new URL(location.href).searchParams.get('source'));",
    "const sourceId = 7;")
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'], **({'executable_path': os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))
    page=browser.new_page(viewport={'width':1380,'height':900})
    page.set_content(html)
    page.add_style_tag(path=str(ROOT/'studio.css'))
    page.evaluate("""() => {
      const source=document.createElement('canvas');source.width=640;source.height=360;
      const sctx=source.getContext('2d');sctx.fillStyle='#fff';sctx.fillRect(0,0,640,360);
      window.rawVideo=source.captureStream(15);
      window.phase='old';window.events=[];
      Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>window.rawVideo}});
      window.chrome={runtime:{
        sendMessage:async message=>{
          if(message.type==='START_CAPTURE')return {ok:true,streamId:'synthetic'};
          if(message.type==='STOP_CAPTURE')return {ok:true};
          if(message.type==='SCAN'){
            if(window.phase==='loading')return {ok:true,navigating:true};
            if(window.phase==='unsupported')return {ok:true,unavailable:true,reason:'Internal browser page'};
            return {ok:true,data:{complete:true,viewport:{width:640,height:360},
              areas:[window.phase==='new'?{x:220,y:20,w:100,h:40}:{x:10,y:20,w:90,h:40}]}};
          }
        },
        onMessage:{addListener: fn=>window.events.push(fn)}
      }};
      window.sample=(x,y)=>Array.from(document.getElementById('protected').getContext('2d').getImageData(x,y,1,1).data);
    }""")
    page.add_script_tag(content=js)
    page.locator('#start').click()
    page.get_by_text('Protected preview active',exact=False).wait_for(timeout=10000)
    assert page.evaluate('sample(30,30)')[0]<45
    assert page.evaluate('sample(280,30)')[:3]==[255,255,255]
    page.evaluate("window.phase='loading'; window.events.forEach(fn=>fn({type:'SOURCE_NAVIGATING',sourceId:7,studioId:99}));")
    page.get_by_text('reconnecting automatically',exact=False).wait_for(timeout=3000)
    assert page.evaluate('sample(280,30)')[0]<45,'navigation must output a black placeholder, not a raw frame'
    assert page.locator('#start').is_disabled(),'navigation must not stop/recreate capture'
    page.evaluate("window.phase='unsupported';")
    page.get_by_text('Internal browser page',exact=False).wait_for(timeout=3000)
    assert page.evaluate('sample(280,30)')[0]<45
    page.evaluate("window.phase='new';")
    page.get_by_text('Protected preview active',exact=False).wait_for(timeout=6000)
    assert page.evaluate('sample(280,30)')[0]<45,'new document must use new coordinates'
    assert page.evaluate('sample(30,30)')[:3]==[255,255,255],'old irrelevant blackout must disappear'
    assert page.locator('#start').is_disabled(),'capture continues after navigation'
    page.locator('#stop').click()
    assert not page.locator('#start').is_disabled()
    print('PASS: Chromium Studio blanks the audience output on navigation, holds through an unsupported page, and resumes masked frames using new coordinates without stopping capture.')
    browser.close()
