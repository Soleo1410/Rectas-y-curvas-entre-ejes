(function(){
var $=function(s){return document.querySelector(s)};
var S={th:90,n:10,curve:true,grid:true,anim:false,col:{},off:{},sel:null,tab:'info'};
var svg=$('#cv'),scene=$('#scene'),hd=$('#hd'),V={ox:0,oy:0,sc:1};
var rad=function(d){return d*Math.PI/180};
var f=function(v){return String(+v.toFixed(2)).replace('.',',')};

/* Colores iniciales */
var DEF={ex:'#1d4ed8',ey:'#0f766e',curve:'#ff4d6d',ang:'#f59e0b'};
var NAME={ex:'Eje x (horizontal)',ey:'Eje y (inclinado)',curve:'La curva',ang:'Ángulo entre los ejes'};
var PAL=['#1d4ed8','#0f766e','#16a34a','#f59e0b','#ff4d6d','#c026d3','#7c3aed','#17214d'];

function isLine(id){return /^l\d+$/.test(id)}
function lineAuto(i){return 'hsl('+(205+(i-1)/Math.max(1,S.n-1)*140)+',68%,46%)'}
function colOf(id){if(S.col[id])return S.col[id];return isLine(id)?lineAuto(+id.slice(1)):DEF[id]}
function name(id){return isLine(id)?'Recta '+id.slice(1):NAME[id]}

function render(){
  var w=svg.clientWidth,h=svg.clientHeight;if(!w||!h)return;
  var n=S.n,L=n+1,c=Math.cos(rad(S.th)),s=Math.sin(rad(S.th));
  
  /* Ajuste de escala elástica para evitar colapsos en 0° y 180° */
  var minx=Math.min(0,L*c),maxx=Math.max(L,L*c);
  var bw=Math.max(L,maxx-minx);
  var bh=Math.max(15,L*Math.abs(s)); // Se mantiene una altura mínima de referencia
  var M=36;
  
  // Escala balanceada horizontal y verticalmente sin saltos bruscos
  var scX=(w-2*M)/bw;
  var scY=(h-2*M-16)/Math.max(bh,L*0.45);
  var sc=Math.min(scX,scY);
  V.sc=sc;
  
  V.ox=(w-sc*bw)/2-sc*minx;
  V.oy=(h/2)+(sc*bh*0.4); // Centrado dinámico suave

  function P(x,y){return [V.ox+sc*(x+y*c),V.oy-sc*y*s]}
  function pt(p){return p[0].toFixed(1)+','+p[1].toFixed(1)}
  function seg(a,b){return 'M'+pt(a)+'L'+pt(b)}
  function el(id,d,width,extra){
    var col=colOf(id),sel=S.sel===id,dim=S.off[id]?' dim':'';
    return '<g data-id="'+id+'" class="g'+dim+'">'+
      (sel?'<path class="vis" d="'+d+'" stroke="'+col+'" stroke-width="'+(width+7)+'" opacity=".25"/>':'')+
      '<path class="vis" d="'+d+'" stroke="'+col+'" stroke-width="'+(sel?width+1.5:width)+'" '+(extra||'')+'/>'+
      '<path class="hit" d="'+d+'"/></g>';
  }
  
  var o='';
  if(S.grid && s>0.05){
    var g='';
    for(var k=1;k<=n;k++){g+=seg(P(k,0),P(k,L-k))+seg(P(0,k),P(L-k,k))}
    o+='<path d="'+g+'" stroke="#cfd8e8" stroke-width="1" fill="none"/>';
  }
  
  /* ===== ÁNGULO ===== */
  var r=Math.min(46,sc*L*.3),O=P(0,0),ac=colOf('ang');
  var ma=rad(S.th/2),lr=r*1.45;
  if(S.th>0.5){
    var sweep=S.th>180?1:0;
    var ad='M'+pt(O)+'L'+(O[0]+r).toFixed(1)+','+O[1].toFixed(1)+'A'+r+','+r+' 0 '+sweep+' 0 '+(O[0]+r*c).toFixed(1)+','+(O[1]-r*s).toFixed(1)+'Z';
    o+='<g data-id="ang" class="g'+(S.off.ang?' dim':'')+'"><path d="'+ad+'" fill="'+ac+'" fill-opacity="'+(S.sel==='ang'?.55:.28)+'" stroke="'+ac+'" stroke-width="1.5"/></g>';
    o+='<text x="'+(O[0]+lr*Math.cos(ma)).toFixed(1)+'" y="'+(O[1]-lr*Math.sin(ma)+4).toFixed(1)+'" text-anchor="middle" style="font-weight:700;fill:#b45309;font-size:13px">'+Math.round(S.th)+'°</text>';
  } else {
    o+='<text x="'+(O[0]+28).toFixed(1)+'" y="'+(O[1]-12).toFixed(1)+'" text-anchor="middle" style="font-weight:700;fill:#b45309;font-size:13px">0° (Superpuestos)</text>';
  }

  /* ===== CURVA ===== */
  if(S.curve){
    var d='';
    for(var i=0;i<=80;i++){var t=i/80,p=P(L*t*t,L*(1-t)*(1-t));d+=(i?'L':'M')+pt(p)}
    o+=el('curve',d,3.5);
  }

  /* ===== RECTAS ===== */
  for(var j=1;j<=n;j++){o+=el('l'+j,seg(P(j,0),P(0,L-j)),2.2)}

  /* ===== EJES ===== */
  o+=el('ex',seg(P(0,0),P(L,0)),3.5);
  o+=el('ey',seg(P(0,0),P(0,L)),3.5);

  /* ===== PUNTOS EN LOS EJES ===== */
  for(var q=1;q<=n;q++){
    var a=P(q,0),b=P(0,L-q),cc=colOf('l'+q),dm=S.off['l'+q]?' class="dim"':'';
    o+='<g'+dm+' style="pointer-events:none"><circle cx="'+a[0].toFixed(1)+'" cy="'+a[1].toFixed(1)+'" r="4.5" fill="'+cc+'" stroke="#fff" stroke-width="1.5"/><circle cx="'+b[0].toFixed(1)+'" cy="'+b[1].toFixed(1)+'" r="4.5" fill="'+cc+'" stroke="#fff" stroke-width="1.5"/></g>';
  }

  /* ===== NÚMEROS ===== */
  var st=n>24?5:n>13?2:1;
  for(var m=st;m<=L;m+=st){
    var px=P(m,0),py=P(0,m);
    o+='<text x="'+px[0].toFixed(1)+'" y="'+(px[1]+16).toFixed(1)+'" text-anchor="middle">'+m+'</text>';
    if(S.th>5 && S.th<175){
      o+='<text x="'+(py[0]-9).toFixed(1)+'" y="'+(py[1]+4).toFixed(1)+'" text-anchor="end">'+m+'</text>';
    }
  }

  scene.innerHTML=o;
  var hp=P(0,L);
  hd.setAttribute('transform','translate('+hp[0].toFixed(1)+','+hp[1].toFixed(1)+')');
  updateCharExpression();
}

/* Panel de información matemático seguro */
function info(id){
  var n=S.n,L=n+1,th=S.th,c=Math.cos(rad(th)),s=Math.sin(rad(th));
  var tipo=th===0?'nulo (0°)':th===180?'llano (180°)':th<89.5?'agudo (< 90°)':th>90.5?'obtuso (> 90°)':'recto (90°)';
  if(id==='ex')return '<p>Eje horizontal con los puntos <b>1, 2, … '+n+'</b>.</p>';
  if(id==='ey')return '<p>Eje móvil: forma un ángulo de <b>'+Math.round(th)+'°</b> con el eje x.</p>';
  if(id==='ang')return '<p>Ángulo entre los ejes: <b>'+Math.round(th)+'°</b> ('+tipo+').</p>'+(th===0?'<p>En 0°, los dos ejes se superponen sobre la misma semirrecta.</p>':th===180?'<p>En 180°, forman una recta completa (sentidos opuestos).</p>':'');
  if(id==='curve')return '<p>Envolvente parábolica. Al llegar a 0° o 180° la curva colapsa en un segmento recto continuo.</p>';
  
  var i=+id.slice(1),a=i,b=L-i;
  var len=Math.sqrt(a*a+b*b-2*a*b*c);
  var den=b*c-a;
  var cart=Math.abs(den)<1e-4?'x = '+f(a):Math.abs(s)<1e-4?'Superpuesta sobre el eje x':'y = '+f(b*s/den)+' · (x − '+a+')';
  return '<p>Segmento de ('+a+', 0) a (0, '+b+').</p><p>Longitud: <b>'+f(len)+'</b></p><p>Ecuación: <code>'+cart+'</code></p>';
}

function sheet(){
  var id=S.sel;if(!id)return;
  $('#stitle').textContent=name(id);$('#sdot').style.background=colOf(id);
  $('#tvis').textContent=S.off[id]?'Mostrar':'Atenuar';
  var bs=document.querySelectorAll('#stabs button');
  for(var i=0;i<bs.length;i++)bs[i].classList.toggle('on',bs[i].dataset.t===S.tab);
  var b=$('#sbody');
  if(S.tab==='info')b.innerHTML=info(id);
  else if(S.tab==='color'){
    var h='<div class="sw">';
    PAL.forEach(function(p){h+='<button class="c" data-c="'+p+'" style="background:'+p+'" aria-label="Color '+p+'"></button>'});
    h+='<input type="color" id="cpick" value="'+hex(colOf(id))+'" aria-label="Otro color"></div>';
    if(isLine(id))h+='<div class="btns" style="margin-top:10px"><button id="cAll">Pintar todas las rectas de este color</button></div>';
    b.innerHTML=h;
  } else b.innerHTML='<p>'+(S.off[id]?'Se muestra atenuada. Tocá “Mostrar” para devolverle su color.':'Se atenúa para que veas mejor las demás.')+'</p>';
}

function hex(c){if(c[0]==='#')return c;var m=c.match(/hsl\(([\d.]+),(\d+)%,(\d+)%/);if(!m)return '#000000';
  var H=+m[1]/360,Sx=m[2]/100,Lx=m[3]/100,q=Lx<.5?Lx*(1+Sx):Lx+Sx-Lx*Sx,p=2*Lx-q;
  function t(x){if(x<0)x+=1;if(x>1)x-=1;return x<1/6?p+(q-p)*6*x:x<.5?q:x<2/3?p+(q-p)*(2/3-x)*6:p}
  return '#'+[t(H+1/3),t(H),t(H-1/3)].map(function(v){return ('0'+Math.round(v*255).toString(16)).slice(-2)}).join('')}
function open(id){S.sel=id;S.tab='info';$('#ctrl').hidden=true;$('#sheet').hidden=false;sheet();render()}
function close(){S.sel=null;$('#sheet').hidden=true;$('#ctrl').hidden=false;render()}

/* Eventos */
scene.addEventListener('click',function(e){var g=e.target.closest('[data-id]');if(g)open(g.dataset.id);else if(S.sel)close()});
$('#stabs').addEventListener('click',function(e){var t=e.target.dataset.t;if(!t)return;
  if(t==='close')return close();
  if(t==='vis'){S.off[S.sel]=!S.off[S.sel];S.tab='vis';render();return sheet()}
  S.tab=t;sheet()});
$('#sbody').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  if(b.dataset.c){S.col[S.sel]=b.dataset.c;render();sheet();S.tab='color'}
  if(b.id==='cAll'){var cc=colOf(S.sel);for(var i=1;i<=S.n;i++)S.col['l'+i]=cc;render()}
});
$('#sbody').addEventListener('input',function(e){if(e.target.id==='cpick'){S.col[S.sel]=e.target.value;render();$('#sdot').style.background=e.target.value}});

function sync(){
  var t=Math.round(S.th);$('#th').value=t;$('#thv').textContent=t+'°';
  $('#n').value=S.n;$('#nv').textContent=S.n;
  render();if(S.sel&&S.tab==='info')sheet();
}
$('#th').addEventListener('input',function(e){S.anim=false;pa();S.th=+e.target.value;sync()});
$('#n').addEventListener('input',function(e){S.n=+e.target.value;sync()});

/* Botones rápidos incluyendo 0° y 180° */
$('#pre').innerHTML='';
[0, 45, 90, 135, 180].forEach(function(a){
  var b=document.createElement('button');b.textContent=a+'°';
  b.onclick=function(){S.anim=false;pa();S.th=a;sync()};$('#pre').appendChild(b)});

function tog(id,key){$(id).onclick=function(){S[key]=!S[key];this.setAttribute('aria-pressed',S[key]);if(key==='anim'){if(S.anim)loop()}render()}}
tog('#bCurve','curve');tog('#bGrid','grid');tog('#bAnim','anim');
$('#bReset').onclick=function(){S.col={};S.off={};render();if(S.sel)sheet()};
function pa(){$('#bAnim').setAttribute('aria-pressed',S.anim)}

/* Arrastre suave con límites ampliados [0°, 180°] */
var drag=false;
hd.addEventListener('pointerdown',function(e){drag=true;S.anim=false;pa();hd.setPointerCapture(e.pointerId);e.preventDefault()});
hd.addEventListener('pointermove',function(e){if(!drag)return;
  var r=svg.getBoundingClientRect(),dx=e.clientX-r.left-V.ox,dy=V.oy-(e.clientY-r.top);
  var deg=Math.atan2(dy,dx)*180/Math.PI;
  if(deg<0){deg=dx>=0?0:180} // Suaviza el límite inferior si el puntero baja del eje
  S.th=Math.max(0,Math.min(180,deg));
  sync()});
hd.addEventListener('pointerup',function(){drag=false});
hd.addEventListener('pointercancel',function(){drag=false});

/* Animación continua de 0° a 180° */
var dir=1,last=0;
function loop(){last=performance.now();requestAnimationFrame(step)}
function step(t){
  if(!S.anim)return;
  var dt=Math.min(.05,(t-last)/1000);last=t;
  S.th+=dir*26*dt;
  if(S.th>=180){S.th=180;dir=-1}
  if(S.th<=0){S.th=0;dir=1}
  sync();requestAnimationFrame(step)}
if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)$('#bAnim').hidden=true;

/* ============================================================
   TRIANGULÍN: REACCIONES A 0° Y 180°
============================================================ */
var ch=$('#char'),chMouth=$('#char-mouth'),chSpeech=$('#char-speech');
var armL=$('#arm-l'),armR=$('#arm-r'),body=$('#char-body');
var charPos={x:75,y:75},charDrag=false,charOffset={x:0,y:0};

function updateCharPos(){ch.setAttribute('transform','translate('+charPos.x+','+charPos.y+')')}

function updateCharExpression(){
  var th=Math.round(S.th);
  if(th===0){
    // Caso extremo: 0°
    chMouth.setAttribute('d','M -6 28 L 6 28'); // Boca plana / aplastado
    chSpeech.textContent='¡Auxilio! ¡0° colapsado!';
    armL.setAttribute('d','M -24 24 Q -32 36 -20 38');
    armR.setAttribute('d','M 24 24 Q 32 36 20 38');
  } else if(th===180){
    // Caso extremo: 180°
    chMouth.setAttribute('d','M -10 22 Q 0 34 10 22 Z');
    chSpeech.textContent='¡180°! ¡Todo recto!';
    armL.setAttribute('d','M -24 16 L -44 16'); // Brazos totalmente abiertos en 180°
    armR.setAttribute('d','M 24 16 L 44 16');
  } else if(th<70){
    chMouth.setAttribute('d','M -5 27 A 5 5 0 1 0 5 27 A 5 5 0 1 0 -5 27');
    chSpeech.textContent='¡Me aprietan! ('+th+'°)';
    armL.setAttribute('d','M -24 20 Q -36 30 -28 36');
    armR.setAttribute('d','M 24 20 Q 36 30 28 36');
  } else if(th>115){
    chMouth.setAttribute('d','M -10 21 Q 0 33 10 21 Z');
    chSpeech.textContent='¡Qué espacio! ('+th+'°)';
    armL.setAttribute('d','M -24 16 Q -42 -2 -30 -14');
    armR.setAttribute('d','M 24 16 Q 42 -2 30 -14');
  } else {
    chMouth.setAttribute('d','M -8 24 Q 0 31 8 24');
    chSpeech.textContent=th===90?'¡Ángulo recto perfecto!':'Ángulo: '+th+'°';
    armL.setAttribute('d','M -24 18 Q -40 16 -34 6');
    armR.setAttribute('d','M 24 18 Q 40 16 34 6');
  }
}

$('#triColor').addEventListener('input',function(e){body.setAttribute('fill',e.target.value)});

ch.addEventListener('pointerdown',function(e){
  charDrag=true;
  var r=svg.getBoundingClientRect();
  charOffset.x=(e.clientX-r.left)-charPos.x;
  charOffset.y=(e.clientY-r.top)-charPos.y;
  ch.setPointerCapture(e.pointerId);
  chSpeech.textContent='¡Wiii!';
  e.stopPropagation();
});

ch.addEventListener('pointermove',function(e){
  if(!charDrag)return;
  var r=svg.getBoundingClientRect();
  charPos.x=Math.max(40,Math.min(r.width-40,(e.clientX-r.left)-charOffset.x));
  charPos.y=Math.max(45,Math.min(r.height-50,(e.clientY-r.top)-charOffset.y));
  updateCharPos();
});

ch.addEventListener('pointerup',function(e){if(charDrag){charDrag=false;updateCharExpression()}});
ch.addEventListener('pointercancel',function(){charDrag=false});

var bob=0;
setInterval(function(){
  if(!charDrag){
    bob+=0.05;
    $('#foot-l').setAttribute('cy',46+Math.sin(bob)*2);
    $('#foot-r').setAttribute('cy',46-Math.sin(bob)*2);
  }
},50);

new ResizeObserver(render).observe(svg);
window.addEventListener('resize',render);
updateCharPos();
sync();
})();