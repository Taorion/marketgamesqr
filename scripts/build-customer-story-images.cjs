/* Usage: node scripts/build-customer-story-images.cjs <directory containing supplied PNGs>.
   Only resized, compressed copies are written; supplied originals are never changed. */
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),source=path.resolve(process.argv[2]||path.join(root,'img')),dir=path.join(root,'qori-web/qori-customer'),out=path.join(dir,'assets'),files=JSON.parse(fs.readFileSync(path.join(dir,'image-sources.json'),'utf8'));
(async()=>{fs.mkdirSync(out,{recursive:true});const images={};let originals=0,optimized=0;
 for(const [slug,name]of files){const input=path.join(source,name),meta=await sharp(input).metadata(),variants=[];originals+=fs.statSync(input).size;
  for(const width of [640,Math.min(1280,meta.width)]){const filename=slug+'-'+width+'.webp',info=await sharp(input).rotate().resize({width,withoutEnlargement:true}).webp({quality:86,effort:5}).toFile(path.join(out,filename));optimized+=info.size;variants.push({file:filename,width:info.width,height:info.height,bytes:info.size});}
  images[slug]={source:name,width:meta.width,height:meta.height,variants};
 }
 const social=await sharp(path.join(source,files[0][1])).resize({width:1200}).jpeg({quality:86,mozjpeg:true}).toFile(path.join(out,'qori-customer-social.jpg'));optimized+=social.size;
 fs.writeFileSync(path.join(dir,'images.json'),JSON.stringify(images,null,2)+'\n');
 console.log(JSON.stringify({images:files.length,original_bytes:originals,web_bytes:optimized,reduction_percent:Math.round((1-optimized/originals)*100)}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
