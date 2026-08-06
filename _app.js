
/* ============ STORAGE ============ */
const KEY='catatan_bulanan_v1';
const LEGACY_KEYS=['catatan_jualan_v2','catatan_jualan_v1'];
let DB={jual:[],keluar:[],produk:[]};
function load(){
  try{
    const r=localStorage.getItem(KEY);
    if(r){DB=Object.assign({jual:[],keluar:[],produk:[]},JSON.parse(r));return;}
    // Belum ada data di key baru — coba tarik dari key lama supaya tidak kehilangan data.
    for(const lk of LEGACY_KEYS){
      const old=localStorage.getItem(lk);
      if(old){const d=JSON.parse(old);if(d&&((d.jual&&d.jual.length)||(d.keluar&&d.keluar.length)||(d.produk&&d.produk.length))){
        DB=Object.assign({jual:[],keluar:[],produk:[]},d);save();return;
      }}
    }
  }catch(e){}
}
function save(){localStorage.setItem(KEY,JSON.stringify(DB));}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

/* ============ HELPERS ============ */
const rp=n=>'Rp '+Math.round(n||0).toLocaleString('id-ID');
function toast(msg,err){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show'+(err?' err':'');clearTimeout(t._t);t._t=setTimeout(()=>t.className='toast',2200);}
function nowLocal(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);}
function ymd(d){d=new Date(d);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);}
function startOfWeek(d){d=new Date(d);const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);d.setHours(0,0,0,0);return d;}
function startOfMonth(d){d=new Date(d);return new Date(d.getFullYear(),d.getMonth(),1);}
function fmtDate(iso){const d=new Date(iso);return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});}
function esc(s){return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function itemUnitPrice(it){return (it.hargaDasar||0)+ (it.addons||[]).reduce((s,a)=>s+a.harga,0);}
function itemTotal(it){return it.qty*itemUnitPrice(it);}

/* ============ NAV ============ */
function go(page,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.tabbar button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(page==='lapor')renderLaporan();
  updateCartBar();
}

/* ============ DASHBOARD ============ */
function sumRange(arr,field,from){return arr.filter(x=>new Date(x.waktu)>=from).reduce((s,x)=>s+(x[field]||0),0);}
function refreshDash(){
  const now=new Date();
  const t0=new Date();t0.setHours(0,0,0,0);
  const w0=startOfWeek(now),m0=startOfMonth(now);
  const todayJ=DB.jual.filter(x=>new Date(x.waktu)>=t0);
  document.getElementById('s-today').textContent=rp(todayJ.reduce((s,x)=>s+x.total,0));
  document.getElementById('s-today-sub').textContent=todayJ.length+' transaksi';
  document.getElementById('s-week').textContent=rp(sumRange(DB.jual,'total',w0));
  const inMonth=sumRange(DB.jual,'total',m0);
  const outMonth=sumRange(DB.keluar,'nominal',m0);
  document.getElementById('s-month').textContent=rp(inMonth);
  document.getElementById('s-expense').textContent=rp(outMonth);
  const net=inMonth-outMonth;
  const el=document.getElementById('s-profit');
  el.textContent=rp(net);el.className='val '+(net>=0?'pos':'neg');
}

/* ============ PRODUK ============ */
const KAT_PRODUK=['Nasi','Mie','Minuman','Addons'];
const prodIcon={'Nasi':'🍚','Mie':'🍜','Minuman':'🥤','Addons':'🍳'};
function saveProduk(e){e.preventDefault();
  const nama=document.getElementById('pNama').value.trim();
  const harga=parseFloat(document.getElementById('pHarga').value);
  const kategori=document.getElementById('pKategori').value;
  if(!nama){toast('Nama produk wajib diisi',1);return false;}
  if(!(harga>=0)||isNaN(harga)){toast('Harga tidak valid',1);return false;}
  const id=document.getElementById('pId').value;
  if(id){const p=DB.produk.find(x=>x.id===id);p.nama=nama;p.harga=harga;p.kategori=kategori;toast('Produk diperbarui');}
  else{DB.produk.push({id:uid(),nama,harga,kategori});toast('Produk ditambahkan');}
  save();resetProduk();renderProduk();renderPosGrid();return false;
}
function resetProduk(){document.getElementById('formProduk').reset();document.getElementById('pId').value='';
  document.getElementById('pSubmitBtn').textContent='Tambah Produk';document.getElementById('pCancelBtn').style.display='none';}
function editProduk(id){const p=DB.produk.find(x=>x.id===id);document.getElementById('pId').value=p.id;
  document.getElementById('pNama').value=p.nama;document.getElementById('pHarga').value=p.harga;
  document.getElementById('pKategori').value=p.kategori||'Addons';
  document.getElementById('pSubmitBtn').textContent='Simpan Perubahan';document.getElementById('pCancelBtn').style.display='block';
  document.getElementById('pNama').focus();window.scrollTo({top:0,behavior:'smooth'});}
function delProduk(id){if(!confirm('Hapus produk ini?'))return;DB.produk=DB.produk.filter(x=>x.id!==id);save();renderProduk();renderPosGrid();toast('Produk dihapus');}
function renderProduk(){
  const el=document.getElementById('pList');
  if(!DB.produk.length){el.innerHTML='<div class="empty"><div class="em">🏷️</div><p>Belum ada produk.</p><p style="font-size:13px">Tambahkan produk untuk mempercepat input penjualan di Kasir.</p></div>';return;}
  let html='';
  KAT_PRODUK.forEach(kat=>{
    const items=DB.produk.filter(p=>(p.kategori||'Addons')===kat);
    if(!items.length)return;
    html+=`<div class="section-title" style="margin:14px 0 8px">${prodIcon[kat]} ${kat} <span style="color:var(--muted);font-weight:600">(${items.length})</span></div>`;
    html+=items.map(p=>`<div class="item" style="margin-bottom:9px"><div class="ic">${prodIcon[kat]}</div>
      <div class="info"><div class="t">${esc(p.nama)}</div><div class="m">Harga default</div></div>
      <div class="amt">${rp(p.harga)}</div>
      <div class="acts"><div class="row2"><button onclick="editProduk('${p.id}')">✏️</button><button class="del" onclick="delProduk('${p.id}')">🗑️</button></div></div></div>`).join('');
  });
  el.innerHTML=html;
}

/* ============ KASIR: grid produk ============ */
let posKat=null;
function renderPosKatSeg(){
  const seg=document.getElementById('posKatSeg');
  const available=KAT_PRODUK.filter(k=>DB.produk.some(p=>(p.kategori||'Addons')===k));
  if(!posKat||!available.includes(posKat))posKat=available[0]||null;
  seg.innerHTML=available.map(k=>`<button class="${k===posKat?'active':''}" onclick="setPosKat('${k}',this)">${prodIcon[k]} ${k}</button>`).join('');
}
function setPosKat(k,btn){posKat=k;document.querySelectorAll('#posKatSeg button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderPosGrid();}
function renderPosGrid(){
  renderPosKatSeg();
  const grid=document.getElementById('posGrid');
  if(!DB.produk.length){
    grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="em">🏷️</div><p>Belum ada produk tersimpan.</p>
      <button class="btn sec" onclick="go('produk',document.querySelector('.tabbar button[data-page=produk]'))">Tambah Produk Dulu</button></div>`;
    return;
  }
  const items=DB.produk.filter(p=>(p.kategori||'Addons')===posKat);
  if(!items.length){grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="em">${prodIcon[posKat]||'🏷️'}</div><p>Belum ada produk di kategori ini.</p></div>`;return;}
  grid.innerHTML=items.map(p=>`<button type="button" class="pos-card" onclick="openAddonSheet('${p.id}')">
    <span class="pc-ic">${prodIcon[p.kategori]||'🏷️'}</span>
    <span class="pc-name">${esc(p.nama)}</span>
    <span class="pc-price">${rp(p.harga)}</span></button>`).join('');
}
function toggleManual(){const f=document.getElementById('manualForm');f.style.display=f.style.display==='none'?'block':'none';}

/* ============ Sheet kustomisasi (addon/qty/catatan) ============ */
let asProduk=null,asQty=1,asAddonIds=new Set();
function openAddonSheet(produkId){
  asProduk=DB.produk.find(p=>p.id===produkId);if(!asProduk)return;
  asQty=1;asAddonIds=new Set();
  document.getElementById('asName').textContent=asProduk.nama;
  document.getElementById('asPrice').textContent='Harga dasar '+rp(asProduk.harga);
  document.getElementById('asNote').value='';
  document.getElementById('asQty').textContent=asQty;

  const addonProduk=DB.produk.filter(p=>(p.kategori||'')==='Addons');
  const wrap=document.getElementById('asAddonsWrap');
  if(asProduk.kategori==='Addons'||!addonProduk.length){
    wrap.style.display='none';
  }else{
    wrap.style.display='block';
    document.getElementById('asAddonsList').innerHTML=addonProduk.map(a=>`<label class="addon-row">
      <input type="checkbox" value="${a.id}" onchange="toggleAsAddon('${a.id}',this.checked)">
      <span class="ar-name">${esc(a.nama)}</span><span class="ar-price">+${rp(a.harga)}</span></label>`).join('');
  }
  updateAsTotal();
  document.getElementById('addonOverlay').classList.add('show');
}
function toggleAsAddon(id,checked){if(checked)asAddonIds.add(id);else asAddonIds.delete(id);updateAsTotal();}
function asStep(d){asQty=Math.max(1,asQty+d);document.getElementById('asQty').textContent=asQty;updateAsTotal();}
function updateAsTotal(){
  if(!asProduk)return;
  const addonsSum=[...asAddonIds].reduce((s,id)=>{const a=DB.produk.find(p=>p.id===id);return s+(a?a.harga:0);},0);
  document.getElementById('asTotal').textContent=rp(asQty*(asProduk.harga+addonsSum));
}
function closeAddonSheet(){document.getElementById('addonOverlay').classList.remove('show');asProduk=null;}
function confirmAddonAdd(){
  if(!asProduk)return;
  const addons=[...asAddonIds].map(id=>{const a=DB.produk.find(p=>p.id===id);return {nama:a.nama,harga:a.harga};});
  const it={id:uid(),nama:asProduk.nama,hargaDasar:asProduk.harga,qty:asQty,addons,catatan:document.getElementById('asNote').value.trim()};
  it.total=itemTotal(it);
  cart.push(it);
  closeAddonSheet();renderCart();toast(`${asProduk.nama} ditambahkan ✓`);
}

/* ============ PENJUALAN (multi-item / pesanan) ============ */
let cart=[]; // item pesanan: {id,nama,hargaDasar,qty,addons:[{nama,harga}],catatan,total}
function addManualToCart(){
  const nama=document.getElementById('jNama').value.trim();
  const qty=parseFloat(document.getElementById('jQty').value);
  const harga=parseFloat(document.getElementById('jHarga').value);
  if(!nama){toast('Nama item wajib diisi',1);return;}
  if(!(qty>=1)){toast('Jumlah minimal 1',1);return;}
  if(!(harga>=0)||isNaN(harga)){toast('Harga tidak valid',1);return;}
  const it={id:uid(),nama,hargaDasar:harga,qty,addons:[],catatan:''};
  it.total=itemTotal(it);
  cart.push(it);
  document.getElementById('jNama').value='';document.getElementById('jQty').value=1;document.getElementById('jHarga').value='';
  renderCart();toast('Item ditambahkan ✓');
}
function removeCartItem(i){cart.splice(i,1);renderCart();}
function cartStep(i,d){const it=cart[i];it.qty=Math.max(1,it.qty+d);it.total=itemTotal(it);renderCart();}
function cartSum(){return cart.reduce((s,x)=>s+itemTotal(x),0);}
function renderCart(){
  const wrap=document.getElementById('cartWrap');
  wrap.style.display=cart.length?'block':'none';
  if(cart.length){
    document.getElementById('cartList').innerHTML=cart.map((x,i)=>{
      const addonTxt=(x.addons||[]).map(a=>'+'+a.nama).join(', ');
      return `<div class="cart-item">
        <div class="ci-info">
          <div class="ci-name">${esc(x.nama)}</div>
          ${addonTxt?`<div class="ci-addons">${esc(addonTxt)}</div>`:''}
          ${x.catatan?`<div class="ci-note">"${esc(x.catatan)}"</div>`:''}
          <div class="ci-price">${rp(itemUnitPrice(x))} / item</div>
        </div>
        <div class="ci-right">
          <div class="ci-total">${rp(itemTotal(x))}</div>
          <div class="stepper">
            <button type="button" onclick="cartStep(${i},-1)">−</button>
            <span class="qv">${x.qty}</span>
            <button type="button" onclick="cartStep(${i},1)">+</button>
          </div>
        </div>
        <button class="del" style="padding:7px;border-radius:8px;background:#f3f4f6;color:var(--muted)" onclick="removeCartItem(${i})">🗑️</button>
      </div>`;
    }).join('');
    document.getElementById('cartTotal').textContent=rp(cartSum());
  }
  updateCartBar();
}
function updateCartBar(){
  const bar=document.getElementById('cartBar');
  const onKasir=document.getElementById('page-jual').classList.contains('active');
  if(cart.length&&onKasir){
    bar.classList.add('show');
    document.getElementById('cb-count').textContent=cart.reduce((s,x)=>s+x.qty,0);
    document.getElementById('cb-total').textContent=rp(cartSum());
  }else{bar.classList.remove('show');}
}
function scrollToCart(){document.getElementById('cartWrap').scrollIntoView({behavior:'smooth',block:'start'});}
function saveJual(){
  if(!cart.length){toast('Tambahkan minimal 1 item ke pesanan',1);return;}
  let waktu=document.getElementById('jWaktu').value;if(!waktu)waktu=nowLocal();
  const rec={items:cart.map(x=>({...x,addons:(x.addons||[]).map(a=>({...a}))})),total:cartSum(),waktu:new Date(waktu).toISOString(),
    bayar:document.getElementById('jBayar').value,catatan:document.getElementById('jCatatan').value.trim()};
  const id=document.getElementById('jId').value;
  if(id){rec.id=id;const idx=DB.jual.findIndex(x=>x.id===id);DB.jual[idx]=rec;toast('Pesanan diperbarui');}
  else{rec.id=uid();DB.jual.push(rec);toast('Pesanan disimpan ✓');}
  save();resetJual();renderAll();
}
function resetJual(){cart=[];document.getElementById('jId').value='';
  document.getElementById('jNama').value='';document.getElementById('jQty').value=1;document.getElementById('jHarga').value='';
  document.getElementById('jCatatan').value='';
  document.getElementById('jWaktu').value=nowLocal();
  document.getElementById('jFormTitle').textContent='🧾 Pesanan Baru';
  document.getElementById('jSubmitBtn').textContent='Simpan Pesanan';document.getElementById('jCancelBtn').style.display='none';
  document.getElementById('manualForm').style.display='none';
  renderCart();}
function editJual(id){const x=DB.jual.find(v=>v.id===id);
  cart=(x.items||[]).map(it=>({...it,addons:(it.addons||[]).map(a=>({...a}))}));
  document.getElementById('jId').value=x.id;
  document.getElementById('jBayar').value=x.bayar;document.getElementById('jCatatan').value=x.catatan||'';
  const d=new Date(x.waktu);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
  document.getElementById('jWaktu').value=d.toISOString().slice(0,16);
  document.getElementById('jFormTitle').textContent='✏️ Edit Pesanan';
  document.getElementById('jSubmitBtn').textContent='Simpan Perubahan';
  document.getElementById('jCancelBtn').style.display='block';
  go('jual',document.querySelector('.tabbar button[data-page=jual]'));
  renderCart();window.scrollTo({top:0,behavior:'smooth'});}
function delJual(id){if(!confirm('Hapus pesanan ini?'))return;DB.jual=DB.jual.filter(x=>x.id!==id);save();renderAll();toast('Pesanan dihapus');}
function orderSummary(x){return (x.items||[]).map(it=>{const ad=(it.addons||[]).map(a=>'+'+a.nama).join(' ');return `${esc(it.nama)}${ad?' '+esc(ad):''} ×${it.qty}`;}).join(', ');}

let jualRange='today';
function setJualRange(r,btn){jualRange=r;document.querySelectorAll('#page-jual .chip').forEach(c=>c.classList.remove('active'));btn.classList.add('active');
  const{from,to}=rangeDates(r);document.getElementById('jFrom').value=from;document.getElementById('jTo').value=to;renderJual();}
function rangeDates(r){const now=new Date();let from='',to=ymd(now);
  if(r==='today')from=ymd(now);
  else if(r==='week')from=ymd(startOfWeek(now));
  else if(r==='month')from=ymd(startOfMonth(now));
  else if(r==='all'){from='';to='';}
  return{from,to};}
function nameMatches(x,q){
  if(!q)return true;
  if(x.items)return x.items.some(it=>(it.nama||'').toLowerCase().includes(q)||(it.addons||[]).some(a=>(a.nama||'').toLowerCase().includes(q)));
  return (x.nama||'').toLowerCase().includes(q);
}
function filterByDateSearch(arr,fromId,toId,searchId){
  const from=document.getElementById(fromId).value;const to=document.getElementById(toId).value;
  const q=searchId?document.getElementById(searchId).value.trim().toLowerCase():'';
  return arr.filter(x=>{const d=ymd(x.waktu);
    if(from&&d<from)return false;if(to&&d>to)return false;
    if(q&&!nameMatches(x,q))return false;return true;});}
function renderJual(){
  let rows=filterByDateSearch(DB.jual,'jFrom','jTo','jSearch').sort((a,b)=>new Date(b.waktu)-new Date(a.waktu));
  const el=document.getElementById('jList');
  if(!rows.length){el.innerHTML='<div class="empty"><div class="em">🧾</div><p>Belum ada transaksi pada rentang ini.</p></div>';document.getElementById('jSubtotal').innerHTML='';return;}
  el.innerHTML=rows.map(x=>{const n=(x.items||[]).length;return `<div class="item"><div class="ic">💰</div>
    <div class="info"><div class="t">${esc(orderSummary(x))} <span class="badge">${n} item</span></div>
      <div class="m">${fmtDate(x.waktu)} · ${esc(x.bayar)}${x.catatan?' · '+esc(x.catatan):''}</div></div>
    <div style="text-align:right"><div class="amt">${rp(x.total)}</div></div>
    <div class="acts"><div class="row2"><button onclick="editJual('${x.id}')">✏️</button><button class="del" onclick="delJual('${x.id}')">🗑️</button></div></div></div>`;}).join('');
  const tot=rows.reduce((s,x)=>s+x.total,0);
  document.getElementById('jSubtotal').innerHTML=`<div class="subtotal"><span>Subtotal (${rows.length} pesanan)</span><span>${rp(tot)}</span></div>`;
}

/* ============ PENGELUARAN ============ */
function saveKeluar(e){e.preventDefault();
  const nama=document.getElementById('kNama').value.trim();
  const nominal=parseFloat(document.getElementById('kNominal').value);
  let waktu=document.getElementById('kWaktu').value;
  if(!nama){toast('Nama pengeluaran wajib diisi',1);return false;}
  if(!(nominal>0)){toast('Nominal harus lebih dari 0',1);return false;}
  if(!waktu)waktu=nowLocal();
  const rec={nama,kategori:document.getElementById('kKategori').value,nominal,
    waktu:new Date(waktu).toISOString(),catatan:document.getElementById('kCatatan').value.trim()};
  const id=document.getElementById('kId').value;
  if(id){Object.assign(DB.keluar.find(x=>x.id===id),rec);toast('Pengeluaran diperbarui');}
  else{rec.id=uid();DB.keluar.push(rec);toast('Pengeluaran disimpan ✓');}
  save();resetKeluar();renderAll();return false;
}
function resetKeluar(){document.getElementById('formKeluar').reset();document.getElementById('kId').value='';
  document.getElementById('kWaktu').value=nowLocal();
  document.getElementById('kSubmitBtn').textContent='Simpan Pengeluaran';document.getElementById('kCancelBtn').style.display='none';}
function editKeluar(id){const x=DB.keluar.find(v=>v.id===id);
  document.getElementById('kId').value=x.id;document.getElementById('kNama').value=x.nama;
  document.getElementById('kKategori').value=x.kategori;document.getElementById('kNominal').value=x.nominal;
  document.getElementById('kCatatan').value=x.catatan||'';
  const d=new Date(x.waktu);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
  document.getElementById('kWaktu').value=d.toISOString().slice(0,16);
  document.getElementById('kSubmitBtn').textContent='Simpan Perubahan';
  document.getElementById('kCancelBtn').style.display='block';window.scrollTo({top:0,behavior:'smooth'});}
function delKeluar(id){if(!confirm('Hapus pengeluaran ini?'))return;DB.keluar=DB.keluar.filter(x=>x.id!==id);save();renderAll();toast('Pengeluaran dihapus');}

function setKeluarRange(r,btn){document.querySelectorAll('#page-keluar .chip').forEach(c=>c.classList.remove('active'));btn.classList.add('active');
  const{from,to}=rangeDates(r);document.getElementById('kFrom').value=from;document.getElementById('kTo').value=to;renderKeluar();}
const katIcon={'Bahan Baku':'📦','Operasional':'⚙️','Gaji':'👤','Lain-lain':'📎'};
function renderKeluar(){
  let rows=filterByDateSearch(DB.keluar,'kFrom','kTo',null);
  const kat=document.getElementById('kFilterKat').value;
  if(kat)rows=rows.filter(x=>x.kategori===kat);
  rows.sort((a,b)=>new Date(b.waktu)-new Date(a.waktu));
  const el=document.getElementById('kList');
  if(!rows.length){el.innerHTML='<div class="empty"><div class="em">🧾</div><p>Belum ada pengeluaran pada filter ini.</p></div>';document.getElementById('kSubtotal').innerHTML='';return;}
  el.innerHTML=rows.map(x=>`<div class="item exp"><div class="ic">${katIcon[x.kategori]||'📎'}</div>
    <div class="info"><div class="t">${esc(x.nama)} <span class="badge" style="background:#fef3c7;color:#b45309">${esc(x.kategori)}</span></div>
      <div class="m">${fmtDate(x.waktu)}${x.catatan?' · '+esc(x.catatan):''}</div></div>
    <div class="amt neg">−${rp(x.nominal)}</div>
    <div class="acts"><div class="row2"><button onclick="editKeluar('${x.id}')">✏️</button><button class="del" onclick="delKeluar('${x.id}')">🗑️</button></div></div></div>`).join('');
  const tot=rows.reduce((s,x)=>s+x.nominal,0);
  document.getElementById('kSubtotal').innerHTML=`<div class="subtotal" style="background:#fef2f2;color:var(--neg)"><span>Subtotal (${rows.length} item)</span><span>−${rp(tot)}</span></div>`;
}

/* ============ LAPORAN ============ */
let trendDays=7,plMode='week',topMode='omzet';
let chartTren=null,chartPL=null;
function setTrend(d,btn){trendDays=d;btn.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');drawTren();}
function setPL(m,btn){plMode=m;btn.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');drawPL();}
function setTop(m,btn){topMode=m;btn.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');drawTop();}
function renderLaporan(){drawTren();drawPL();drawTop();}

function drawTren(){
  const labels=[],data=[];
  for(let i=trendDays-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=ymd(d);
    labels.push(d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'}));
    data.push(DB.jual.filter(x=>ymd(x.waktu)===key).reduce((s,x)=>s+x.total,0));}
  const ctx=document.getElementById('chartTren');if(chartTren)chartTren.destroy();
  chartTren=new Chart(ctx,{type:trendDays<=7?'bar':'line',
    data:{labels,datasets:[{label:'Penjualan',data,backgroundColor:'rgba(14,124,102,.15)',borderColor:'#0e7c66',
      borderWidth:2,borderRadius:6,tension:.35,fill:true,pointRadius:trendDays<=7?0:2,pointBackgroundColor:'#0e7c66'}]},
    options:chartOpts()});
}
function drawPL(){
  let buckets=[];const now=new Date();
  if(plMode==='day'){for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);buckets.push({label:d.toLocaleDateString('id-ID',{weekday:'short'}),from:new Date(ymd(d)+'T00:00'),to:new Date(ymd(d)+'T23:59:59')});}}
  else if(plMode==='week'){for(let i=5;i>=0;i--){const s=startOfWeek(now);s.setDate(s.getDate()-i*7);const e=new Date(s);e.setDate(e.getDate()+6);e.setHours(23,59,59);buckets.push({label:s.getDate()+'/'+(s.getMonth()+1),from:s,to:e});}}
  else{for(let i=5;i>=0;i--){const s=new Date(now.getFullYear(),now.getMonth()-i,1);const e=new Date(now.getFullYear(),now.getMonth()-i+1,0,23,59,59);buckets.push({label:s.toLocaleDateString('id-ID',{month:'short'}),from:s,to:e});}}
  const labels=buckets.map(b=>b.label);
  const inc=buckets.map(b=>DB.jual.filter(x=>{const t=new Date(x.waktu);return t>=b.from&&t<=b.to;}).reduce((s,x)=>s+x.total,0));
  const exp=buckets.map(b=>DB.keluar.filter(x=>{const t=new Date(x.waktu);return t>=b.from&&t<=b.to;}).reduce((s,x)=>s+x.nominal,0));
  const ctx=document.getElementById('chartPL');if(chartPL)chartPL.destroy();
  chartPL=new Chart(ctx,{type:'bar',data:{labels,datasets:[
    {label:'Pemasukan',data:inc,backgroundColor:'#0e7c66',borderRadius:5},
    {label:'Pengeluaran',data:exp,backgroundColor:'#f87171',borderRadius:5}]},
    options:chartOpts(true)});
  const ti=inc.reduce((a,b)=>a+b,0),to=exp.reduce((a,b)=>a+b,0);
  document.getElementById('pl-in').textContent=rp(ti);
  document.getElementById('pl-out').textContent=rp(to);
  const net=document.getElementById('pl-net');net.innerHTML=`<span>Laba Bersih</span><span style="color:${ti-to>=0?'var(--pos)':'var(--neg)'}">${rp(ti-to)}</span>`;
}
function drawTop(){
  const map={};
  const bump=(nama,qty,total)=>{const k=nama.trim().toLowerCase();if(!map[k])map[k]={nama,qty:0,omzet:0};map[k].qty+=qty;map[k].omzet+=total;};
  DB.jual.forEach(o=>(o.items||[]).forEach(it=>{
    bump(it.nama,it.qty,it.qty*(it.hargaDasar||0));
    (it.addons||[]).forEach(a=>bump(a.nama,it.qty,it.qty*a.harga));
  }));
  let arr=Object.values(map).sort((a,b)=>b[topMode]-a[topMode]).slice(0,7);
  const el=document.getElementById('topList');
  if(!arr.length){el.innerHTML='<div class="empty"><div class="em">🏆</div><p>Belum ada data penjualan.</p></div>';return;}
  const max=arr[0][topMode]||1;
  el.innerHTML=arr.map((x,i)=>`<div class="rank"><div class="no">${i+1}</div>
    <div class="info"><div class="t">${esc(x.nama)}</div>
      <div class="m">${x.qty} terjual · ${rp(x.omzet)}</div>
      <div class="bar"><i style="width:${Math.max(6,x[topMode]/max*100)}%"></i></div></div>
    <div class="v">${topMode==='omzet'?rp(x.omzet):x.qty+'×'}</div></div>`).join('');
}
function chartOpts(stacked){return{responsive:true,maintainAspectRatio:false,
  plugins:{legend:{display:!!stacked,position:'bottom',labels:{boxWidth:12,padding:14,font:{size:12}}},
    tooltip:{callbacks:{label:c=>c.dataset.label+': '+rp(c.parsed.y)}}},
  scales:{x:{grid:{display:false},ticks:{font:{size:11},color:'#6b7280'}},
    y:{beginAtZero:true,ticks:{font:{size:11},color:'#6b7280',callback:v=>v>=1e6?(v/1e6)+'jt':v>=1e3?(v/1e3)+'rb':v},grid:{color:'#f0f2f4'}}}};}

/* ============ EXPORT / BACKUP ============ */
function exportCSV(type){
  let rows,head,name;
  if(type==='jual'){rows=filterByDateSearch(DB.jual,'jFrom','jTo','jSearch').sort((a,b)=>new Date(a.waktu)-new Date(b.waktu));
    head=['No Pesanan','Tanggal','Waktu','Produk','Tambahan','Catatan Item','Qty','Harga Satuan','Subtotal Item','Total Pesanan','Pembayaran','Catatan Pesanan'];
    var body=[];
    rows.forEach((o,oi)=>{const d=new Date(o.waktu);const no=oi+1;
      (o.items||[]).forEach((it,ii)=>{
        const addonTxt=(it.addons||[]).map(a=>a.nama+' (+'+a.harga+')').join('; ');
        body.push([no,d.toLocaleDateString('id-ID'),d.toLocaleTimeString('id-ID'),it.nama,addonTxt,it.catatan||'',it.qty,itemUnitPrice(it),itemTotal(it),ii===0?o.total:'',o.bayar,ii===0?(o.catatan||''):'']);
      });});
    name='penjualan';}
  else{let r=filterByDateSearch(DB.keluar,'kFrom','kTo',null);const kat=document.getElementById('kFilterKat').value;if(kat)r=r.filter(x=>x.kategori===kat);
    r.sort((a,b)=>new Date(a.waktu)-new Date(b.waktu));
    head=['Tanggal','Waktu','Nama','Kategori','Nominal','Catatan'];
    var body=r.map(x=>{const d=new Date(x.waktu);return[d.toLocaleDateString('id-ID'),d.toLocaleTimeString('id-ID'),x.nama,x.kategori,x.nominal,x.catatan||''];});
    name='pengeluaran';}
  if(!body.length){toast('Tidak ada data untuk diexport',1);return;}
  const csv=[head,...body].map(r=>r.map(c=>{c=String(c);return /[",\n;]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c;}).join(';')).join('\r\n');
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`${name}_${ymd(new Date())}.csv`;a.click();toast('CSV berhasil diexport ✓');
}
function doBackup(){const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`backup_catatan-bulanan_${ymd(new Date())}.json`;a.click();toast('Backup tersimpan ✓');}
function doRestore(input){const f=input.files[0];if(!f)return;const r=new FileReader();
  r.onload=e=>{try{const d=JSON.parse(e.target.result);
    if(!d||typeof d!=='object'||!('jual'in d))throw 0;
    if(!confirm('Ganti semua data saat ini dengan isi file backup?')){input.value='';return;}
    DB=Object.assign({jual:[],keluar:[],produk:[]},d);save();renderAll();toast('Data berhasil dipulihkan ✓');
  }catch(err){toast('File backup tidak valid',1);}input.value='';};r.readAsText(f);}

/* ============ INIT ============ */
function renderAll(){refreshDash();renderJual();renderKeluar();renderProduk();renderPosGrid();updateCartBar();
  if(document.getElementById('page-lapor').classList.contains('active'))renderLaporan();}
function migrate(){
  let changed=false;
  // Pesanan lama (format 1-item datar / tanpa addons) diubah ke struktur baru.
  DB.jual=DB.jual.map(x=>{
    if(x.items){
      const items=x.items.map(it=>{
        if('hargaDasar'in it)return it;
        changed=true;
        return {id:it.id||uid(),nama:it.nama,hargaDasar:it.harga,qty:it.qty,addons:[],catatan:''};
      });
      return {...x,items};
    }
    changed=true;
    return {id:x.id||uid(),items:[{id:uid(),nama:x.nama,hargaDasar:x.harga,qty:x.qty,addons:[],catatan:''}],
      total:x.total,waktu:x.waktu,bayar:x.bayar||'Tunai',catatan:x.catatan||''};
  });
  if(changed)save();
}
load();migrate();
document.getElementById('jWaktu').value=nowLocal();
document.getElementById('kWaktu').value=nowLocal();
setJualRange('today',document.querySelector('#page-jual .chip[data-range=today]'));
setKeluarRange('month',document.querySelector('#page-keluar .chip[data-range=month]'));
renderAll();

/* ============ PWA: service worker & tombol install ============ */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  });
}
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',(e)=>{
  e.preventDefault();deferredInstallPrompt=e;
  document.getElementById('installBtn').style.display='flex';
});
function installApp(){
  if(!deferredInstallPrompt){toast('Buka aplikasi ini lewat browser Chrome/Edge untuk memasangnya',1);return;}
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then((choice)=>{
    if(choice.outcome==='accepted')toast('Aplikasi berhasil dipasang ✓');
    deferredInstallPrompt=null;document.getElementById('installBtn').style.display='none';
  });
}
window.addEventListener('appinstalled',()=>{document.getElementById('installBtn').style.display='none';toast('Aplikasi terpasang di perangkat ✓');});
