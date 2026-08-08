import { readFileSync } from 'fs';
import zlib from 'zlib';
const data = readFileSync('public/assets/green-collage.png');
let offset=8, width=0,height=0,bitDepth=0,colorType=0; let idat=Buffer.alloc(0);
while(offset<data.length){
 const length=data.readUInt32BE(offset);
 const type=data.toString('ascii',offset+4,offset+8);
 const chunkData=data.subarray(offset+8,offset+8+length);
 if(type==='IHDR'){width=chunkData.readUInt32BE(0);height=chunkData.readUInt32BE(4);bitDepth=chunkData[8];colorType=chunkData[9];}
 else if(type==='IDAT'){idat=Buffer.concat([idat,chunkData]);}
 offset+=12+length;
}
const rawData=zlib.inflateSync(idat);
const channels = colorType===6?4:colorType===2?3:1;
const bpp=(channels*bitDepth)/8;
const stride=width*bpp;
const pixelData=Buffer.alloc(height*stride);
let prevRow=Buffer.alloc(stride);
for(let y=0;y<height;y++){
 const filterType=rawData[y*(stride+1)];
 const rowStart=y*stride;
 const rawRowStart=y*(stride+1)+1;
 const row=rawData.subarray(rawRowStart,rawRowStart+stride);
 for(let i=0;i<stride;i++){
  const raw=row[i]; let result;
  switch(filterType){
   case 0: result=raw; break;
   case 1: result=raw+(i>=bpp?pixelData[rowStart+i-bpp]:0); break;
   case 2: result=raw+(y>0?prevRow[i]:0); break;
   case 3: result=raw+Math.floor(((i>=bpp?pixelData[rowStart+i-bpp]:0)+(y>0?prevRow[i]:0))/2); break;
   case 4: {
     const a=i>=bpp?pixelData[rowStart+i-bpp]:0;
     const b=y>0?prevRow[i]:0;
     const c=(i>=bpp&&y>0)?prevRow[i-bpp]:0;
     const p=a+b-c; const pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
     result=raw+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);
     break;
   }
   default: result=raw;
  }
  pixelData[rowStart+i]=result&0xff;
 }
 prevRow=pixelData.subarray(rowStart,rowStart+stride);
}
const getPixel=(x,y)=>{const idx=y*stride+x*bpp; return [pixelData[idx],pixelData[idx+1],pixelData[idx+2]];};
const isBg=(x,y)=>{const [r,g,b]=getPixel(x,y); return (r>200&&g>200&&b>200);};
for(const y of [500,600,700,900,1100,1300,1340]){
 let xStart=-1,xEnd=-1;
 for(let x=0;x<width;x++){ if(isBg(x,y)){xStart=x;break;} }
 for(let x=width-1;x>=0;x--){ if(isBg(x,y)){xEnd=x;break;} }
 console.log('y='+y+' xStart='+xStart+' xEnd='+xEnd);
}
console.log('---top boundary at x=590---');
for(let y=460;y<480;y++){const [r,g,b]=getPixel(590,y); console.log('x=590,y='+y+' rgb=('+r+','+g+','+b+')');}
console.log('---bottom boundary at x=590---');
for(let y=1330;y<1355;y++){const [r,g,b]=getPixel(590,y); console.log('x=590,y='+y+' rgb=('+r+','+g+','+b+')');}
console.log('---left boundary at y=900---');
for(let x=0;x<40;x++){const [r,g,b]=getPixel(x,900); console.log('x='+x+',y=900 rgb=('+r+','+g+','+b+')');}
console.log('---right boundary at y=900---');
for(let x=1140;x<1181;x++){const [r,g,b]=getPixel(x,900); console.log('x='+x+',y=900 rgb=('+r+','+g+','+b+')');}

// Find the black border rectangle precisely
const isBlack = (x,y) => { const [r,g,b]=getPixel(x,y); return r<60&&g<60&&b<60; };
// scan for topmost row that has a long horizontal run of black pixels
console.log('--- scanning for top border row ---');
for (let y = 440; y < 480; y++) {
  let count = 0;
  for (let x = 0; x < width; x += 2) if (isBlack(x, y)) count++;
  if (count > 100) console.log('y=' + y + ' blackCount=' + count);
}
console.log('--- scanning for bottom border row ---');
for (let y = 1330; y < 1360; y++) {
  let count = 0;
  for (let x = 0; x < width; x += 2) if (isBlack(x, y)) count++;
  if (count > 100) console.log('y=' + y + ' blackCount=' + count);
}
console.log('--- scanning for left border col (within box y 468-1342), lower threshold ---');
for (let x = 0; x < 60; x++) {
  let count = 0;
  for (let y = 468; y < 1342; y += 1) if (isBlack(x, y)) count++;
  console.log('x=' + x + ' blackCount=' + count);
}
console.log('--- scanning for right border col (within box y 468-1342) ---');
for (let x = 1120; x < width; x++) {
  let count = 0;
  for (let y = 468; y < 1342; y += 1) if (isBlack(x, y)) count++;
  if (count > 400) console.log('x=' + x + ' blackCount=' + count);
}

console.log('--- x=27 column scan for black gaps ---');
let inBlack = false, start=0;
for (let y = 460; y < 1350; y++) {
  const b = isBlack(27, y);
  if (b && !inBlack) { inBlack = true; start = y; }
  if (!b && inBlack) { inBlack = false; console.log('black run y=' + start + ' to ' + y); }
}
if (inBlack) console.log('black run y=' + start + ' to 1350(end)');

console.log('--- For each y, find first dark pixel (r<100) x from left ---');
const isDark = (x,y) => { const [r,g,b]=getPixel(x,y); return r<100&&g<100&&b<100; };
for (let y = 468; y < 1345; y += 20) {
  let fx = -1;
  for (let x = 0; x < 60; x++) { if (isDark(x, y)) { fx = x; break; } }
  console.log('y=' + y + ' firstDarkX=' + fx);
}
console.log('--- For each y, find last dark pixel (r<100) x from right side (1100-1181) ---');
for (let y = 468; y < 1345; y += 20) {
  let fx = -1;
  for (let x = width - 1; x >= 1100; x--) { if (isDark(x, y)) { fx = x; break; } }
  console.log('y=' + y + ' lastDarkX=' + fx);
}
