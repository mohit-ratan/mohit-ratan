const crypto=require('crypto');
const {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand}=require('@aws-sdk/client-s3');
const sharp=require('sharp');
const PREFIX='private-journal:';
function encryptionReady(){return /^[a-fA-F0-9]{64}$/.test(process.env.JOURNAL_ENCRYPTION_KEY||'');}
function storageReady(){return !!process.env.R2_PRIVATE_BUCKET&&process.env.R2_PRIVATE_BUCKET!==process.env.R2_BUCKET&&!!process.env.R2_ACCOUNT_ID&&!!process.env.R2_ACCESS_KEY_ID&&!!process.env.R2_SECRET_ACCESS_KEY;}
function mediaReady(){return encryptionReady()&&storageReady();}
function key(){if(!encryptionReady())throw new Error('Private journal encryption is not configured.');return Buffer.from(process.env.JOURNAL_ENCRYPTION_KEY,'hex');}
function encrypt(data,context){const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(context));const ciphertext=Buffer.concat([cipher.update(data),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),ciphertext]);}
function decrypt(data,context){const decipher=crypto.createDecipheriv('aes-256-gcm',key(),data.subarray(0,12));decipher.setAAD(Buffer.from(context));decipher.setAuthTag(data.subarray(12,28));return Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]);}
let client;
function storage(){if(!storageReady())throw new Error('Private journal photo storage is not configured.');return client||(client=new S3Client({region:'auto',endpoint:`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}}));}
async function savePhoto(file,userId,id){
  if(!file.mimetype?.startsWith('image/')||file.buffer.length>10*1024*1024)throw new Error('Choose an image up to 10 MB.');
  // Decode/re-encode: strip metadata and never serve uploaded SVG/HTML as active content.
  const buffer=await sharp(file.buffer,{limitInputPixels:40000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:85}).toBuffer();
  const objectKey=`journal/${crypto.randomUUID()}.bin`;
  await storage().send(new PutObjectCommand({Bucket:process.env.R2_PRIVATE_BUCKET,Key:objectKey,Body:encrypt(buffer,`${userId}:${id}:photo`),ContentType:'application/octet-stream'}));
  return PREFIX+objectKey;
}
async function readPhoto(ref,userId,id){if(!ref?.startsWith(PREFIX))throw new Error('Invalid journal reference.');const result=await storage().send(new GetObjectCommand({Bucket:process.env.R2_PRIVATE_BUCKET,Key:ref.slice(PREFIX.length)}));return decrypt(Buffer.from(await result.Body.transformToByteArray()),`${userId}:${id}:photo`);}
async function removePhoto(ref){if(!ref?.startsWith(PREFIX))return;await storage().send(new DeleteObjectCommand({Bucket:process.env.R2_PRIVATE_BUCKET,Key:ref.slice(PREFIX.length)}));}
module.exports={encrypt,decrypt,encryptionReady,mediaReady,savePhoto,readPhoto,removePhoto,PREFIX};
