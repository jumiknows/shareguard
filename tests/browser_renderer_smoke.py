"""Exercises the real Studio JS with synthetic tab video; external browser capture remains untested."""
from pathlib import Path
import os
import re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]/'extension'
html=(ROOT/'studio.html').read_text()
html=re.sub(r'<script\b[^>]*></script>', '', html)
html=html.replace('<link rel="stylesheet" href="studio.css">','')
js=(ROOT/'studio.js').read_text().replace("const sourceId = Number(new URL(location.href).searchParams.get('source'));","const sourceId = 1;")
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'], **({'executable_path': os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))
    page=browser.new_page(viewport={'width':1380,'height':900})
    page.set_content(html)
    page.add_style_tag(path=str(ROOT/'studio.css'))
    page.evaluate("""() => {
      const src=document.createElement('canvas');src.width=640;src.height=360;
      const sctx=src.getContext('2d');sctx.fillStyle='#fff';sctx.fillRect(0,0,640,360);
      sctx.fillStyle='#000';sctx.font='24px sans-serif';sctx.fillText('FAKE SECRET',10,45);
      window.__rawVideo=src.captureStream(15);
      Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>window.__rawVideo}});
      window.chrome={runtime:{sendMessage:async message=>message.type==='START_CAPTURE'
        ? {ok:true,streamId:'synthetic'}
        : {ok:true,data:{complete:true,viewport:{width:640,height:360},areas:[{x:0,y:12,w:190,h:40,kind:'passwords'}]}}}};
    }""")
    page.add_script_tag(content=js)
    page.locator('#start').click()
    try:
        page.get_by_text('Protected preview active',exact=False).wait_for(timeout=10000)
    except Exception as e:
        print('STATUS',page.locator('#status').inner_text());raise
    colors=page.evaluate("""() => {
      const c=document.getElementById('protected').getContext('2d');
      return {masked:Array.from(c.getImageData(50,30,1,1).data),visible:Array.from(c.getImageData(400,100,1,1).data)};
    }""")
    assert colors['masked'][0]<45,colors
    assert colors['visible'][:3]==[255,255,255],colors
    page.locator('#add').click()
    rect=page.locator('#editor').bounding_box()
    page.mouse.move(rect['x']+rect['width']*.5,rect['y']+rect['height']*.5)
    page.mouse.down();page.mouse.move(rect['x']+rect['width']*.7,rect['y']+rect['height']*.7);page.mouse.up()
    page.locator('#manualCount').get_by_text('1').wait_for(timeout=3000)
    page.locator('#undo').click()
    page.locator('#manualCount').get_by_text('0').wait_for(timeout=3000)
    page.locator('#stop').click()
    assert 'stopped' in page.locator('#status').inner_text().lower()
    print('PASS: Studio starts, masks synthetic captured video, preserves public pixels, adds/undoes a manual blackout, and stops.')
    browser.close()
