/* Public-file boundary validation, separate from the preserved numerical engine. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'));else root.CellImport=factory(root.CellEngine);})(typeof globalThis!=='undefined'?globalThis:this,function(engine){
'use strict';
const {Simulation,LIMITS}=engine;
const example=new Simulation(2646);
example.launchWave(1);example.pulse(0,0);
const shape=example.exportState();
function checkShape(value,model,label){
 if(model===null){if(value!==null&&(!Number.isSafeInteger(value)||value<1))throw Error('Invalid '+label);return;}
 if(Array.isArray(model)){
  if(!Array.isArray(value)||value.length>5000)throw Error('Invalid '+label);
  for(const child of value)checkShape(child,model[0],label+'[]');
 }else if(typeof model==='object'){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid '+label);
  for(const key of Object.keys(model))checkShape(value[key],model[key],label+'.'+key);
 }else if(typeof value!==typeof model||(typeof model==='number'&&(!Number.isFinite(value)||Math.abs(value)>1e12)))throw Error('Invalid '+label);
}
function restore(data){
 checkShape(data,shape,'state');
 if(data.schema!==shape.schema||data.version!==shape.version)throw Error('Unsupported experiment version.');
 for(const key of ['seed','rngState'])if(!Number.isInteger(data[key])||data[key]<0||data[key]>4294967295)throw Error('Invalid '+key);
 if(data.dt<.001||data.dt>.08)throw Error('Unsupported numerical timestep.');
 for(const key of ['nextId','nextWaveId','maxHistory'])if(!Number.isSafeInteger(data[key])||data[key]<1)throw Error('Invalid '+key);
 if(data.events.length>500||data.history.length>data.maxHistory||data.pulses.length>32)throw Error('State exceeds retention limits.');
 for(const [key,[min,max]] of Object.entries(LIMITS))if(data.params[key]<min||data.params[key]>max)throw Error('Invalid parameter: '+key);
 for(const n of data.neurites)if(!Number.isSafeInteger(n.id)||n.id<1||n.id>=data.nextId)throw Error('Invalid process identity.');
 if(data.view!==undefined&&(!data.view||typeof data.view!=='object'||Array.isArray(data.view)))throw Error('Invalid view settings.');
 return Simulation.fromState(data);
}
return{restore};
});
