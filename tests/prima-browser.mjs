import test from 'node:test';
import {verifyRetinaBrowser} from './helpers/retina-browser-harness.mjs';
test('PRIMA migration: canonical redirect, real photovoltaic worker, retained presets, WebGL and experiment restoration',{skip:process.env.PRIMA_REQUIRE_BROWSER==='1'?false:'Graphics CI gate; managed browser used for local QA',timeout:720000},()=>verifyRetinaBrowser('photovoltaic'));
