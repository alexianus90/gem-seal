const el=id=>document.getElementById(id),N=6;
const dirs={l:[0,-1],r:[0,1],u:[-1,0],d:[1,0]};
const opposite={l:'r',r:'l',u:'d',d:'u'};
const stages=[
 {name:'First seal',rings:[[1,1,'A']],solve:[[2,'r']],moves:3,hint:'Swipe the row with the gold gem one step right.'},
 {name:'Double seal',rings:[[1,0,'A'],[1,3,'B']],solve:[[2,'l']],moves:3,hint:'Both rings can close with one swipe of their shared middle row.'},
 {name:'Cross shift',rings:[[0,1,'B'],[3,3,'C']],solve:[[2,'d'],[4,'r']],moves:4,hint:'Work on the upper ring first.'},
 {name:'Offset',rings:[[0,0,'C'],[3,3,'A']],solve:[[1,'r'],[4,'u'],[5,'l']],moves:4,hint:'Line up the top ring, then work on the lower one.'},
 {name:'Triple seal',rings:[[0,0,'A'],[0,3,'B'],[3,1,'C']],solve:[[1,'r'],[2,'l'],[2,'d']],moves:5,hint:'The upper rings share rows. Move those into place before sealing the lower ring.'}
];
let level=0,board,moves,left,selected=0,previous,phase,gesture,timer;
let swipes=0;
const rewards={D:0,E:2,F:3,G:4,H:0};
const isGem=piece=>Object.hasOwn(rewards,piece);
const cuts={
 A:[[50,1],[84,14],[98,50],[84,86],[50,99],[16,86],[2,50],[16,14]],
 B:[[50,0],[99,48],[50,100],[1,48]],
 C:[[25,3],[75,3],[98,23],[98,77],[75,97],[25,97],[2,77],[2,23]],
 D:[[25,8],[75,8],[98,34],[50,96],[2,34]],
 E:[[50,1],[96,25],[96,75],[50,99],[4,75],[4,25]],
 F:[[50,0],[98,78],[50,99],[2,78]],
 G:[[50,0],[67,30],[100,50],[67,70],[50,100],[33,70],[0,50],[33,30]]
};
const facetLight=[.6,.33,.11,-.28,-.46,-.19,.27,.56];
const gemFacets=Object.fromEntries(Object.entries(cuts).map(([piece,points])=>{
 const inner=points.map(([x,y])=>[50+(x-50)*.58,47+(y-50)*.58]);
 const polygon=vertices=>'polygon('+vertices.map(([x,y])=>x+'% '+y+'%').join(',')+')';
 const faces=points.map((point,i)=>{
  const next=(i+1)%points.length;
  return [polygon([point,points[next],inner[next],inner[i]]),facetLight[Math.floor(i*8/points.length)]];
 });
 return [piece,{outline:polygon(points),faces,table:polygon(inner)}];
}));
function decorateGem(mark,piece){
 const gem=gemFacets[piece==='H'?'D':piece];
 mark.className='jewel';mark.style.clipPath=gem.outline;
 for(const [shape,light] of [...gem.faces,[gem.table,.07]]){
  const facet=document.createElement('span');facet.className='facet';
  facet.style.clipPath=shape;
  facet.style.background=light>=0?'rgb(255 255 255 / '+light+')':'rgb(8 0 25 / '+(-light)+')';
  mark.append(facet);
 }
}
const colors={E:'Mint bonus gem, earns 2 moves',F:'Blue bonus gem, earns 3 moves',G:'Pink bonus gem, earns 4 moves',A:'Lavender',B:'Mint',C:'Amber',D:'Gold gem',H:'Anchored gem'};
function movableLine(source,line,horizontal){
 return Array.from({length:N},(_,i)=>horizontal?line*N+i:i*N+line).filter(i=>source[i]!=='H');
}
function shifted(source,line,d){
 const [dy,dx]=dirs[d],next=source.slice(),indices=movableLine(source,line,Boolean(dx));
 indices.forEach((i,n)=>{next[indices[(n+dy+dx+indices.length)%indices.length]]=source[i]});
 return next;
}
function initial(stage){
 let b=Array(N*N).fill('');
 for(const [y,x,color,gem='D'] of stage.rings)for(let j=0;j<3;j++)for(let i=0;i<3;i++)b[(y+j)*N+x+i]=i===1&&j===1?gem:color;
 for(const [line,d] of [...stage.solve].reverse())b=shifted(b,line,opposite[d]);
 return b;
}
const ringPositions=[];
for(let y=0;y<=N-3;y++)for(let x=0;x<=N-3;x++){
 const base=y*N+x;
 ringPositions.push({
  center:base+N+1,
  rim:[base,base+1,base+2,base+N+2,base+2*N+2,base+2*N+1,base+2*N,base+N]
 });
}
function ringMatches(b){
 return ringPositions.filter(({center})=>isGem(b[center])).map(({center,rim})=>{
  let a=0,c=0,g=0;
  for(const i of rim){
   if(b[i]==='A')a++;
   if(b[i]==='B')c++;
   if(b[i]==='C')g++;
  }
  return {center,rim,matched:Math.max(a,c,g)};
 });
}
function seals(b){
 return new Set(ringMatches(b).filter(({matched})=>matched===8).flatMap(({center,rim})=>[center,...rim]));
}
function generateLevels(){
 const seen=new Set(stages.map(stage=>initial(stage).join('.')));
 let seed=41597;
 const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed>>>8)%n};
 const layouts=[[[0,0],[0,3],[3,0],[3,3]],[[0,1],[3,0],[3,3]],[[1,0],[1,3]],[[0,0],[0,3],[3,1]]];
 while(stages.length<100){
  const index=stages.length,slots=layouts[rand(layouts.length)].slice();
  const count=Math.min(slots.length,index<15?2:index<45?3:4),rings=[];
  for(let i=0;i<count;i++){
   const [y,x]=slots.splice(rand(slots.length),1)[0];
   const bonus=index>=50?'G':index>=20?'F':'E';
   rings.push([y,x,['A','B','C'][(i+index)%3],i===0?bonus:'D']);
  }
  const steps=index<20?3:index<50?4:index<75?5:6;
  const solve=Array.from({length:steps},()=>[rand(N),['l','r','u','d'][rand(4)]]);
  const stage={name:'Puzzle '+(index+1),rings,solve,moves:steps+2,hint:'Seal matching rings. Bonus gems give you extra moves.'};
  let b=initial(stage);const key=b.join('.');
  if(seen.has(key)||seals(b).size)continue;
  let valid=true;
  for(const [line,d] of solve){
   const next=shifted(b,line,d);
   if(next.every((v,i)=>v===b[i])){valid=false;break}
   const hit=seals(next);b=next.map((v,i)=>hit.has(i)?'':v);
  }
  if(!valid||b.some(isGem))continue;
  stages.push(stage);seen.add(key);
 }
}
generateLevels();
// Preserve the existing generated boards outside the new tutorial and anchor levels.
stages.splice(0,10,
 {name:'First seal',rings:[[1,1,'A']],solve:[[2,'r']],moves:3,hint:'Drag the row with the gold gem one tile to the right.'},
 {name:'Down one',rings:[[1,2,'B']],solve:[[3,'d']],moves:3,hint:'Drag the column with the gold gem down one tile.'},
 {name:'Around the edge',rings:[[1,0,'C']],solve:[[2,'l']],moves:3,hint:'Drag the gem row left. The tile at the right edge wraps into the first slot.'},
 {name:'Cross shift',rings:[[0,0,'A'],[3,3,'B']],solve:[[1,'r'],[4,'u']],moves:4,hint:'Seal one gem with a row shift and the other with a column shift.'},
 {name:'Double seal',rings:[[1,0,'A'],[1,3,'B']],solve:[[2,'l']],moves:3,hint:'Both gems share a row. One swipe can seal them together.'},
 {name:'One move left',rings:[[0,0,'B','E'],[3,3,'A']],solve:[[1,'r'],[4,'u']],moves:1,hint:'Seal the mint gem first. Its two extra moves let you reach the gold gem.'},
 {name:'Fixed in place',rings:[[1,1,'C','H']],solve:[[2,'l']],moves:4,hint:'Swipe the row with the silver-set gem left. The gem stays fixed while tiles slide past it.'},
 {name:'Spend and earn',rings:[[0,3,'C','E'],[3,0,'B']],solve:[[4,'u'],[4,'l'],[0,'d']],moves:2,hint:'Seal the mint gem early. You need three swipes and start with two.'},
 {name:'Three seals',rings:[[0,0,'A'],[0,3,'B'],[3,1,'C']],solve:[[1,'r'],[2,'l'],[2,'d']],moves:5,hint:'Line up the upper rings, then look for a column shift.'},
 {name:'First milestone',rings:[[0,0,'B','E'],[0,3,'C'],[3,1,'A']],solve:[[0,'u'],[1,'l'],[3,'r'],[3,'d']],moves:2,hint:'Set up the mint gem, earn two moves, then try to close both remaining rings at once.'}
);
stages[25]={name:'Anchored',rings:[[1,1,'B','H']],solve:[[2,'l'],[2,'d']],moves:5,hint:'The silver-set gem stays put. Tiles slide past it as you build its ring.'};
stages[45]={name:'Two anchors',rings:[[1,0,'A','H'],[1,3,'C','H']],solve:[[2,'r'],[1,'u'],[4,'d']],moves:5,hint:'Both anchored gems stay fixed. Use their shared row and then their columns.'};
stages[70]={name:'Anchored trio',rings:[[0,0,'A','H'],[0,3,'B','G'],[3,1,'C','H']],solve:[[1,'r'],[2,'l'],[2,'d']],moves:5,hint:'Use the pink gem for extra moves and build around the two anchors.'};
for(const levelNumber of [9,12,17,22,31,36,41,51,56,61,66,76,81,86,91,96]){
 const stage=stages[levelNumber-1];
 for(let slot=0;slot<stage.rings.length;slot++){
  const [y,x,colour,gem='D']=stage.rings[slot];
  if(gem!=='D')continue;
  const rings=stage.rings.map((ring,i)=>i===slot?[y,x,colour,'H']:ring);
  const candidate={...stage,rings,hint:'Silver-set gems stay fixed. Slide the tiles around them to complete a ring.'};
  let position=initial(candidate),remaining=candidate.moves;
  if(seals(position).size)continue;
  for(const [line,direction] of candidate.solve){
   if(!remaining)break;
   const step=afterShift(position,line,direction);
   if(!step)break;
   position=step.next;remaining+=step.bonus-1;
  }
  if(!position.some(isGem)){
   stages[levelNumber-1]=candidate;
   break;
  }
 }
}
const themes=[
 ['#131329','#262447','#3b3562','#bfb1ff'],
 ['#241628','#412538','#60364d','#ffb5c8'],
 ['#1e1717','#382924','#594034','#ffd19a'],
 ['#15182d','#252e4b','#384970','#b4cbff'],
 ['#24172b','#3a2547','#573563','#e9b4ff'],
 ['#171d21','#2b393a','#3b5151','#b7dfdc'],
 ['#2b1824','#482738','#67384c','#ffc0c0'],
 ['#201b13','#3d3424','#564933','#f5d691'],
 ['#1c172c','#302545','#483767','#d7bbff'],
 ['#171821','#2c2c39','#424358','#c3c6f3']
];
function setTheme(index){
 const palette=themes[Math.floor(index/5)%themes.length];
 ['--page-base','--board-base','--tile-base','--accent'].forEach((name,i)=>document.body.style.setProperty(name,palette[i]));
}

let progress={level:0,won:[],records:{},sound:true,vibration:true,started:false};
try{progress={...progress,...JSON.parse(localStorage.getItem('slide-seal-progress')||'{}')}}catch{}
function save(){try{localStorage.setItem('slide-seal-progress',JSON.stringify(progress))}catch{}}
let audio;
function pulse(pattern){
 if(progress.vibration)navigator.vibrate?.(pattern);
}
function sound(notes,type='sine',volume=.09,duration=.17){

 if(!progress.sound)return;
 try{
  audio??=new (window.AudioContext||window.webkitAudioContext)();
  const play=()=>notes.forEach((frequency,i)=>{
   const t=audio.currentTime+i*.075,o=audio.createOscillator(),g=audio.createGain();
   o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);
   o.connect(g).connect(audio.destination);o.start(t);o.stop(t+duration);
  });
  if(audio.state==='running')play();else audio.resume().then(play).catch(()=>{});
 }catch{}
}
function openLevel(index){
 level=index;progress.level=index;progress.started=true;save();el('home').hidden=true;el('game').hidden=false;start();
}
function home(){
 stopCelebration();
 if(gesture)clearDrag(gesture);
 clearTimeout(timer);el('game').hidden=true;el('home').hidden=false;
 setTheme(0);
 el('playLabel').textContent=progress.started?'Play level '+(progress.level+1):'New game';
 el('homeCount').textContent=progress.won.length+' / '+stages.length;
}
function start(){
 stopCelebration();
 if(gesture)clearDrag(gesture);
 clearTimeout(timer);const stage=stages[level];board=initial(stage);moves=stage.moves;left=stage.rings.length;
 setTheme(level);
 swipes=0;
 selected=0;previous=null;phase='play';gesture=null;el('result').hidden=true;el('sealReward').hidden=true;note(stage.hint);render();
 [...el('grid').children].forEach((tile,i)=>{
  tile.classList.add('deal');tile.style.setProperty('--delay',((Math.floor(i/N)+i%N)*24)+'ms');
 });
 sound([392,523,659,784],'triangle',.055);pulse(16);
}
function note(s){el('status').textContent=s}
function play(d,index=selected,animated=false){
 if(phase!=='play'||gesture)return;
 const [dy,dx]=dirs[d],line=dx?Math.floor(index/N):index%N,next=shifted(board,line,d);
 if(next.every((v,i)=>v===board[i])){note('That line has nothing to shift. No move used.');return}
 previous={board,moves,left,selected};swipes++;sound([720,1020],'triangle',.047,.064);pulse(12);board=next;moves--;selected=index;
 const cleared=seals(board),count=[...cleared].filter(i=>isGem(board[i])).length;
 const bonus=[...cleared].reduce((sum,i)=>sum+(rewards[board[i]]||0),0);
 if(count){
  phase='anim';render(line,animated?null:d,cleared);drawSealTrace();
  if(bonus){
   const reward=el('sealReward');
   reward.textContent='+'+bonus+' moves';
   reward.hidden=false;
  }

  sound(bonus?[523,659,784,1047,1319]:[523,784,1047]);pulse(bonus?[22,35,28,35,45]:[22,32,26]);
  note((count===1?'Seal! One gem cleared.':count+' gems sealed in one swipe.')+(bonus?' +'+bonus+' moves.':''));
  timer=setTimeout(()=>{board=board.map((v,i)=>cleared.has(i)?'':v);left-=count;moves+=bonus;el('sealReward').hidden=true;settle()},bonus?820:580);
 }else{note('No seal yet. Line up matching pieces around a gem.');settle(line,animated?null:d)}
}
function settle(line,d){
 phase=left===0?'won':moves===0?'lost':'play';
 render(line,d);
 if(phase==='play')return;
 if(phase==='lost'){
  sound([390,290,196]);pulse([45,40,70]);
  el('roundLevel').textContent='Level '+(level+1);
  el('roundGems').textContent=(stages[level].rings.length-left)+' / '+stages[level].rings.length;
  el('roundSwipes').textContent=swipes;
  el('roundOver').showModal();
  return;
 }
 let milestone=0;
 if(!progress.won.includes(level)){
  progress.won.push(level);
  if(progress.won.length%10===0)milestone=progress.won.length;
 }
 const best=progress.records[level];
 progress.records[level]={best:Math.min(best?.best??Infinity,swipes)};
 progress.level=Math.min(level+1,stages.length-1);save();sound([660,880,1047]);pulse([22,45,40]);
 el('result').hidden=false;el('title').textContent='Board sealed';
 el('summary').textContent=milestone?milestone+' of '+stages.length+' levels cleared!':
  (level+1)%10===0?'Level '+(level+1)+' sealed!':'Every gem cleared.';
 el('next').textContent=level<stages.length-1?'Next puzzle':'Play again';
 celebrate(true,milestone||(level+1)%10===0);
}
let celebrationFrame=0;
function stopCelebration(){
 cancelAnimationFrame(celebrationFrame);
 celebrationFrame=0;
 el('fireworks').hidden=true;
}
function celebrate(won,milestone){
 stopCelebration();
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 if(!won||motion.matches)return;
 const canvas=el('fireworks'),ctx=canvas.getContext('2d');
 if(!ctx)return;
 canvas.hidden=false;
 const width=canvas.clientWidth,height=canvas.clientHeight;
 const ratio=Math.min(devicePixelRatio||1,1.5);
 canvas.width=Math.ceil(width*ratio);canvas.height=Math.ceil(height*ratio);
 ctx.scale(ratio,ratio);
 const colours=['#ffd174','#b5a6ff','#76f4df','#ff89bd','#82c9ff','#fff0bf'];
 const particles=[];
 const bursts=milestone?[
  [0,.16,.73],[.08,.84,.71],[.24,.22,.29],[.43,.78,.25],
  [.67,.5,.16],[.96,.13,.46],[1.05,.87,.46],[1.32,.5,.7]
 ]:[];
 const spread=Math.min(width,height);
 const fallTime=milestone?2.5:.9;
 const totalTime=milestone?3.3:1;
 function addParticle(x,y,vx,vy,born,life,size,colour,spark=false){
  particles.push({x,y,vx,vy,born,life,size,colour,spark,spin:(Math.random()-.5)*13});
 }
 bursts.forEach(([born,x,y],burst)=>{
  const count=44;
  for(let i=0;i<count;i++){
   const angle=(i/count)*Math.PI*2;
   const speed=spread*(.29+Math.random()*.36);
   addParticle(x*width,y*height,Math.cos(angle)*speed,Math.sin(angle)*speed,born,
    .8+Math.random()*.55,2+Math.random()*3,colours[(burst+i%3)%colours.length],true);
  }
 });
 const confettiCount=milestone?154:16;
 for(let i=0;i<confettiCount;i++){
  const fromEdge=i%3===0;
  const fromLeft=i%2===0;
  const x=fromEdge?(fromLeft?.04:.96):Math.random();
  const y=fromEdge?.8:-.04;
  const vx=fromEdge?(fromLeft?1:-1)*width*(.2+Math.random()*.45):(Math.random()-.5)*width*.42;
  const vy=fromEdge?-height*(.42+Math.random()*.55):height*(.15+Math.random()*.34);
  addParticle(x*width,y*height,vx,vy,Math.random()*(milestone?.8:.33),
   fallTime,4+Math.random()*6,colours[i%colours.length]);
 }
 const started=performance.now();
 function draw(now){
  const elapsed=(now-started)/1000;
  if(elapsed>=totalTime||motion.matches){stopCelebration();return}
  ctx.clearRect(0,0,width,height);
  for(const p of particles){
   const age=elapsed-p.born;
   if(age<0||age>=p.life)continue;
   const gravity=height*(p.spark?.36:.76);
   const x=p.x+p.vx*age,y=p.y+p.vy*age+gravity*age*age/2;
   if(x<-32||x>width+32||y<-32||y>height+32)continue;
   const fade=Math.min(1,(p.life-age)*3,(totalTime-elapsed)*4);
   ctx.globalAlpha=fade;
   if(p.spark){
    ctx.strokeStyle=p.colour;ctx.lineWidth=p.size;ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(x-p.vx*.09,y-(p.vy+gravity*age)*.09);
    ctx.lineTo(x,y);ctx.stroke();
    ctx.fillStyle='#fff7e6';ctx.fillRect(x-1,y-1,2,2);
   }else{
    ctx.save();ctx.translate(x,y);ctx.rotate(p.spin*age);
    ctx.fillStyle=p.colour;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*(.3+.6*Math.abs(Math.cos(age*8))));
    ctx.restore();
   }
  }
  ctx.globalAlpha=1;
  celebrationFrame=requestAnimationFrame(draw);
 }
 celebrationFrame=requestAnimationFrame(draw);
}
function undo(){
 if(!previous||!['play','lost'].includes(phase)||gesture)return;
 stopCelebration();
 ({board,moves,left,selected}=previous);previous=null;phase='play';el('result').hidden=true;note('Last move undone.');render();
}
function render(line,d,cleared=new Set()){
 el('stage').textContent=(level+1)+' / '+stages.length;
 el('moves').textContent=moves;el('gems').textContent=left+(left===1?' gem left':' gems left');
 renderControls();
 el('sealTrace').replaceChildren();
 const near=new Set(ringMatches(board).filter(({matched})=>matched===7).map(({center})=>center));
 el('grid').replaceChildren(...board.map((piece,i)=>{
  const b=document.createElement('button'),mark=document.createElement('i');b.className='tile';b.dataset.piece=piece;
  b.setAttribute('aria-label',(colors[piece]||'Empty')+', row '+(Math.floor(i/N)+1)+', column '+(i%N+1)+(near.has(i)?', one tile from a seal':''));
  b.setAttribute('aria-pressed',String(i===selected));if(i===selected)b.classList.add('pick');
  if(piece){decorateGem(mark,piece);b.append(mark)}
  if(near.has(i))b.classList.add('near-seal');
  if(cleared.has(i)){
   b.classList.add('flash');
   if(isGem(piece)){
    for(let n=0;n<8;n++){
     const spark=document.createElement('span');spark.className='seal-spark';
     spark.style.setProperty('--angle',n*45+'deg');b.append(spark);
    }
   }
  }
  else if(d){const [dy,dx]=dirs[d];if((dx?Math.floor(i/N):i%N)===line){b.classList.add('slide');b.style.setProperty('--sx',(-dx*28)+'%');b.style.setProperty('--sy',(-dy*28)+'%')}}
  b.onclick=()=>{if(phase==='play'&&!gesture){selected=i;for(const [j,tile] of [...el('grid').children].entries()){tile.classList.toggle('pick',j===i);tile.setAttribute('aria-pressed',String(j===i))}}};
  return b;
 }));
}
function drawSealTrace(){
 const svg=el('sealTrace'),frame=svg.getBoundingClientRect();
 for(const {rim,matched} of ringMatches(board)){
  if(matched!==8)continue;
  const points=rim.map(i=>{
   const r=el('grid').children[i].getBoundingClientRect();
   return (r.left+r.width/2-frame.left)+','+(r.top+r.height/2-frame.top);
  });
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d','M'+points.join(' L')+' Z');
  path.setAttribute('pathLength','1');svg.append(path);
 }
}
function afterShift(source,line,d){
 const next=shifted(source,line,d);
 if(next.every((v,i)=>v===source[i]))return null;
 const cleared=seals(next);
 let bonus=0;
 for(const i of cleared){bonus+=rewards[next[i]]||0;next[i]=''}
 return {next,bonus};
}
const grid=el('grid'), dragLayer=el('dragLayer');
function paintDrag(g,offset){
 for(const {clone,wrap,backward,forward} of g.copies){
  const distance=offset<0?backward:forward;
  const delta=offset*distance+wrap*g.pitch*N;
  clone.style.transform=g.horizontal?'translate3d('+delta+'px,0,0)':'translate3d(0,'+delta+'px,0)';
 }
}
function clearDrag(g){
 for(const tile of g.sources||[])tile.classList.remove('drag-source');
 dragLayer.replaceChildren();
 if(gesture===g)gesture=null;
}
function createDrag(g){
 const tiles=[...grid.children];
 tiles.forEach(tile=>tile.classList.remove('deal','slide'));
 const bounds=grid.getBoundingClientRect(),arena=grid.parentElement.getBoundingClientRect();
 const edge=tiles[0].getBoundingClientRect();
 const inset=edge.left-bounds.left;
 Object.assign(dragLayer.style,{
  left:bounds.left-arena.left+inset+'px',top:bounds.top-arena.top+inset+'px',
  width:bounds.width-2*inset+'px',height:bounds.height-2*inset+'px'
 });
 const frame=dragLayer.getBoundingClientRect();
 const first=tiles[0].getBoundingClientRect(),adjacent=tiles[g.horizontal?1:N].getBoundingClientRect();
 sound([255],'triangle',.032,.075);pulse(8);
 g.pitch=g.horizontal?adjacent.left-first.left:adjacent.top-first.top;
 const line=g.horizontal?Math.floor(g.index/N):g.index%N;
 const indices=movableLine(board,line,g.horizontal);
 g.sources=indices.map(i=>tiles[i]);
 const r=tiles[g.horizontal?line*N:line].getBoundingClientRect();
 const track=document.createElement('div');track.className='drag-track';
 Object.assign(track.style,g.horizontal?
  {left:'0',width:'100%',top:r.top-frame.top+'px',height:r.height+'px'}:
  {left:r.left-frame.left+'px',width:r.width+'px',top:'0',height:'100%'});
 dragLayer.append(track);
 g.copies=[];
 const slot=i=>g.horizontal?i%N:Math.floor(i/N);
 for(const [n,tile] of g.sources.entries()){
  const from=slot(indices[n]);
  const backward=(from-slot(indices[(n-1+indices.length)%indices.length])+N)%N;
  const forward=(slot(indices[(n+1)%indices.length])-from+N)%N;
  const r=tile.getBoundingClientRect();
  tile.classList.add('drag-source');
  for(const wrap of [-1,0,1]){
   const clone=tile.cloneNode(true);clone.classList.remove('drag-source','pick','slide','flash','deal','near-seal');clone.tabIndex=-1;
   Object.assign(clone.style,{left:r.left-frame.left+'px',top:r.top-frame.top+'px',width:r.width+'px',height:r.height+'px'});
   g.copies.push({clone,wrap,backward,forward});dragLayer.append(clone);
  }
 }
}
grid.onpointerdown=e=>{
 const tile=e.target.closest('.tile');
 if(!tile||phase!=='play'||gesture||e.button!==0)return;
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY,index:[...grid.children].indexOf(tile)};
 grid.setPointerCapture(e.pointerId);
};
grid.onpointermove=e=>{
 const g=gesture;if(!g||g.id!==e.pointerId||phase!=='play')return;
 const dx=e.clientX-g.x,dy=e.clientY-g.y;
 if(!g.copies){
  if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;
  g.horizontal=Math.abs(dx)>=Math.abs(dy);createDrag(g);
 }
 g.offset=Math.max(-g.pitch,Math.min(g.pitch,g.horizontal?dx:dy));paintDrag(g,g.offset);
 const armed=Math.abs(g.offset)>=Math.min(24,g.pitch*.38);
 if(armed&&!g.armed){sound([470],'triangle',.027,.06);pulse(8)}
 g.armed=armed;
};
function releaseDrag(e,cancelled){
 const g=gesture;if(!g||g.id!==e.pointerId||phase!=='play')return;
 if(!g.copies){
  clearDrag(g);
  if(!cancelled)grid.children[g.index]?.click();
  return;
 }
 const step=!cancelled&&Math.abs(g.offset)>=Math.min(24,g.pitch*.38)?Math.sign(g.offset):0;
 const direction=g.horizontal?(step>0?'r':'l'):(step>0?'d':'u');
 phase='drag';renderControls();
 const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:190;
 for(const {clone} of g.copies)clone.style.transition='transform '+duration+'ms cubic-bezier(.22,.72,.25,1)';
 paintDrag(g,step*g.pitch);
 if(!step&&!cancelled)sound([240],'sine',.027,.08);
 timer=setTimeout(()=>{
  clearDrag(g);phase='play';renderControls();
  if(step)play(direction,g.index,true);
 },duration);
}
grid.onpointerup=e=>releaseDrag(e,false);
grid.onpointercancel=grid.onlostpointercapture=e=>releaseDrag(e,true);
function renderControls(){
 el('undo').disabled=!previous||phase!=='play';
}
el('next').onclick=()=>{if(phase==='won')openLevel((level+1)%stages.length)};
el('undo').onclick=undo;
el('roundOver').addEventListener('cancel',event=>event.preventDefault());
el('playAgain').onclick=()=>{el('roundOver').close();openLevel(0)};
el('roundHome').onclick=()=>{el('roundOver').close();home()};
el('rescue').onclick=()=>{if(phase==='lost')el('adDemo').showModal()};
el('adReward').onclick=()=>{
 if(phase!=='lost')return;
 el('adDemo').close();el('roundOver').close();moves+=3;previous=null;phase='play';el('result').hidden=true;note('Rescued! +3 moves.');sound([523,784]);render();
};
el('continue').onclick=()=>openLevel(progress.level);
el('homeButton').onclick=()=>{el('preferences').close();home()};
let levelsFromSettings=false;
function openLevels(fromSettings=false){
 levelsFromSettings=fromSettings;
 if(fromSettings)el('preferences').close();
 el('levelGrid').replaceChildren(...stages.map((_,i)=>{
  const b=document.createElement('button'),record=progress.records[i];
  b.textContent=i+1;b.dataset.won=progress.won.includes(i);
  if(record){
   const best=document.createElement('small');best.textContent=record.best+(record.best===1?' move':' moves');b.append(best);
  }
  b.setAttribute('aria-label','Level '+(i+1)+(b.dataset.won==='true'?', cleared':'')+
   (record?', best '+record.best+(record.best===1?' move':' moves'):''));
  b.onclick=()=>{levelsFromSettings=false;el('levelPicker').close();openLevel(i)};return b;
 }));
 el('levelPicker').showModal();
}
el('levels').onclick=()=>openLevels();
el('settingsLevels').onclick=()=>openLevels(true);
el('levelPicker').addEventListener('close',()=>{
 if(levelsFromSettings){levelsFromSettings=false;openSettings()}
});
el('how').onclick=()=>el('guide').showModal();
function openSettings(){
 el('sound').checked=progress.sound;el('vibration').checked=progress.vibration;
 el('vibration').disabled=typeof navigator.vibrate!=='function';el('vibrationNote').hidden=!el('vibration').disabled;
 el('homeButton').hidden=el('game').hidden;el('preferences').showModal();
}
el('settings').onclick=el('playSettings').onclick=openSettings;
el('sound').onchange=()=>{progress.sound=el('sound').checked;save();if(progress.sound)sound([660])};
el('vibration').onchange=()=>{progress.vibration=el('vibration').checked;save();pulse(25)};
el('settingsGuide').onclick=()=>{el('preferences').close();el('guide').showModal();el('guide').addEventListener('close',openSettings,{once:true})};
el('more').onclick=()=>{el('preferences').close();el('moreSettings').showModal()};
el('backSettings').onclick=()=>{el('moreSettings').close();openSettings()};
const info={
 contact:['Contact us','Send your feedback in the chat where you opened the prototype. Include the level number and what happened.'],
 support:['Help & support','Drag along a row or column to shift it. Seal a gem with eight matching tiles. If a gesture behaves unexpectedly, include your device and level number when reporting it.'],
 terms:['Terms of use','Gem Seal is a playable prototype for testing. Puzzle progress and features may change during development.'],
 privacy:['Privacy information','The game saves completed levels and preferences in this browser. The rescue ad is simulated.'],
 about:['About Gem Seal','A sliding puzzle with 100 levels. Wrap rows and columns around the board to close rings and collect gems.'],
 adPrivacy:['Ad privacy choices','This prototype has no live ad network or ad personalisation settings. The rescue preview simulates the reward.'],
 adReport:['Report an ad','The rescue preview does not display a live ad. To report a problem with the preview, use Contact us and include your level number.']
};
function showInfo(title,body,sharing=false){
 el('moreSettings').close();el('infoTitle').textContent=title;el('infoBody').textContent=body;
 el('copyStatus').textContent='';el('shareField').hidden=el('copyInfo').hidden=!sharing;el('info').showModal();
}
document.querySelectorAll('[data-info]').forEach(b=>b.onclick=()=>showInfo(...info[b.dataset.info]));
el('backMore').onclick=()=>{el('info').close();el('moreSettings').showModal()};
el('shareGame').onclick=()=>{
 el('shareLink').value='https://slide-seal-mobile-mwf57p1u.alex-747.chatgpt.site';showInfo('Share with friends','Copy the link to send to a friend.',true);
};
el('copyInfo').onclick=async()=>{
 try{await navigator.clipboard.writeText(el('shareLink').value);el('copyStatus').textContent='Link copied.'}
 catch{el('shareLink').select();el('copyStatus').textContent='Select and copy the link.'}
};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>el(b.dataset.close).close();
addEventListener('keydown',e=>{const d={ArrowLeft:'l',ArrowRight:'r',ArrowUp:'u',ArrowDown:'d'}[e.key];if(d&&!document.querySelector('dialog[open]')&&!el('game').hidden&&phase==='play'){e.preventDefault();play(d)}});
home();
