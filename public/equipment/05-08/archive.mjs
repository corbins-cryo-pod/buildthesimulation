// Portable uncompressed ZIP, local UTF-8 entries with standardized CRC32.
// This is a data export, not a program archive; entry names are fixed callers.
const utf=new TextEncoder();
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^(c&1?0xedb88320:0);}return (~c)>>>0;}
export function makeStudyZIP(result,png){
 const entries=[['fit.json',utf.encode(JSON.stringify(result,null,2)+'\n')],['sensor.png',png]],local=[],central=[];let offset=0,dirSize=0;
 const packet=size=>{const bytes=new Uint8Array(size),v=new DataView(bytes.buffer);return {bytes,u16:(n,x)=>v.setUint16(n,x,true),u32:(n,x)=>v.setUint32(n,x,true)}};
 for(const [n,p] of entries){
  const name=utf.encode(n),c=crc(p);
  const h=packet(30+name.length);h.u32(0,0x04034b50);h.u16(4,20);h.u16(12,0x21);h.u32(14,c);h.u32(18,p.length);h.u32(22,p.length);h.u16(26,name.length);h.bytes.set(name,30);local.push(h.bytes,p);
  const d=packet(46+name.length);d.u32(0,0x02014b50);d.u16(4,20);d.u16(6,20);d.u16(14,0x21);d.u32(16,c);d.u32(20,p.length);d.u32(24,p.length);d.u16(28,name.length);d.u32(42,offset);d.bytes.set(name,46);central.push(d.bytes);
  offset+=h.bytes.length+p.length;dirSize+=d.bytes.length;
 }
 const e=packet(22);e.u32(0,0x06054b50);e.u16(8,entries.length);e.u16(10,entries.length);e.u32(12,dirSize);e.u32(16,offset);
 return new Blob([...local,...central,e.bytes],{type:'application/zip'});
}
