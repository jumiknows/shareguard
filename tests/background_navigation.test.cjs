const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../extension/background.js'), 'utf8');
let receive, onUpdated, onRemoved, scans = 0, injected = 0, capture = 0;
let tab = {id:7, status:'complete', url:'https://example.org/old'};
let scannerLive = false;
const broadcasts = [];
const chrome = {
  action: {onClicked:{addListener(){}}},
  runtime: {
    getURL: x=>`chrome-extension://testid/${x}`,
    onMessage:{addListener(fn){receive=fn;}},
    sendMessage:async m=>{broadcasts.push(m);},
  },
  windows: {create:async ()=>{}},
  tabs: {
    get:async id=> {assert.equal(id,7); return {...tab};},
    sendMessage:async (id,msg)=>{
      assert.equal(id,7); assert.equal(msg.type,'SCAN_NOW'); scans++;
      if (!scannerLive) throw new Error('Could not establish connection. Receiving end does not exist.');
      return {complete:true,areas:[{x:20,y:25,w:5,h:8}],viewport:{width:800,height:600}};
    },
    onUpdated:{addListener(fn){onUpdated=fn;}},
    onRemoved:{addListener(fn){onRemoved=fn;}},
  },
  scripting: {executeScript:async opts=>{
    assert.equal(opts.target.tabId,7);
    injected++;scannerLive=true;
  }},
  tabCapture:{getMediaStreamId:async ()=>{capture++;return 'same-capture-stream';}},
};
vm.runInNewContext(source,{chrome,console,Error,Number,String,RegExp,Map});
function invoke(type) {
  return new Promise(resolve=>{
    const alive = receive({type,sourceId:7,categories:{passwords:true,tokens:true,cards:true}},
      {tab:{id:8},url:'chrome-extension://testid/studio.html?source=7'},resolve);
    assert.equal(alive,true);
  });
}
(async()=>{
  const first=await invoke('START_CAPTURE');
  assert.equal(first.ok,true,JSON.stringify(first));
  assert.equal(first.streamId,'same-capture-stream');
  assert.equal(injected,1);
  assert.equal(capture,1);

  tab={...tab,url:'https://another.example/new',status:'loading'};
  scannerLive=false;
  onUpdated(7,{status:'loading',url:tab.url});
  const during=await invoke('SCAN');
  assert.equal(during.navigating,true);
  assert.equal(during.ok,true);
  assert.equal(injected,1,'do not inject into a loading/vanishing document');
  assert(broadcasts.some(m=>m.type==='SOURCE_NAVIGATING'&&m.sourceId===7&&m.studioId===8));

  tab.status='complete';onUpdated(7,{status:'complete'});
  const next=await invoke('SCAN');
  assert.equal(next.ok,true,JSON.stringify(next));
  assert.equal(next.data.complete,true);
  assert.equal(injected,2,'scanner re-injected after full navigation');
  assert.equal(capture,1,'no new capture request; original source tab ID retained');

  tab.url='https://another.example/next-route';
  onUpdated(7,{url:tab.url});
  const spa=await invoke('SCAN');
  assert.equal(spa.data.complete,true);
  assert.equal(injected,2,'same-document routing should not re-inject');

  tab.url='chrome://settings';
  const restricted=await invoke('SCAN');
  assert.equal(restricted.unavailable,true);
  tab.url='https://example.net/back';tab.status='loading';
  scannerLive=false;
  assert.equal((await invoke('SCAN')).navigating,true);
  tab.status='complete';
  assert.equal((await invoke('SCAN')).data.complete,true);
  assert.equal(injected,3);

  onRemoved(7);
  assert(broadcasts.some(m=>m.type==='SOURCE_CLOSED'));
  console.log('PASS: navigation pauses checks, installs the scanner into each new document, resumes on another origin, handles SPA/internal pages, and keeps capture bound to the original tab.');
})().catch(e=>{console.error(e);process.exitCode=1;});
