import {importDxf,exportDxf,validateDocument} from './io.js';
import {dxfText} from './dxf-bytes.js';
self.onmessage = ({data}) => {
  try {
    const {action, payload} = data;
    const value = action === 'import'
      ? importDxf(dxfText(payload.bytes), payload.options)
      : exportDxf(validateDocument(payload.doc), payload.options);
    self.postMessage({id:data.id, value});
  } catch (error) {
    self.postMessage({id:data.id, error:error.message});
  }
};
