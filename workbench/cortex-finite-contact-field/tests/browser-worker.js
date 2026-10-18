import {runBrowserSuite} from './browser-suite.js';
self.onmessage=async event=>{try{self.postMessage({result:await runBrowserSuite(event.data.baseURL)});}catch(error){self.postMessage({error:String(error.stack??error)});}};
