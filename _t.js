const uid=()=>Math.random().toString(36).slice(2,7);
function itemUnitPrice(it){return (it.hargaDasar||0)+ (it.addons||[]).reduce((s,a)=>s+a.harga,0);}
function itemTotal(it){return it.qty*itemUnitPrice(it);}

// 1) Nasi Goreng + Telur + Belacan, qty 2
const nasiGoreng={id:uid(),nama:'Nasi Goreng',hargaDasar:15000,qty:2,addons:[{nama:'Telur',harga:3000},{nama:'Belacan',harga:2000}],catatan:''};
nasiGoreng.total=itemTotal(nasiGoreng);
console.log('Unit price (15000+3000+2000=20000)?', itemUnitPrice(nasiGoreng)===20000?'OK':'FAIL');
console.log('Total (qty2 * 20000=40000)?', nasiGoreng.total===40000?'OK':'FAIL');

// 2) cart with multiple items, cartSum
const cart=[nasiGoreng, {id:uid(),nama:'Es Teh',hargaDasar:5000,qty:3,addons:[],catatan:'less sugar',total:15000}];
const cartSum=cart.reduce((s,x)=>s+itemTotal(x),0);
console.log('Cart sum (40000+15000=55000)?', cartSum===55000?'OK':'FAIL');

// 3) cartStep qty increment recompute
nasiGoreng.qty+=1; nasiGoreng.total=itemTotal(nasiGoreng);
console.log('After +1 qty (3*20000=60000)?', nasiGoreng.total===60000?'OK':'FAIL');

// 4) migration: old flat single-item order -> new items[] w/ hargaDasar
function migrateOne(x){
  if(x.items){
    const items=x.items.map(it=>{ if('hargaDasar'in it) return it; return {id:it.id||uid(),nama:it.nama,hargaDasar:it.harga,qty:it.qty,addons:[],catatan:''}; });
    return {...x, items};
  }
  return {id:x.id||uid(), items:[{id:uid(),nama:x.nama,hargaDasar:x.harga,qty:x.qty,addons:[],catatan:''}], total:x.total, waktu:x.waktu, bayar:x.bayar||'Tunai', catatan:x.catatan||''};
}
const oldFlat={id:'a1',nama:'Mie Ayam',qty:2,harga:15000,total:30000,waktu:'2026-07-20T10:00:00Z',bayar:'Tunai'};
const migratedFlat=migrateOne(oldFlat);
console.log('Migrate flat->items OK?', migratedFlat.items[0].hargaDasar===15000 && migratedFlat.items[0].nama==='Mie Ayam' ? 'OK':'FAIL');

const oldItemsNoAddon={id:'a2',items:[{id:'x',nama:'Kopi',qty:2,harga:12000,total:24000}],total:24000,waktu:'2026-07-20T10:00:00Z',bayar:'QRIS'};
const migratedItems=migrateOne(oldItemsNoAddon);
console.log('Migrate items[] w/o hargaDasar OK?', migratedItems.items[0].hargaDasar===12000 && Array.isArray(migratedItems.items[0].addons) ? 'OK':'FAIL');

// already-new-format order should pass through unchanged
const alreadyNew={id:'a3',items:[{id:'y',nama:'Nasi',hargaDasar:15000,qty:1,addons:[{nama:'Telur',harga:3000}],catatan:''}],total:18000,waktu:'2026-07-20T10:00:00Z',bayar:'Tunai'};
const migratedNew=migrateOne(alreadyNew);
console.log('Already-new passthrough OK?', migratedNew.items[0].addons.length===1 ? 'OK':'FAIL');

// 5) search includes addon names
function nameMatches(x,q){
  if(!q)return true;
  if(x.items)return x.items.some(it=>(it.nama||'').toLowerCase().includes(q)||(it.addons||[]).some(a=>(a.nama||'').toLowerCase().includes(q)));
  return (x.nama||'').toLowerCase().includes(q);
}
const order={items:[nasiGoreng]};
console.log('Search "belacan" finds order via addon?', nameMatches(order,'belacan')?'OK':'FAIL');
console.log('Search "kopi" not in this order?', !nameMatches(order,'kopi')?'OK':'FAIL');

// 6) drawTop bump logic incl addons
const map={};
const bump=(nama,qty,total)=>{const k=nama.trim().toLowerCase();if(!map[k])map[k]={nama,qty:0,omzet:0};map[k].qty+=qty;map[k].omzet+=total;};
[nasiGoreng].forEach(it=>{
  bump(it.nama,it.qty,it.qty*(it.hargaDasar||0));
  (it.addons||[]).forEach(a=>bump(a.nama,it.qty,it.qty*a.harga));
});
console.log('Top: Nasi Goreng omzet (3*15000=45000)?', map['nasi goreng'].omzet===45000?'OK':'FAIL');
console.log('Top: Telur omzet (3*3000=9000)?', map['telur'].omzet===9000?'OK':'FAIL');
console.log('Top: Belacan omzet (3*2000=6000)?', map['belacan'].omzet===6000?'OK':'FAIL');

console.log('ALL DONE');
