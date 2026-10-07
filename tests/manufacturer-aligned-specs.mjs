import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const orders=['01-','05-','22-','25-','29-','32-','33-'];
const fields=['Electrode Pitch','Channel Count','Output Connectors','Output Conn. dimensions L x W x H','Standard Electrode Lengths','Impedance','Array Dimensions','Multi-Port Options','Metalization','Wire Bundle Length','Reference and Ground','Insulation'];
test('aligned source-specific sheets contain all twelve core fields in manufacturer order',()=>{
 const dir='src/content/designs';for(const order of orders){const file=fs.readdirSync(dir).find(x=>x.startsWith(order));const s=fs.readFileSync(`${dir}/${file}`,'utf8');const core=s.split('## Core interface specifications')[1].split('\n## ')[0];let last=-1;for(const f of fields){const at=core.indexOf(`| ${f} |`);assert.ok(at>last,`${file}: ${f}`);last=at;}assert.equal(core.split('\n').filter(x=>x.startsWith('|')).length,14);assert.ok(core.includes('not a manufacturer-issued datasheet'));}
});
