/** Small, deterministic Designer-format examples. No commercial device replication. */
export const TRANSFER_DEMOS=[['split-bank','Split-bank planar array'],['annular','Annular sites with side-entry leads'],['bent','Orthogonal routed coupon']];
export function designerDemo(id='split-bank'){
  if(!TRANSFER_DEMOS.some(([key])=>key===id))throw Error('Unknown Designer transfer demo.');
  const s={schema:'bts-neural-interface',version:1,units:'µm',name:TRANSFER_DEMOS.find(([key])=>key===id)[1],contacts:[],pads:[],routes:[],routing:{layers:1,material:'Au',dielectric:'Polyimide',substrateStyle:'envelope',substrateMargin:60,substrateRadius:40,substrateThickness:10,sheetResistance:.2}};
  const count=id==='bent'?2:4;
  for(let i=0;i<count;i++){
    const y=id==='split-bank'?(i<2?-80:80):(i-(count-1)/2)*(id==='annular'?120:280);
    const x=id==='split-bank'?(i%2?-120:120):-160;
    const side=id==='split-bank'?(x<0?-1:1):1,px=side*(id==='split-bank'?540:440);
    const key=`contact-${i+1}`,padId=`connector-${i+1}`,shape=id==='annular'?'ring':id==='bent'?'rectangle':'circle';
    s.contacts.push({id:key,x,y,shape,w:id==='annular'?60:48,h:id==='bent'?32:48,inner:id==='annular'?24:0,rotation:id==='bent'?30:0,layer:1});
    s.pads.push({id:padId,contactId:key,channel:i+1,x:px,y,w:64,h:56,layer:1});
    const points=id==='bent'?[[x,y],[0,y],[0,y+60],[280,y+60],[280,y],[px,y]]:[[x+(id==='annular'?25:0),y],[px,y]];
    s.routes.push({contactId:key,padId,channel:i+1,layer:1,status:'routed',width:12,style:id==='bent'?'manhattan':'straight',points:points.map(([x,y])=>({x,y}))});
  }
  return s;
}
