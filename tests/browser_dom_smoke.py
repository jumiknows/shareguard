"""Checks content-script behavior in real Chromium DOM; doesn't simulate tabCapture."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]/'extension'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'], **({'executable_path': os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))
    page=browser.new_page(viewport={'width':1100,'height':1200})
    page.set_content((ROOT/'demo.html').read_text(encoding='utf-8'))
    page.evaluate("window.chrome={runtime:{onMessage:{addListener(fn){window.__scan=fn}}}}")
    page.add_script_tag(path=str(ROOT/'detector.js'))
    page.add_script_tag(path=str(ROOT/'scanner.js'))
    def scan(categories=None):
        return page.evaluate("(cats)=>new Promise(resolve=>window.__scan({type:'SCAN_NOW',categories:cats},null,resolve))",categories)
    result=scan()
    assert result['complete'] is True, result
    assert result['viewport']=={'width':1100,'height':1200}
    assert result['areas'], 'no rectangles returned'
    assert any(r['kind']=='passwords' for r in result['areas']), result['areas']
    assert any(r['kind']=='tokens' for r in result['areas']), result['areas']
    assert any(r['kind']=='cards' for r in result['areas']), result['areas']
    before=page.locator('#pw').input_value()
    assert before=='not-a-real-password-123', before
    page.locator('#pw').fill('new-fake-password-value')
    after=scan()
    assert after['complete'] is True and any(r['kind']=='passwords' for r in after['areas'])
    off=scan({'passwords':False,'cards':False,'tokens':False})
    assert not off['areas'],off['areas']
    mask_area=sum(r['w']*r['h'] for r in result['areas'])
    assert mask_area < 0.18*1100*1200,mask_area
    print(f'PASS: Chromium DOM scanner finds {len(result["areas"])} precise regions; masking disabled returns 0; original page unchanged.')
    browser.close()
