import {sources,sample} from './gallery-field.js';
let data;
self.onmessage=async({data:request})=>{
  try {
    data ||= await fetch('/models/cortex/field-gallery.json').then(r=>{if(!r.ok)throw Error('Field model could not be loaded');return r.json();});
    const {cards,plane,height,id}=request,n=65,extent=150;
    const maps=cards.map(card=>{
      const model=data.shapes[card.shape],source=sources(model),values=[];
      for(let row=0;row<n;row++) for(let col=0;col<n;col++) {
        const x=-extent+(col+.5)*2*extent/n;
        const y=plane==='top'?extent-(row+.5)*2*extent/n:0;
        const z=plane==='top'?height:2*extent-(row+.5)*2*extent/n;
        values.push(sample(source,x,y,z,card.diameter/2,1));
      }
      return {...card,model,values,n,extent};
    });
    self.postMessage({id,maps});
  }catch(error){self.postMessage({id:request.id,error:error.message});}
};
