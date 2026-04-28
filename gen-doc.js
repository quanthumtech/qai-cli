import { DocTool } from './packages/qai/src/tool/doc';
import path from 'path';

(async () => {
  const input = path.resolve(process.cwd(), 'README.md');
  const output = path.resolve(process.cwd(), 'system-doc.docx');
  try {
    const result = await DocTool.execute({ input, output, format: undefined }, { cwd: process.cwd(), env: process.env });
    console.log('Result:', result);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
