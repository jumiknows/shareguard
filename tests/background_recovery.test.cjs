const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../extension/background.js'), 'utf8');
let clicked, receive, injected = 0, scans = 0, capture = 0;
const tabs = {
  get: async id => ({id, status:'complete', url:'https://example.org/demo'}),
  onUpdated:{addListener(){}}, onRemoved:{addListener(){}},
  sendMessage: async (_id, msg) => {
    assert.equal(msg.type, 'SCAN_NOW');
    scans++;
    if (scans === 1) throw new Error('Could not establish connection. Receiving end does not exist.');
    return {complete:true,viewport:{width:800,height:600},areas:[]};
  },
};
const chrome = {
  action:{onClicked:{addListener(fn){clicked=fn;}}},
  runtime:{getURL:x=>`chrome-extension://testid/${x}`,onMessage:{addListener(fn){receive=fn;}},sendMessage:async()=>{}},
  windows:{create:async x=>x},
  tabs,
  scripting:{executeScript:async ({target,files})=>{
    injected++;
    assert.equal(target.tabId, 7);
    assert.deepEqual(Array.from(files),['detector.js','scanner.js']);
  }},
  tabCapture:{getMediaStreamId:async ()=>{capture++;return 'test-stream';}}
};
vm.runInNewContext(source,{chrome,console,Error,Number,String,RegExp});
function invoke(type) {
  return new Promise(resolve=>{
    const keepAlive = receive({type,sourceId:7,categories:{passwords:true,tokens:true,cards:true}},
      {tab:{id:8},url:'chrome-extension://testid/studio.html?source=7'},resolve);
    assert.equal(keepAlive,true,'MV3 response channel must remain open');
  });
}
(async()=>{
  const r=await invoke('START_CAPTURE');
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.streamId,'test-stream');
  assert.equal(injected,1,'must install scanner when old tab has no receiver');
  assert.equal(scans,2,'must retry once after injection');
  assert.equal(capture,1);
  const next=await invoke('SCAN');
  assert.equal(next.ok,true);
  assert.equal(injected,1,'must not inject repeatedly when scanner responds');
  console.log('PASS: no-receiver error triggers scanner installation, retry, and a valid stream; later scans reuse scanner.');
})().catch(err=>{console.error(err);process.exitCode=1;});
