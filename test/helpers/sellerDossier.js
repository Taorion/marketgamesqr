const {kinds}=require('../../backend/src/services/sellerDocumentPolicy');
const photo=()=>require('sharp')({create:{width:32,height:32,channels:3,background:'#aaa'}}).png().toBuffer();
async function file(kind,pdf){return {filename:kind+(kind==='PHOTO'?'.png':'.pdf'),content_base64:(kind==='PHOTO'?await photo():pdf).toString('base64'),...(kind==='PHOTO'?{photo_consent:true}:{})};}
async function adminFile(kind,pdf){const d=await file(kind,pdf);delete d.photo_consent;return {...d,expected_sha256:null};}
module.exports={kinds,photo,file,adminFile};
