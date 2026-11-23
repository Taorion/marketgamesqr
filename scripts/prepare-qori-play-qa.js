// Reuse the audited baseline initializer, changing only its fixed local test DB.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const sourcePath=path.join(__dirname,'prepare-qori-invoice-qa.js');
const source=fs.readFileSync(sourcePath,'utf8').replaceAll('qori_invoice_qa','qori_play_qa');
const local=new Module(sourcePath,module);local.filename=sourcePath;local.paths=Module._nodeModulePaths(__dirname);local._compile(source,sourcePath);
