/** Browser/runtime comparison is descriptive; it cannot qualify the field. */
import fs from 'node:fs';import crypto from 'node:crypto';
const [browserPath,nodePath,outputPath]=process.argv.slice(2);
if(!outputPath)throw new Error('Usage: compare-browser-export.mjs browser.json node.json report.json');
const read=p=>JSON.parse(fs.readFileSync(p)),a=read(browserPath),b=read(nodePath),nonNumericDifferences=[];let numericDifferences=0,maximumVoltageDifferenceMv=0;
function walk(x,y,path=''){
 if(/\.(elapsedSeconds|solveSeconds|meshBuildSeconds|constructionSeconds|assemblySeconds)$/.test(path))return;
 if(typeof x!==typeof y){nonNumericDifferences.push(path);return;}
 if(x&&typeof x==='object')for(const k of new Set([...Object.keys(x),...Object.keys(y??{})]))walk(x[k],y?.[k],path+'.'+k);
 else if(x!==y){if(typeof x==='number'&&Number.isFinite(x)&&Number.isFinite(y)){numericDifferences++;if(path.includes('.voltageMv.'))maximumVoltageDifferenceMv=Math.max(maximumVoltageDifferenceMv,Math.abs(x-y));}else nonNumericDifferences.push(path);}
}
walk(a,b);
const rowHash=r=>JSON.stringify(r.points.map(p=>p.matrices));
const report={schema:'axon-stage2-browser-export-comparison/1',browserVersion:a.modelVersion,nodeVersion:b.modelVersion,browserElapsedSeconds:a.elapsedSeconds,nodeElapsedSeconds:b.elapsedSeconds,settingsEqual:JSON.stringify(a.settings)===JSON.stringify(b.settings),allMatricesExactlyEqual:rowHash(a)===rowHash(b),bothRetainConditionalMagneticMeaning:a.settings.modality==='magnetic'?[a,b].every(r=>r.points.every(p=>/Conditional/.test(p.metrics.headlineMeaning)&&p.recordings.every(q=>q.totalUv===null))):null,nonNumericDifferences,numericDifferences,exactExportMatchExcludingTiming:numericDifferences===0&&nonNumericDifferences.length===0,maximumVoltageDifferenceMv,fieldResiduals:{browser:a.fieldReports.map(x=>x.diagnostics?.relativeResidual??null),node:b.fieldReports.map(x=>x.diagnostics?.relativeResidual??null)},sha256:{browser:crypto.createHash('sha256').update(fs.readFileSync(browserPath)).digest('hex'),node:crypto.createHash('sha256').update(fs.readFileSync(nodePath)).digest('hex')},meaning:'Bitwise export equivalence is reported separately from discrete-output agreement. Voltage differences are measured, not assigned a new post-hoc acceptance tolerance. This does not replace physical field, membrane or spatial qualification.'};
fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
