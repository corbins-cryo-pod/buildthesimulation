import test from 'node:test';
import {verifyRetinaBrowser} from './helpers/retina-browser-harness.mjs';
test('unified retina: real electrical worker, retained presets, WebGL, comparison, files and responsive interaction',{skip:process.env.RETINAL_REQUIRE_BROWSER==='1'?false:'Graphics CI gate; managed browser used for local QA',timeout:720000},()=>verifyRetinaBrowser('electrical'));
