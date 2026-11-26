import {defaults,scan,parseMap} from './solver.mjs';
export function station(){return {settings:{...defaults},doorOpen:false,loaded:true,engaged:true,input:null,result:null,cursor:0,cutaway:true,status:'Ready: inert ridge loaded; scanner engaged.'}}
export function operate(s,action,value){const t={...s,settings:{...s.settings}};switch(action){
case 'door':if(s.engaged)throw Error('Withdraw the scanner before opening the hood.');t.doorOpen=!s.doorOpen;break;
case 'load':if(!s.doorOpen||s.engaged)throw Error('Open the hood with scanner withdrawn to exchange the coupon.');t.loaded=!s.loaded;t.result=null;break;
case 'engage':if(!s.engaged&&(!s.loaded||s.doorOpen))throw Error('Load a coupon and close the hood before engaging.');t.engaged=!s.engaged;break;
case 'settings':t.settings={...s.settings,...value};t.result=null;t.cursor=0;if(value.source&&value.source!=='import')t.input=null;break;
case 'import': {const m=parseMap(value);t.input=m;t.settings={...s.settings,source:'import',sampleId:m.sampleId,parentRevision:m.revision,scanNm:(m.heightsNm.length-1)*m.pitchNm,points:m.heightsNm.length};t.result=null;t.cursor=0;break}
case 'scan':if(!s.loaded||!s.engaged||s.doorOpen)throw Error('Acquisition blocked: load specimen, shut hood and engage scanner.');t.result=scan(s.settings,s.input);t.cursor=t.result.coordinatesNm.length**2-1;break;
case 'cursor':if(!s.result||!Number.isFinite(value))throw Error('Acquire a raster before replay.');t.cursor=Math.max(0,Math.min(s.result.coordinatesNm.length**2-1,Math.round(value)));break;
case 'cutaway':t.cutaway=!s.cutaway;break;
case 'reset':return station();
default:throw Error('Unknown station action.');}t.status=({door:t.doorOpen?'Hood open.':'Hood closed.',load:t.loaded?'Coupon loaded.':'Coupon removed.',engage:t.engaged?'Probe engaged.':'Probe withdrawn.',settings:'Settings changed. Acquire a new raster.',import:'Source raster loaded; acquire to inspect.',scan:'Raster complete.',cursor:'Serpentine replay.',cutaway:'Display changed; physical state unchanged.'})[action];return t;}
export function cursorXY(s){if(!s.result)return {x:0,y:0};let n=s.result.coordinatesNm.length,y=Math.floor(s.cursor/n),j=s.cursor%n;return {x:y%2?n-1-j:j,y}}
