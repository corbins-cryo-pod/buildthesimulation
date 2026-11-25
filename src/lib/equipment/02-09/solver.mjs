export const defaultSample={"id":"CP-A","surface":"silicon-native-oxide","diameter_mm":100,"coated":false,"revision":0,"history":[],"surfaceState":"untreated"};
export function runBatch({coupons,loadedId,doorClosed,recipe="prime",calibration=null,resistId="virtual-positive-resist"}){
 if(!Array.isArray(coupons)||coupons.length!==2||new Set(coupons.map(c=>c.id)).size!==2)throw Error("Two distinct coupon IDs required.");
 if(!doorClosed)throw Error("Close the chamber door before running.");
 if(!["prime","dehydrate"].includes(recipe))throw Error("Unsupported recipe.");
 const chosen=coupons.find(c=>c.id===loadedId);
 if(!chosen)throw Error("Load a coupon before running.");
 if(chosen.coated)throw Error("Previously resist-coated specimens are incompatible.");
 if(!["silicon-native-oxide","thermal-oxide","silicon-nitride","glass"].includes(chosen.surface))throw Error("Surface compatibility not established.");
 if(![100,150].includes(chosen.diameter_mm))throw Error("Virtual carrier supports 100 or 150 mm circular witnesses only.");
 if(!Number.isInteger(chosen.revision)||chosen.revision<0||!Array.isArray(chosen.history))throw Error("Invalid sample history.");
 if(chosen.surfaceState!=="untreated")throw Error("Use a fresh untreated coupon; re-priming is not modeled.");
 const ok=recipe==="prime"&&calibration&&calibration.surface===chosen.surface&&calibration.resistId===resistId&&calibration.recipe==="EPFL-310TA-01"&&calibration.units==="N/mm"&&typeof calibration.id==="string"&&calibration.id.trim()&&Number.isFinite(calibration.before)&&calibration.before>=0&&Number.isFinite(calibration.after)&&calibration.after>=0;
 const adhesion=ok?{status:"calibrated-input",metric:"user-supplied peel force per width",before:calibration.before,after:calibration.after,delta:calibration.after-calibration.before,units:"N/mm",calibrationId:calibration.id,provenance:"User-supplied matched calibration; not a new measurement or independently validated prediction."}:{status:"unknown",reason:"No matching adhesion calibration for this surface/resist/recipe."};
 const event={eventId:chosen.id+"-rev-"+(chosen.revision+1),type:recipe==="prime"?"HMDS-vapor-prime":"dehydration-only",recipe:recipe==="prime"?"EPFL-310TA-01":"dehydration-only-abstract",temperature_C:150,exposure_s:recipe==="prime"?300:0,total_s:recipe==="prime"?900:null,provenance:"Simulated event. Prime cycle nominal values from EPFL CMi; dehydration-only duration not established."};
 const updated={...chosen,revision:chosen.revision+1,parentRevision:chosen.revision,surfaceState:recipe==="prime"?"primed":"dehydrated",history:[...chosen.history,event],adhesion};
 return {schema:"bts.surface-preparation.v1",instrument:"02-09",configuration:"YES 310TA / EPFL CMi HMDS",provenance:"Simulated, not measured",loadedId,resistId,coupons:coupons.map(c=>c.id===loadedId?updated:JSON.parse(JSON.stringify(c))),event};
}
export function verification(){
 const a={id:"CP-A",surface:"silicon-native-oxide",diameter_mm:100,coated:false,revision:0,history:[],surfaceState:"untreated"},b={...a,id:"CP-B",history:[]};
 const input={coupons:[a,b],loadedId:a.id,doorClosed:true,recipe:"prime",resistId:"R1"};
 const o=runBatch(input),cal={id:"synthetic-test-only",surface:a.surface,resistId:"R1",recipe:"EPFL-310TA-01",units:"N/mm",before:.25,after:.75};
 const rows=[];const check=(name,expected,actual,units="",tol=0)=>rows.push({name,expected,actual,units,tolerance:tol,pass:typeof expected==="number"?Math.abs(expected-actual)<=tol:expected===actual});
 check("Selected coupon primer events",1,o.coupons[0].history.length,"events");check("Untreated witness primer events",0,o.coupons[1].history.length,"events");check("Uncalibrated adhesion","unknown",o.coupons[0].adhesion.status);check("Unselected witness unchanged",true,JSON.stringify(b)===JSON.stringify(o.coupons[1]));check("Synthetic matched peel delta (0.75 − 0.25)",.5,runBatch({...input,calibration:cal}).coupons[0].adhesion.delta,"N/mm",1e-12);check("Wrong-resist calibration","unknown",runBatch({...input,calibration:{...cal,resistId:"other"}}).coupons[0].adhesion.status);check("Wrong-material calibration","unknown",runBatch({...input,calibration:{...cal,surface:"glass"}}).coupons[0].adhesion.status);check("Dehydration only event","dehydration-only",runBatch({...input,recipe:"dehydrate"}).event.type);check("Dehydration only HMDS exposure",0,runBatch({...input,recipe:"dehydrate"}).event.exposure_s,"s");check("Prime exposure",300,o.event.exposure_s,"s");check("Select alternate coupon",1,runBatch({...input,loadedId:b.id}).coupons[1].history.length,"events");
 for(const [name,patch] of [["Open door",{doorClosed:false}],["Missing sample",{loadedId:""}],["Coated coupon",{coupons:[{...a,coated:true},b]}],["Unsupported carrier",{coupons:[{...a,diameter_mm:200},b]}]]){let result="not rejected";try{runBatch({...input,...patch})}catch{result="rejected"}check(name,"rejected",result)}
 return rows;
}
