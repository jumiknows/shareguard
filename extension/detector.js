/* Shared, deterministic, purpose-limited detector. Only secrets, payment cards,
   and password values are enabled by default. Never collect or log matches. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShareGuardDetector = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  'use strict';
  const DEFAULTS = Object.freeze({passwords:true,tokens:true,cards:true});
  const TOKEN = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{16,}|xox[baprs]-[A-Za-z0-9-]{15,}|glpat-[A-Za-z0-9_-]{16,})\b/g;
  const LABELED_SECRET = /\b(?:password|passcode|passwd|pwd|api[ _-]?key|access[ _-]?token|auth(?:orization)?[ _-]?token|client[ _-]?secret|secret[ _-]?key|bearer|private[ _-]?key)\b\s*[:=#-]\s*(?:["'`])?([^\s"'`,;<>]{4,})/gi;
  const BEARER = /\bBearer\s+([A-Za-z0-9._~+/-]{10,}={0,2})/gi;
  const CARD = /\b(?:\d[ -]?){12,18}\d\b/g;
  function luhn(value) {
    const digits = String(value).replace(/\D/g,'');
    if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) return false;
    let sum=0;
    for (let i=digits.length-1, j=0;i>=0;i--,j++) {
      let n=Number(digits[i]); if (j%2) n=n*2>9?n*2-9:n*2; sum+=n;
    }
    return sum%10===0;
  }
  function spans(text, config=DEFAULTS) {
    const str=String(text||''); const hits=[];
    const add=(start,end,kind)=>{if(start>=0&&end>start) hits.push({start,end,kind});};
    if(config.tokens) {
      TOKEN.lastIndex=0;
      for (const m of str.matchAll(TOKEN)) add(m.index,m.index+m[0].length,'tokens');
      BEARER.lastIndex=0;
      for (const m of str.matchAll(BEARER)) { const value=m[1]; add(m.index+m[0].lastIndexOf(value),m.index+m[0].length,'tokens'); }
    }
    if(config.passwords||config.tokens) {
      LABELED_SECRET.lastIndex=0;
      for (const m of str.matchAll(LABELED_SECRET)) {
        const label=m[0].slice(0,m[0].indexOf(m[1])).toLowerCase();
        const kind=/password|passcode|passwd|\bpwd\b/.test(label)?'passwords':'tokens';
        if (!config[kind]) continue;
        const value=m[1];
        add(m.index+m[0].lastIndexOf(value),m.index+m[0].length,kind);
      }
    }
    if(config.cards) {
      CARD.lastIndex=0;
      for (const m of str.matchAll(CARD)) if(luhn(m[0])) add(m.index,m.index+m[0].length,'cards');
    }
    hits.sort((a,b)=>a.start-b.start||b.end-a.end);
    const unique=[];
    for(const hit of hits){const last=unique.at(-1); if(last&&hit.start>=last.start&&hit.end<=last.end)continue; unique.push(hit);}
    return unique;
  }
  function box(b) {
    if(!b)return null;
    const x=b.x0??b.left??b.x, y=b.y0??b.top??b.y;
    const r=b.x1??b.right??(Number(x)+Number(b.w));
    const d=b.y1??b.bottom??(Number(y)+Number(b.h));
    if(![x,y,r,d].every(Number.isFinite)||r<=x||d<=y)return null;
    return {x,y,w:r-x,h:d-y};
  }
  function linesFromBlocks(blocks) {
    const lines=[];
    for(const block of blocks||[])for(const para of block.paragraphs||[])for(const line of para.lines||[]) {
      const words=(line.words||[]).filter(w=>w.text?.trim()&&box(w.bbox));
      if(words.length)lines.push({words,box:box(line.bbox)});
    }
    return lines;
  }
  function boxesFromLines(lines, config=DEFAULTS, strict=false) {
    const rectangles=[];
    for(const line of lines||[]) {
      const words=line.words||[];
      const text=words.map(w=>w.text).join(' ');
      let offset=0;
      const segments=words.map(w=>{const a={start:offset,end:offset+w.text.length,rect:box(w.bbox)};offset+=w.text.length+1;return a;});
      const hits=strict?[{start:0,end:text.length}]:spans(text,config);
      for(const hit of hits)for(const seg of segments)if(seg.rect&&seg.start<hit.end&&seg.end>hit.start)rectangles.push(seg.rect);
    }
    return rectangles;
  }
  return {DEFAULTS,luhn,spans,box,linesFromBlocks,boxesFromLines};
});
