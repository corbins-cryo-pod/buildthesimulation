(function(root,factory){const x=factory();if(typeof module==='object'&&module.exports)module.exports=x;else Object.assign(root.NE4||(root.NE4={}),x);})(typeof self!=='undefined'?self:this,function(){
'use strict';
const MODEL_REVISION='neurotissue-v4.1-review-2026-11-03';
function evidenceRow(raw, previous){
 const row=Object.assign({},raw); if(!raw.conduit)return row;
 row.conduit=Object.assign({},raw.conduit);
 const p=previous&&previous.history||{}, c=raw.conduit;
 row.history={bridgeEverFormed:!!(p.bridgeEverFormed||c.bridged),
  firstBridgeMinute:p.firstBridgeMinute!=null?p.firstBridgeMinute:c.bridged?raw.t:null,
  maxSchwannFrontProx:Math.max(p.maxSchwannFrontProx||0,c.schwannFrontProx||0),
  maxSchwannFrontDist:Math.max(p.maxSchwannFrontDist||0,c.schwannFrontDist||0)};
 return row;
}
function evidenceRows(rows){const out=[];for(const row of rows)out.push(evidenceRow(row,out[out.length-1]));return out;}
function nerveBenchmark(rows,H){
 const gap=H.conduit.gap/1000,last=rows[rows.length-1],end=last?last.t/1440:0;
 const first=rows.find(r=>r.conduit&&r.conduit.crossed>0),done=end>=H.hours/24-0.01;
 const matched=!H.conduit.graft&&(gap===6||gap===10||gap===15);
 const expected=gap===15?false:true;
 return {matched,expectedCrossing:matched?expected:null,observedCrossing:!!(last&&last.conduit&&last.conduit.crossed>0),everCrossed:!!first,
  status:!matched?'unmatched':!done?'pending':!!(last&&last.conduit&&last.conduit.crossed>0)===expected?'direction-consistent':'mismatch',
  firstCrossingDay:first?first.t/1440:null,
  citation:'Lundborg et al. 1982; DOI 10.1016/0014-4886(82)90215-1',
  condition:'Rat sciatic nerve; silicone chamber; proximal AND distal stumps present',
  caveat:'Qualitative endpoint comparison only. No shared uncertainty estimate, matched sample size, or full protocol validation.'};
}
return {MODEL_REVISION,evidenceRow,evidenceRows,nerveBenchmark};
});
