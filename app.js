(function(){
var $=function(s){return document.querySelector(s)};
var S={
  th:90,
  n:10,
  quad:'I', // 'I', 'II', 'III', 'IV' o 'ALL'
  curve:true,
  grid:true,
  anim:false,
  col:{},
  off:{},
  sel:null,
  tab:'info',
  charName:'Triangulín'
};

var svg=$('#cv'),scene=$('#scene'),hd=$('#hd'),V={ox:0,oy:0,sc:1};
var rad=function(d){return d*Math.PI/180};
var f=function(v){return String(+v.toFixed(2)).replace('.',',')};

/* Colores */
var DEF={ex:'#1d4ed8',ey:'#0f766e',curve:'#ff4d6d',ang:'#f59e0b'};
var NAME={ex:'Eje X (horizontal)',ey:'Eje Y (inclinado)',curve:'Curva Envolvente',ang:'Ángulo entre ejes'};
var PAL=['#1d4ed8','#0f766e','#16a34a','#f59e0b','#ff4d6d','#c026d3','#7c3aed','#17214d'];

function isLine(id){return /^l_\w+_\d+$/.test(id)}
function lineAuto(i){return 'hsl('+(205+(i-1)/Math.max(1,S.n-1)*140)+',68%,46%)'}
function colOf(id){if(S.col[id])return S.col[id];return isLine(id)?lineAuto(+id.split('_')[2]):DEF[id]}
function name(id){
  if(isLine(id)){
    var p=id.split('_');
    return 'Recta '+p[2]+' ('+p[1]+')';
  }
  return NAME[id]||id;
}

function render(){
  var w=svg.clientWidth,h=svg.clientHeight;if(!w||!h)return;
  var n=S.n,L=n+1;
  var c=Math.cos(rad(S.th)),s=Math.sin(rad(S.th));

  /* Escalado simétrico para contemplar semi-ejes positivos y negativos (-L a +L) */
  var xCorners=[-L-L*c, -L+L*c, L-L*c, L+L*c];
  var minX=Math.min.apply(null,xCorners), maxX=Math.max.apply(null,xCorners);
  var spanX=Math.max(2*L, maxX-minX);
  var spanY=Math.max(2*L*Math.abs(s), 14);

  var M=40;
  var scX=(w-2*M)/spanX;
  var scY=(h-2*M-20)/spanY;
  var sc=Math.min(scX,scY);
  V.sc=sc;

  // El origen (0,0) centrado
  V.ox=w/2;
  V.oy=h/2;

  function P(x,y){return [V.ox+sc*(x+y*c), V.oy-sc*y*s]}
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

  /* 1. ETIQUETAS DE CUADRANTES */
  var qDist=L*0.65;
  var quads=[
    {name:'Cuadrante I (+,+)',pos:P(qDist,qDist)},
    {name:'Cuadrante II (−,+)',pos:P(-qDist,qDist)},
    {name:'Cuadrante III (−,−)',pos:P(-qDist,-qDist)},
    {name:'Cuadrante IV (+,−)',pos:P(qDist,-qDist)}
  ];
  quads.forEach(function(qd){
    o+='<text x="'+qd.pos[0].toFixed(1)+'" y="'+qd.pos[1].toFixed(1)+'" class="quad-label" text-anchor="middle">'+qd.name+'</text>';
  });

  /* 2. CUADRÍCULA EN LOS 4 CUADRANTES */
  if(S.grid && s>0.04){
    var g='';
    var step=n>20?2:1;
    for(var k=-n;k<=n;k+=step){
      g+=seg(P(k,-n),P(k,n));
      g+=seg(P(-n,k),P(n,k));
    }
    o+='<path d="'+g+'" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3" fill="none"/>';
  }

  /* 3. RECTAS POR CUADRANTE */
  var activeQuads=S.quad==='ALL'?['I','II','III','IV']:[S.quad];
  var quadSigns={
    'I':{sx:1,sy:1},
    'II':{sx:-1,sy:1},
    'III':{sx:-1,sy:-1},
    'IV':{sx:1,sy:-1}
  };

  activeQuads.forEach(function(qKey){
    var sx=quadSigns[qKey].sx;
    var sy=quadSigns[qKey].sy;
    for(var j=1;j<=n;j++){
      var id='l_'+qKey+'_'+j;
      o+=el(id, seg(P(sx*j, 0), P(0, sy*(L-j))), 2);
    }

    /* 4. CURVA ENVOLVENTE EN EL CUADRANTE */
    if(S.curve){
      var dCurve='';
      for(var i=0;i<=80;i++){
        var t=i/80;
        var p=P(sx*L*t*t, sy*L*(1-t)*(1-t));
        dCurve+=(i?'L':'M')+pt(p);
      }
      o+=el('curve_'+qKey, dCurve, 3);
    }
  });

  /* 5. EJES CARTESIANOS COMPLETOS (+ y -) */
  o+=el('ex', seg(P(-L,0), P(L,0)), 3.5);
  o+=el('ey', seg(P(0,-L), P(0,L)), 3.5);

  /* 6. MARCAS Y NÚMEROS EN EJES (+ y -) */
  var st=n>24?5:n>13?2:1;
  for(var m=-n;m<=n;m+=st){
    if(m===0) continue;
    var px=P(m,0), py=P(0,m);
    // Eje X
    o+='<line x1="'+px[0]+'" y1="'+(px[1]-4)+'" x2="'+px[0]+'" y2="'+(px[1]+4)+'" stroke="#1d4ed8" stroke-width="1.5"/>';
    o+='<text x="'+px[0].toFixed(1)+'" y="'+(px[1]+16).toFixed(1)+'" text-anchor="middle" font-weight="600">'+m+'</text>';
    
    // Eje Y
    if(S.th>5 && S.th<175){
      o+='<line x1="'+(py[0]-4)+'" y1="'+py[1]+'" x2="'+(py[0]+4)+'" y2="'+py[1]+'" stroke="#0f766e" stroke-width="1.5"/>';
      o+='<text x="'+(py[0]-9).toFixed(1)+'" y="'+(py[1]+4).toFixed(1)+'" text-anchor="end" font-weight="600">'+m+'</text>';
    }
  }

  // Nombre de los extremos de los ejes
  var eXp=P(L+0.7,0), eXm=P(-L-0.7,0), eYp=P(0,L+0.7), eYm=P(0,-L-0.7);
  o+='<text x="'+eXp[0]+'" y="'+(eXp[1]+4)+'" fill="#1d4ed8" font-weight="bold">+X</text>';
  o+='<text x="'+eXm[0]+'" y="'+(eXm[1]+4)+'" fill="#1d4ed8" font-weight="bold" text-anchor="end">−X</text>';
  o+='<text x="'+eYp[0]+'" y="'+(eYp[1]-6)+'" fill="#0f766e" font-weight="bold" text-anchor="middle">+Y</text>';
  o+='<text x="'+eYm[0]+'" y="'+(eYm[1]+14)+'" fill="#0f766e" font-weight="bold" text-anchor="middle">−Y</text>';

  /* 7. ÁNGULO ENTRE SEMIEJES POSITIVOS */
  var r=Math.min(50,sc*L*.35),O=P(0,0),ac=colOf('ang');
  var ma=rad(S.th/2);
  if(S.th>1){
    var sweep=S.th>180?1:0;
    var ad='M'+pt(O)+'L'+(O[0]+r).toFixed(1)+','+O[1].toFixed(1)+'A'+r+','+r+' 0 '+sweep+' 0 '+(O[0]+r*c).toFixed(1)+','+(O[1]-r*s).toFixed(1)+'Z';
    o+='<g data-id="ang" class="g'+(S.off.ang?' dim':'')+'"><path d="'+ad+'" fill="'+ac+'" fill-opacity="0.45" stroke="'+ac+'" stroke-width="2.5"/></g>';
    
    var labelDist=r+22;
    var tx=(O[0]+labelDist*Math.cos(ma)).toFixed(1);
    var ty=(O[1]-labelDist*Math.sin(ma)).toFixed(1);
    o+='<g style="pointer-events:none"><rect x="'+(tx-24)+'" y="'+(ty-12)+'" width="48" height="22" rx="11" fill="#fff" stroke="'+ac+'" stroke-width="1.5"/><text x="'+tx+'" y="'+(+ty+4)+'" text-anchor="middle" font-weight="bold" fill="#b45309" font-size="12px">'+Math.round(S.th)+'°</text></g>';
  }

  scene.innerHTML=o;

  // Manejador del eje Y móvil (+Y)
  var hp=P(0,L);
  hd.setAttribute('transform','translate('+hp[0].toFixed(1)+','+hp[1].toFixed(1)+')');
  updateCharExpression();
}

/* Panel descriptivo */
function info(id){
  var n=S.n,L=n+1,th=S.th,c=Math.cos(rad(th)),s=Math.sin(rad(th));
  if(id==='ex')return '<p><b>Eje X:</b> Eje horizontal completo con valores negativos (−'+n+') y positivos (+'+n+').</p>';
  if(id==='ey')return '<p><b>Eje Y:</b> Eje inclinado giratorio con valores negativos y positivos formando '+Math.round(th)+'°.</p>';
  if(id==='ang')return '<p>Ángulo entre los semiejes positivos: <b>'+Math.round(th)+'°</b>.</p>';
  if(id.indexOf('curve')===0)return '<p><b>Curva Envolvente Parabólica:</b> Generada por la familia de rectas tangentes en el cuadrante seleccionado.</p>';
  if(isLine(id)){
    var parts=id.split('_');
    return '<p><b>Recta '+parts[2]+'</b> en el '+parts[1]+'.</p><p>Une el punto en el eje horizontal con el eje correspondiente con paso simétrico.</p>';
  }
  return '<p>Elemento seleccionado: '+id+'</p>';
}

function sheet(){
  var id=S.sel;if(!id)return;
  $('#stitle').textContent=name(id);
  $('#sdot').style.background=colOf(id);
  $('#tvis').textContent=S.off[id]?'Mostrar':'Atenuar';
  var bs=document.querySelectorAll('#stabs button');
  for(var i=0;i<bs.length;i++)bs[i].classList.toggle('on',bs[i].dataset.t===S.tab);
  var b=$('#sbody');
  if(S.tab==='info')b.innerHTML=info(id);
  else if(S.tab==='color'){
    var h='<div class="sw">';
    PAL.forEach(function(p){h+='<button class="c" data-c="'+p+'" style="background:'+p+'"></button>'});
    h+='<input type="color" id="cpick" value="#1d4ed8"></div>';
    b.innerHTML=h;
  } else b.innerHTML='<p>'+(S.off[id]?'Elemento atenuado.':'Elemento visible.')+'</p>';
}

function open(id){S.sel=id;S.tab='info';$('#ctrl').hidden=true;$('#sheet').hidden=false;sheet();render()}
function close(){S.sel=null;$('#sheet').hidden=true;$('#ctrl').hidden=false;render()}

scene.addEventListener('click',function(e){var g=e.target.closest('[data-id]');if(g)open(g.dataset.id);else if(S.sel)close()});
$('#stabs').addEventListener('click',function(e){
  var t=e.target.dataset.t;if(!t)return;
  if(t==='close')return close();
  if(t==='vis'){S.off[S.sel]=!S.off[S.sel];S.tab='vis';render();return sheet()}
  S.tab=t;sheet();
});
$('#sbody').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  if(b.dataset.c){S.col[S.sel]=b.dataset.c;render();sheet()}
});
$('#sbody').addEventListener('input',function(e){
  if(e.target.id==='cpick'){S.col[S.sel]=e.target.value;render();$('#sdot').style.background=e.target.value}
});

function sync(){
  var t=Math.round(S.th);$('#th').value=t;$('#thv').textContent=t+'°';
  $('#n').value=S.n;$('#nv').textContent=S.n;
  render();if(S.sel&&S.tab==='info')sheet();
}
$('#th').addEventListener('input',function(e){S.anim=false;pa();S.th=+e.target.value;sync()});
$('#n').addEventListener('input',function(e){S.n=+e.target.value;sync()});
$('#selQuad').addEventListener('change',function(e){S.quad=e.target.value;render()});

$('#pre').innerHTML='';
[0, 45, 90, 135, 180].forEach(function(a){
  var b=document.createElement('button');b.textContent=a+'°';
  b.onclick=function(){S.anim=false;pa();S.th=a;sync()};$('#pre').appendChild(b)});

function tog(id,key){$(id).onclick=function(){S[key]=!S[key];this.setAttribute('aria-pressed',S[key]);if(key==='anim'){if(S.anim)loop()}render()}}
tog('#bCurve','curve');tog('#bGrid','grid');tog('#bAnim','anim');
$('#bReset').onclick=function(){S.col={};S.off={};render();if(S.sel)sheet()};
function pa(){$('#bAnim').setAttribute('aria-pressed',S.anim)}

/* Arrastre del eje Y */
var drag=false;
hd.addEventListener('pointerdown',function(e){drag=true;S.anim=false;pa();hd.setPointerCapture(e.pointerId);e.preventDefault()});
hd.addEventListener('pointermove',function(e){if(!drag)return;
  var r=svg.getBoundingClientRect(),dx=e.clientX-r.left-V.ox,dy=V.oy-(e.clientY-r.top);
  var deg=Math.atan2(dy,dx)*180/Math.PI;
  if(deg<0){deg=dx>=0?0:180}
  S.th=Math.max(0,Math.min(180,deg));
  sync()});
hd.addEventListener('pointerup',function(){drag=false});
hd.addEventListener('pointercancel',function(){drag=false});

/* Animación */
var dir=1,last=0;
function loop(){last=performance.now();requestAnimationFrame(step)}
function step(t){
  if(!S.anim)return;
  var dt=Math.min(.05,(t-last)/1000);last=t;
  S.th+=dir*26*dt;
  if(S.th>=180){S.th=180;dir=-1}
  if(S.th<=0){S.th=0;dir=1}
  sync();requestAnimationFrame(step)}

/* Personaje Triángulo */
var ch=$('#char'),chMouth=$('#char-mouth'),chSpeech=$('#char-speech');
var armL=$('#arm-l'),armR=$('#arm-r'),baseBody=$('#char-base');
var charPos={x:80,y:80},charDrag=false,charOffset={x:0,y:0};

function updateCharPos(){ch.setAttribute('transform','translate('+charPos.x+','+charPos.y+')')}

function updateCharExpression(){
  var th=Math.round(S.th);
  var nom=S.charName||'Tri';
  if(th===0){
    chMouth.setAttribute('d','M -6 28 L 6 28');
    chSpeech.textContent=nom+': 0° Superpuestos';
  } else if(th===180){
    chMouth.setAttribute('d','M -10 22 Q 0 34 10 22 Z');
    chSpeech.textContent=nom+': 180° Recta llana';
  } else if(th<70){
    chMouth.setAttribute('d','M -5 27 A 5 5 0 1 0 5 27 A 5 5 0 1 0 -5 27');
    chSpeech.textContent=nom+': Agudo ('+th+'°)';
  } else if(th>115){
    chMouth.setAttribute('d','M -10 21 Q 0 33 10 21 Z');
    chSpeech.textContent=nom+': Obtuso ('+th+'°)';
  } else {
    chMouth.setAttribute('d','M -8 24 Q 0 31 8 24');
    chSpeech.textContent=nom+': Ángulo '+th+'°';
  }
}

// Control del nombre y color del personaje
$('#triName').addEventListener('input',function(e){
  S.charName=e.target.value.trim()||'Tri';
  updateCharExpression();
});
$('#triColor').addEventListener('input',function(e){
  baseBody.setAttribute('fill',e.target.value);
});

ch.addEventListener('pointerdown',function(e){
  charDrag=true;
  var r=svg.getBoundingClientRect();
  charOffset.x=(e.clientX-r.left)-charPos.x;
  charOffset.y=(e.clientY-r.top)-charPos.y;
  ch.setPointerCapture(e.pointerId);
  chSpeech.textContent=S.charName+': ¡Wiii!';
  e.stopPropagation();
});

ch.addEventListener('pointermove',function(e){
  if(!charDrag)return;
  var r=svg.getBoundingClientRect();
  charPos.x=Math.max(50,Math.min(r.width-50,(e.clientX-r.left)-charOffset.x));
  charPos.y=Math.max(50,Math.min(r.height-50,(e.clientY-r.top)-charOffset.y));
  updateCharPos();
});

ch.addEventListener('pointerup',function(){if(charDrag){charDrag=false;updateCharExpression()}});
ch.addEventListener('pointercancel',function(){charDrag=false});

// Respiración y balanceo sutil
var bob=0;
setInterval(function(){
  if(!charDrag){
    bob+=0.06;
    $('#foot-l').setAttribute('cy',42+Math.sin(bob)*1.8);
    $('#foot-r').setAttribute('cy',42-Math.sin(bob)*1.8);
  }
},50);

new ResizeObserver(render).observe(svg);
window.addEventListener('resize',render);
updateCharPos();
sync();
})();