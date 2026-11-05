import {importDxf,exportDxf,validateDocument} from './io.js';
self.onmessage=e=>{try{const {id,action,payload}=e.data;const value=action==='import'?importDxf(payload.text,payload.options):action==='export'?exportDxf(validateDocument(payload.doc),payload.options):null;self.postMessage({id,value});}catch(error){self.postMessage({id:e.data.id,error:error.message});}};
