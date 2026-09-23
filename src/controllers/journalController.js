const crypto=require('crypto');
const pool=require('../db');
const {ensureMemberTables}=require('../lib/memberFeatures');
const {transaction}=require('../lib/authSecurity');
const storage=require('../lib/journalStorage');
async function list(req,res){
  try{await ensureMemberTables();if(!storage.encryptionReady())return res.json({entries:[],enabled:false,photosEnabled:false});
    const cursor=String(req.query.before||'').split(':');
    const before=Number(cursor[0])||Date.now()+1, beforeId=cursor[1]||'~';
    const [rows]=await pool.query('SELECT id,post_id,note,media_key,created_ms FROM journal_entries WHERE user_id=? AND (created_ms<? OR (created_ms=? AND id<?)) ORDER BY created_ms DESC,id DESC LIMIT 30',[req.userId,before,before,beforeId]);
    res.json({enabled:true,photosEnabled:storage.mediaReady(),entries:rows.map(row=>({id:row.id,postId:row.post_id,note:storage.decrypt(Buffer.from(row.note,'base64'),`${req.userId}:${row.id}:note`).toString('utf8'),hasPhoto:!!row.media_key,createdAt:Number(row.created_ms)})),nextBefore:rows.length===30?`${rows.at(-1).created_ms}:${rows.at(-1).id}`:null});
  }catch(err){console.error('Journal read failed:',err.code||err.name);res.status(503).json({error:'Could not open your journal. Please try again later.'});}
}
async function create(req,res){
  let mediaKey;
  try{await ensureMemberTables();if(!storage.encryptionReady())return res.status(503).json({error:'Private journal is not configured yet.'});
    const {note,postId}=req.body||{};
    if(typeof note!=='string'||!note.trim()||note.length>2000)return res.status(400).json({error:'Write a reflection of 1–2000 characters.'});
    if(postId){const [rows]=await pool.query('SELECT id FROM posts WHERE id=? AND author_id=?',[postId,req.userId]);if(!rows.length)return res.status(404).json({error:'Your linked post was not found.'});}
    if(req.file&&!storage.mediaReady())return res.status(503).json({error:'Private photo storage is not configured yet. You can save a text reflection.'});
    const id=crypto.randomUUID();
    if(req.file)mediaKey=await storage.savePhoto(req.file,req.userId,id);
    await pool.query('INSERT INTO journal_entries (id,user_id,post_id,note,media_key,created_ms) VALUES (?,?,?,?,?,?)',[id,req.userId,postId||null,storage.encrypt(Buffer.from(note.trim()),`${req.userId}:${id}:note`).toString('base64'),mediaKey||null,Date.now()]);
    res.json({ok:true,id});
  }catch(err){if(mediaKey)await pool.query('INSERT IGNORE INTO media_deletion_queue (url) VALUES (?)',[mediaKey]).catch(()=>{});console.error('Journal save failed:',err.code||err.name);res.status(500).json({error:'Could not save the reflection. Check that your image is supported and try again.'});}
}
async function photo(req,res){try{await ensureMemberTables();const [rows]=await pool.query('SELECT media_key FROM journal_entries WHERE id=? AND user_id=?',[req.params.id,req.userId]);if(!rows[0]?.media_key)return res.status(404).json({error:'Photo not found.'});const buffer=await storage.readPhoto(rows[0].media_key,req.userId,req.params.id);res.set('Cache-Control','private, no-store');res.type('image/jpeg').send(buffer);}catch(err){res.status(503).json({error:'Could not load the private photo.'});}}
async function remove(req,res){try{await ensureMemberTables();await transaction(async db=>{const [rows]=await db.query('SELECT media_key FROM journal_entries WHERE id=? AND user_id=? FOR UPDATE',[req.params.id,req.userId]);if(rows[0]?.media_key)await db.query('INSERT IGNORE INTO media_deletion_queue (url) VALUES (?)',[rows[0].media_key]);await db.query('DELETE FROM journal_entries WHERE id=? AND user_id=?',[req.params.id,req.userId]);});res.json({ok:true});}catch(err){res.status(500).json({error:'Could not delete this reflection.'});}}
module.exports={list,create,photo,remove};
