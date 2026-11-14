// 24 Heelz NG — zero-dependency Node server. Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
// Keep deployment settings outside source control. This small loader avoids adding a
// runtime dependency while accepting standard KEY=value .env files.
const ENVF=path.join(__dirname,'.env');if(fs.existsSync(ENVF))fs.readFileSync(ENVF,'utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'')});
const PORT=process.env.PORT||3000,DIR=process.env.DATA_DIR||path.join(__dirname,'data'),DBF=path.join(DIR,'db.json'),PUB=path.join(__dirname,'public');
const hash=(p,s=crypto.randomBytes(16).toString('hex'))=>s+':'+crypto.scryptSync(p,s,32).toString('hex');
const check=(p,h)=>{const a=Buffer.from(hash(p,h.split(':')[0])),b=Buffer.from(h);return a.length==b.length&&crypto.timingSafeEqual(a,b)};
const HEEL={stiletto:'10 cm',strappy:'9 cm',block:'7 cm',kitten:'5 cm',platform:'11 cm'},CN={'#111111':'Black','#e8d9c4':'Nude','#7a4a2b':'Brown','#c9a24a':'Gold','#f0b6c4':'Pink','#2b3a67':'Navy','#b3261e':'Red','#d9d9d9':'Silver'};
// A generous launch catalogue. Every entry remains a normal product record, so the
// owner can change its photograph, price, stock and copy in Admin > Products.
const shoePhotos=['1543163521-1bf539c55dd2','1542291026-7eec264c27ff','1562273138-f46be4ebdf33','1560343090-f0409e92791a','1515347619252-60a4bf4fff4f','1596703263926-eb0762ee17e4','1603808033192-082d6919d3e1','1520639888713-7851133b1ed0'];
const bagPhotos=['1553062407-98eeb64c6a62','1584917865442-de89df76afd3','1594223274512-ad4803739b7c','1585488434455-1a84ea7c4da5','1566150905458-1bf1fc113f0d','1590874103328-eac38a683ce7'];
const heelNames=['Noir Muse','Satin Poise','Golden Hour','Velvet Promise','Rosé Muse','Midnight Edit','Pearl Society','Cocoa Charm','Afterglow','Maison Muse','Luna Line','Petal Theory'];
const bagNames=['The Celeste Tote','Élan Mini Bag','The Sade Clutch','Mira Top Handle','Amara Crossbody','The Nia Edit'];
const heelCats=['Stilettos','Block heels','Strappy','Kitten heels','Platforms'];
const bagCats=['Tote bags','Mini bags','Clutches','Crossbody bags'];
const photo=(id,w=900)=>`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;
const seed=[...Array.from({length:108},(_,i)=>{const cat=heelCats[i%heelCats.length],style=['stiletto','block','strappy','kitten','platform'][i%5],color=['#111111','#e8d9c4','#b3261e','#c9a24a','#7a4a2b','#f0b6c4'][i%6],stock=4+i%12;return {id:'h'+(i+1),name:`${heelNames[i%heelNames.length]} ${String(i+1).padStart(2,'0')}`,cat,price:22000+(i%10)*2500,stock,color,style,avail:true,sizes:'36,37,38,39,40,41',desc:'A polished statement heel selected for comfort, confidence and unforgettable entrances.',imgs:[photo(shoePhotos[i%shoePhotos.length])],heel:HEEL[style],material:'Premium vegan leather',colors:CN[color]||'Black'}}),...Array.from({length:48},(_,i)=>{const cat=bagCats[i%bagCats.length],color=['#111111','#7a4a2b','#e8d9c4','#c9a24a','#f0b6c4'][i%5],stock=3+i%10;return {id:'b'+(i+1),name:`${bagNames[i%bagNames.length]} ${String(i+1).padStart(2,'0')}`,cat,price:18500+(i%9)*3000,stock,color,style:'bag',avail:true,sizes:'One size',desc:'An elevated finishing touch for evenings out, events and everyday polish.',imgs:[photo(bagPhotos[i%bagPhotos.length])],heel:'—',material:'Structured vegan leather',colors:CN[color]||'Black'}})];
const HEEL_PHOTOS=Array.from({length:5},(_,i)=>'/assets/heels/heel-'+i+'.jpg'),BAG_PHOTOS=Array.from({length:6},(_,i)=>'/assets/bags/bag-'+i+'.jpg');
fs.mkdirSync(DIR,{recursive:true});
const UP=path.join(DIR,'uploads');fs.mkdirSync(UP,{recursive:true});
function saveImg(d){const m=String(d||'').match(/^data:image\/(jpeg|png|webp);base64,(.+)$/s);if(!m)throw new Error('Bad image');const b=Buffer.from(m[2],'base64');if(b.length>4e6)throw new Error('Image too large');
 const n=crypto.randomBytes(8).toString('hex')+'.'+(m[1]=='jpeg'?'jpg':m[1]);fs.writeFileSync(path.join(UP,n),b);return '/uploads/'+n}
const DEF={email:process.env.SHOP_EMAIL||'Hello24heelz@gmail.com',phone:'',address:'',hours:'',insta:'https://www.instagram.com/24heelzng?vrfl=MWhuZzdzNHA5c2o0Mw%3D%3D&utm_source=qr',tiktok:'https://www.tiktok.com/@24heelzng?_r=1&_t=ZS-9BKMJad2brg',bank1Number:'9049909474',bank1Name:'24 HEELZ NIGERIA',bank1Bank:'MONIE POINT',bank2Number:'0099415430',bank2Name:'24 HEELZ NIGERIA',bank2Bank:'STERLING BANK',
 about:"24 Heelz NG is a Nigerian online store for ladies' heels. Our promise is simple: quality for less.",
 delivery:'We deliver nationwide. Delivery within Lagos is free and completed within 24 hours.',
 returns:'If your pair arrives damaged or in the wrong size, contact us as soon as you receive it, with a photo, and we will arrange an exchange where possible.',
 payment:'Orders are paid by bank transfer. Use your order number as the payment reference.'};
const PUBK=['email','phone','address','hours','insta','tiktok','bank1Number','bank1Name','bank1Bank','bank2Number','bank2Name','bank2Bank','about','delivery','returns','payment'];
let db;try{db=JSON.parse(fs.readFileSync(DBF,'utf8'))}catch(e){db={products:seed,orders:[],seq:0,settings:{user:'Kenny',pass:hash('1234richard')}}}
db.settings={...DEF,...db.settings};
if(!db.settings.email||db.settings.email==='olugbusikehinde01@gmail.com')db.settings.email=DEF.email;
if(db.settings.delivery==='We deliver across Nigeria. The delivery fee and time depend on your city.')db.settings.delivery=DEF.delivery;
// Remove legacy contact-channel fields and copy when older data is loaded.  Customer
// phone numbers remain available to the admin as normal order contact details.
const legacyKey=k=>k.length===2&&k.charCodeAt(0)===119&&k.charCodeAt(1)===97;
const cleanCopy=s=>String(s||'').replace(/whats\s*app/gi,'contact us');
for(const o of db.orders){for(const k of Object.keys(o))if(legacyKey(k)){if(!o.phone)o.phone=o[k];delete o[k]}if(o.status==='New')o.status='Awaiting Payment';if(o.status==='Delivered')o.status='Completed'}
for(const k of Object.keys(db.settings))if(legacyKey(k))delete db.settings[k];
for(const p of db.products){p.desc=cleanCopy(p.desc);if(/contact us on contact us/i.test(p.desc))p.desc='A curated 24 Heelz NG piece. Contact us for fit and availability guidance.'}
for(const k of ['about','delivery','returns','payment'])db.settings[k]=cleanCopy(db.settings[k]);
if(/confirm every order personally on contact us/i.test(db.settings.about))db.settings.about=DEF.about;
if(/confirm both with you on contact us/i.test(db.settings.delivery))db.settings.delivery=DEF.delivery;
if(/message us on contact us/i.test(db.settings.returns))db.settings.returns=DEF.returns;
if(/shared with you on contact us/i.test(db.settings.payment))db.settings.payment=DEF.payment;
db.seq=Math.max(1000,Number(db.seq)||0);
if(process.env.ADMIN_USERNAME)db.settings.user=process.env.ADMIN_USERNAME;
if(process.env.ADMIN_PASSWORD&&!db.envPasswordSet){db.settings.pass=hash(process.env.ADMIN_PASSWORD);db.envPasswordSet=true}
db.products.forEach((p,i)=>{p.imgs=Array.isArray(p.imgs)?p.imgs:[];if(typeof p.img=='string'&&p.img.startsWith('data:image/')){try{p.imgs.unshift(saveImg(p.img))}catch(e){}}delete p.img;p.heel=p.heel||'';p.material=p.material||'';p.colors=p.colors||'';p.restocked=!!p.restocked;if(p.imgs.some(u=>/^https:\/\/images\.unsplash\.com\//.test(u)))p.imgs=[p.id.startsWith('b')?BAG_PHOTOS[i%BAG_PHOTOS.length]:HEEL_PHOTOS[i%HEEL_PHOTOS.length]]});
save();
function save(){const t=DBF+'.tmp';fs.writeFileSync(t,JSON.stringify(db));fs.renameSync(t,DBF)}
function ownAssetFiles(dir,rel=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?ownAssetFiles(path.join(dir,e.name),path.join(rel,e.name)):(/\.(jpe?g|png|webp)$/i.test(e.name)?[path.join(rel,e.name)]:[]))}
function productTitle(file){return path.basename(file,path.extname(file)).replace(/[_-]+/g,' ').replace(/\s*\([^)]*\)|\b\d{8,}\b/g,'').replace(/…/g,'').replace(/\s+/g,' ').trim()||'New arrival'}
function isBagAsset(file){return /bag|handbag|tote|clutch|purse|bolsa|crossbody/i.test(file)}
function seedOwnAssets(){if(db.assetSeedVersion>=2)return;const root=path.join(PUB,'assets');const files=ownAssetFiles(root).filter(f=>!/^Glamorous_Red_Platform_Heels_on_White-removebg-preview\.png$/i.test(path.basename(f)));
 const retained=db.products.filter(p=>!/^([hb]\d+|asset-\d+)$/.test(p.id));const imported=files.map((file,i)=>{const bag=isBagAsset(file),raw=productTitle(file),name=raw==='New arrival'?`${bag?'Signature Bag':'Signature Heel'} ${String(i+1).padStart(2,'0')}`:raw,low=name.toLowerCase();return {id:'asset-'+(i+1),name,cat:bag?(low.includes('clutch')?'Clutches':low.includes('crossbody')?'Crossbody bags':'Tote bags'):(low.includes('platform')?'Platforms':low.includes('sandal')?'Strappy':'Stilettos'),price:bag?22000:25000,stock:10,avail:true,color:'#111111',style:bag?'bag':'stiletto',sizes:bag?'One size':'36,37,38,39,40,41',desc:'A curated 24 Heelz NG piece. Contact us for fit and availability guidance.',imgs:['/assets/'+file.split(path.sep).map(encodeURIComponent).join('/')],heel:bag?'':'10 cm',material:'Premium fashion finish',colors:'As shown'}});db.products=[...retained,...imported];db.assetSeeded=true;db.assetSeedVersion=2;save()}
seedOwnAssets();
function seedSlippers(){if(db.slippersSeedVersion>=2)return;const root=path.join(PUB,'assets');const files=ownAssetFiles(root).filter(f=>/slipper|slip into|bedroom/i.test(f));let i=0;for(const file of files){const url='/assets/'+file.split(path.sep).map(encodeURIComponent).join('/'),existing=db.products.find(p=>(p.imgs||[]).includes(url));if(existing){existing.cat='Slippers';existing.style='slipper';existing.heel='';continue}i++;db.products.unshift({id:'slipper-'+Date.now()+'-'+i,name:productTitle(file),cat:'Slippers',price:12000,stock:10,avail:true,restocked:false,color:'#7a4a2b',style:'slipper',sizes:'36,37,38,39,40,41',desc:'Comfort-led slippers selected for an effortless, polished finish.',imgs:[url],heel:'',material:'Soft comfort finish',colors:'As shown'})}db.slippersSeeded=true;db.slippersSeedVersion=2;save()}
seedSlippers();
function fixProductCategories(){
 const fixes={
  'asset-43':{name:'Burgundy Crystal Stilettos',cat:'Stilettos',style:'stiletto',sizes:'36,37,38,39,40,41',heel:'10 cm'},
  'asset-45':{name:'Black Chain Shoulder Bag',cat:'Tote bags',style:'bag',sizes:'One size',heel:''},
  'asset-62':{name:'Burgundy Top-Handle Bag',cat:'Tote bags',style:'bag',sizes:'One size',heel:''}
 };
 let changed=false;
 for(const p of db.products){const f=fixes[p.id];if(!f)continue;for(const [k,v] of Object.entries(f))if(p[k]!==v){p[k]=v;changed=true}}
 if(changed)save();
}
fixProductCategories();
const sess=new Map(),hits={},fails={};
const send=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
const body=req=>new Promise((ok,no)=>{let n=0,c=[];req.on('data',d=>{n+=d.length;if(n>12e6){no(new Error('Too large'));req.destroy()}else c.push(d)});req.on('end',()=>{try{const s=Buffer.concat(c).toString();ok(s?JSON.parse(s):{})}catch(e){no(new Error('Bad JSON'))}})});
const S=(v,n)=>String(v==null?'':v).trim().slice(0,n);
async function api(req,res,r){
 const m=req.method,ip=req.socket.remoteAddress,now=Date.now();
 if(m=='GET'&&r=='products')return send(res,200,db.products);
 const cfg=()=>Object.fromEntries(PUBK.map(k=>[k,db.settings[k]]));
 if(m=='GET'&&r=='config')return send(res,200,cfg());
 if(m=='POST'&&r=='orders'){
  const b=await body(req);hits[ip]=(hits[ip]||[]).filter(t=>now-t<36e5);
  if(hits[ip].length>=100)return send(res,429,{error:'Too many completed orders from this device. Try again later.'});
 const o={name:S(b.name,80),phone:S(b.phone,30).replace(/\D/g,''),email:S(b.email,100),city:S(b.city,80),addr:S(b.addr,300),note:S(b.note,300)};
  if(!o.name||!o.phone||!o.city||!o.addr)return send(res,400,{error:'Fill in all required fields'});
  if(!/^(?:0[789]\d{9}|234[789]\d{9})$/.test(o.phone))return send(res,400,{error:'Enter a valid Nigerian phone number'});
  if(!Array.isArray(b.items)||!b.items.length||b.items.length>30)return send(res,400,{error:'No items selected'});
  const items=[];for(const i of b.items){const p=db.products.find(x=>x.id==i.id),q=Math.max(1,Math.min(20,parseInt(i.qty)||1));
   if(!p||!p.avail||p.stock<=0)return send(res,400,{error:(p?p.name:'An item')+' is no longer available'});
   if(q>p.stock)return send(res,400,{error:'Only '+p.stock+' left of '+p.name});
   items.push({id:p.id,name:p.name,size:S(i.size,10),qty:q,price:p.price})}
  hits[ip].push(now);
  const order={id:'24H-'+String(++db.seq).padStart(4,'0'),date:new Date().toLocaleString('en-NG',{timeZone:'Africa/Lagos'}),status:'Awaiting Payment',total:items.reduce((a,i)=>a+i.qty*i.price,0),items,...o};
  db.orders.unshift(order);save();return send(res,200,order)}
 if(m=='POST'&&r=='login'){
  const f=(fails[ip]||[]).filter(t=>now-t<6e5);if(f.length>=5)return send(res,429,{error:'Too many attempts. Wait 10 minutes.'});
  const b=await body(req);
  if(S(b.u,80)==db.settings.user&&check(String(b.p||''),db.settings.pass)){const t=crypto.randomBytes(24).toString('hex');sess.set(t,now+432e5);return send(res,200,{token:t})}
  f.push(now);fails[ip]=f;return send(res,401,{error:'Wrong username or password'})}
 let pm=r.match(/^orders\/(24H-\d+)\/paid$/);if(pm&&m=='POST'){const o=db.orders.find(x=>x.id==pm[1]);if(!o)return send(res,404,{error:'Order not found'});if(o.status==='Awaiting Payment'){o.status='Payment Confirming';save()}return send(res,200,o)}
 let sm=r.match(/^orders\/(24H-\d+)\/status$/);if(sm&&m=='GET'){const o=db.orders.find(x=>x.id==sm[1]);return o?send(res,200,{id:o.id,status:o.status,total:o.total,items:o.items}):send(res,404,{error:'Order not found'})}
 const tok=(req.headers.authorization||'').slice(7);if(!(sess.get(tok)>now))return send(res,401,{error:'Login required'});
 if(m=='GET'&&r=='orders')return send(res,200,db.orders);
 let mm=r.match(/^orders\/((?:ORD|24H)-\d+)$/);
 if(mm){const i=db.orders.findIndex(o=>o.id==mm[1]);if(i<0)return send(res,404,{error:'Not found'});
  if(m=='DELETE'){db.orders.splice(i,1);save();return send(res,200,{ok:1})}
  if(m=='PATCH'){const b=await body(req),o=db.orders[i];if(!['Awaiting Payment','Payment Confirming','Confirmed','Processing','Completed','Cancelled'].includes(b.status))return send(res,400,{error:'Bad status'});
   o.status=b.status;
   if(b.status==='Confirmed'&&!o.stockCut){o.stockCut=true;o.items.forEach(it=>{const p=db.products.find(x=>x.id==it.id);if(p){p.stock=Math.max(0,p.stock-it.qty);if(!p.stock)p.avail=false}})}
   save();return send(res,200,o)}}
 if(m=='PUT'&&r=='products'){const b=await body(req);if(!Array.isArray(b)||b.length>500)return send(res,400,{error:'Bad data'});
  db.products=b.map(p=>({id:S(p.id,40),name:S(p.name,100),cat:S(p.cat,40),price:Math.max(0,+p.price||0),stock:Math.max(0,parseInt(p.stock)||0),avail:!!p.avail,restocked:!!p.restocked,color:/^#[0-9a-f]{6}$/i.test(p.color)?p.color:'#111111',style:S(p.style,20),sizes:S(p.sizes,80),desc:S(p.desc,600),heel:S(p.heel,30),material:S(p.material,80),colors:S(p.colors,80),imgs:(Array.isArray(p.imgs)?p.imgs:[]).filter(u=>/^\/uploads\/[a-f0-9]+\.(jpg|png|webp)$/.test(u)||/^\/assets\/[\w .()'\-%]+\.(jpg|png|webp)$/i.test(u)).slice(0,8)}));
  save();return send(res,200,db.products)}
 if(m=='POST'&&r=='upload'){const b=await body(req);try{return send(res,200,{url:saveImg(b.data)})}catch(e){return send(res,400,{error:e.message})}}
 if(m=='GET'&&r=='settings')return send(res,200,{...cfg(),user:db.settings.user});
 if(m=='PUT'&&r=='settings'){const b=await body(req),s=db.settings;
  for(const k of PUBK)if(b[k]!==undefined)s[k]=S(b[k],['about','delivery','returns','payment'].includes(k)?1500:200);
  s.email=s.email||DEF.email;if(b.user)s.user=S(b.user,40);
  if(b.pass){if(String(b.pass).length<6)return send(res,400,{error:'Password must be at least 6 characters'});s.pass=hash(String(b.pass))}
  save();return send(res,200,{...cfg(),user:s.user})}
 send(res,404,{error:'Not found'})}
const MIME={'.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{try{
 const p=decodeURIComponent(new URL(req.url,'http://x').pathname);
 if(p.startsWith('/api/'))return await api(req,res,p.slice(5));
 let f;if(p.startsWith('/uploads/')){f=path.join(UP,path.basename(p));if(!fs.existsSync(f)){res.writeHead(404);return res.end()}}
 else{f=path.join(PUB,p==='/'?'index.html':p);if(!f.startsWith(PUB)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(PUB,'index.html')}
 res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':p.startsWith('/uploads/')?'public, max-age=2592000':'no-cache'});fs.createReadStream(f).pipe(res)
}catch(e){send(res,e.message=='Too large'?413:500,{error:e.message=='Too large'?'File too large':'Server error'})}}).listen(PORT,()=>console.log('24 Heelz NG running at http://localhost:'+PORT));
