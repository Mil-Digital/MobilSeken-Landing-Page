// Tombol "Kirim ke MS Garage" (bookmarklet) yang dijalankan tim di OLX, di browser mereka sendiri.
// - Di halaman iklan  (/item/...-iid-123): kirim iklan itu.
// - Di halaman profil (/profile/44649495): kirim semua iklan milik profil itu yang terbaca di halaman.
// Data dibaca dari state yang sudah ada di halaman (window.__APP.states.items.elements), lalu tombol
// pindah ke /admin/impor dengan data di bagian "#" URL. Tidak ada yang tersimpan sampai tim menekan Simpan.
//
// PENTING: kode di bawah ini sengaja satu string tanpa komentar. Saat link disimpan sebagai bookmark,
// browser menghapus semua baris baru, jadi komentar "//" akan memutus kode. Logika ringkasnya harus sama
// dengan compactAd() di parse.ts — dijaga oleh tests/olx.test.ts.

const CODE = String.raw`function(o){try{
var P=location.pathname;
if(!/(^|\.)olx\.co\.id$/.test(location.hostname)){alert("Buka halaman iklan atau profil MS Garage di olx.co.id, lalu ketuk tombol ini.");return}
var A=window.__APP,st=A&&A.states;
if(!st){var ss=document.scripts,src="";for(var k=0;k<ss.length;k++){var t=ss[k].textContent||"";if(t.indexOf("window.__APP")>-1){src=t;break}}
if(src){var i=src.indexOf("{",src.indexOf("states:")),d=0,q=false,e=false;for(var j=i;j<src.length;j++){var c=src[j];if(q){if(e)e=false;else if(c==="\\")e=true;else if(c==='"')q=false}else if(c==='"')q=true;else if(c==="{"||c==="[")d++;else if(c==="}"||c==="]"){d--;if(d===0){st=JSON.parse(src.slice(i,j+1));break}}}}}
var E=(st&&st.items&&st.items.elements)||{};
var s=function(v){return v==null?"":String(v)};
var C=function(a){return{id:String(a.id),title:s(a.title),description:s(a.description),price:(a.price&&a.price.value&&a.price.value.raw)||null,images:(a.images||[]).map(function(x){return[String(x.external_id),Number(x.width)||0,Number(x.height)||0]}),params:(a.parameters||[]).map(function(x){return[String(x.key),s(x.value),s(x.formatted_value)]}),status:(a.status&&a.status.status)||null,user:a.user_id!=null?String(a.user_id):null,created:a.created_at_first||a.created_at||null}};
var p,m=P.match(/iid-(\d+)/),u=P.match(/\/profile\/(\d+)/);
if(m){var ad=E[m[1]];if(!ad){alert("Data iklan belum terbaca. Muat ulang (refresh) halaman iklan ini, lalu ketuk tombol lagi.");return}p={v:1,url:location.origin+P,ad:C(ad)}}
else if(u){var L=[];for(var key in E){var a=E[key];if(a&&a.title&&String(a.user_id)===u[1]){var slug=s(a.title).toLowerCase().replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-");L.push({v:1,url:"https://www.olx.co.id/item/"+slug+"-iid-"+a.id,ad:C(a)})}}
if(!L.length){alert("Daftar iklan belum terbaca di halaman profil ini. Muat ulang halaman profil lalu coba lagi, atau kirim dari halaman masing-masing iklan.");return}p={v:1,bulk:L}}
else{alert("Buka halaman iklan atau profil OLX MS Garage, lalu ketuk tombol ini.");return}
var b=btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
location.href=o+"/admin/impor#d="+b
}catch(err){alert("Gagal membaca data OLX: "+(err&&err.message))}}`;

/** Kode bookmarklet siap pasang untuk origin situs ini (satu baris, ter-encode aman). */
export function bookmarkletHref(origin: string) {
  const oneLine = CODE.replace(/\n/g, "");
  return "javascript:" + encodeURIComponent(`(${oneLine})(${JSON.stringify(origin)});void 0`);
}

/** Jalankan kode bookmarklet persis seperti di browser (dipakai test). */
export function runBookmarklet(origin: string) {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function(`return (${CODE.replace(/\n/g, "")})`)() as (o: string) => void;
  fn(origin);
}

/** Dekode isi "#d=..." dari halaman impor. */
export function decodePayload(hash: string): unknown {
  const raw = hash.replace(/^#/, "").split("&").find((s) => s.startsWith("d="))?.slice(2);
  if (!raw) return null;
  const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
