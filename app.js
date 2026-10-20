(function(){
var $=function(s){return document.querySelector(s)};
var S={
  th:90,
  n:10,
  visibleLines:1,
  stepPlaying:false,
  stepTimer:null,
  zoom:1.0,
  quads:{I:true, II:false, III:true, IV:false},
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

var DEF={ex:'#1d4ed8',ey:'#0f766e',curve:'#ff4d6d',ang:'#f59e0b'};
var NAME={ex:'Eje X (horizontal)',ey:'Eje Y (inclinado)',curve:'Curva Envolvente',ang:'Ángulo'};
var PAL=['#1d4ed8','#0f766e','#16a34a','#f59e0b','#ff4d6d','#c026d3','#7c3aed','#17214d'];

var PREGUNTAS=[
  "¿Los hilos son rectos o curvos? ¿Por qué se ve una curva en el borde?",
  "¿Qué pasa con la pendiente a medida que nos acercamos al eje X?",
  "¿Se rompe la curva si el ángulo no es de 90°?"
];

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
  var n=Math.max(10, S.visibleLines), L=n+1;
  var c=Math.cos(rad(S.th)),s=Math.sin(rad(S.th));

  var xCorners=[-L-L*c, -L+L*c, L-L*c, L+L*c];
  var minX=Math.min.apply(null,xCorners), maxX=Math.max.apply(null,xCorners);
  var spanX=Math.max(2*L, maxX-minX);
  var spanY=Math.max(2*L*Math.abs(s), 14);

  var M=30;
  var scX=(w-2*M)/spanX;
  var scY=(h-2*M-20)/spanY;
  
  var sc=Math.min(scX,scY) * S.zoom;
  V.sc=sc;
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

  function angleBadge(tx, ty, angleVal){
    return '<g style="pointer-events:none; isolation:isolate;">'+
      '<rect x="'+(tx-22)+'" y="'+(ty-12)+'" width="44" height="22" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1.8" filter="url(#shadow3d)"/>'+
      '<text x="'+tx+'" y="'+(ty+4.5)+'" text-anchor="middle" font-size="12px" font-weight="900" fill="#000000" style="font-family:system-ui,sans-serif;">'+angleVal+'°</text>'+
      '</g>';
  }

  var o='';

  /* 1. ETIQUETAS DE CUADRANTES */
  var qDist=L*0.65;
  var quadsInfo=[
    {id:'I', name:'Cuadrante I (+,+)', pos:P(qDist,qDist)},
    {id:'II', name:'Cuadrante II (−,+)', pos:P(-qDist,qDist)},
    {id:'III', name:'Cuadrante III (−,−)', pos:P(-qDist,-qDist)},
    {id:'IV', name:'Cuadrante IV (+,−)', pos:P(qDist,-qDist)}
  ];
  quadsInfo.forEach(function(qd){
    var activeClass=S.quads[qd.id]?' quad-active':'';
    o+='<text x="'+qd.pos[0].toFixed(1)+'" y="'+qd.pos[1].toFixed(1)+'" class="quad-label'+activeClass+'" text-anchor="middle">'+qd.name+'</text>';
  });

  /* 2. CUADRÍCULA */
  if(S.grid && s>0.04){
    var g='';
    var step=n>25?5:n>12?2:1;
    for(var k=-n;k<=n;k+=step){
      g+=seg(P(k,-n),P(k,n));
      g+=seg(P(-n,k),P(n,k));
    }
    o+='<path d="'+g+'" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3" fill="none"/>';
  }

  /* 3. RECTAS Y CURVAS */
  var quadSigns={
    'I':{sx:1,sy:1},
    'II':{sx:-1,sy:1},
    'III':{sx:-1,sy:-1},
    'IV':{sx:1,sy:-1}
  };

  Object.keys(S.quads).forEach(function(qKey){
    if(!S.quads[qKey]) return;
    var sx=quadSigns[qKey].sx;
    var sy=quadSigns[qKey].sy;

    for(var j=1;j<=S.visibleLines;j++){
      var id='l_'+qKey+'_'+j;
      o+=el(id, seg(P(sx*j, 0), P(0, sy*(L-j))), 1.8);
    }

    if(S.curve && S.visibleLines>=4){
      var dCurve='';
      var maxT=S.visibleLines/n;
      var steps=Math.round(80*maxT);
      for(var i=0;i<=steps;i++){
        var t=(i/steps)*maxT;
        var p=P(sx*L*t*t, sy*L*(1-t)*(1-t));
        dCurve+=(i?'L':'M')+pt(p);
      }
      o+=el('curve_'+qKey, dCurve, 3);
    }
  });

  /* 4. SECTORES Y GRADOS */
  var r=Math.min(48, sc*L*0.3);
  var O=P(0,0);

  if(S.quads.I && S.th>1){
    var pX=P(r/sc, 0), pY=P(0, r/sc);
    var midA=rad(S.th/2);
    o+='<path d="M'+pt(O)+'L'+pt(pX)+'A'+r+','+r+' 0 0 0 '+pt(pY)+'Z" fill="#f59e0b" fill-opacity="0.3" stroke="#f59e0b" stroke-width="2"/>';
    var tx=O[0]+(r+24)*Math.cos(midA), ty=O[1]-(r+24)*Math.sin(midA);
    o+=angleBadge(tx, ty, Math.round(S.th));
  }
  if(S.quads.II && S.th<179){
    var pXm=P(-r/sc, 0), pY=P(0, r/sc);
    var midA_II=rad(180 - (180-S.th)/2);
    o+='<path d="M'+pt(O)+'L'+pt(pY)+'A'+r+','+r+' 0 0 0 '+pt(pXm)+'Z" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6" stroke-width="2"/>';
    var tx2=O[0]+(r+24)*Math.cos(midA_II), ty2=O[1]-(r+24)*Math.sin(midA_II);
    o+=angleBadge(tx2, ty2, Math.round(180-S.th));
  }
  if(S.quads.III && S.th>1){
    var pXm=P(-r/sc, 0), pYm=P(0, -r/sc);
    var midA_III=rad(180 + S.th/2);
    o+='<path d="M'+pt(O)+'L'+pt(pXm)+'A'+r+','+r+' 0 0 0 '+pt(pYm)+'Z" fill="#06b6d4" fill-opacity="0.3" stroke="#06b6d4" stroke-width="2"/>';
    var tx3=O[0]+(r+24)*Math.cos(midA_III), ty3=O[1]-(r+24)*Math.sin(midA_III);
    o+=angleBadge(tx3, ty3, Math.round(S.th));
  }
  if(S.quads.IV && S.th<179){
    var pX=P(r/sc, 0), pYm=P(0, -r/sc);
    var midA_IV=rad(360 - (180-S.th)/2);
    o+='<path d="M'+pt(O)+'L'+pt(pYm)+'A'+r+','+r+' 0 0 0 '+pt(pX)+'Z" fill="#10b981" fill-opacity="0.3" stroke="#10b981" stroke-width="2"/>';
    var tx4=O[0]+(r+24)*Math.cos(midA_IV), ty4=O[1]-(r+24)*Math.sin(midA_IV);
    o+=angleBadge(tx4, ty4, Math.round(180-S.th));
  }

  /* 5. EJES CARTESIANOS */
  o+=el('ex', seg(P(-L,0), P(L,0)), 3.5);
  o+=el('ey', seg(P(0,-L), P(0,L)), 3.5);

  /* 6. MARCAS Y NÚMEROS EN EJES */
  var st=n>25?5:n>12?2:1;
  for(var m=-n;m<=n;m+=st){
    if(m===0) continue;
    var px=P(m,0), py=P(0,m);
    o+='<line x1="'+px[0]+'" y1="'+(px[1]-4)+'" x2="'+px[0]+'" y2="'+(px[1]+4)+'" stroke="#1d4ed8" stroke-width="1.5"/>';
    o+='<text x="'+px[0].toFixed(1)+'" y="'+(px[1]+16).toFixed(1)+'" text-anchor="middle" font-weight="600">'+m+'</text>';
    
    if(S.th>5 && S.th<175){
      o+='<line x1="'+(py[0]-4)+'" y1="'+py[1]+'" x2="'+(py[0]+4)+'" y2="'+py[1]+'" stroke="#0f766e" stroke-width="1.5"/>';
      o+='<text x="'+(py[0]-9).toFixed(1)+'" y="'+(py[1]+4).toFixed(1)+'" text-anchor="end" font-weight="600">'+m+'</text>';
    }
  }

  var eXp=P(L+0.7,0), eXm=P(-L-0.7,0), eYp=P(0,L+0.7), eYm=P(0,-L-0.7);
  o+='<text x="'+eXp[0]+'" y="'+(eXp[1]+4)+'" fill="#1d4ed8" font-weight="bold">+X</text>';
  o+='<text x="'+eXm[0]+'" y="'+(eXm[1]+4)+'" fill="#1d4ed8" font-weight="bold" text-anchor="end">−X</text>';
  o+='<text x="'+eYp[0]+'" y="'+(eYp[1]-6)+'" fill="#0f766e" font-weight="bold" text-anchor="middle">+Y</text>';
  o+='<text x="'+eYm[0]+'" y="'+(eYm[1]+14)+'" fill="#0f766e" font-weight="bold" text-anchor="middle">−Y</text>';

  scene.innerHTML=o;

  var hp=P(0,L);
  hd.setAttribute('transform','translate('+hp[0].toFixed(1)+','+hp[1].toFixed(1)+')');
}

function info(id){
  var n=Math.max(10, S.visibleLines), th=Math.round(S.th), L=n+1;
  if(id==='ex')return '<p><b>Eje X:</b> Eje horizontal (−'+n+' a +'+n+').</p>';
  if(id==='ey')return '<p><b>Eje Y:</b> Eje móvil a '+th+'° con el semieje +X y '+(180-th)+'° con el semieje −X.</p>';
  if(id.indexOf('curve')===0){
    return '<p><b>Curva Envolvente (Función Cuadrática emergente):</b></p>' +
           '<p>Ecuación en coordenadas locales: <code>√x + √y = √'+L+'</code></p>' +
           '<p>Forma cuadrática implícita: <code>(x − y)² − '+(2*L)+'(x + y) + '+(L*L)+' = 0</code></p>' +
           '<p><i>Aunque cada hilo individual responde a una ecuación de primer grado (recta), la frontera envolvente define una curva cuadrática de segundo grado.</i></p>';
  }
  if(isLine(id)){
    var parts=id.split('_');
    var k=+parts[2];
    var m = -((L-k)/k).toFixed(2);
    return '<p><b>Hilo / Recta '+k+' ('+parts[1]+'):</b></p>' +
           '<p>Une el punto ('+k+', 0) con (0, '+(L-k)+').</p>' +
           '<p>Ecuación segmentaria: <code>x/'+k+' + y/'+(L-k)+' = 1</code></p>' +
           '<p>Ecuación explícita (1.º grado): <code>y = '+m+'x + '+(L-k)+'</code></p>';
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
  $('#visibleLines').value=S.visibleLines;
  $('#lineCountVal').textContent=S.visibleLines+' / '+S.n;
  render();if(S.sel&&S.tab==='info')sheet();
}
$('#th').addEventListener('input',function(e){S.anim=false;pa();S.th=+e.target.value;sync();updateCharExpression()});

$('#visibleLines').addEventListener('input',function(e){
  stopStepPlay();
  S.visibleLines=+e.target.value;
  sync();
});

$('#bStepPlay').onclick=function(){
  if(S.stepPlaying){
    stopStepPlay();
  } else {
    S.stepPlaying=true;
    this.textContent='⏸ Pausar tejido';
    if(S.visibleLines>=S.n) S.visibleLines=0;
    S.stepTimer=setInterval(function(){
      if(S.visibleLines<S.n){
        S.visibleLines++;
        sync();
      } else {
        stopStepPlay();
      }
    }, 100);
  }
};

$('#bStepReset').onclick=function(){
  stopStepPlay();
  S.visibleLines=0;
  sync();
};

function stopStepPlay(){
  S.stepPlaying=false;
  clearInterval(S.stepTimer);
  $('#bStepPlay').textContent='▶ Tejer hilos paso a paso';
}

$('#pre').innerHTML='';
[0, 60, 90, 120, 180].forEach(function(a){
  var b=document.createElement('button');
  b.textContent=a+'°';
  b.onclick=function(){
    S.anim=false;pa();S.th=a;sync();
    if(a===60){
      say("¡Ángulo agudo de 60°! Mirá cómo se comprime la parábola.");
    } else if(a===120){
      say("¡Ángulo obtuso de 120°! Mirá cómo se ensancha.");
    } else {
      updateCharExpression();
    }
  };
  $('#pre').appendChild(b);
});

$('#zoomIn').onclick=function(){S.zoom=Math.min(3.0, S.zoom+0.2);render()};
$('#zoomOut').onclick=function(){S.zoom=Math.max(0.4, S.zoom-0.2);render()};
$('#zoomReset').onclick=function(){S.zoom=1.0;render()};

svg.addEventListener('wheel',function(e){
  e.preventDefault();
  if(e.deltaY<0) S.zoom=Math.min(3.0, S.zoom+0.1);
  else S.zoom=Math.max(0.4, S.zoom-0.1);
  render();
},{passive:false});

$('#quadBtns').addEventListener('click',function(e){
  var q=e.target.dataset.q;
  if(q){
    S.quads[q]=!S.quads[q];
    e.target.classList.toggle('on', S.quads[q]);
    e.target.setAttribute('aria-pressed', S.quads[q]);
    render();
    lanzarPreguntaAleatoria();
  }
});
$('#qAll').onclick=function(){
  ['I','II','III','IV'].forEach(function(k){
    S.quads[k]=true;
    var btn=$('#quadBtns button[data-q="'+k+'"]');
    if(btn){btn.classList.add('on');btn.setAttribute('aria-pressed', true);}
  });
  render();
  lanzarPreguntaAleatoria();
};
$('#qClear').onclick=function(){
  ['I','II','III','IV'].forEach(function(k){
    S.quads[k]=false;
    var btn=$('#quadBtns button[data-q="'+k+'"]');
    if(btn){btn.classList.remove('on');btn.setAttribute('aria-pressed', false);}
  });
  render();
};

function tog(id,key){$(id).onclick=function(){S[key]=!S[key];this.setAttribute('aria-pressed',S[key]);if(key==='anim'){if(S.anim)loop()}render()}}
tog('#bCurve','curve');tog('#bGrid','grid');tog('#bAnim','anim');
$('#bReset').onclick=function(){S.col={};S.off={};render();if(S.sel)sheet()};
function pa(){$('#bAnim').setAttribute('aria-pressed',S.anim)}

var drag=false;
hd.addEventListener('pointerdown',function(e){drag=true;S.anim=false;pa();hd.setPointerCapture(e.pointerId);e.preventDefault()});
hd.addEventListener('pointermove',function(e){if(!drag)return;
  var r=svg.getBoundingClientRect(),dx=e.clientX-r.left-V.ox,dy=V.oy-(e.clientY-r.top);
  var deg=Math.atan2(dy,dx)*180/Math.PI;
  if(deg<0){deg=dx>=0?0:180}
  S.th=Math.max(0,Math.min(180,deg));
  sync();
  updateCharExpression();
});
hd.addEventListener('pointerup',function(){drag=false});
hd.addEventListener('pointercancel',function(){drag=false});

var dir=1,last=0;
function loop(){last=performance.now();requestAnimationFrame(step)}
function step(t){
  if(!S.anim)return;
  var dt=Math.min(.05,(t-last)/1000);last=t;
  S.th+=dir*26*dt;
  if(S.th>=180){S.th=180;dir=-1}
  if(S.th<=0){S.th=0;dir=1}
  sync();
  updateCharExpression();
  requestAnimationFrame(step);
}

var ch=$('#char'),chMouth=$('#char-mouth'),chSpeech=$('#char-speech');
var armL=$('#arm-l'),armR=$('#arm-r'),baseBody=$('#char-base');
var charPos={x:70,y:70},charDrag=false,charOffset={x:0,y:0};

function updateCharPos(){ch.setAttribute('transform','translate('+charPos.x+','+charPos.y+')')}

function say(texto){
  var nom=S.charName||'Tri';
  chSpeech.innerHTML='<strong>'+nom+':</strong> '+texto;
}

function updateCharExpression(){
  var th=Math.round(S.th);
  if(th===60){
    say("¡Ángulo agudo de 60°! Mirá cómo se comprime la parábola.");
  } else if(th===120){
    say("¡Ángulo obtuso de 120°! Mirá cómo se ensancha.");
  } else if(th===0){
    chMouth.setAttribute('d','M -6 28 L 6 28');
    say("0° Superpuestos sobre una semirrecta.");
  } else if(th===180){
    chMouth.setAttribute('d','M -10 22 Q 0 34 10 22 Z');
    say("180° Recta continua.");
  } else if(th===90){
    chMouth.setAttribute('d','M -8 24 Q 0 31 8 24');
    say("90° Ángulo recto clásico.");
  } else {
    say("Ángulo actual: "+th+"°");
  }
}

function lanzarPreguntaAleatoria(){
  var preg = PREGUNTAS[Math.floor(Math.random()*PREGUNTAS.length)];
  say(preg);
}

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
  lanzarPreguntaAleatoria();
  e.stopPropagation();
});

ch.addEventListener('pointermove',function(e){
  if(!charDrag)return;
  var r=svg.getBoundingClientRect();
  charPos.x=Math.max(40,Math.min(r.width-40,(e.clientX-r.left)-charOffset.x));
  charPos.y=Math.max(40,Math.min(r.height-40,(e.clientY-r.top)-charOffset.y));
  updateCharPos();
});

ch.addEventListener('pointerup',function(){charDrag=false});
ch.addEventListener('pointercancel',function(){charDrag=false});

var panelOpen=true;
var toggleBtn=$('#panelToggleBtn');
var ctrlPanel=$('#ctrl');

toggleBtn.addEventListener('click',function(e){
  e.preventDefault();
  e.stopPropagation();
  panelOpen=!panelOpen;
  
  if(panelOpen){
    ctrlPanel.classList.remove('collapsed');
    $('#panelToggleText').textContent='Ocultar controles';
    $('#panelToggleIcon').textContent='▼';
    toggleBtn.style.bottom='12px';
  } else {
    ctrlPanel.classList.add('collapsed');
    $('#panelToggleText').textContent='Mostrar controles';
    $('#panelToggleIcon').textContent='▲';
    toggleBtn.style.bottom='14px';
  }

  setTimeout(function(){
    render();
  }, 50);
  setTimeout(function(){
    render();
  }, 200);
});

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
updateCharExpression();
})();