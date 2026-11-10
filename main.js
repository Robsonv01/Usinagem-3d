import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (selector) => document.querySelector(selector);
const viewport = $('#viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b1721');
scene.fog = new THREE.FogExp2('#0b1721', 0.018);
const camera = new THREE.PerspectiveCamera(73, 1, .1, 100);
camera.position.set(0, 1.66, 5.6);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.10;
viewport.insertBefore(renderer.domElement, $('#loading'));
const vrButton = VRButton.createButton(renderer, { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
vrButton.id = 'VRButton';
vrButton.title = 'Iniciar a oficina em realidade virtual';
viewport.appendChild(vrButton);
const walkControls = new PointerLockControls(camera, renderer.domElement);
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enabled = false; orbitControls.enableDamping = true; orbitControls.dampingFactor = .055;
orbitControls.target.set(0, 1.25, -1.3); orbitControls.minDistance = 2.5; orbitControls.maxDistance = 22; orbitControls.maxPolarAngle = Math.PI * .49;

// Reflexos de ambiente: sem isso o metal fica chapado/preto. O RoomEnvironment gera um "estúdio" para os reflexos PBR.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.8;
scene.add(new THREE.HemisphereLight(0xdbeeff, 0x27323a, 0.85));
const mainLight = new THREE.DirectionalLight(0xffe4c2, 3.0); mainLight.position.set(-4, 10, 5); mainLight.castShadow = true; mainLight.shadow.mapSize.set(4096, 4096); mainLight.shadow.bias = -0.00035; mainLight.shadow.normalBias = 0.022; mainLight.shadow.camera.left=-12; mainLight.shadow.camera.right=12; mainLight.shadow.camera.top=12; mainLight.shadow.camera.bottom=-12; scene.add(mainLight);
const fillLight = new THREE.DirectionalLight(0x72bde9, 1.35); fillLight.position.set(7, 6, -5); scene.add(fillLight);
for (const [x,z] of [[-5,-2],[0,-2],[5,-2],[-5,3],[0,3],[5,3]]) { const lamp = new THREE.PointLight(0xffd7a3, 17, 8, 2); lamp.position.set(x, 4.7, z); scene.add(lamp); }

const material = (color, metalness=.2, roughness=.52, extras={}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extras });
const M = {
  floor:material('#343e45',.12,.91), wall:material('#344651',.08,.9), wallPanel:material('#283943',.12,.85), navy:material('#1a2d3b',.34,.48), blue:material('#26799f',.36,.34), blue2:material('#469fc4',.28,.33), ivory:material('#c6d0d4',.42,.31), ivory2:material('#e2e8e9',.3,.28), steel:material('#a8b8c0',.9,.22), steelDark:material('#414e56',.75,.32), dark:material('#171e24',.4,.47), black:material('#0f151a',.2,.7), gold:material('#efad42',.25,.38), yellow:material('#f0ba43',.16,.4), red:material('#cd4a3d',.2,.38), green:material('#42ad7a',.16,.35), glass:material('#69c6e8',.28,.15,{transparent:true,opacity:.35}), white:material('#eef4f3',.12,.3), rubber:material('#20282e',.08,.86), aluminum:material('#b5c9d0',.86,.23), steelStock:material('#8498a5',.83,.28), brass:material('#c89e4f',.68,.27), cut:material('#26333d',.72,.34)
};
M.goldStock=material('#e4b52f',.9,.2);
M.bronze=material('#a96535',.84,.25);
M.cyan=material('#29c7df',.42,.24);
// Materiais físicos: pintura industrial com verniz (clearcoat), aço retificado reflexivo e ferro fundido acetinado.
(function upgradeMaterials(){
  const tune={
    floor:{metalness:.05,roughness:.62,clearcoat:.22,clearcoatRoughness:.55},
    navy:{metalness:.08,roughness:.42,clearcoat:.55,clearcoatRoughness:.3},
    blue:{metalness:.08,roughness:.36,clearcoat:.7,clearcoatRoughness:.22},
    blue2:{metalness:.08,roughness:.34,clearcoat:.7,clearcoatRoughness:.22},
    ivory:{metalness:.04,roughness:.4,clearcoat:.6,clearcoatRoughness:.25},
    ivory2:{metalness:.04,roughness:.34,clearcoat:.6,clearcoatRoughness:.2},
    dark:{metalness:.15,roughness:.5,clearcoat:.35,clearcoatRoughness:.4},
    black:{metalness:.05,roughness:.35,clearcoat:.8,clearcoatRoughness:.15},
    steel:{metalness:.9,roughness:.27},
    steelDark:{metalness:.85,roughness:.36},
    aluminum:{metalness:.82,roughness:.26},
    steelStock:{metalness:.78,roughness:.32},
    brass:{metalness:.85,roughness:.26},
    bronze:{metalness:.85,roughness:.3},
    goldStock:{metalness:.92,roughness:.2},
    gold:{metalness:.75,roughness:.3},
    yellow:{metalness:.05,roughness:.38,clearcoat:.6,clearcoatRoughness:.25},
    red:{metalness:.05,roughness:.3,clearcoat:.8,clearcoatRoughness:.15},
    green:{metalness:.05,roughness:.3,clearcoat:.8,clearcoatRoughness:.15},
    cyan:{metalness:.1,roughness:.25,clearcoat:.8,clearcoatRoughness:.15},
    cut:{metalness:.9,roughness:.4},
  };
  for(const [key,opts] of Object.entries(tune)){
    const old=M[key];if(!old)continue;
    M[key]=new THREE.MeshPhysicalMaterial({color:old.color.clone(),metalness:old.metalness,roughness:old.roughness,...opts});
    old.dispose();
  }
  M.guard=new THREE.MeshPhysicalMaterial({color:'#cfeeff',metalness:0,roughness:.06,transparent:true,opacity:.26,side:THREE.DoubleSide,depthWrite:false,clearcoat:1});
  M.belt=material('#1b1f22',.0,.8);
  M.lampGlow=new THREE.MeshStandardMaterial({color:'#fff3d6',emissive:'#ffe2a8',emissiveIntensity:2.2});
})();
const room = new THREE.Group(); scene.add(room);
const latheRoot = new THREE.Group(); latheRoot.position.set(-3.55,0,-1.45); scene.add(latheRoot);
const millRoot = new THREE.Group(); millRoot.position.set(3.45,0,-1.50); scene.add(millRoot);
const latheRotor = new THREE.Group(); latheRotor.position.set(-1.05,1.43,0); latheRoot.add(latheRotor);
let latheStock = null, latheMachinedSection = null, latheGrooves = [], latheJaws = [];
let millPart = null, millToolAssembly = null, millCollet = null, millToolBits = [], millGrooves = [], chipCloud = null;
let latheToolAssembly = null, latheToolBits = [], latheCarriage = null;
let activeStation = 'mill'; let mode = 'walk'; let currentInteract = null; let enteredOnce = false;
const keys = new Set(); const player = {height:1.66, radius:.23, speed:3.3, sprint:5.1};
const activeMachines = { mill: {stock:'steel', pieceLoaded:false, pieceClamped:false, tool:'endmill', toolInstalled:false, toolClamped:false, powered:false, emergencyStopped:false, cutting:false, progress:0, machined:false, passes:0, rpm:1200}, lathe: {stock:'steel', pieceLoaded:false, pieceClamped:false, tool:'turning', toolInstalled:false, toolClamped:false, powered:false, emergencyStopped:false, cutting:false, progress:0, machined:false, passes:0, rpm:900} };
const MAX_DELIVERY_PRODUCTS = 6;
const rpmRanges = {
  mill: {endmill:{min:500,max:3000,name:'Fresa de topo Ø10 mm',short:'Fresa de topo'}, facemill:{min:400,max:1800,name:'Fresa de face Ø25 mm',short:'Fresa de face'}, drill:{min:300,max:2500,name:'Broca Ø8 mm',short:'Broca'}},
  lathe: {turning:{min:300,max:1800,name:'Ferramenta de torneamento',short:'Pastilha de torneamento'}, boring:{min:300,max:1200,name:'Barra de mandrilar',short:'Barra de mandrilar'}, groove:{min:300,max:1500,name:'Ferramenta de canal',short:'Ferramenta de canal'}}
};
const stockMaterials = { aluminum:M.aluminum, steel:M.steelStock, brass:M.brass, bronze:M.bronze, gold:M.goldStock };
const stockNames = { aluminum:'Alumínio', steel:'Aço', brass:'Latão', bronze:'Bronze', gold:'Ouro' };
const stockValues = { aluminum:28, steel:45, brass:39, bronze:48, gold:75 };
const stationFocus = {mill:new THREE.Vector3(3.45,1.3,-1.5),lathe:new THREE.Vector3(-3.55,1.35,-1.45),room:new THREE.Vector3(0,1.25,-1.3)};
const stationAccess = {mill:new THREE.Vector3(1.98,0,.05),lathe:new THREE.Vector3(-5.0,0,.2)};
const machinePowerLights = {};
const machineDisplays = {};
const automaticDisplays = {};
const machineControlTargets = [];
const pickupObjects = [];
const machineEmergencyButtons = {};
const machineControlRaycaster = new THREE.Raycaster();
const machineControlPointer = new THREE.Vector2();
const machiningStates = {mill:{start:0,duration:5200},lathe:{start:0,duration:5200}};
let autoSelectedMachine='mill';
const newAutoRun=()=>( {active:false,total:1,completed:0,timeout:0,status:'',kind:'',material:'steel',waiting:false,paused:false});
const autoRuns={mill:newAutoRun(),lathe:newAutoRun()};

let toastTimeout = 0;
let latheFeedWheel = null;
let latheSelectorLevers = [];
let latheFeedLever = null;
let millQuillLever = null;
let millQuillLeverPosition = 0;
const machineAutomaticButtons = {};
let cabinetDoors = [];
let cabinetOpen = true; // armário começa aberto para mostrar as ferramentas
let handwheelEngaged = false;
const cabinetFocus = new THREE.Vector3(7.75,0,-2.95);
const handwheelWorldPosition = new THREE.Vector3();

// WebXR scene controls: the floating console and controller lasers are visible in immersive VR.
const vrConsoleGroup = new THREE.Group();
vrConsoleGroup.name = 'VR operating console';
vrConsoleGroup.position.set(0, 1.72, 3.55);
vrConsoleGroup.visible = false;
scene.add(vrConsoleGroup);
const vrConsoleButtons = [];
let vrConsoleStatus = null;
const vrControllers = [];
const vrControllerRays = [];
const vrRaycaster = new THREE.Raycaster();
const vrRayOrigin = new THREE.Vector3();
const vrRayDirection = new THREE.Vector3();
const vrTempMatrix = new THREE.Matrix4();
const vrForward = new THREE.Vector3();
const vrRight = new THREE.Vector3();
const vrMove = new THREE.Vector3();
const vrViewQuaternion = new THREE.Quaternion();
let vrLastSnapTurn = 0;

function box(parent,name,x,y,z,sx,sy,sz,mat,opts={}){const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=opts.cast!==false;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function roundedBox(parent,name,x,y,z,sx,sy,sz,mat,radius=.035){const bevel=Math.min(radius,Math.min(sx,sy,sz)*.18);const mesh=new THREE.Mesh(new RoundedBoxGeometry(sx,sy,sz,3,bevel),mat);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function cylinder(parent,name,x,y,z,rTop,rBottom,height,mat,axis='y',segments=32){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBottom,height,segments),mat);mesh.name=name;mesh.position.set(x,y,z);if(axis==='x')mesh.rotation.z=-Math.PI/2;if(axis==='z')mesh.rotation.x=Math.PI/2;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function sphere(parent,name,x,y,z,r,mat){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,18,12),mat);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
function textPlaque(parent,text,x,y,z,color='#efad42',ry=0){const can=document.createElement('canvas');can.width=512;can.height=128;const ctx=can.getContext('2d');ctx.fillStyle='#121d26';ctx.fillRect(0,0,512,128);ctx.strokeStyle=color;ctx.lineWidth=5;ctx.strokeRect(3,3,506,122);ctx.font='bold 42px Arial';ctx.fillStyle='#f4f6f7';ctx.fillText(text,18,79);const tex=new THREE.CanvasTexture(can);tex.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.75,.44),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=ry;parent.add(mesh);return mesh;}

function buildRoom(){
  box(room,'floor',0,-.16,0,18,.3,15,M.floor,{cast:false});
  for(let x=-8.5;x<=8.5;x+=1)box(room,'floor joint',x,.002,0,.012,.006,14,M.steelDark,{cast:false});
  for(let z=-7;z<=7;z+=1)box(room,'floor joint',0,.003,z,17,.006,.012,M.steelDark,{cast:false});
  box(room,'back wall',0,3.25,-7.55,18,6.5,.28,M.wall,{cast:false});
  box(room,'left wall',-9,3.25,0,.28,6.5,15,M.wall,{cast:false});
  box(room,'right wall',9,3.25,0,.28,6.5,15,M.wall,{cast:false});
  box(room,'back wall base',0,.4,-7.38,18,.22,.06,M.blue,{cast:false});
  box(room,'left wall base',-8.84,.4,0,.06,.22,15,M.blue,{cast:false});
  box(room,'right wall base',8.84,.4,0,.06,.22,15,M.blue,{cast:false});
  for(let x=-7.2;x<=7.3;x+=3.6){box(room,'wall panel',x,3.15,-7.37,3.25,4.6,.035,M.wallPanel,{cast:false});box(room,'panel vertical',x-1.65,3.2,-7.33,.045,4.7,.04,M.steelDark,{cast:false});}
  for(const x of [-5.4,-1.8,1.8,5.4]){box(room,'window frame',x,4.55,-7.26,2.45,1.45,.14,M.dark,{cast:false});box(room,'window glass',x,4.55,-7.17,2.23,1.25,.035,M.glass,{cast:false});box(room,'window vertical mullion',x,4.55,-7.13,.045,1.25,.04,M.steel,{cast:false});box(room,'window horizontal mullion',x,4.55,-7.13,2.23,.04,.04,M.steel,{cast:false});}
  // Ceiling beams and industrial LED fixtures remain above the operator's head.
  for(const x of [-7,-3.5,0,3.5,7])box(room,'ceiling beam',x,6.0,-.2,.13,.14,14,M.steelDark);
  for(const z of [-5,0,5])box(room,'ceiling cross beam',0,6.0,z,17,.14,.13,M.steelDark);
  for(const [x,z] of [[-5,-2],[0,-2],[5,-2],[-5,3],[0,3],[5,3]]){box(room,'lamp housing',x,5.84,z,1.32,.08,.36,M.dark,{cast:false});box(room,'lamp panel',x,5.79,z,1.13,.025,.22,M.white,{cast:false});}
  // A steel storage cabinet with shelves and two genuinely hinged doors.
  const cabX=7.75,cabZ=-4.55;
  roundedBox(room,'cabinet back',cabX,1.22,cabZ-.52,1.52,2.34,.10,M.blue,.045);
  roundedBox(room,'cabinet left side',cabX-.72,1.22,cabZ,0.10,2.30,1.08,M.blue,.035);roundedBox(room,'cabinet right side',cabX+.72,1.22,cabZ,.10,2.30,1.08,M.blue,.035);
  roundedBox(room,'cabinet top',cabX,2.35,cabZ,1.46,.08,1.08,M.blue,.025);roundedBox(room,'cabinet bottom',cabX,.09,cabZ,1.46,.08,1.08,M.blue,.025);
  box(room,'cabinet interior back',cabX,1.22,cabZ-.45,1.34,2.12,.035,M.navy);
  for(const y of [.48,1.04,1.60,2.16])box(room,'cabinet shelf',cabX,y,cabZ-.02,1.34,.045,.94,M.steelDark);
  for(const x of [cabX-.38,cabX+.12]){
    cylinder(room,'cabinet stored stock',x,.75,cabZ-.05,.07,.07,.36,M.steel,'y',18);
    cylinder(room,'cabinet stored stock',x,1.31,cabZ-.05,.06,.06,.34,M.brass,'y',18);
  }
  box(room,'cabinet cap',cabX,2.43,cabZ,1.62,.12,1.22,M.steelDark);
  cabinetDoors=[];
  for(const side of [-1,1]){
    const hinge=new THREE.Group();hinge.name='cabinet hinged door';hinge.position.set(cabX+side*.75,1.22,cabZ+.57);room.add(hinge);
    const panel=roundedBox(hinge,'cabinet door',-side*.36,0,0,.72,2.20,.085,M.blue2,.035);
    box(hinge,'cabinet door inset',-side*.36,0,.047,.57,1.95,.018,M.blue);
    const handle=cylinder(hinge,'cabinet door handle',-side*.10,0,.075,.022,.022,.32,M.steel,'y',14);
    registerMachineControl(handle,'lathe','cabinet','Abrir ou fechar armário');
    for(const y of [-.83,.83])cylinder(hinge,'cabinet door hinge',-side*.715,y,-.015,.035,.035,.12,M.steelDark,'y',18);
    hinge.userData.closedRotation=0;hinge.userData.openRotation=side===-1?-1.92:1.92;hinge.userData.panel=panel;hinge.userData.handle=handle;cabinetDoors.push(hinge);
  }
  textPlaque(room,'FERRAMENTAS',cabX,2.58,cabZ+.60,'#efad42',0);
  box(room,'workbench top',-7.15,1.0,-1.75,2.7,.18,1.2,M.steel);
  for(const x of [-8.15,-6.15])for(const z of [-2.18,-1.32])box(room,'bench leg',x,.5,z,.12,.9,.12,M.dark);
  box(room,'bench drawer',-7.15,.79,-1.72,1.4,.24,.8,M.blue);
  for(let x=-8.0;x<=-6.3;x+=.34){cylinder(room,'tool handle',x,1.16,-1.75,.035,.035,.27,M.gold,'y',12);cylinder(room,'tool tip',x,1.31,-1.75,.025,.025,.06,M.steel,'y',10);}
  // Four collectible metals sit on a clearly marked side table.
  box(room,'raw material table top',-7.15,.92,.34,2.55,.14,.82,M.steelDark);
  for(const x of [-8.20,-6.10])for(const z of [.04,.64])box(room,'raw material table leg',x,.45,z,.10,.86,.10,M.dark);
  box(room,'raw material table apron',-7.15,.70,.34,2.30,.22,.70,M.blue);
  textPlaque(room,'MATERIAIS',-7.15,1.22,.77,'#58b9e7',0);
  const rackMaterials=['steel','brass','bronze','gold'];
  for(let i=0;i<rackMaterials.length;i++){
    const stock=rackMaterials[i],x=-7.92+i*.51,group=new THREE.Group();group.name=`barra de ${stockNames[stock].toLowerCase()}`;group.position.set(x,0,.34);
    cylinder(group,'raw material bar',0,1.065,0,.075,.075,.86,stockMaterials[stock],'x',28);
    for(const dx of [-.43,.43])cylinder(group,'bar end collar',dx,1.065,0,.078,.078,.035,M.steelDark,'x',20);
    group.userData.pickup=true;group.userData.inventoryPayload={...pickupDefaults('bar'),name:`Cilindro de ${stockNames[stock].toLowerCase()}`,material:stock,value:stockValues[stock]};
    room.add(group);pickupObjects.push(group);
  }
  // The rear electrical panel was removed to clear this wall and open the view.
  box(room,'safety sign',-8.77,3.8,1.25,.06,.9,1.25,M.yellow);box(room,'safety sign inset',-8.72,3.8,1.25,.03,.76,1.1,M.dark);textPlaque(room,'USE EPI',-8.65,3.8,1.25,'#efad42',-Math.PI/2);
  // Yellow floor marks designate safe work envelopes; aisle remains wide.
  for(const [x,z,w,d] of [[-3.55,-1.45,4.8,3.0],[3.45,-1.5,3.5,3.1]]){box(room,'station front marking',x,.012,z+d/2,w,.012,.04,M.yellow,{cast:false});box(room,'station back marking',x,.012,z-d/2,w,.012,.04,M.yellow,{cast:false});box(room,'station left marking',x-w/2,.012,z,.04,.012,d,M.yellow,{cast:false});box(room,'station right marking',x+w/2,.012,z,.04,.012,d,M.yellow,{cast:false});}
  // Tool trolley and wheels.
  const cart=new THREE.Group();cart.position.set(-5.6,0,3.75);room.add(cart);box(cart,'trolley lower shelf',0,.32,0,1.15,.08,.68,M.blue);box(cart,'trolley upper shelf',0,.82,0,1.15,.08,.68,M.blue);
  for(const x of [-.48,.48])for(const z of [-.25,.25])box(cart,'trolley post',x,.57,z,.05,.58,.05,M.steel);
  for(const x of [-.36,-.12,.12,.36])cylinder(cart,'stored cutter',x,.97,0,.045,.045,.22,M.gold,'y',12);
  for(const x of [-.42,.42])for(const z of [-.23,.23])cylinder(cart,'trolley wheel',x,.12,z,.11,.11,.07,M.black,'z',18);
  // Safety rails near the back aisle.
  for(const x of [1.1,3.35])box(room,'safety post',x,.7,4.9,.08,1.4,.08,M.yellow);
  box(room,'safety top rail',2.22,1.24,4.9,2.25,.07,.07,M.yellow);box(room,'safety lower rail',2.22,.35,4.9,2.25,.07,.07,M.yellow);
}

function buildLathe(){
  // A more traditional manual engine lathe: two pedestals, long bed, headstock, chuck, carriage, handwheels, tailstock and control levers.
  roundedBox(latheRoot,'left pedestal',-1.35,.53,0,1.22,1.0,1.35,M.dark,.07);roundedBox(latheRoot,'right pedestal',1.35,.53,0,1.22,1.0,1.35,M.dark,.07);
  roundedBox(latheRoot,'pedestal front panel',-1.35,.54,.69,1.03,.77,.06,M.navy,.025);roundedBox(latheRoot,'pedestal front panel',1.35,.54,.69,1.03,.77,.06,M.navy,.025);
  for(const x of [-1.65,-1.35,-1.05,1.05,1.35,1.65])box(latheRoot,'pedestal vent',x,.53,.73,.04,.48,.025,M.steelDark,{cast:false});
  roundedBox(latheRoot,'lathe bed',0,1.08,0,4.6,.3,1.05,M.steelDark,.06);box(latheRoot,'bed way left',0,1.26,-.37,4.4,.08,.17,M.ivory);box(latheRoot,'bed way right',0,1.26,.37,4.4,.08,.17,M.ivory);
  for(let x=-1.85;x<=1.86;x+=.24)box(latheRoot,'bed tooth',x,1.31,0,.035,.025,.78,M.dark,{cast:false});
  // Headstock casting, with selector levers visibly mounted to the front face.
  roundedBox(latheRoot,'headstock body',-1.63,1.79,0,1.12,1.18,1.18,M.ivory,.11);roundedBox(latheRoot,'headstock front face',-1.63,1.8,.61,.96,.92,.055,M.ivory2,.025);roundedBox(latheRoot,'headstock upper cover',-1.63,2.4,0,1.18,.13,1.2,M.steelDark,.035);
  box(latheRoot,'headstock label',-1.63,2.04,.65,.46,.22,.035,M.navy);
  latheSelectorLevers=[];
  for(const [index,x] of [-1.89,-1.64,-1.39].entries()){
    cylinder(latheRoot,'selector pivot mounting plate',x,1.54,.684,.075,.075,.045,M.steelDark,'z',20);
    const pivot=new THREE.Group();pivot.name=`lathe selector lever ${index+1}`;pivot.position.set(x,1.54,.72);latheRoot.add(pivot);
    cylinder(pivot,'selector pivot cap',0,0,0,.052,.052,.075,M.steel,'z',18);
    const arm=box(pivot,'selector lever arm',0,.12,.055,.035,.24,.035,M.steelDark);arm.rotation.z=-.08;
    const grip=sphere(pivot,'selector lever knob',0,.245,.06,.055,M.black);
    const target=registerMachineControl(grip,'lathe','selector',`Alavanca seletora ${index+1}`);target.userData.selectorIndex=index;
    const armTarget=registerMachineControl(arm,'lathe','selector',`Alavanca seletora ${index+1}`);armTarget.userData.selectorIndex=index;
    latheSelectorLevers.push({position:1,pivot,arm});
  }
  // Rotating chuck is a separate assembly rotating about the spindle X axis.
  cylinder(latheRotor,'chuck backplate',.10,0,0,.37,.37,.22,M.dark,'x');cylinder(latheRotor,'chuck body',.25,0,0,.32,.32,.17,M.steel,'x');cylinder(latheRotor,'chuck face',.35,0,0,.265,.265,.055,M.ivory,'x');cylinder(latheRotor,'chuck hub',.39,0,0,.105,.105,.05,M.dark,'x');
  latheJaws=[];for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const jaw=box(latheRotor,'three jaw chuck jaw',.42,Math.cos(a)*.24,Math.sin(a)*.24,.16,.075,.075,M.steelDark);jaw.rotation.x=a;jaw.userData.angle=a;latheJaws.push(jaw);}
  // A shaft socket and faceplate center are visible even with no stock loaded.
  cylinder(latheRotor,'chuck socket',.43,0,0,.075,.075,.05,M.black,'x');
  // Carriage, cross slide and tool holder.
  latheCarriage=new THREE.Group();latheCarriage.position.set(-.12,0,0);latheRoot.add(latheCarriage);
  box(latheCarriage,'carriage saddle',0,1.31,.43,.98,.14,.70,M.ivory);box(latheCarriage,'cross slide',0,1.41,.31,.78,.11,.56,M.blue);box(latheCarriage,'compound rest',0,1.48,.17,.46,.09,.34,M.steelDark);box(latheCarriage,'four way tool post',0,1.53,.12,.38,.07,.25,M.yellow);box(latheCarriage,'tool holder',0,1.56,.10,.42,.055,.21,M.dark);box(latheCarriage,'tool insert placeholder',0,1.565,0,.08,.025,.07,M.ivory2);
  box(latheCarriage,'apron',0,1.13,.66,.76,.38,.09,M.blue);
  cylinder(latheCarriage,'carriage handwheel axle',0,1.33,.76,.055,.055,.20,M.steelDark,'z',20);
  latheFeedWheel=addSpokedWheel(latheCarriage,0,1.33,.83,.22,M.steel);for(const part of latheFeedWheel.children)if(part.isMesh)registerMachineControl(part,'lathe','handwheel','Girar volante do carro');
  const feedLeverPivot=new THREE.Group();feedLeverPivot.position.set(-.34,1.30,.76);latheCarriage.add(feedLeverPivot);
  cylinder(feedLeverPivot,'lathe manual feed lever boss',0,0,0,.07,.07,.05,M.steelDark,'z',18);
  const latheFeedArm=box(feedLeverPivot,'lathe manual feed lever arm',0,.12,.06,.035,.24,.035,M.steelDark);
  const latheFeedGrip=sphere(feedLeverPivot,'lathe manual feed lever grip',0,.245,.06,.06,M.black);
  registerMachineControl(latheFeedArm,'lathe','latheFeedLever','Avançar o carro pelo seletor manual');
  registerMachineControl(latheFeedGrip,'lathe','latheFeedLever','Avançar o carro pelo seletor manual');
  latheFeedLever={pivot:feedLeverPivot,position:0};
  // Lead screw and feed rod.
  cylinder(latheRoot,'lead screw',0,.99,.54,.035,.035,4.0,M.steel,'x',18);cylinder(latheRoot,'feed rod',0,.84,.55,.025,.025,4.0,M.steelDark,'x',16);
  // Tailstock and quill.
  box(latheRoot,'tailstock base',.92,1.34,0,.92,.2,.9,M.dark);box(latheRoot,'tailstock casting',.91,1.70,0,.75,.58,.77,M.ivory);box(latheRoot,'tailstock cap',.91,2.00,0,.71,.08,.73,M.steelDark);cylinder(latheRoot,'tailstock quill',.48,1.43,0,.09,.09,.44,M.steel,'x');
  // Manual control levers and speed selector.
  box(latheRoot,'control panel',-1.62,1.91,.78,.96,.90,.13,M.dark);box(latheRoot,'control screen',-1.62,2.07,.855,.45,.20,.03,M.glass);createMachineDisplay('lathe',latheRoot,-1.62,2.07,.879,.45,.20);
  for(const [x,y,mat,action,label] of [[-1.94,1.79,M.green,'power','Ligar / desligar'],[-1.74,1.79,M.gold,'rpmDown','Diminuir RPM'],[-1.54,1.79,M.red,'cut','Usinar']])registerMachineControl(cylinder(latheRoot,'control pushbutton',x,y,.87,.04,.04,.035,mat,'z',16),'lathe',action,label);
  machineEmergencyButtons.lathe=registerMachineControl(cylinder(latheRoot,'emergency stop',-1.34,1.79,.87,.085,.085,.05,M.red,'z',20),'lathe','emergency','Parada de emergência');
  machineEmergencyButtons.lathe.position.set(-1.28,1.58,.87);
  createAutomaticDisplay(latheRoot,'lathe',-1.62,1.64,.88,.46,.11);
  machineAutomaticButtons.lathe={
    start:registerMachineControl(cylinder(latheRoot,'lathe automatic cycle start',-1.88,1.52,.87,.052,.052,.04,M.cyan,'z',20),'lathe','autoStart','Iniciar ciclo automático do torno'),
    stop:registerMachineControl(cylinder(latheRoot,'lathe automatic cycle stop',-1.67,1.52,.87,.04,.04,.035,M.red,'z',18),'lathe','autoStop','Parar ciclo automático do torno')
  };
  textPlaque(latheRoot,'TORNO MECANICO TM-01',-.1,2.65,-.64,'#efad42',0);
  machinePowerLights.lathe=cylinder(latheRoot,'lathe machine status lamp',-1.24,2.35,.64,.055,.055,.035,M.red,'z',18);
}

function buildMill(){
  // Compact, operator-scale manual milling machine (kept deliberately lower than a large industrial gantry).
  roundedBox(millRoot,'milling base',0,.28,0,2.25,.48,1.75,M.blue,.10);roundedBox(millRoot,'base toe',0,.06,0,2.42,.12,1.86,M.dark,.035);box(millRoot,'base front panel',0,.3,.89,1.95,.30,.05,M.blue2);
  for(const x of [-.65,0,.65])box(millRoot,'base vent',x,.3,.925,.34,.12,.025,M.dark,{cast:false});
  roundedBox(millRoot,'column casting',-.37,1.03,-.38,1.05,1.20,1.10,M.blue,.09);box(millRoot,'column face',-.37,1.05,.20,.83,1.0,.08,M.blue2);roundedBox(millRoot,'column cap',-.37,1.67,-.38,1.18,.12,1.2,M.steelDark,.035);
  // Head is roughly chest/head height in the virtual operator scale, not an oversized gantry.
  roundedBox(millRoot,'milling head housing',-.06,1.58,.13,1.34,.52,1.04,M.ivory,.08);roundedBox(millRoot,'head front plate',-.06,1.58,.67,1.15,.40,.055,M.ivory2,.025);roundedBox(millRoot,'motor cover',-.10,1.89,-.10,.72,.22,.66,M.dark,.08);
  for(let z=-.31;z<.1;z+=.1)box(millRoot,'motor cooling fin',-.1,1.90,z,.56,.025,.025,M.steel);
  // Spindle head and machine light.
  cylinder(millRoot,'spindle housing',.34,1.37,.52,.18,.18,.34,M.blue,'y');cylinder(millRoot,'spindle nose',.34,1.18,.52,.12,.12,.12,M.steelDark,'y');
  const taskLight=box(millRoot,'lamp arm',.62,1.44,.48,.035,.35,.035,M.steel);taskLight.rotation.z=-.45;cylinder(millRoot,'lamp shade',.50,1.25,.49,.12,.09,.12,M.gold,'y');
  // Lower knee and cross slides, T-slot table.
  box(millRoot,'knee',.28,.68,.38,1.42,.30,1.02,M.ivory);box(millRoot,'cross slide',.28,.82,.44,1.58,.12,1.12,M.blue2);box(millRoot,'mill table',.28,.91,.50,2.02,.17,1.42,M.steel);
  for(let x=-.56;x<=1.12;x+=.24)box(millRoot,'table T slot',x,1.001,.50,.035,.012,1.20,M.dark,{cast:false});
  // Machine vice with movable jaw on +X side.
  box(millRoot,'vise base',.28,1.025,.50,1.28,.08,.80,M.steelDark);box(millRoot,'vise fixed jaw',-.055,1.135,.50,.10,.16,.74,M.blue);const moveJaw=box(millRoot,'vise movable jaw',.60,1.135,.50,.10,.16,.74,M.blue);moveJaw.userData.movableJaw=true;
  box(millRoot,'vise fixed jaw insert',-.055,1.14,.50,.025,.12,.67,M.steel);const jawInsert=box(millRoot,'vise movable jaw insert',.60,1.14,.50,.025,.12,.67,M.steel);jawInsert.userData.movableJaw=true;
  cylinder(millRoot,'vise screw',.90,1.02,.50,.045,.045,.42,M.steel,'x',18);cylinder(millRoot,'vise handle hub',1.12,1.02,.50,.07,.07,.08,M.steelDark,'x',18);const viseHandle=cylinder(millRoot,'vise handle',1.14,1.02,.5,.025,.025,.33,M.steel,'z',14);viseHandle.rotation.x=Math.PI/2;
  // Tool holder stays in the spindle; the user-added tool is dynamically mounted beneath it.
  box(millRoot,'tool holder cap',.34,1.26,.52,.30,.08,.30,M.steelDark);cylinder(millRoot,'collet housing',.34,1.20,.52,.095,.095,.12,M.steel,'y');
  // Move the console to the open front-left corner so the screen and buttons stay visible.
  box(millRoot,'control console support',-1.02,1.43,.12,.26,.18,.30,M.steelDark);
  box(millRoot,'control console',-1.47,1.45,.28,.96,.70,.14,M.dark);
  box(millRoot,'console display',-1.47,1.59,.36,.40,.15,.025,M.glass);createMachineDisplay('mill',millRoot,-1.47,1.59,.378,.40,.15);
  for(const [y,mat,action,label] of [[1.40,M.green,'power','Ligar / desligar'],[1.28,M.gold,'rpmDown','Diminuir RPM'],[1.16,M.red,'cut','Usinar']])registerMachineControl(cylinder(millRoot,'mill console button',-1.47,y,.38,.035,.035,.03,mat,'z',16),'mill',action,label);
  machineEmergencyButtons.mill=registerMachineControl(cylinder(millRoot,'mill emergency stop',-1.03,1.32,.38,.075,.075,.045,M.red,'z',20),'mill','emergency','Parada de emergência');
  textPlaque(millRoot,'FRESADORA FV-02',-.30,3.0,-.62,'#58b9e7',0);
  machinePowerLights.mill=cylinder(millRoot,'mill status lamp',-1.05,1.78,.38,.045,.045,.035,M.red,'z',16);
  // A side magazine holds blank blocks beside the supported automatic pendant.
  box(millRoot,'automatic magazine mounting bracket',1.28,.44,-.13,.38,.10,.16,M.steelDark);
  roundedBox(millRoot,'automatic blank magazine back',1.78,.45,-.49,.58,.58,.07,M.blue,.025);
  box(millRoot,'automatic blank magazine left rail',1.51,.45,-.23,.06,.58,.52,M.steelDark);
  box(millRoot,'automatic blank magazine right rail',2.05,.45,-.23,.06,.58,.52,M.steelDark);
  box(millRoot,'automatic blank magazine floor',1.78,.18,-.23,.58,.08,.52,M.steelDark);
  box(millRoot,'automatic blank magazine retaining lip',1.78,.27,.035,.58,.08,.07,M.gold);
  for(const x of [1.68,1.88])for(let level=0;level<6;level++)box(millRoot,'stock blank in automatic magazine',x,.255+level*.07,-.22,.17,.05,.30,M.aluminum);
  // A supported side-mounted pendant controls the automatic part feeder.
  box(millRoot,'automatic pendant foot',1.31,.77,.15,.25,.12,.28,M.steelDark);
  box(millRoot,'automatic pendant post',1.42,1.02,.16,.12,.62,.14,M.steelDark);
  box(millRoot,'automatic pendant bracket',1.65,1.34,.30,.48,.10,.18,M.steelDark);
  roundedBox(millRoot,'automatic pendant enclosure',1.91,1.44,.43,.54,.68,.20,M.blue,.045);
  box(millRoot,'automatic pendant face',1.91,1.44,.541,.47,.61,.025,M.dark);
  createAutomaticDisplay(millRoot,'mill',1.91,1.63,.557,.39,.13);
  const autoStartControl=registerMachineControl(cylinder(millRoot,'automatic cycle start button',1.79,1.30,.56,.064,.064,.045,M.cyan,'z',24),'mill','autoStart','Iniciar lote automático');
  const autoStopControl=registerMachineControl(cylinder(millRoot,'automatic cycle stop button',2.03,1.30,.56,.052,.052,.035,M.red,'z',20),'mill','autoStop','Parar lote automático');
  // The dynamic part is centered in the vise; jaws move on its left/right edges.
  return {moveJaw,jawInsert,viseHandle,autoStartControl,autoStopControl};
}

const millDetails=buildMill();buildRoom();buildLathe();
machineAutomaticButtons.mill={start:millDetails.autoStartControl,stop:millDetails.autoStopControl};

// Extra mechanical detail: spoked handwheels, fasteners, threaded rods, guards and coolant lines.
function addSpokedWheel(parent,x,y,z,radius,material=M.steel){
  const wheel=new THREE.Group();wheel.position.set(x,y,z);parent.add(wheel);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(radius*.83,radius*.075,10,32),material);rim.castShadow=true;wheel.add(rim);
  const hub=cylinder(wheel,'handwheel hub detail',0,0,0,radius*.20,radius*.20,radius*.28,M.dark,'z',24);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    const spoke=box(wheel,'handwheel spoke',Math.cos(a)*radius*.40,Math.sin(a)*radius*.40,0,radius*.075,radius*.80,radius*.07,material);
    spoke.rotation.z=a-Math.PI/2;
  }
  const center=cylinder(wheel,'handwheel center cap',0,0,radius*.16,radius*.105,radius*.105,radius*.08,M.gold,'z',20);
  return wheel;
}
function turnLatheHandwheel(angle){
  if(!latheFeedWheel||!latheCarriage)return;
  latheFeedWheel.rotation.z+=angle;
  moveLatheCarriage(angle*.045);
}
function moveLatheCarriage(delta){
  if(!latheCarriage)return;
  const next=THREE.MathUtils.clamp(latheCarriage.position.x+delta,-1.28,1.08);
  latheCarriage.position.x=next;
  if(latheToolAssembly&&!activeMachines.lathe.cutting)latheToolAssembly.position.x=next;
}
function addHelicalThread(parent,axis,start,end,centerY,centerZ,radius,turns,tubeRadius,mat,phase=0){
  const pts=[];const n=Math.max(100,Math.round(turns*18));
  for(let i=0;i<=n;i++){const t=i/n;const a=phase+t*turns*Math.PI*2;const x=start+(end-start)*t;pts.push(axis==='x'?new THREE.Vector3(x,centerY+Math.cos(a)*radius,centerZ+Math.sin(a)*radius):new THREE.Vector3(centerY+Math.cos(a)*radius,x,centerZ+Math.sin(a)*radius));}
  const curve=new THREE.CatmullRomCurve3(pts);const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,n,tubeRadius,5,false),mat);mesh.name='helical thread detail';mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function addIndustrialDetails(){
  // Cast feet, slide covers and guards give both machines a grounded, assembled silhouette.
  for(const x of [-.88,.88])for(const z of [-.62,.62]){
    cylinder(millRoot,'rubber leveling foot',x,.045,z,.13,.15,.09,M.rubber,'y',24);
    box(millRoot,'mill foot plate',x,.10,z,.34,.055,.30,M.steelDark);
  }
  for(const x of [-1.82,1.82])for(const z of [-.43,.43]){
    cylinder(latheRoot,'lathe leveling foot',x,.045,z,.15,.17,.09,M.rubber,'y',24);
    box(latheRoot,'lathe foot plate',x,.10,z,.38,.055,.30,M.steelDark);
  }
  // Exposed vertical ways and their accordion covers on the milling column.
  box(millRoot,'vertical gib rail',-.91,1.05,.285,.12,.78,.075,M.steelDark);
  for(let y=.70;y<=1.40;y+=.10){
    box(millRoot,'accordion way cover rib',-.91,y,.34,.18,.035,.055,M.ivory2);
    box(millRoot,'accordion way shadow',-.91,y-.035,.337,.17,.012,.058,M.steelDark,{cast:false});
  }
  // Detailed rotary scale and index marks on the front of the lathe headstock.
  cylinder(latheRoot,'headstock speed dial bezel',-1.63,2.22,.66,.145,.145,.035,M.dark,'z',32);
  cylinder(latheRoot,'headstock speed dial face',-1.63,2.22,.685,.112,.112,.018,M.ivory2,'z',32);
  cylinder(latheRoot,'headstock speed dial center',-1.63,2.22,.701,.035,.035,.012,M.red,'z',20);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    const tick=box(latheRoot,'speed dial graduation',-1.63+Math.cos(a)*.083,2.22+Math.sin(a)*.083,.701,.009,.028,.008,M.dark,{cast:false});
    tick.rotation.z=a-Math.PI/2;
  }
  const dialNeedle=box(latheRoot,'speed dial needle',-1.605,2.245,.711,.008,.072,.008,M.red,{cast:false});
  dialNeedle.rotation.z=-Math.PI/4;
  // Chip tray and coolant reservoir beneath the lathe bed.
  box(latheRoot,'lathe chip tray',0,.91,.18,3.55,.07,.78,M.steelDark);
  box(latheRoot,'coolant reservoir',1.34,.69,-.43,.66,.38,.55,M.navy);
  box(latheRoot,'coolant reservoir label',1.34,.70,-.145,.38,.12,.025,M.blue2,{cast:false});
  cylinder(latheRoot,'coolant pump cap',1.34,.90,-.43,.10,.10,.06,M.gold,'y',18);
  // Small recessed screws make the existing covers and console read as assembled castings.
  for(const x of [-.87,-.67,.55,.75]){
    cylinder(millRoot,'column cover screw',x,1.48,.249,.025,.025,.018,M.steel,'z',12);
  }
  for(const x of [-.96,-.66,.54,.84]){
    cylinder(millRoot,'mill base panel screw',x,.30,.925,.022,.022,.016,M.steel,'z',12);
  }
  // Handwheels are modeled as separate rims and spokes instead of featureless cylinders.
  addSpokedWheel(latheRoot,1.34,1.76,.61,.20,M.steelDark);
  // Table-height wheel is mounted on the knee's right side with a visible axle.
  cylinder(millRoot,'mill knee handwheel axle',1.10,.68,.40,.045,.045,.24,M.steelDark,'x',18);
  const millKneeWheel=addSpokedWheel(millRoot,1.22,.68,.40,.19,M.steelDark);millKneeWheel.rotation.y=Math.PI/2;
  // Conventional table feed handwheels are joined to the slide castings by steel axles.
  cylinder(millRoot,'mill table X feed axle',-.84,.89,.50,.045,.045,.22,M.steelDark,'x',18);
  const millXWheel=addSpokedWheel(millRoot,-.98,.89,.50,.19,M.steelDark);millXWheel.rotation.y=Math.PI/2;
  cylinder(millRoot,'mill table Y feed axle',.28,.82,1.28,.045,.045,.24,M.steelDark,'z',18);
  addSpokedWheel(millRoot,.28,.82,1.44,.19,M.steelDark);
  // Three-arm quill feed lever, mounted on a real pivot at the front of the head.
  cylinder(millRoot,'quill feed lever mounting boss',.52,1.55,.725,.085,.085,.09,M.steelDark,'z',22);
  cylinder(millRoot,'quill feed lever pivot cap',.52,1.55,.778,.055,.055,.025,M.steel,'z',18);
  millQuillLever=new THREE.Group();millQuillLever.position.set(.52,1.55,.80);millRoot.add(millQuillLever);
  for(const angle of [-2.92,-.68,.78]){
    const arm=box(millQuillLever,'quill feed lever arm',Math.cos(angle)*.15,Math.sin(angle)*.15,0,.04,.31,.04,M.steelDark);arm.rotation.z=angle-Math.PI/2;
    const grip=sphere(millQuillLever,'quill feed lever grip',Math.cos(angle)*.30,Math.sin(angle)*.30,0,.06,M.black);
    registerMachineControl(arm,'mill','millFeedLever','Avançar o eixo pelo manete manual');
    registerMachineControl(grip,'mill','millFeedLever','Avançar o eixo pelo manete manual');
  }
  // Headstock wheel sits on the front casting and connects through its spindle.
  cylinder(millRoot,'mill head handwheel axle',-.58,1.42,.79,.04,.04,.22,M.steelDark,'z',18);
  addSpokedWheel(millRoot,-.58,1.42,.93,.18,M.steel);
  // Thread profile on the lathe lead screw and the milling vise screw.
  addHelicalThread(latheRoot,'x',-1.90,1.90,.99,.54,.038,32,.013,M.steel);
  addHelicalThread(millRoot,'x',.73,1.12,1.02,.50,.043,8,.012,M.ivory2);
  // Rows of real 3D fasteners around castings and table rails.
  for(const x of [-1.95,-1.45,-.95,-.45,.05,.55,1.05,1.55,1.95]){
    for(const z of [-.43,.43]){
      cylinder(latheRoot,'bed rail bolt',x,1.315,z,.032,.032,.018,M.gold,'y',6);
    }
  }
  for(const [x,y,z] of [[-2.02,.65,.73],[-.70,.65,.73],[.78,.65,.73],[1.98,.65,.73]]){
    cylinder(latheRoot,'pedestal face bolt',x,y,z,.035,.035,.025,M.steel,'z',8);
  }
  for(const [x,z] of [[-.72,.76],[-.38,.76],[-.04,.76],[.30,.76],[.64,.76],[.98,.76]]){
    cylinder(millRoot,'table clamp bolt',x,1.012,z,.026,.026,.014,M.gold,'y',6);
  }
  // Mill head warning decal, rear motor cooling slots and a flexible segmented coolant hose.
  box(millRoot,'hazard decal',-.50,1.67,.713,.24,.16,.025,M.yellow,{cast:false});
  const hazard=new THREE.Mesh(new THREE.ConeGeometry(.045,.085,3),M.black);hazard.position.set(-.50,1.68,.733);hazard.rotation.z=Math.PI;millRoot.add(hazard);
  const hosePoints=[new THREE.Vector3(.62,1.52,.54),new THREE.Vector3(.77,1.48,.62),new THREE.Vector3(.79,1.34,.66),new THREE.Vector3(.70,1.24,.68),new THREE.Vector3(.56,1.23,.68)];
  const hoseCurve=new THREE.CatmullRomCurve3(hosePoints);const hose=new THREE.Mesh(new THREE.TubeGeometry(hoseCurve,36,.032,9,false),M.blue);hose.name='flexible coolant hose';hose.castShadow=true;millRoot.add(hose);
  for(let i=0;i<8;i++){const t=(i+1)/10;const q=hoseCurve.getPoint(t);const ring=new THREE.Mesh(new THREE.TorusGeometry(.032,.008,6,12),M.steelDark);ring.position.copy(q);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),hoseCurve.getTangent(t));ring.name='coolant hose rib';millRoot.add(ring);}
  cylinder(millRoot,'coolant nozzle',.56,1.23,.68,.035,.012,.10,M.gold,'y',18);
  // Small sight glass and extra controls on the lathe headstock.
  cylinder(latheRoot,'oil sight glass rim',-1.72,2.13,.67,.085,.085,.025,M.dark,'z',22);
  cylinder(latheRoot,'oil sight glass',-1.72,2.13,.69,.057,.057,.018,M.gold,'z',22);
  for(let i=0;i<3;i++){
    const x=-1.95+i*.27;const led=cylinder(latheRoot,'status LED lens',x,2.28,.69,.027,.027,.025,[M.green,M.gold,M.red][i],'z',16);
  }
  // Protective work lights and small cable guides near the console.
  box(millRoot,'console lower socket',-1.03,1.10,.12,.20,.05,.13,M.steelDark);
  const cableCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-1.03,1.38,.12),new THREE.Vector3(-.99,1.18,.04),new THREE.Vector3(-.91,.92,-.04),new THREE.Vector3(-.70,.78,-.08)]);
  const cable=new THREE.Mesh(new THREE.TubeGeometry(cableCurve,24,.018,7,false),M.black);cable.name='control console cable';millRoot.add(cable);
}
addIndustrialDetails();

// ---------------------------------------------------------------------------
// Realismo 3D: perfis torneados (LatheGeometry), perfis extrudados (barramento em V,
// mesa com rasgos em T, castings), aletas de motor, guardas, mangueiras e sombras de contato.
// ---------------------------------------------------------------------------
function removeNamed(root,names){
  const set=new Set(names),found=[];
  root.traverse(o=>{if(o.isMesh&&set.has(o.name))found.push(o);});
  for(const o of found){o.parent?.remove(o);o.geometry?.dispose();}
  return found.length;
}
function lathed(parent,name,profile,mat,x=0,y=0,z=0,axis='y',segments=48){
  // profile: [[raio, altura], ...] em ordem crescente de altura
  const geo=new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
  const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.position.set(x,y,z);
  if(axis==='x')mesh.rotation.z=-Math.PI/2;if(axis==='-x')mesh.rotation.z=Math.PI/2;if(axis==='z')mesh.rotation.x=Math.PI/2;
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function shapeFrom(points){return new THREE.Shape(points.map(([a,b])=>new THREE.Vector2(a,b)));}
function extrudeAlongX(parent,name,shape,length,mat,x,y,z,bevel=0){
  // perfil no plano (z,y) extrudado ao longo do eixo X
  const geo=new THREE.ExtrudeGeometry(shape,{depth:length,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:16});
  geo.translate(0,0,-length/2);const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.rotation.y=Math.PI/2;mesh.position.set(x,y,z);
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function extrudeUp(parent,name,shape,height,mat,x,y,z,bevel=0){
  // perfil no plano (x,-z) extrudado para cima (eixo Y)
  const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:24});
  const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function stadiumShape(r,halfLen){const s=new THREE.Shape();s.moveTo(-r,-halfLen);s.lineTo(-r,halfLen);s.absarc(0,halfLen,r,Math.PI,0,true);s.lineTo(r,-halfLen);s.absarc(0,-halfLen,r,0,Math.PI,true);return s;}
function instancedBoxes(parent,name,mat,sx,sy,sz,items){
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(sx,sy,sz),mat,items.length);mesh.name=name;
  const o=new THREE.Object3D();items.forEach((it,i)=>{o.position.set(it[0],it[1],it[2]);o.rotation.set(it[3]||0,it[4]||0,it[5]||0);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function finnedProfile(r0,r1,h0,h1,count){
  // perfil de carcaça de motor com aletas de refrigeração
  const pts=[[0,h0],[r0*.9,h0],[r0,h0+.01]];const step=(h1-h0-.04)/count;
  for(let i=0;i<count;i++){const h=h0+.02+i*step;pts.push([r0,h],[r1,h+step*.15],[r1,h+step*.55],[r0,h+step*.7]);}
  pts.push([r0,h1-.01],[r0*.9,h1],[0,h1]);return pts;
}
function hoseWithRibs(parent,name,points,radius,mat,ribMat,ribs=8){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const hose=new THREE.Mesh(new THREE.TubeGeometry(curve,48,radius,10,false),mat);hose.name=name;hose.castShadow=true;parent.add(hose);
  for(let i=0;i<ribs;i++){const t=(i+.5)/ribs;const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,radius*.28,6,14),ribMat);ring.position.copy(curve.getPoint(t));ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),curve.getTangent(t));parent.add(ring);}
  return curve;
}
function ballLever(parent,name,x,y,z,length,angleZ,mat=M.steelDark,knob=M.black,angleX=0){
  const pivot=new THREE.Group();pivot.name=name;pivot.position.set(x,y,z);pivot.rotation.set(angleX,0,angleZ);parent.add(pivot);
  cylinder(pivot,`${name} boss`,0,0,0,.028,.028,.04,M.steelDark,'z',16);
  cylinder(pivot,`${name} rod`,0,length/2,.0,.011,.014,length,mat,'y',12);
  sphere(pivot,`${name} knob`,0,length,0,.03,knob);
  return pivot;
}
function partialRing(parent,name,radius,tube,thetaStart,thetaLength,mat,x,y,z){
  // anel parcial ao redor do eixo X (theta medido como na CylinderGeometry girada)
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=Math.PI/2;parent.add(g);
  const torus=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,40,thetaLength),mat);torus.name=name;
  torus.rotation.z=Math.PI-(thetaStart+thetaLength);torus.castShadow=true;g.add(torus);return g;
}

function addLatheRealism(){
  // 1) Placa de três castanhas torneada (perfil real com chanfros) no lugar dos cilindros simples.
  removeNamed(latheRotor,['chuck backplate','chuck body','chuck face','chuck hub']);
  lathed(latheRotor,'chuck backplate profile',[[0,-.01],[.30,-.01],[.355,.005],[.37,.03],[.37,.17],[.355,.2],[.30,.21],[0,.21]],M.dark,0,0,0,'x',64);
  lathed(latheRotor,'chuck body profile',[[0,.20],[.33,.20],[.335,.215],[.335,.36],[.325,.385],[.30,.395],[.17,.40],[.14,.41],[.12,.43],[0,.43]],M.steel,0,0,0,'x',64);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3+Math.PI/3;cylinder(latheRotor,'chuck key socket',.405,Math.cos(a)*.25,Math.sin(a)*.25,.026,.026,.02,M.black,'x',6);}
  for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6;cylinder(latheRotor,'chuck backplate bolt',.215,Math.cos(a)*.35,Math.sin(a)*.35,.018,.018,.03,M.steelDark,'x',6);}
  for(const jaw of latheJaws){
    // castanhas escalonadas (degraus) como numa placa real
    const s1=box(jaw,'jaw step',-.022,.05,0,.115,.035,.075,M.steelDark);const s2=box(jaw,'jaw step',-.048,.085,0,.065,.035,.075,M.steelDark);
    for(const s of [s1,s2])s.castShadow=true;
    for(let k=0;k<4;k++)box(jaw,'jaw serration',.02+k*.016,-.04,0,.006,.008,.076,M.steel,{cast:false});
  }
  // Nariz do fuso entre o cabeçote e a placa.
  lathed(latheRoot,'spindle nose flange',[[0,0],[.2,0],[.215,.02],[.215,.05],[.17,.07],[.17,.10],[0,.10]],M.steelDark,-1.11,1.43,0,'x',48);

  // 2) Barramento: guia prismática em V, cremalheira dentada e mancais do fuso.
  extrudeAlongX(latheRoot,'prismatic V way',shapeFrom([[-.085,0],[.085,0],[.0,.06]]),4.4,M.steel,0,1.30,.37);
  extrudeAlongX(latheRoot,'inner V way',shapeFrom([[-.06,0],[.06,0],[0,.045]]),4.4,M.steel,0,1.23,-.14);
  box(latheRoot,'bed rack bar',0,1.165,.545,4.25,.055,.035,M.steelDark);
  const teeth=[];for(let x=-2.08;x<=2.08;x+=.045)teeth.push([x,1.13,.552]);
  instancedBoxes(latheRoot,'bed rack teeth',M.steel,.02,.026,.024,teeth);
  for(const x of [-2.04,2.04]){roundedBox(latheRoot,'lead screw bearing bracket',x,.93,.555,.12,.34,.14,M.ivory,.02);cylinder(latheRoot,'bracket bolt',x,1.05,.63,.02,.02,.02,M.steel,'z',6);}
  // Nervuras de reforço sob o barramento.
  for(let x=-.6;x<=.61;x+=.4)box(latheRoot,'bed web rib',x,.98,0,.06,.12,.95,M.steelDark);

  // 3) Caixa Norton (caixa de avanços) com placa indexada e alavancas.
  roundedBox(latheRoot,'quick change gearbox',-1.62,1.07,.60,.95,.30,.17,M.ivory,.035);
  box(latheRoot,'gearbox index plate',-1.62,1.09,.69,.70,.20,.012,M.ivory2);
  const holes=[];for(let i=0;i<9;i++)holes.push([-1.90+i*.07,1.13,.697]);
  const holeMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.012,.012,.012,10),M.black,holes.length);holeMesh.name='gearbox index holes';
  {const o=new THREE.Object3D();holes.forEach((h,i)=>{o.position.set(...h);o.rotation.set(Math.PI/2,0,0);o.updateMatrix();holeMesh.setMatrixAt(i,o.matrix);});latheRoot.add(holeMesh);}
  ballLever(latheRoot,'gearbox tumbler lever',-1.86,1.04,.72,.13,Math.PI*.82);
  ballLever(latheRoot,'gearbox range lever',-1.40,1.04,.72,.13,-Math.PI*.82);
  ballLever(latheRoot,'feed direction lever',-1.22,1.10,.70,.11,-Math.PI*.6);

  // 4) Bandeja de cavacos entre os pedestais, com cavacos espiralados.
  box(latheRoot,'chip pan floor',0,.33,0,1.46,.03,1.12,M.steelDark);
  for(const z of [-.55,.55])box(latheRoot,'chip pan wall',0,.40,z,1.46,.15,.025,M.steelDark);
  const chipMat=[M.steel,M.brass,M.steelDark];
  for(let i=0;i<14;i++){const chip=new THREE.Mesh(new THREE.TorusGeometry(.03+Math.random()*.025,.005,5,16,Math.PI*(1.2+Math.random())),chipMat[i%3]);chip.name='spiral chip';chip.position.set(-.6+Math.random()*1.2,.36+Math.random()*.02,-.4+Math.random()*.8);chip.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);chip.castShadow=true;latheRoot.add(chip);}

  // 5) Proteção traseira contra cavacos (splash guard) com borda enrolada.
  roundedBox(latheRoot,'rear splash guard',.58,1.62,-.62,3.32,.78,.03,M.navy,.012);
  cylinder(latheRoot,'splash guard rolled edge',.58,2.01,-.62,.022,.022,3.32,M.steelDark,'x',14);
  for(const x of [-.6,.6,1.8])box(latheRoot,'splash guard stiffener',x,1.62,-.645,.05,.76,.02,M.steelDark);

  // 6) Proteção da placa (policarbonato articulado, levantada).
  const guardShell=new THREE.Mesh(new THREE.CylinderGeometry(.47,.47,.34,40,1,true,Math.PI*.42,Math.PI*.78),M.guard);
  guardShell.name='chuck guard shell';guardShell.rotation.z=Math.PI/2;guardShell.position.set(-.79,1.43,0);guardShell.renderOrder=2;latheRoot.add(guardShell);
  for(const x of [-.96,-.62])partialRing(latheRoot,'chuck guard frame',.47,.014,Math.PI*.42,Math.PI*.78,M.yellow,x,1.43,0);
  box(latheRoot,'chuck guard hinge arm',-1.0,1.93,-.12,.06,.06,.30,M.yellow);
  cylinder(latheRoot,'chuck guard hinge pin',-1.04,1.93,-.24,.03,.03,.10,M.steelDark,'x',14);

  // 7) Contraponta redesenhada: base, corpo fundido trapezoidal, mangote, volante e ponta rotativa.
  removeNamed(latheRoot,['tailstock base','tailstock casting','tailstock cap']);
  {const q=latheRoot.getObjectByName('tailstock quill');if(q)q.position.x+=.34;}
  const floating=latheRoot.children.find(c=>c.isGroup&&Math.abs(c.position.x-1.34)<.01&&Math.abs(c.position.y-1.76)<.01);
  if(floating){latheRoot.remove(floating);disposeGroup(floating);}
  roundedBox(latheRoot,'tailstock base plate',1.27,1.335,0,.90,.07,.92,M.dark,.02);
  extrudeAlongX(latheRoot,'tailstock casting body',shapeFrom([[-.32,0],[.32,0],[.18,.15],[-.18,.15]]),.70,M.ivory,1.29,1.37,0,.012);
  cylinder(latheRoot,'tailstock barrel',1.29,1.43,0,.155,.155,.74,M.ivory,'x',40);
  cylinder(latheRoot,'tailstock barrel nose collar',.91,1.43,0,.165,.165,.04,M.steelDark,'x',40);
  cylinder(latheRoot,'tailstock barrel end cap',1.68,1.43,0,.12,.13,.06,M.steelDark,'x',32);
  const tailWheel=addSpokedWheel(latheRoot,1.76,1.43,0,.19,M.steel);tailWheel.rotation.y=Math.PI/2;
  const crank=cylinder(tailWheel,'tailstock crank grip',.155,0,.06,.022,.022,.11,M.black,'z',12);crank.castShadow=true;
  lathed(latheRoot,'live center',[[0,0],[.07,0],[.07,.05],[.05,.07],[.0,.15]],M.steel,.61,1.43,0,'-x',32);
  ballLever(latheRoot,'quill lock lever',1.04,1.60,.0,.12,-.9,M.steelDark,M.black,0);
  ballLever(latheRoot,'tailstock clamp lever',1.50,1.40,.36,.16,-2.2);
  cylinder(latheRoot,'tailstock oil cup',1.42,1.6,0,.025,.03,.05,M.brass,'y',14);

  // 8) Cabeçote: tampa da transmissão à esquerda, bujão de óleo e motor com aletas na traseira.
  roundedBox(latheRoot,'headstock gear cover',-2.27,1.70,0,.16,1.22,1.16,M.ivory,.07);
  for(const y of [1.25,2.15])cylinder(latheRoot,'gear cover hinge',-2.36,y,.45,.025,.025,.12,M.steelDark,'y',12);
  cylinder(latheRoot,'gear cover knob',-2.36,1.70,-.35,.04,.04,.05,M.black,'x',16);
  cylinder(latheRoot,'oil filler cap',-1.4,2.49,-.3,.05,.05,.04,M.red,'y',18);
  lathed(latheRoot,'main motor housing',finnedProfile(.17,.205,0,.62,10),M.blue,-1.98,.62,-.95,'x',40);
  lathed(latheRoot,'main motor fan cover',[[0,0],[.18,0],[.18,.06],[.15,.11],[0,.12]],M.dark,-1.36,.62,-.95,'x',32);
  box(latheRoot,'main motor foot',-1.67,.4,-.95,.5,.08,.34,M.dark);
  roundedBox(latheRoot,'motor terminal box',-1.70,.86,-.95,.18,.1,.16,M.blue,.02);
  cylinder(latheRoot,'motor pulley',-2.06,.62,-.95,.08,.08,.08,M.steel,'x',28);
  cylinder(latheRoot,'headstock pulley',-2.28,1.55,-.30,.13,.13,.06,M.steel,'x',32);
  for(const dz of [-.06,.06]){
    const a=new THREE.Vector3(-2.15,.62,-.95+dz*1.2),b=new THREE.Vector3(-2.15,1.55,-.30+dz);
    const len=a.distanceTo(b),mid=a.clone().add(b).multiplyScalar(.5);
    const belt=box(latheRoot,'v belt',mid.x,mid.y,mid.z,.04,len,.018,M.belt);belt.rotation.x=Math.atan2(b.z-a.z,b.y-a.y);
  }
  // Conduíte do motor até o painel.
  hoseWithRibs(latheRoot,'motor conduit',[[-1.70,.92,-.95],[-1.72,1.15,-.86],[-1.8,1.4,-.62]],.022,M.black,M.steelDark,5);

  // 9) Detalhes do carro (acompanham o movimento): manivela do carro transversal, alavanca do porta-ferramentas,
  //    relógio de roscas, alavanca da porca bipartida e mangueira de fluido com bico.
  const c=latheCarriage;
  cylinder(c,'cross slide screw boss',0,1.41,.62,.032,.032,.07,M.steelDark,'z',16);
  const crossCrank=new THREE.Group();crossCrank.position.set(0,1.41,.665);c.add(crossCrank);
  cylinder(crossCrank,'cross slide dial',0,0,0,.055,.055,.03,M.ivory2,'z',32);
  box(crossCrank,'cross slide crank arm',.0,.045,.022,.025,.11,.018,M.steel);
  cylinder(crossCrank,'cross slide crank grip',0,.095,.055,.016,.016,.06,M.black,'z',12);
  cylinder(c,'tool post stud',0,1.625,.12,.022,.022,.08,M.steel,'y',12);
  ballLever(c,'tool post lever',0,1.665,.12,.17,0,M.steel,M.black,-Math.PI/2+.25);
  cylinder(c,'compound rest gib screw',.18,1.48,.30,.016,.016,.04,M.gold,'z',6);
  cylinder(c,'thread dial housing',.33,1.27,.70,.04,.04,.06,M.steelDark,'y',16);
  cylinder(c,'thread dial face',.33,1.30,.70,.036,.036,.004,M.ivory2,'y',24);
  ballLever(c,'half nut lever',.26,1.05,.715,.12,-2.5);
  hoseWithRibs(c,'carriage coolant hose',[[.32,1.42,.04],[.40,1.62,.10],[.36,1.82,.08],[.20,1.86,.03],[.08,1.76,.0],[.05,1.68,0]],.018,M.blue,M.steelDark,9);
  lathed(c,'carriage coolant nozzle',[[.006,0],[.018,0],[.02,.05],[.008,.07]],M.gold,.05,1.68,0,'y',14).rotation.x=Math.PI;

  // 10) Portas dos pedestais com puxadores e dobradiças; luminária articulada.
  for(const px of [-1.35,1.35]){
    cylinder(latheRoot,'pedestal door handle',px+.36,.58,.765,.016,.016,.24,M.steel,'y',12);
    for(const y of [.47,.69])box(latheRoot,'handle standoff',px+.36,y,.74,.02,.02,.05,M.steel);
    for(const y of [.28,.82])cylinder(latheRoot,'door hinge',px-.50,y,.73,.018,.018,.08,M.steelDark,'y',10);
  }
  cylinder(latheRoot,'work lamp base',-1.95,2.49,-.38,.06,.07,.05,M.dark,'y',18);
  const lampPts=[[-1.95,2.5,-.38],[-1.92,2.82,-.25],[-1.62,2.95,-.05],[-1.35,2.82,.12]];
  const lampCurve=new THREE.CatmullRomCurve3(lampPts.map(p=>new THREE.Vector3(...p)));
  const lampArm=new THREE.Mesh(new THREE.TubeGeometry(lampCurve,30,.014,8,false),M.steelDark);lampArm.name='work lamp gooseneck';lampArm.castShadow=true;latheRoot.add(lampArm);
  const shade=lathed(latheRoot,'work lamp shade',[[.03,0],[.05,.03],[.085,.11],[.09,.12]],M.gold,-1.33,2.80,.13,'y',24);shade.rotation.x=Math.PI;shade.rotation.z=.35;
  const bulb=new THREE.Mesh(new THREE.CircleGeometry(.08,24),M.lampGlow);bulb.position.set(-1.30,2.68,.14);bulb.rotation.x=Math.PI/2;bulb.rotation.y=.35;latheRoot.add(bulb);
}

const MILL_HEAD_LIFT=.30;
let millQuill=null;
function raiseMillHead(){
  // O cabeçote original ficava baixo demais: o nariz do fuso entrava na morsa e escondia a ferramenta.
  // Sobe o cabeçote inteiro e troca o nariz fixo por um mangote que desce junto com a ferramenta.
  const lift=['milling head housing','head front plate','spindle housing','lamp arm','lamp shade','quill feed lever mounting boss','quill feed lever pivot cap','mill head handwheel axle','hazard decal'];
  const moved=[];millRoot.traverse(o=>{if(o.isMesh&&o.parent===millRoot&&lift.includes(o.name))moved.push(o);});
  for(const o of millRoot.children){
    if(o.isMesh&&o.geometry?.type==='ConeGeometry'&&Math.abs(o.position.x+.50)<.01)moved.push(o);
    if(o.isGroup&&Math.abs(o.position.x+.58)<.01&&Math.abs(o.position.y-1.42)<.01)moved.push(o);
  }
  if(millQuillLever)moved.push(millQuillLever);
  for(const o of moved)o.position.y+=MILL_HEAD_LIFT;
  removeNamed(millRoot,['spindle nose','tool holder cap','collet housing','flexible coolant hose','coolant hose rib','coolant nozzle']);
  lathed(millRoot,'spindle nose',[[0,0],[.13,0],[.13,.06],[.11,.08],[.11,.12],[0,.12]],M.steelDark,.34,1.40,.52,'y',40);
  millQuill=new THREE.Group();millQuill.name='mill quill';millRoot.add(millQuill);
  lathed(millQuill,'quill sleeve',[[0,0],[.075,0],[.08,.01],[.08,.44],[0,.44]],M.steel,0,0,0,'y',40);
  lathed(millQuill,'spindle drive collar',[[0,-.03],[.09,-.03],[.095,-.02],[.095,.02],[0,.02]],M.steelDark,0,0,0,'y',32);
  for(const s of [-1,1])box(millQuill,'spindle drive key',s*.07,-.03,0,.03,.03,.04,M.steelDark);
  millQuill.position.set(.34,1.55,.52);
  // Nova mangueira de fluido saindo do cabeçote e apontando para a ferramenta.
  hoseWithRibs(millRoot,'flexible coolant hose',[[.62,1.82,.56],[.80,1.74,.66],[.80,1.52,.70],[.66,1.36,.68],[.54,1.31,.62]],.03,M.blue,M.steelDark,9);
  const nozzle=lathed(millRoot,'coolant nozzle',[[.008,0],[.03,0],[.03,.02],[.012,.09]],M.gold,.54,1.31,.62,'y',16);
  nozzle.rotation.set(0,0,0);nozzle.lookAt(new THREE.Vector3(.34,1.27,.52).add(millRoot.position));nozzle.rotateX(Math.PI/2);
}
// Carro da mesa: mesa, morsa, peça e volante X andam juntos. Durante o corte é a mesa que se desloca
// sob a fresa (como numa fresadora real), enquanto o mangote só sobe e desce.
const millTableCarrier=new THREE.Group();millTableCarrier.name='mill table carrier';millRoot.add(millTableCarrier);
const TABLE_MOVER_NAMES=new Set(['T-slot milling table','table front dog slot','table travel stop dog','dog screw','table end bracket','vise base','vise fixed jaw','vise movable jaw','vise fixed jaw insert','vise movable jaw insert','vise screw','vise handle hub','vise handle','helical thread detail','table clamp bolt','vise swivel base','swivel graduation','table power feed unit','power feed lever','power feed speed knob','mill table X feed axle','X dial collar','workpiece-in-vise','metal chip']);
function collectTableMovers(){
  for(const o of [...millRoot.children])if(o!==millTableCarrier&&(o.userData.tableMover||TABLE_MOVER_NAMES.has(o.name)))millTableCarrier.add(o);
}
function syncMillQuill(dt=1/60){
  if(!millQuill)return;
  const s=activeMachines.mill;let target=0;
  if(millToolAssembly){if(s.cutting)target=-(millToolAssembly.position.x-.34);millToolAssembly.position.x=.34;}
  millTableCarrier.position.x=s.cutting?target:THREE.MathUtils.damp(millTableCarrier.position.x,millManualOffset.x,6,dt);
  millTableCarrier.position.z=THREE.MathUtils.damp(millTableCarrier.position.z,s.cutting?0:millManualOffset.y,6,dt);
  if(millPart&&millPart.parent===millRoot)millTableCarrier.add(millPart);
  for(const o of [...millRoot.children])if(o.name==='metal chip')millTableCarrier.add(o);
  const toolY=millToolAssembly?millToolAssembly.position.y:1.44;
  millQuill.position.set(.34,toolY+.11,.52);
  if(millCollet)millCollet.position.set(.34,toolY-.045,.52);
}
const baseRemoveStockPartForCarrier=removeStockPart;
removeStockPart=function(station){if(station==='mill'&&millPart&&millPart.parent!==millRoot)millRoot.add(millPart);return baseRemoveStockPartForCarrier(station);};
function addMillRealism(){
  raiseMillHead();
  // 1) Mesa com rasgos em T reais (perfil extrudado), mais estreita e proporcional.
  removeNamed(millRoot,['mill table','table T slot']);
  const half=.42,top=.17,pts=[[-half,0],[half,0],[half,top]];
  for(const cz of [.26,0,-.26]){pts.push([cz+.022,top],[cz+.022,top-.035],[cz+.045,top-.035],[cz+.045,top-.065],[cz-.045,top-.065],[cz-.045,top-.035],[cz-.022,top-.035],[cz-.022,top]);}
  pts.push([-half,top]);
  extrudeAlongX(millRoot,'T-slot milling table',shapeFrom(pts),2.02,M.steel,.28,.825,.50,.006);
  box(millRoot,'table front dog slot',.28,.90,.925,2.0,.03,.012,M.black,{cast:false});
  for(const x of [-.45,1.02]){roundedBox(millRoot,'table travel stop dog',x,.90,.94,.08,.07,.04,M.gold,.01);cylinder(millRoot,'dog screw',x,.90,.965,.012,.012,.012,M.steel,'z',6);}
  for(const x of [-.66,1.22])box(millRoot,'table end bracket',x,.86,.5,.14,.10,.70,M.ivory);
  // Eixo do volante Y alcança o carro transversal; colares graduados nos volantes.
  cylinder(millRoot,'mill Y axle extension',.28,.82,1.10,.045,.045,.24,M.steelDark,'z',18);
  box(millRoot,'Y feed bearing block',.28,.82,1.02,.18,.14,.07,M.ivory);
  cylinder(millRoot,'Y dial collar',.28,.82,1.355,.075,.075,.05,M.ivory2,'z',32);
  cylinder(millRoot,'X dial collar',-.90,.89,.50,.075,.075,.05,M.ivory2,'x',32);
  cylinder(millRoot,'Z dial collar',1.14,.68,.40,.07,.07,.05,M.ivory2,'x',32);
  // Avanço automático da mesa (power feed) na ponta direita.
  roundedBox(millRoot,'table power feed unit',1.385,.91,.50,.17,.21,.32,M.dark,.04);
  ballLever(millRoot,'power feed lever',1.40,1.02,.50,.09,0,M.steel,M.red);
  cylinder(millRoot,'power feed speed knob',1.475,.91,.58,.03,.03,.03,M.gold,'x',18);

  // 2) Cabeçote: caixa de polias em formato estádio, motor vertical aletado e tirante (drawbar).
  removeNamed(millRoot,['motor cover','motor cooling fin']);
  extrudeUp(millRoot,'belt housing',stadiumShape(.21,.22),.15,M.ivory,.34,2.14,.30,.02);
  lathed(millRoot,'drawbar cap',[[0,0],[.06,0],[.06,.04],[.04,.06],[0,.06]],M.dark,.34,2.31,.52,'y',24);
  cylinder(millRoot,'drawbar nut',.34,2.38,.52,.03,.03,.03,M.steel,'y',6);
  lathed(millRoot,'vertical spindle motor',finnedProfile(.17,.19,0,.34,7),M.blue,.34,2.30,.08,'y',40);
  lathed(millRoot,'motor fan cap',[[0,0],[.17,0],[.17,.03],[.12,.07],[0,.08]],M.dark,.34,2.64,.08,'y',32);
  roundedBox(millRoot,'motor terminal box',.56,2.46,.08,.09,.12,.12,M.blue,.02);
  hoseWithRibs(millRoot,'motor conduit',[[.6,2.46,.08],[.70,2.25,-.08],[.5,1.95,-.40],[.2,1.72,-.62]],.02,M.black,M.steelDark,5);
  // Seletor de velocidade (volante pequeno) e alavanca alta/baixa na caixa de polias.
  const speedWheel=addSpokedWheel(millRoot,.58,2.22,.35,.075,M.steel);speedWheel.rotation.y=Math.PI/2;
  ballLever(millRoot,'hi lo range lever',.14,2.22,.55,.10,.6);
  // Haste de fim de curso do mangote com porcas.
  cylinder(millRoot,'quill depth stop rod',.55,1.70,.42,.012,.012,.30,M.steel,'y',12);
  for(const y of [1.62,1.66])cylinder(millRoot,'depth stop nut',.55,y,.42,.026,.026,.022,M.steelDark,'y',6);
  box(millRoot,'depth stop block',.53,1.86,.42,.06,.04,.06,M.steelDark);

  // 3) Coluna: guias rabo de andorinha, porta elétrica traseira e nervuras laterais.
  for(const x of [-.66,-.10])extrudeUp(millRoot,'column dovetail way',shapeFrom([[-.05,0],[.05,0],[.07,-.06],[-.07,-.06]]),.48,M.steel,x,.84,.24);
  roundedBox(millRoot,'column rear electrical door',-.37,1.02,-.945,.72,.86,.03,M.blue2,.015);
  cylinder(millRoot,'electrical door lock',-.08,1.02,-.965,.03,.03,.02,M.steel,'z',16);
  for(let i=0;i<5;i++)box(millRoot,'electrical door louver',-.47,.72+i*.06,-.962,.36,.018,.012,M.dark,{cast:false});
  for(const x of [-.91,.17])for(const z of [-.62,-.14])box(millRoot,'column side rib',x+(x<0?-.015:.015),1.0,z,.03,1.1,.05,M.blue);

  // 4) Base com bandeja de cavacos (bordas elevadas) e bomba de refrigeração.
  for(const [x,z,sx,sz] of [[0,.86,2.2,.03],[-1.10,.3,.03,1.15],[1.10,.3,.03,1.15]])box(millRoot,'chip pan lip',x,.545,z,sx,.05,sz,M.steelDark);
  lathed(millRoot,'coolant pump motor',finnedProfile(.07,.085,0,.18,4),M.blue2,.95,.52,-.62,'y',24);
  cylinder(millRoot,'coolant pump outlet',.95,.75,-.62,.02,.02,.06,M.gold,'y',12);
  hoseWithRibs(millRoot,'coolant supply hose',[[.95,.78,-.62],[1.0,1.1,-.5],[.85,1.65,-.1],[.68,1.82,.4],[.62,1.82,.56]],.022,M.blue,M.steelDark,8);

  // 5) Morsa: manopla com esferas, parafusos dos mordentes e base giratória graduada.
  for(const s of [-1,1]){const knob=sphere(millDetails.viseHandle,'vise handle ball',0,s*.17,0,.03,M.black);knob.castShadow=true;}
  const fixedInsert=millRoot.getObjectByName('vise fixed jaw insert');
  for(const z of [-.2,.2]){if(fixedInsert)cylinder(fixedInsert,'jaw plate screw',.014,.025,z,.012,.012,.006,M.dark,'x',8);cylinder(millDetails.jawInsert,'jaw plate screw',-.014,.025,z,.012,.012,.006,M.dark,'x',8);}
  lathed(millRoot,'vise swivel base',[[0,0],[.40,0],[.42,.01],[.42,.022],[0,.022]],M.steelDark,.28,.985,.50,'y',64);
  const ticks=[];for(let i=0;i<36;i++){const a=i*Math.PI/18;ticks.push([.28+Math.cos(a)*.415,1.0,.50+Math.sin(a)*.415,0,-a,0]);}
  instancedBoxes(millRoot,'swivel graduation',M.ivory2,.02,.006,.004,ticks);

  // 6) Leitor digital (DRO) em braço articulado ao lado da coluna.
  box(millRoot,'DRO arm',-1.0,1.78,-.25,.05,.05,.5,M.steelDark);
  roundedBox(millRoot,'DRO housing',-1.0,1.86,.05,.42,.26,.07,M.dark,.02);
  const droCanvas=document.createElement('canvas');droCanvas.width=256;droCanvas.height=160;const dx=droCanvas.getContext('2d');
  dx.fillStyle='#04110b';dx.fillRect(0,0,256,160);dx.font='bold 30px monospace';dx.fillStyle='#ff5b4d';
  ['X  +012.450','Y  -003.120','Z  +000.885'].forEach((t,i)=>dx.fillText(t,14,44+i*46));
  const droTex=new THREE.CanvasTexture(droCanvas);droTex.colorSpace=THREE.SRGBColorSpace;
  const droScreen=new THREE.Mesh(new THREE.PlaneGeometry(.34,.2),new THREE.MeshBasicMaterial({map:droTex}));droScreen.position.set(-1.0,1.865,.087);millRoot.add(droScreen);

  // Tudo que fica sobre a mesa passa a andar junto com ela.
  for(const o of millRoot.children)if(o.isGroup&&Math.abs(o.position.x+.98)<.01&&Math.abs(o.position.y-.89)<.01)o.userData.tableMover=true;
  collectTableMovers();
}

addLatheRealism();
addMillRealism();

// ---------------------------------------------------------------------------
// Manivelas, volantes e fins de curso. Segure o clique sobre um volante/manivela para girar
// continuamente; ao chegar no limite a peça para (nada atravessa) e o sentido inverte no próximo giro.
// ---------------------------------------------------------------------------
const LATHE_CARRIAGE_MIN=-.22,LATHE_CARRIAGE_MAX=.20;   // entre a placa e a ponta da contraponta
const LATHE_CUT_START=-.20,LATHE_CUT_END=.17;
const millManualOffset=new THREE.Vector2(0,0);          // x = mesa longitudinal, y = transversal
const MILL_X_LIMIT=.30,MILL_Y_LIMIT=.12,MILL_TOOL_TOP=1.44;
const crankDirs={handwheel:-1,tailWheel:1,millX:1,millY:1,millFeed:-1};
const lastLimitNotice={};
function limitNotice(key,text){const now=performance.now();if(now-(lastLimitNotice[key]||0)<1500)return;lastLimitNotice[key]=now;notify(text,'error');}

// Torno: carro com fim de curso real (não passa pela placa nem pela contraponta).
moveLatheCarriage=function(delta){
  if(!latheCarriage)return false;
  const wanted=latheCarriage.position.x+delta,next=THREE.MathUtils.clamp(wanted,LATHE_CARRIAGE_MIN,LATHE_CARRIAGE_MAX);
  latheCarriage.position.x=next;if(latheToolAssembly&&!activeMachines.lathe.cutting)latheToolAssembly.position.x=next;
  return Math.abs(wanted-next)>1e-6;
};
turnLatheHandwheel=function(angle){
  if(!latheFeedWheel||!latheCarriage)return true;
  const before=latheCarriage.position.x;const hit=moveLatheCarriage(angle*.045);
  latheFeedWheel.rotation.z+=(latheCarriage.position.x-before)/.045;
  if(hit)limitNotice('lathe-carriage',latheCarriage.position.x>=LATHE_CARRIAGE_MAX-1e-6?'Fim de curso: o carro encostou no limite da contraponta.':'Fim de curso: o carro chegou perto da placa.');
  return hit;
};
// Trava a posição inicial dentro dos limites.
if(latheCarriage){latheCarriage.position.x=THREE.MathUtils.clamp(latheCarriage.position.x,LATHE_CARRIAGE_MIN,LATHE_CARRIAGE_MAX);}

// Carro mais estreito para caber entre a placa e a contraponta sem atravessar nenhuma das duas.
for(const [name,from,to] of [['carriage saddle',.98,.70],['cross slide',.78,.66],['apron',.76,.66]]){const m=latheCarriage.getObjectByName(name);if(m)m.scale.x=to/from;}
for(const o of latheCarriage.children){if(o.isGroup&&Math.abs(o.position.x+.34)<.01)o.position.x=-.27;}
for(const name of ['thread dial housing','thread dial face']){const m=latheCarriage.getObjectByName(name);if(m)m.position.x=.25;}

// Contraponta: mangote e ponta rotativa avançam/recuam pelo volante.
const tailParts=['tailstock quill','live center'].map(n=>latheRoot.getObjectByName(n)).filter(Boolean);
tailParts.forEach(o=>o.userData.baseX=o.position.x);
let tailQuillOffset=0;const tailWheelGroup=latheRoot.getObjectByName('tailstock crank grip')?.parent;
tailWheelGroup?.traverse(o=>{if(o.isMesh)registerMachineControl(o,'lathe','tailWheel','Volante da contraponta');});

// Fresadora: volantes X e Y movem a mesa; o manete do mangote desce até encostar na peça.
const millXWheel=millTableCarrier.children.find(o=>o.isGroup&&o.userData.tableMover);
const millYWheel=millRoot.children.find(o=>o.isGroup&&Math.abs(o.position.x-.28)<.01&&Math.abs(o.position.z-1.44)<.01);
millXWheel?.traverse(o=>{if(o.isMesh)registerMachineControl(o,'mill','millX','Volante da mesa (eixo X)');});
millYWheel?.traverse(o=>{if(o.isMesh)registerMachineControl(o,'mill','millY','Volante transversal (eixo Y)');});
function millToolBottomOffset(){const t=activeMachines.mill.tool;return t==='drill'?.218:(t==='facemill'?.205:.182);}
function millSurfaceUnderTool(offX=millManualOffset.x,offZ=millManualOffset.y){
  // altura da superfície (peça, morsa ou mesa) que está embaixo da ferramenta (x=.34, z=.52)
  const lx=.34-offX,lz=.52-offZ;let top=.995;
  if(Math.abs(lx-.28)<=.64&&Math.abs(lz-.50)<=.40)top=1.065;
  if(activeMachines.mill.pieceLoaded&&Math.abs(lx-.28)<=.285+.06&&Math.abs(lz-.50)<=.24+.06)top=1.195;
  for(const jx of [-.055,millDetails.moveJaw.position.x])if(Math.abs(lx-jx)<=.05+.06&&Math.abs(lz-.50)<=.37)top=Math.max(top,1.215);
  return top+(typeof millKneeOffset==='number'?millKneeOffset:0);
}
function millToolMinY(offX,offZ){return millSurfaceUnderTool(offX,offZ)+millToolBottomOffset()+.004;}
function moveMillTable(axis){
  const s=activeMachines.mill;if(s.powered||s.cutting){notify('Desligue a fresadora antes de girar os volantes da mesa.','error');return;}
  const key=axis==='x'?'millX':'millY',limit=axis==='x'?MILL_X_LIMIT:MILL_Y_LIMIT,step=.018*crankDirs[key];
  const cur=axis==='x'?millManualOffset.x:millManualOffset.y;const next=THREE.MathUtils.clamp(cur+step,-limit,limit);
  const nx=axis==='x'?next:millManualOffset.x,nz=axis==='x'?millManualOffset.y:next;
  if(millToolAssembly&&millToolAssembly.position.y<millToolMinY(nx,nz)){crankDirs[key]*=-1;limitNotice('mill-collide','A ferramenta está baixa: recolha o mangote antes de mover a mesa por baixo dela.');return;}
  if(axis==='x')millManualOffset.x=next;else millManualOffset.y=next;
  const wheel=axis==='x'?millXWheel:millYWheel;if(wheel)wheel.rotation.z+=(next-cur)/.012;
  if(Math.abs(next-(cur+step))>1e-6){crankDirs[key]*=-1;limitNotice('mill-'+axis,`Fim de curso da mesa no eixo ${axis.toUpperCase()}. Gire de novo para voltar.`);}
}
function feedMillQuill(step=.014){
  const s=activeMachines.mill;if(s.powered||s.cutting){notify('Desligue a fresadora antes de movimentar o mangote manualmente.','error');return;}
  if(!millToolAssembly){notify('Instale uma ferramenta para usar o manete do mangote.','error');return;}
  const minY=millToolMinY(millManualOffset.x,millManualOffset.y),cur=millToolAssembly.position.y,wanted=cur+step*crankDirs.millFeed;
  const next=THREE.MathUtils.clamp(wanted,Math.min(minY,MILL_TOOL_TOP),MILL_TOOL_TOP);
  millToolAssembly.position.y=next;if(millQuillLever)millQuillLever.rotation.z=(MILL_TOOL_TOP-next)*4.2;
  if(Math.abs(wanted-next)>1e-6){
    const touching=next<MILL_TOOL_TOP-.001;crankDirs.millFeed*=-1;
    limitNotice('mill-feed',touching?'Fim de curso: a ferramenta encostou na peça/morsa. Gire de novo para subir.':'Mangote todo recolhido. Gire de novo para descer.');
  }
}
function turnTailstock(){
  const s=activeMachines.lathe;if(s.cutting){notify('Aguarde a passada terminar para mexer na contraponta.','error');return;}
  const minOff=s.pieceLoaded?0:-.10,maxOff=.12,wanted=tailQuillOffset+.012*crankDirs.tailWheel,next=THREE.MathUtils.clamp(wanted,minOff,maxOff);
  tailQuillOffset=next;tailParts.forEach(o=>o.position.x=o.userData.baseX+next);if(tailWheelGroup)tailWheelGroup.rotation.z+=.6*crankDirs.tailWheel;
  if(Math.abs(wanted-next)>1e-6){crankDirs.tailWheel*=-1;limitNotice('tail',next<=minOff+1e-6?(s.pieceLoaded?'A ponta rotativa já está apoiada na barra.':'Mangote todo avançado.'):'Mangote da contraponta todo recolhido.');}
}

// Morsa: manivela perpendicular ao fuso (não cruza mais o parafuso nem a mesa) e mordente animado.
millDetails.viseHandle.visible=false;millDetails.viseHandle.traverse(o=>{o.visible=false;});
for(const name of ['vise screw','vise handle hub']){const m=millTableCarrier.getObjectByName(name);if(m)m.position.y=1.11;}
const viseThread=millTableCarrier.children.find(o=>o.name==='helical thread detail');if(viseThread)viseThread.position.y+=.09;
box(millTableCarrier,'vise screw end bracket',1.04,1.07,.50,.08,.17,.30,M.blue);
const viseCrank=new THREE.Group();viseCrank.name='vise crank';viseCrank.position.set(1.13,1.11,.50);millTableCarrier.add(viseCrank);
const crankParts=[cylinder(viseCrank,'vise crank hub',0,0,0,.04,.04,.05,M.steelDark,'x',20),box(viseCrank,'vise crank arm',.02,.045,0,.025,.10,.03,M.steel),cylinder(viseCrank,'vise crank grip',.06,.09,0,.016,.016,.08,M.black,'x',14),sphere(viseCrank,'vise crank knob',.105,.09,0,.022,M.black)];
crankParts.forEach(m=>registerMachineControl(m,'mill','viseCrank','Manivela da morsa'));
const viseAnim={target:millDetails.moveJaw.position.x,pitch:.012};
moveVise=function(closed){viseAnim.target=closed?.615:.80;};
const latheJawAnim={current:.24,target:.24};
moveLatheJaws=function(closed){latheJawAnim.target=closed?.1675:.24;};

function updateMechanisms(dt){
  const jaw=millDetails.moveJaw,cur=jaw.position.x;
  if(Math.abs(viseAnim.target-cur)>1e-4){const next=cur+THREE.MathUtils.clamp(viseAnim.target-cur,-.35*dt,.35*dt);jaw.position.x=next;millDetails.jawInsert.position.x=next;viseCrank.rotation.x-=(next-cur)/viseAnim.pitch;}
  if(Math.abs(latheJawAnim.target-latheJawAnim.current)>1e-4){
    latheJawAnim.current+=THREE.MathUtils.clamp(latheJawAnim.target-latheJawAnim.current,-.18*dt,.18*dt);
    for(const j of latheJaws){const a=j.userData.angle;j.position.y=Math.cos(a)*latheJawAnim.current;j.position.z=Math.sin(a)*latheJawAnim.current;}
  }
  if(millToolAssembly&&!activeMachines.mill.cutting&&millQuillLever)millQuillLever.rotation.z=(MILL_TOOL_TOP-millToolAssembly.position.y)*4.2;
}

// Encaminha as novas ações de controle (as antigas continuam no controlador original).
const baseActivateMachineControl=activateMachineControl;
activateMachineControl=function(station,action,target=null){
  if(action==='handwheel'){const s=activeMachines.lathe;if(s.powered||s.cutting){notify('Desligue o torno antes de girar o volante.','error');return;}if(turnLatheHandwheel(crankDirs.handwheel*Math.PI/5))crankDirs.handwheel*=-1;return;}
  if(action==='tailWheel'){turnTailstock();return;}
  if(action==='millX'){moveMillTable('x');return;}
  if(action==='millY'){moveMillTable('y');return;}
  if(action==='millFeedLever'){feedMillQuill();return;}
  if(action==='viseCrank'){if(activeStation!=='mill')switchStation('mill');clampPiece('mill');return;}
  return baseActivateMachineControl(station,action,target);
};

// Segurar o clique = girar continuamente (volantes, manete do mangote, contraponta).
const REPEATABLE_CONTROLS=new Set(['handwheel','tailWheel','millX','millY','millFeedLever']);
let crankHold=null;
function stopCrankHold(){if(crankHold){clearInterval(crankHold.timer);crankHold=null;}}
viewport.addEventListener('pointerdown',event=>{
  if(event.button!==0||renderer.xr.isPresenting)return;
  if(walkControls.isLocked)machineControlPointer.set(0,0);
  else if(orbitControls.enabled){const rect=renderer.domElement.getBoundingClientRect();machineControlPointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);}
  else return;
  machineControlRaycaster.setFromCamera(machineControlPointer,camera);
  const hit=machineControlRaycaster.intersectObjects(machineControlTargets,false)[0];
  const control=hit?.object.userData.machineControl;if(!control||!REPEATABLE_CONTROLS.has(control.action))return;
  event.preventDefault();event.stopPropagation();stopCrankHold();
  activateMachineControl(control.station,control.action,hit.object);
  crankHold={timer:setInterval(()=>activateMachineControl(control.station,control.action,hit.object),110)};
},true);
for(const ev of ['pointerup','pointercancel','blur'])window.addEventListener(ev,stopCrankHold);

// Sombras de contato suaves sob móveis e máquinas (oclusão de ambiente "assada").
function addContactShadows(){
  const can=document.createElement('canvas');can.width=can.height=128;const ctx=can.getContext('2d');
  const g=ctx.createRadialGradient(64,64,6,64,64,64);g.addColorStop(0,'rgba(0,0,0,0.85)');g.addColorStop(.55,'rgba(0,0,0,0.45)');g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,128,128);const tex=new THREE.CanvasTexture(can);
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:.62,polygonOffset:true,polygonOffsetFactor:-2});
  for(const [x,z,sx,sz] of [[-3.55,-1.45,5.6,2.3],[3.45,-1.5,3.2,2.7],[7.75,-4.55,2.0,1.6],[-7.15,-1.75,3.2,1.6],[-7.15,.34,3.0,1.3],[6.35,3.05,2.2,1.5],[-5.6,3.75,1.6,1.1],[6.35,1.35,2.3,1.3],[2.2,3.0,2.8,1.3]]){
    const p=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),mat);p.name='contact shadow';p.rotation.x=-Math.PI/2;p.position.set(x,.021,z);p.renderOrder=1;room.add(p);
  }
}
addContactShadows();

function makeVRTexture(text, background='#1b2b37', foreground='#f2f6f8', border='#536c7b', fontSize=36){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=background;ctx.fillRect(0,0,512,128);
  ctx.strokeStyle=border;ctx.lineWidth=5;ctx.strokeRect(3,3,506,122);
  ctx.fillStyle=foreground;ctx.font=`bold ${fontSize}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
  // Keep labels readable on compact VR controls.
  let lines=String(text).split('\n');
  if(lines.length===1)ctx.fillText(lines[0],256,65,470);
  else {ctx.fillText(lines[0],256,43,470);ctx.font=`${Math.max(23,fontSize-6)}px Arial`;ctx.fillText(lines.slice(1).join(' '),256,83,470);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
  return {canvas,ctx,texture};
}
function repaintVRTexture(ref,text,background,foreground,border,fontSize=36){
  const {canvas,ctx,texture}=ref;ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle=border;ctx.lineWidth=5;ctx.strokeRect(3,3,506,122);ctx.fillStyle=foreground;ctx.textAlign='center';ctx.textBaseline='middle';
  const lines=String(text).split('\n');
  if(lines.length===1){ctx.font=`bold ${fontSize}px Arial`;ctx.fillText(lines[0],256,65,470);}else{ctx.font=`bold ${fontSize}px Arial`;ctx.fillText(lines[0],256,43,470);ctx.font=`${Math.max(21,fontSize-7)}px Arial`;ctx.fillText(lines.slice(1).join(' '),256,83,470);}
  texture.needsUpdate=true;
}
function createMachineDisplay(station,parent,x,y,z,width,height){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const ctx=canvas.getContext('2d');const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  mesh.name=`${station} live RPM display`;mesh.position.set(x,y,z);parent.add(mesh);machineDisplays[station]={canvas,ctx,texture,mesh};syncMachineDisplay(station);return mesh;
}
function createAutomaticDisplay(parent,station,x,y,z,width,height){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const ctx=canvas.getContext('2d');const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  mesh.name=`${station} automatic cycle display`;mesh.position.set(x,y,z);parent.add(mesh);automaticDisplays[station]={canvas,ctx,texture};syncAutomaticDisplay(station);return mesh;
}
function syncAutomaticDisplay(station=activeStation){
  const display=automaticDisplays[station];if(!display)return;
  const {canvas,ctx,texture}=display;const run=autoRuns[station];const active=run.active;
  ctx.fillStyle=active?'#071a10':'#0b151b';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle=active?'#47bd75':'#536773';ctx.lineWidth=8;ctx.strokeRect(5,5,canvas.width-10,canvas.height-10);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=active?'#9af2b6':'#d8e3e8';ctx.font='bold 38px Arial';ctx.fillText('CICLO AUTOMATICO',256,48);
  const displayText=run.paused&&!active?`PARADO ${run.completed}/${run.total}`:run.waiting?'SEM ESPACO':(active?`${run.completed}/${run.total} PRONTAS`:run.kind==='finished'?`${run.completed} PECAS PRONTAS`:run.kind==='error'?'VERIFIQUE':'PRONTO');
  ctx.fillStyle=run.paused&&!active?'#ffb35c':run.waiting?'#ff8b80':(active?'#9af2b6':run.kind==='error'?'#ff8b80':'#efbd62');ctx.font='bold 44px Arial';
  ctx.fillText(displayText,256,112);
  texture.needsUpdate=true;
}
function syncMachineDisplay(station){
  const display=machineDisplays[station];if(!display)return;
  const {ctx,canvas,texture}=display;const s=activeMachines[station];if(!s)return;
  const stopped=s.emergencyStopped;const running=s.powered&&!stopped;
  ctx.fillStyle=stopped?'#240d0b':'#07130f';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle=stopped?'#ed5147':(running?'#43c981':'#315948');ctx.lineWidth=8;ctx.strokeRect(5,5,canvas.width-10,canvas.height-10);
  ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#9cb4a5';ctx.font='bold 26px Arial';ctx.fillText(station==='mill'?'FV-02  •  RPM REAL':'TM-01  •  RPM REAL',24,40);
  ctx.fillStyle=stopped?'#ff766e':(running?'#9af2b6':'#d5e0da');ctx.font='bold 104px Arial';ctx.fillText(String(running?s.rpm:0),22,145);
  ctx.fillStyle='#9cb4a5';ctx.font='bold 25px Arial';ctx.fillText(`AJUSTE ${s.rpm} RPM`,25,215);
  ctx.textAlign='right';ctx.fillStyle=stopped?'#ff766e':(running?'#81e8a6':'#b6c9bd');ctx.font='bold 27px Arial';ctx.fillText(stopped?'EMERGÊNCIA':(s.cutting?'USINANDO':(running?'LIGADA':'DESLIGADA')),488,215);
  texture.needsUpdate=true;
}
function registerMachineControl(mesh,station,action,label){
  mesh.userData.machineControl={station,action,label};mesh.userData.restZ=mesh.position.z;machineControlTargets.push(mesh);return mesh;
}
function activateMachineControl(station,action,target=null){
  if(action==='cabinet'){cabinetOpen=!cabinetOpen;notify(cabinetOpen?'Armário aberto.':'Armário fechado.');return;}
  if(action==='autoStop'){stopAutomaticBatch(station);return;}
  if(action==='autoStart'){startAutomaticBatch(station);return;}
  if(action==='handwheel'){if(activeMachines.lathe.powered||activeMachines.lathe.cutting){notify('Desligue o torno antes de girar o volante.','error');return;}turnLatheHandwheel(Math.PI/4);return;}
  if(action==='latheFeedLever'){
    const s=activeMachines.lathe;if(s.powered||s.cutting){notify('Desligue o torno antes de movimentar o carro manualmente.','error');return;}
    if(latheFeedLever){latheFeedLever.position=(latheFeedLever.position+1)%3;const direction=[0,1,-1][latheFeedLever.position];latheFeedLever.pivot.rotation.z=[0,.42,-.42][latheFeedLever.position];if(direction)moveLatheCarriage(direction*.12);notify(direction?'Alavanca do torno: carro avançado manualmente.':'Alavanca do torno em neutro.');}
    return;
  }
  if(action==='millFeedLever'){
    const s=activeMachines.mill;if(s.powered||s.cutting){notify('Desligue a fresadora antes de movimentar o eixo manualmente.','error');return;}
    millQuillLeverPosition=(millQuillLeverPosition+1)%3;if(millQuillLever)millQuillLever.rotation.z=[0,.22,-.22][millQuillLeverPosition];
    if(millToolAssembly){const step=[0,-.025,.025][millQuillLeverPosition];millToolAssembly.position.y=THREE.MathUtils.clamp(millToolAssembly.position.y+step,1.30,1.44);}
    notify(millQuillLeverPosition===1?'Manete da fresadora: eixo avançado.':(millQuillLeverPosition===2?'Manete da fresadora: eixo recuado.':'Manete da fresadora em neutro.'));
    return;
  }
  if(action==='selector'){
    const selector=latheSelectorLevers[target?.userData.selectorIndex??0];
    if(selector){selector.position=(selector.position+1)%3;selector.pivot.rotation.z=[-.30,0,.30][selector.position];notify(`Alavanca do torno na posição ${selector.position+1}.`);}
    return;
  }
  if(action!=='emergency'&&station!==activeStation){if(activeMachines[activeStation].cutting){notify('Conclua ou interrompa a passada atual antes de trocar de máquina.','error');return;}switchStation(station);}
  if(action==='power')powerMachine(station);
  else if(action==='emergency')toggleEmergencyStop(station);
  else if(action==='cut')startMachining(station);
  else if(action==='rpmDown')changeMachineRPM(station,-100);
  else if(action==='autoStart')startAutomaticBatch(station);
  else if(action==='autoStop')stopAutomaticBatch();
}
function buildVRConsole(){
  const board=new THREE.Mesh(new THREE.BoxGeometry(2.76,2.34,.11),new THREE.MeshStandardMaterial({color:'#101b25',metalness:.28,roughness:.48}));
  board.position.set(0,0,0);board.castShadow=true;board.receiveShadow=true;vrConsoleGroup.add(board);
  const header=makeVRTexture('OFICINA 3D • PAINEL VR','#111f2a','#f1b74f','#876831',35);
  const headerMesh=new THREE.Mesh(new THREE.PlaneGeometry(2.52,.18),new THREE.MeshBasicMaterial({map:header.texture,transparent:false,side:THREE.DoubleSide}));
  headerMesh.position.set(0,.79,.061);vrConsoleGroup.add(headerMesh);
  const status=makeVRTexture('FRESADORA • DESLIGADA • 1200 RPM','#0b141d','#7ee0ae','#315e4b',27);
  vrConsoleStatus={...status,mesh:null};
  vrConsoleStatus.mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.48,.15),new THREE.MeshBasicMaterial({map:status.texture,side:THREE.DoubleSide}));
  vrConsoleStatus.mesh.position.set(0,.61,.062);vrConsoleGroup.add(vrConsoleStatus.mesh);
  const defs=[
    {label:'FRESADORA',x:-.91,y:.36,kind:'station',action:()=>switchStation('mill')},
    {label:'TORNO',x:0,y:.36,kind:'station',action:()=>switchStation('lathe')},
    {label:'MATERIAL',x:.91,y:.36,kind:'setting',action:cycleVRMaterial},
    {label:'COLOCAR PEÇA',x:-.91,y:.02,kind:'action',action:()=>loadPiece(activeStation)},
    {label:'FIXAR PEÇA',x:0,y:.02,kind:'action',action:()=>clampPiece(activeStation)},
    {label:'TIPO FERR.',x:.91,y:.02,kind:'setting',action:cycleVRTool},
    {label:'INSTALAR',x:-.91,y:-.32,kind:'action',action:()=>installTool(activeStation)},
    {label:'PRENDER FERR.',x:0,y:-.32,kind:'action',action:()=>clampTool(activeStation)},
    {label:'RPM −',x:.91,y:-.32,kind:'rpm',action:()=>changeVRRPM(-100)},
    {label:'RPM +',x:-.91,y:-.66,kind:'rpm',action:()=>changeVRRPM(100)},
    {label:'LIGAR / PARAR',x:0,y:-.66,kind:'power',action:()=>powerMachine(activeStation)},
    {label:'USINAR',x:.91,y:-.66,kind:'cut',action:()=>startMachining(activeStation)},
    {label:'PARADA DE EMERGÊNCIA',x:0,y:-.99,kind:'emergency',action:()=>toggleEmergencyStop(activeStation)},
  ];
  for(const d of defs){
    const tex=makeVRTexture(d.label,'#203342','#e9f0f4','#506879',29);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.84,.25,.075),new THREE.MeshStandardMaterial({color:'#203342',metalness:.15,roughness:.45,emissive:'#081018',emissiveIntensity:.25}));
    mesh.position.set(d.x,d.y,.065);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={...d,tex,baseColor:'#203342',hovered:false};vrConsoleGroup.add(mesh);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(.80,.21),new THREE.MeshBasicMaterial({map:tex.texture,side:THREE.DoubleSide}));face.position.set(0,0,.041);mesh.add(face);
    vrConsoleButtons.push(mesh);
  }
  syncVRConsole();
}
function cycleVRMaterial(){const s=currentState();if(s.pieceLoaded||s.powered){notify('Retire a peça e desligue a máquina para mudar o material.','error');return;}const options=['aluminum','steel','brass','bronze','gold'];s.stock=options[(options.indexOf(s.stock)+1)%options.length];$('#stockSelect').value=s.stock;renderStation();notify(`Material selecionado: ${stockNames[s.stock]}.`);}
function cycleVRTool(){const s=currentState();if(s.toolInstalled||s.powered){notify('Retire a ferramenta e desligue a máquina para trocar o tipo.','error');return;}const options=activeStation==='mill'?['endmill','facemill','drill']:['turning','boring','groove'];s.tool=options[(options.indexOf(s.tool)+1)%options.length];$('#toolSelect').value=s.tool;renderStation();notify(`Ferramenta selecionada: ${rangeFor(activeStation).short}.`);}
function changeVRRPM(delta){const s=currentState();if(s.powered||s.cutting){notify('Desligue a máquina para ajustar o RPM.','error');return;}const r=rangeFor(activeStation);s.rpm=Math.max(300,Math.min(3000,s.rpm+delta));$('#rpmSlider').value=s.rpm;renderStation();notify(`Rotação definida em ${s.rpm} RPM. Faixa didática desta ferramenta: ${r.min}–${r.max} RPM.`);}
function syncVRConsole(){
  if(!vrConsoleStatus||!vrConsoleStatus.texture)return;
  const s=activeMachines[activeStation];const station=activeStation==='mill'?'FRESADORA':'TORNO';
  repaintVRTexture(vrConsoleStatus,`${station} • ${s.cutting?'USINANDO':(s.powered?'LIGADA':'DESLIGADA')} • ${s.rpm} RPM`,'#0b141d',s.powered?'#7ee0ae':'#c4d1da',s.powered?'#315e4b':'#344959',25);
  const machineStatus=s.emergencyStopped?'EMERGENCY STOP':(s.cutting?'USINANDO':(s.powered?'LIGADA':'DESLIGADA'));
  repaintVRTexture(vrConsoleStatus,`${station} | ${machineStatus} | ${s.powered?s.rpm:0} RPM`,'#0b141d',s.emergencyStopped?'#ff8178':(s.powered?'#7ee0ae':'#c4d1da'),s.emergencyStopped?'#8f332e':(s.powered?'#315e4b':'#344959'),25);
  for(const b of vrConsoleButtons){
    let bg='#203342',fg='#e9f0f4',border='#506879';
    if(b.userData.kind==='station'&&((b.userData.label==='FRESADORA'&&activeStation==='mill')||(b.userData.label==='TORNO'&&activeStation==='lathe'))){bg='#34502e';fg='#b8f0c7';border='#5b9a6b';}
    if(b.userData.kind==='power'&&s.powered){bg='#492522';fg='#ffb1a8';border='#a7574b';}
    if(b.userData.kind==='cut'){bg='#49371e';fg='#ffd17c';border='#a97936';}
    if(b.userData.kind==='emergency'){bg=s.emergencyStopped?'#5a241f':'#42201e';fg='#ffaaa2';border='#bf5148';}
    repaintVRTexture(b.userData.tex,b.userData.label,bg,fg,border,28);
    b.userData.baseColor=bg;
    if(!b.userData.hovered)b.material.color.set(bg);
  }
}
function setVRButtonHover(button,hover){if(!button)return;button.userData.hovered=hover;button.material.emissive.set(hover?'#7d9e36':'#081018');button.material.emissiveIntensity=hover?1.0:.25;if(hover)button.material.color.set('#a2b76a');else button.material.color.set(button.userData.baseColor||'#203342');}
function addVRControllers(){
  const factory=new XRControllerModelFactory();
  for(let i=0;i<2;i++){
    const controller=renderer.xr.getController(i);controller.userData.vrIndex=i;controller.addEventListener('selectstart',()=>{
      if(!renderer.xr.isPresenting)return;
      controller.updateMatrixWorld(true);vrTempMatrix.identity().extractRotation(controller.matrixWorld);vrRayOrigin.setFromMatrixPosition(controller.matrixWorld);vrRayDirection.set(0,0,-1).applyMatrix4(vrTempMatrix);vrRaycaster.set(vrRayOrigin,vrRayDirection);
      const hits=vrRaycaster.intersectObjects(vrConsoleButtons,false);
      let pickupHits=[];
      try{pickupHits=vrRaycaster.intersectObjects(pickupObjects,true);}catch(_){pickupHits=[];}
      const nearestPickup=pickupHits.find(hit=>{let node=hit.object;while(node&&!node.userData.pickup)node=node.parent;return Boolean(node);});
      if(nearestPickup && (!hits.length || nearestPickup.distance<hits[0].distance)){
        let picked=nearestPickup.object;while(picked&&!picked.userData.pickup)picked=picked.parent;
        if(picked){try{interactPickup(picked);}catch(err){console.error('VR pickup failed',err);notify('Não foi possível pegar essa peça.','error');}}
      } else if(hits.length){const button=hits[0].object;try{button.userData.action();syncVRConsole();}catch(err){console.error('VR console action failed',err);notify('Não foi possível concluir esta ação.','error');}}
      else {
        let shopHits=[];try{shopHits=vrRaycaster.intersectObjects(saleCounterTargets,false);}catch(_){shopHits=[];}
        if(shopHits.length){try{sellInventory();}catch(err){console.error('VR sale failed',err);}}
      }
    });
    const lineGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-3.4)]);
    const line=new THREE.Line(lineGeo,new THREE.LineBasicMaterial({color:'#82d8ff',transparent:true,opacity:.9}));line.name='VR controller laser';line.visible=false;controller.add(line);vrControllerRays.push(line);
    scene.add(controller);vrControllers.push(controller);
    const grip=renderer.xr.getControllerGrip(i);grip.add(factory.createControllerModel(grip));scene.add(grip);
  }
}
function updateVRControllerRays(){
  if(!renderer.xr.isPresenting){for(const line of vrControllerRays)line.visible=false;for(const b of vrConsoleButtons)if(b.userData.hovered)setVRButtonHover(b,false);return;}
  const hovered=new Set();
  for(let i=0;i<vrControllers.length;i++){
    const controller=vrControllers[i],line=vrControllerRays[i];line.visible=true;controller.updateMatrixWorld(true);
    vrTempMatrix.identity().extractRotation(controller.matrixWorld);vrRayOrigin.setFromMatrixPosition(controller.matrixWorld);vrRayDirection.set(0,0,-1).applyMatrix4(vrTempMatrix);vrRaycaster.set(vrRayOrigin,vrRayDirection);
    const hits=vrConsoleGroup.visible?vrRaycaster.intersectObjects(vrConsoleButtons,false):[];
    if(hits.length){hovered.add(hits[0].object);line.material.color.set('#ffd16e');}else line.material.color.set('#82d8ff');
  }
  for(const b of vrConsoleButtons)setVRButtonHover(b,hovered.has(b));
}
function readStickAxes(source){
  const axes=source?.gamepad?.axes||[];
  if(axes.length>=4&&(Math.abs(axes[2]||0)+Math.abs(axes[3]||0)>.12))return {x:axes[2]||0,y:axes[3]||0};
  return {x:axes[0]||0,y:axes[1]||0};
}
function vrWalkStep(dt,xrFrame){
  const session=renderer.xr.getSession();if(!session)return;
  let hasPose=false;const refSpace=renderer.xr.getReferenceSpace();if(xrFrame&&refSpace){const pose=xrFrame.getViewerPose(refSpace);if(pose){const q=pose.transform.orientation;vrViewQuaternion.set(q.x,q.y,q.z,q.w);hasPose=true;}}
  let left=null,rightStick=null;
  for(const source of session.inputSources||[]){if(!source.gamepad)continue;if(source.handedness==='left')left=source;else if(source.handedness==='right')rightStick=source;}
  if(left){const a=readStickAxes(left);if(Math.abs(a.x)>.12||Math.abs(a.y)>.12){if(hasPose)vrForward.set(0,0,-1).applyQuaternion(vrViewQuaternion);else camera.getWorldDirection(vrForward);vrForward.y=0;vrForward.normalize();vrRight.set(-vrForward.z,0,vrForward.x);vrMove.copy(vrForward).multiplyScalar(-a.y).addScaledVector(vrRight,a.x);if(vrMove.lengthSq()>1)vrMove.normalize();const nx=camera.position.x+vrMove.x*player.speed*dt*1.35,nz=camera.position.z+vrMove.z*player.speed*dt*1.35;if(!blocked(nx,camera.position.z))camera.position.x=nx;if(!blocked(camera.position.x,nz))camera.position.z=nz;}}
  const now=performance.now();if(rightStick&&now-vrLastSnapTurn>420){const a=readStickAxes(rightStick);if(Math.abs(a.x)>.72){camera.rotation.y-=Math.sign(a.x)*Math.PI/6;vrLastSnapTurn=now;}}
}
renderer.xr.addEventListener('sessionstart',()=>{
  walkControls.unlock();orbitControls.enabled=false;mode='walk';enteredOnce=true;vrConsoleGroup.visible=true;camera.position.y=0;
  $('#enterBtn').classList.add('hidden');$('#centerCrosshair').classList.add('hidden');$('#modeLabel').textContent='VR: stick esquerdo move • direito gira • gatilho seleciona';$('#sceneStatus').textContent='REALIDADE VIRTUAL ATIVA';
  syncVRConsole();notify('VR ativo: aponte o controle para o painel no ambiente e aperte o gatilho.','silent');
});
renderer.xr.addEventListener('sessionend',()=>{
  vrConsoleGroup.visible=false;camera.position.y=player.height;$('#centerCrosshair').classList.remove('hidden');$('#enterBtn').classList.remove('hidden');$('#modeLabel').textContent='Modo: caminhada';$('#sceneStatus').textContent='AMBIENTE PRONTO';keys.clear();
});
addVRControllers();buildVRConsole();

function setStatusLamp(station,on){const lamp=machinePowerLights[station];if(lamp)lamp.material=on?M.green:M.red;}
function currentState(){return activeMachines[activeStation];}
function setLog(text, kind='ok') { const row=document.createElement('div');row.className='log-line';const dot=document.createElement('i');dot.textContent=kind==='error'?'!':'•';if(kind==='error')dot.style.color='#ee8c7f';const body=document.createElement('span');body.textContent=text;const time=document.createElement('time');time.textContent='AGORA';row.append(dot,body,time);$('#operationLog').prepend(row);while($('#operationLog').children.length>8)$('#operationLog').lastElementChild.remove(); }
function notify(text,kind='ok'){const t=$('#toast');t.textContent=text;t.classList.remove('hidden');window.clearTimeout(toastTimeout);toastTimeout=window.setTimeout(()=>t.classList.add('hidden'),3200);if(kind!=='silent')setLog(text,kind);}
function rangeFor(station=activeStation,tool=activeMachines[station].tool){return rpmRanges[station][tool];}
function validRPM(station=activeStation){const s=activeMachines[station],r=rangeFor(station);return s.rpm>=r.min&&s.rpm<=r.max;}
function addStockPart(station){
  const s=activeMachines[station];
  if(station==='mill'){
    const group=new THREE.Group();group.name='workpiece-in-vise';group.position.set(.28,1.105,.50);const mesh=box(group,'raw milling stock',0,0,0,.57,.18,.48,stockMaterials[s.stock]);mesh.material=stockMaterials[s.stock];millRoot.add(group);millPart=group;
    // The contact surfaces are modeled separately to show clamp state.
    removeGrooves('mill');s.machined=false;
  } else {
    const mat=stockMaterials[s.stock];latheStock=cylinder(latheRotor,'raw lathe bar',.93,0,0,.13,.13,1.15,mat,'x',40);latheStock.material=mat;
    latheMachinedSection=null;latheGrooves=[];s.machined=false;
  }
  s.pieceLoaded=true;s.pieceClamped=false;renderStation();
}
function removeStockPart(station){
  const s=activeMachines[station];
  if(station==='mill'&&millPart){millRoot.remove(millPart);disposeGroup(millPart);millPart=null;millGrooves=[];}
  if(station==='lathe'){
    if(latheStock){latheRotor.remove(latheStock);latheStock.geometry.dispose();latheStock=null;}
    if(latheMachinedSection){latheRotor.remove(latheMachinedSection);latheMachinedSection.geometry.dispose();latheMachinedSection=null;}
    for(const o of latheGrooves){latheRotor.remove(o);o.geometry?.dispose();}latheGrooves=[];
  }
  s.pieceLoaded=false;s.pieceClamped=false;s.machined=false;s.passes=0;renderStation();
}
function disposeGroup(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
function removeGrooves(station){if(station==='mill'&&millPart){for(const g of millGrooves){millPart.remove(g);g.geometry?.dispose();}millGrooves=[];} if(station==='lathe'){for(const g of latheGrooves){latheRotor.remove(g);g.geometry?.dispose();}latheGrooves=[];}}
function moveVise(closed){const target=closed?.615:.80;millDetails.moveJaw.position.x=target;millDetails.jawInsert.position.x=target;millDetails.viseHandle.rotation.z=closed?Math.PI/2:0;}
function moveLatheJaws(closed){for(const jaw of latheJaws){const a=jaw.userData.angle;const r=closed?.18:.24;jaw.position.y=Math.cos(a)*r;jaw.position.z=Math.sin(a)*r;}}
moveLatheJaws(false);
moveVise(false);
function setToolOptions(station){const sel=$('#toolSelect');const entries=station==='mill'?[['endmill','Fresa de topo Ø10 mm'],['facemill','Fresa de face Ø25 mm'],['drill','Broca Ø8 mm']]:[['turning','Ferramenta de torneamento'],['boring','Barra de mandrilar'],['groove','Ferramenta de canal']];sel.innerHTML='';for(const [value,text] of entries){const o=document.createElement('option');o.value=value;o.textContent=text;sel.append(o);}sel.value=activeMachines[station].tool;}
function clearMillingTool(){if(millToolAssembly){millRoot.remove(millToolAssembly);disposeGroup(millToolAssembly);millToolAssembly=null;}if(millCollet){millRoot.remove(millCollet);millCollet.geometry.dispose();millCollet=null;}millToolBits=[];}
function addMillingTool(tool){clearMillingTool();millToolAssembly=new THREE.Group();millToolAssembly.name='installed-cutting-tool';millToolAssembly.position.set(.34,1.44,.52);millRoot.add(millToolAssembly);
  const isDrill=tool==='drill',rad=tool==='facemill'?.105:(isDrill?.045:.055),length=tool==='facemill'?.13:(isDrill?.12:.12);
  cylinder(millToolAssembly,'tool shank',0,.035,0,.048,.048,.19,M.steel,'y',24);
  // Porta-ferramenta cônico (estilo BT/ISO) entre o fuso e a ferramenta.
  const holder=new THREE.Mesh(new THREE.LatheGeometry([[0,.13],[.07,.13],[.07,.11],[.085,.10],[.085,.075],[.06,.07],[.052,.0],[0,0]].map(([r,h])=>new THREE.Vector2(r,h)).reverse(),40),M.steel);holder.position.y=-.02;holder.castShadow=true;millToolAssembly.add(holder);
  if(isDrill){const body=cylinder(millToolAssembly,'drill body',0,-.085,0,rad*.82,rad*.82,length,M.steelDark,'y',24);const tip=new THREE.Mesh(new THREE.ConeGeometry(rad,.07,24),M.steel);tip.position.set(0,-.18,0);tip.rotation.x=Math.PI;tip.castShadow=true;millToolAssembly.add(tip);millToolBits.push(body,tip);
    // Canais helicoidais de verdade: dois filetes em espiral ao redor do corpo da broca.
    for(let i=0;i<2;i++)millToolBits.push(addHelicalThread(millToolAssembly,'y',-.145,-.03,0,0,rad*.86,1.8,.011,M.steel,i*Math.PI));}
  else {const body=cylinder(millToolAssembly,'cutter body',0,-.12,0,rad*(tool==='facemill'?1:.86),rad*(tool==='facemill'?1:.86),length,M.steelDark,'y',32);millToolBits.push(body);
    if(tool==='facemill'){const fluteCount=8;for(let i=0;i<fluteCount;i++){const a=i*Math.PI*2/fluteCount;const fl=box(millToolAssembly,'cutter flute',Math.cos(a)*(rad+.003),-.12,Math.sin(a)*(rad+.003),.018,length*.7,.018,M.ivory);fl.rotation.y=-a;millToolBits.push(fl);}for(let i=0;i<4;i++){const ins=box(millToolAssembly,'face mill insert',Math.cos(i*Math.PI/2)*rad,-.19,Math.sin(i*Math.PI/2)*rad,.035,.025,.035,M.gold);ins.rotation.y=i*Math.PI/2;}}
    else for(let i=0;i<4;i++)millToolBits.push(addHelicalThread(millToolAssembly,'y',-.175,-.07,0,0,rad*.88,.9,.012,M.steel,i*Math.PI/2));}
  millCollet=cylinder(millRoot,'tool collet lock',.34,1.335,.52,.075,.075,.06,M.gold,'y',24);millCollet.visible=false;
}
function clearLatheTool(){if(latheToolAssembly){latheRoot.remove(latheToolAssembly);disposeGroup(latheToolAssembly);latheToolAssembly=null;}latheToolBits=[];}
function addLatheTool(tool){clearLatheTool();latheToolAssembly=new THREE.Group();latheToolAssembly.position.set(-.12,0,0);latheRoot.add(latheToolAssembly);
  box(latheToolAssembly,'tool post clamp',0,1.49,.16,.25,.06,.24,M.steelDark);box(latheToolAssembly,'lathe cutter shank',0,1.535,.09,.32,.05,.15,M.steel);const insert=box(latheToolAssembly,'lathe cutting insert',0,1.555,0,.085,.025,.075,tool==='groove'?M.gold:M.ivory2);latheToolBits.push(insert);
  const collar=box(latheToolAssembly,'lathe tool clamp screw',0,1.555,.18,.09,.04,.07,M.gold);latheToolBits.push(collar);
}
function installTool(station){const s=activeMachines[station];if(s.powered){notify('Desligue a máquina antes de trocar a ferramenta.','error');return;}if(s.toolInstalled){notify('A ferramenta já está instalada.');return;}s.toolInstalled=true;s.toolClamped=false;if(station==='mill')addMillingTool(s.tool);else addLatheTool(s.tool);renderStation();notify(`${rangeFor(station).name} instalada no suporte.`);}
function clampTool(station){const s=activeMachines[station];if(s.powered){notify('Desligue a máquina antes de prender a ferramenta.','error');return;}if(!s.toolInstalled){notify('Instale uma ferramenta antes de prendê-la.','error');return;}s.toolClamped=!s.toolClamped;if(station==='mill'&&millCollet){millCollet.visible=s.toolClamped;millCollet.material=s.toolClamped?M.green:M.gold;}if(station==='lathe'&&latheToolBits.length){latheToolBits.forEach(o=>{if(o.material)o.material=s.toolClamped?M.green:M.gold;});}renderStation();notify(s.toolClamped?'Ferramenta presa no suporte.':'Fixação da ferramenta liberada.');}
function removeTool(station){const s=activeMachines[station];if(s.powered){notify('Desligue a máquina antes de retirar a ferramenta.','error');return;}if(station==='mill')clearMillingTool();else clearLatheTool();s.toolInstalled=false;s.toolClamped=false;renderStation();notify('Ferramenta retirada do suporte.');}
function compatibleStockKinds(station){return station==='mill'?['block','stockBlock']:['bar'];}
function findLoadStock(station){const allowed=compatibleStockKinds(station);return inventoryItems.find(item=>item.id===selectedInventoryId&&allowed.includes(item.kind))||inventoryItems.find(item=>allowed.includes(item.kind))||null;}
function loadPiece(station){
  const s=activeMachines[station];if(s.powered||s.cutting){notify('Desligue a máquina antes de trocar a peça.','error');return;}if(s.pieceLoaded){notify('Já existe uma peça na máquina.','error');return;}
  const stockItem=findLoadStock(station);if(!stockItem){notify(station==='mill'?'A fresadora usa BLOCO: pegue um na prateleira de baixo da bancada de materiais.':'O torno usa CILINDRO: pegue um no tampo da bancada de materiais ou na mesa de materiais.','error');return;}
  s.stock=stockItem.material in stockMaterials?stockItem.material:'steel';$('#stockSelect').value=s.stock;
  inventoryItems.splice(inventoryItems.indexOf(stockItem),1);selectedInventoryId=inventoryItems[0]?.id||null;
  addStockPart(station);renderInventory();notify(station==='mill'?`Bloco de ${stockNames[s.stock].toLowerCase()} colocado na morsa.`:`Cilindro de ${stockNames[s.stock].toLowerCase()} colocado na placa.`);
}
function clampPiece(station){const s=activeMachines[station];if(s.powered){notify('Desligue a máquina antes de mexer na fixação.','error');return;}if(!s.pieceLoaded){notify('Coloque uma peça na máquina primeiro.','error');return;}s.pieceClamped=!s.pieceClamped;if(station==='mill')moveVise(s.pieceClamped);else moveLatheJaws(s.pieceClamped);renderStation();notify(station==='mill'?(s.pieceClamped?'Morsa fechada: peça fixada.':'Morsa aberta: peça liberada.'):(s.pieceClamped?'Mandril apertado: barra fixada.':'Mandril aberto: barra liberada.'));}
function powerMachine(station){const s=activeMachines[station];if(s.powered){s.powered=false;s.cutting=false;renderStation();notify('Máquina desligada. O eixo está parando.');return;}if(!s.toolInstalled||!s.toolClamped){notify('Instale e prenda a ferramenta antes de ligar.','error');return;}if(!validRPM(station)){const r=rangeFor(station);notify(`RPM fora da faixa didática desta ferramenta (${r.min}–${r.max}). Ajuste a rotação.`,'error');return;}s.powered=true;renderStation();notify(station==='mill'?'Fresadora ligada: ferramenta em rotação.':'Torno ligado: mandril em rotação.');}
function canMachine(station){const s=activeMachines[station];if(!s.pieceLoaded){notify('Coloque a peça na máquina.','error');return false;}if(!s.pieceClamped){notify(station==='mill'?'Feche a morsa para fixar a peça.':'Aperte o mandril para prender a barra.','error');return false;}if(!s.toolInstalled||!s.toolClamped){notify('Instale e prenda a ferramenta de corte.','error');return false;}if(!s.powered){notify('Ligue a máquina antes de iniciar a usinagem.','error');return false;}if(!validRPM(station)){const r=rangeFor(station);notify(`RPM fora da faixa didática: ${r.min}–${r.max}.`,'error');return false;}return true;}
// ---------------- Modo automático por máquina ----------------
// Cada máquina tem o próprio ciclo; as duas podem rodar juntas e nada exige pegar peça ou selecionar
// item no inventário. Se a mesa de venda lotar, a peça vai para a mochila; se a mochila também lotar,
// o ciclo só espera (sem travar o resto do jogo) até abrir espaço.
function autoRunning(station){return Boolean(autoRuns[station]?.active);}
function autoMachineName(station){return station==='mill'?'FRESADORA':'TORNO';}
function setAutomaticStatus(text,kind='',station=activeStation){
  const r=autoRuns[station];if(!r)return;r.status=text;r.kind=kind;syncAutomaticControls();syncAutomaticDisplay('mill');syncAutomaticDisplay('lathe');
}
function syncAutomaticControls(){
  const panel=$('#autoCyclePanel');if(!panel)return;
  const pick=autoSelectedMachine;const targets=pick==='both'?['mill','lathe']:[pick];
  document.querySelectorAll('[data-auto-machine]').forEach(b=>{const on=b.dataset.autoMachine===pick;b.classList.toggle('selected',on);b.setAttribute('aria-checked',String(on));});
  $('#autoMachineTag').textContent=pick==='both'?'FV-02 + TM-01':(pick==='mill'?'FV-02':'TM-01');
  $('#autoCycleTitle').textContent=pick==='both'?'Automático nas duas máquinas':`Automático ${pick==='mill'?'da fresadora':'do torno'}`;
  const anyIdle=targets.some(st=>!autoRunning(st)&&!activeMachines[st].cutting&&!activeMachines[st].emergencyStopped);
  const anyRunning=targets.some(autoRunning);
  const paused=targets.filter(st=>autoRuns[st].paused&&!autoRunning(st));
  $('#autoStartBtn').disabled=!anyIdle;
  $('#autoStartBtn').textContent=anyRunning&&!anyIdle?'Usinando no automático…':(paused.length?'▶ Continuar automático':'▶ Colocar tudo no automático');
  $('#autoStartBtn').classList.toggle('running',anyRunning&&!anyIdle);
  // "Parar" para tudo: qualquer máquina rodando, ligada ou usinando.
  $('#autoStopBtn').disabled=!['mill','lathe'].some(st=>autoRunning(st)||activeMachines[st].powered||activeMachines[st].cutting);
  for(const st of ['mill','lathe']){
    const el=$(st==='mill'?'#autoStatusMill':'#autoStatusLathe');if(!el)continue;const r=autoRuns[st];
    const fallback=activeMachines[st].emergencyStopped?'Emergência acionada: rearme para usar o automático.':(activeMachines[st].cutting&&!r.active?'Passada manual em andamento.':(st==='mill'?'Pronta para iniciar.':'Pronto para iniciar.'));
    el.innerHTML='';const b=document.createElement('b');b.textContent=autoMachineName(st);el.append(b,document.createTextNode(' '+(r.status||fallback)));
    el.classList.toggle('running',r.active&&!r.waiting);el.classList.toggle('finished',!r.active&&r.kind==='finished');el.classList.toggle('error',r.kind==='error'||r.waiting);el.classList.toggle('paused',!r.active&&r.paused);
  }
}
function prepareAutomaticMachine(station){
  const s=activeMachines[station],r=autoRuns[station];
  s.powered=false;if(station==='lathe')handwheelEngaged=false;
  if(station==='mill'&&millToolAssembly)millToolAssembly.position.y=1.44;
  if(!s.toolInstalled){s.toolInstalled=true;if(station==='mill')addMillingTool(s.tool);else addLatheTool(s.tool);}
  s.toolClamped=true;
  if(station==='mill'&&millCollet){millCollet.visible=true;millCollet.material=M.green;}
  if(station==='lathe')latheToolBits.forEach(o=>{if(o.material)o.material=M.green;});
  const range=rangeFor(station);s.rpm=Math.round(THREE.MathUtils.clamp(s.rpm,range.min,range.max)/100)*100;
  s.rpm=THREE.MathUtils.clamp(s.rpm,range.min,range.max);
  if(!s.pieceLoaded){s.stock=r.material;addStockPart(station);}
  if(!s.pieceClamped){s.pieceClamped=true;if(station==='mill')moveVise(true);else moveLatheJaws(true);}
  s.powered=true;renderStation();
}
function deliverAutomaticOutput(station){
  const placedAt=deliverMachinePart(station);if(placedAt)return placedAt;
  if(inventoryItems.length<MAX_INVENTORY){addInventoryItem(finishedProductPayload(station),true);return 'bag';}
  return false;
}
function startAutomaticFor(station,material,quantity){
  const s=activeMachines[station],r=autoRuns[station];
  if(r.active){setAutomaticStatus('Já está rodando no automático.','running',station);return false;}
  if(s.cutting){setAutomaticStatus('Espere a passada manual terminar.','error',station);return false;}
  if(s.emergencyStopped){setAutomaticStatus('Rearme a parada de emergência antes de iniciar.','error',station);return false;}
  // Peça já usinada que ficou presa na máquina é entregue antes de começar.
  if(s.pieceLoaded&&s.machined){if(!deliverAutomaticOutput(station)){setAutomaticStatus('Caixinha e mochila cheias: venda uma peça para liberar a máquina.','error',station);return false;}removeStockPart(station);}
  const resume=r.paused&&r.completed<r.total;
  if(resume)Object.assign(r,{active:true,waiting:false,paused:false});
  else Object.assign(r,{active:true,total:quantity,completed:0,material,waiting:false,paused:false});
  autoNextPiece(station,resume);
  if(!s.cutting&&!r.waiting){r.active=false;s.powered=false;setAutomaticStatus('Não foi possível iniciar. Confira a máquina e tente de novo.','error',station);renderStation();return false;}
  return true;
}
// Próxima peça do automático. Se a bandeja de cavaco do torno estiver cheia, espera (sem travar)
// até ela ser esvaziada e continua sozinho.
function autoNextPiece(station,resume=false){
  const r=autoRuns[station],s=activeMachines[station];if(!r.active)return;
  if(station==='lathe'&&typeof lathePanFull==='function'&&lathePanFull()){
    s.powered=false;r.waiting=true;
    setAutomaticStatus('Bandeja de cavaco cheia. Aperte X perto do torno (ou "Esvaziar cavaco") e o ciclo continua.','error',station);renderStation();
    clearTimeout(r.timeout);r.timeout=window.setTimeout(()=>autoNextPiece(station,resume),1000);return;
  }
  r.waiting=false;
  prepareAutomaticMachine(station);
  setAutomaticStatus(`${resume?'Retomado: produzindo':'Produzindo'} peça ${r.completed+1} de ${r.total} (${stockNames[r.material].toLowerCase()}).`,'running',station);
  startMachining(station,true);
  if(!s.cutting&&r.active)stopAutomaticBatch(station,true);
}
function startAutomaticBatch(station){
  const material=$('#autoMaterial')?.value||'steel';const quantity=Math.max(1,Number($('#autoQuantity')?.value)||1);
  const pick=(station==='mill'||station==='lathe'||station==='both')?station:autoSelectedMachine;
  const targets=pick==='both'?['mill','lathe']:[pick];
  const resuming=targets.filter(st=>autoRuns[st].paused&&autoRuns[st].completed<autoRuns[st].total);
  let started=0;for(const st of targets)if(startAutomaticFor(st,material,quantity))started++;
  if(started&&resuming.length)notify(`Automático retomado: ${targets.filter(autoRunning).map(st=>st==='mill'?'fresadora':'torno').join(' e ')} continua de onde parou.`);
  else if(started)notify(`Automático iniciado: ${targets.filter(autoRunning).map(st=>st==='mill'?'fresadora':'torno').join(' e ')} • ${quantity} peça(s) de ${stockNames[material].toLowerCase()}.`);
  else notify('O automático não iniciou. Veja o status de cada máquina no painel.','error');
  renderStation();
}
// Botão vermelho / "Parar": para TUDO na máquina (ciclo automático, passada manual e o motor).
// O ciclo fica pausado e só volta quando o botão verde (ou "Continuar automático") for apertado de novo.
function stopAutomaticBatch(station,silent=false){
  const targets=(station==='mill'||station==='lathe')?[station]:['mill','lathe'];
  let stopped=0;
  for(const st of targets){
    const r=autoRuns[st],s=activeMachines[st];
    const wasAuto=r.active,wasBusy=s.cutting||s.powered;
    if(!wasAuto&&!wasBusy)continue;stopped++;
    clearTimeout(r.timeout);r.timeout=0;
    if(wasAuto){r.active=false;r.waiting=false;r.paused=r.completed<r.total;}
    if(s.cutting){s.cutting=false;if(st===activeStation){$('#progressWrap').classList.remove('hidden');$('#progressLabel').textContent='Parada pelo botão vermelho';}}
    s.powered=false;
    if(st==='mill'&&millToolAssembly)millToolAssembly.position.set(.34,1.44,.52);
    if(st==='lathe'&&latheToolAssembly){latheToolAssembly.position.y=0;latheToolAssembly.position.x=latheCarriage?.position.x??-.12;}
    if(wasAuto)setAutomaticStatus(r.paused?`PARADA. Aperte o botão verde para continuar (faltam ${r.total-r.completed} peça(s)).`:'Parada.','paused',st);
    else setAutomaticStatus('Parada. Motor desligado.','paused',st);
  }
  renderStation();
  if(!silent)notify(stopped?`${targets.length>1?'Tudo parado':(targets[0]==='mill'?'Fresadora parada':'Torno parado')}. Aperte o botão verde para voltar.`:'Nada rodando para parar.',stopped?'ok':'error');
}
function advanceAutomaticBatch(station){
  const r=autoRuns[station];if(!r?.active)return;
  const s=activeMachines[station];
  const where=deliverAutomaticOutput(station);
  if(!where){
    // Sem espaço: a máquina desliga e o ciclo espera, tentando de novo a cada segundo.
    s.powered=false;r.waiting=true;setAutomaticStatus('Caixinha e mochila cheias. Venda uma peça; o ciclo continua sozinho.','error',station);renderStation();
    clearTimeout(r.timeout);r.timeout=window.setTimeout(()=>{if(!r.active)return;r.waiting=false;advanceAutomaticBatch(station);},1000);
    return;
  }
  r.waiting=false;r.completed++;
  removeStockPart(station);if(station==='mill')moveVise(false);else moveLatheJaws(false);
  const placed=where==='bin'?'na caixinha ao lado da máquina':'na mochila (caixinha cheia)';
  if(r.completed>=r.total){
    r.active=false;r.paused=false;s.powered=false;
    setAutomaticStatus(`Concluído: ${r.completed} peça(s) ${placed}.`,'finished',station);renderStation();
    notify(`${station==='mill'?'Fresadora':'Torno'}: automático concluído, peça ${placed}.`);return;
  }
  s.powered=false;setAutomaticStatus(`Peça ${r.completed} pronta ${placed}. Preparando a próxima…`,'running',station);renderStation();
  clearTimeout(r.timeout);
  r.timeout=window.setTimeout(()=>autoNextPiece(station),900);
}
function startMachining(station,automatic=false){const s=activeMachines[station];if(autoRunning(station)&&!automatic){notify('O ciclo automático está controlando esta máquina. Use Parar no painel.','error');return;}if(s.cutting){notify('A passada já está em andamento.');return;}if(!canMachine(station))return;s.cutting=true;s.progress=0;machiningStates[station].start=performance.now();machiningStates[station].duration=5200;if(station==='mill')millManualOffset.set(0,0);if(station===activeStation){$('#progressWrap').classList.remove('hidden');$('#progressBar').style.width='0%';$('#progressPercent').textContent='0%';$('#progressLabel').textContent=station==='mill'?'Fresando superfície':'Torneando diâmetro';}renderStation();notify(station==='mill'?'Usinagem iniciada: fresa avançando sobre a peça.':'Torneamento iniciado: ferramenta avançando sobre a barra.');}
powerMachine=function(station){
  const s=activeMachines[station];
  if(s.emergencyStopped){notify('Rearme a parada de emergência antes de ligar.','error');return;}
  if(station==='lathe'&&!s.powered&&handwheelEngaged)handwheelEngaged=false;
  if(s.powered&&autoRunning(station)){stopAutomaticBatch(station,true);return;}
  if(s.powered){const interrupted=s.cutting;s.powered=false;s.cutting=false;if(interrupted&&station===activeStation){$('#progressWrap').classList.remove('hidden');$('#progressLabel').textContent='Passada interrompida pelo desligamento';}renderStation();notify(interrupted?'Máquina desligada. A passada foi interrompida.':'Máquina desligada.');return;}
  if(!s.toolInstalled||!s.toolClamped){notify('Instale e prenda a ferramenta antes de ligar.','error');return;}
  if(!validRPM(station)){const r=rangeFor(station);notify(`RPM fora da faixa didática desta ferramenta (${r.min}–${r.max}). Ajuste a rotação.`,'error');return;}
  s.powered=true;renderStation();notify(station==='mill'?'Fresadora ligada: ferramenta em rotação.':'Torno ligado: mandril em rotação.');
};
function toggleEmergencyStop(station){
  const s=activeMachines[station];
  if(s.emergencyStopped){s.emergencyStopped=false;renderStation();notify('Parada de emergência rearmada. A máquina continua desligada.');return;}
  if(autoRunning(station))stopAutomaticBatch(station,true);
  const wasCutting=s.cutting;s.emergencyStopped=true;s.powered=false;s.cutting=false;renderStation();
  if(wasCutting){$('#progressWrap').classList.remove('hidden');$('#progressLabel').textContent='Passada interrompida pela emergência';}
  notify('PARADA DE EMERGÊNCIA: eixo desligado e usinagem interrompida.','error');
}
function changeMachineRPM(station,delta){
  const s=activeMachines[station];if(s.powered||s.cutting||s.emergencyStopped){notify('Desligue e rearme a máquina para ajustar o RPM.','error');return;}
  s.rpm=Math.max(300,Math.min(3000,s.rpm+delta));renderStation();notify(`Rotação ajustada para ${s.rpm} RPM.`);
}
const machineCanMachine=canMachine;
canMachine=function(station){if(activeMachines[station].emergencyStopped){notify('Rearme a parada de emergência antes de usinar.','error');return false;}return machineCanMachine(station);};
const baseRenderStation=renderStation;
renderStation=function(){
  baseRenderStation();
  for(const station of ['mill','lathe']){syncMachineDisplay(station);const button=machineEmergencyButtons[station];const s=activeMachines[station];setStatusLamp(station,s.powered&&!s.emergencyStopped);if(button){button.position.z=button.userData.restZ-(s.emergencyStopped ? .025 : 0);button.material=s.emergencyStopped?M.yellow:M.red;}}
  syncAutomaticControls();syncAutomaticDisplay('mill');syncAutomaticDisplay('lathe');
  for(const station of ['mill','lathe']){const controls=machineAutomaticButtons[station];if(!controls)continue;const running=autoRunning(station);controls.start.material=running?M.green:M.cyan;controls.stop.material=running?M.yellow:M.red;}
  const s=activeMachines[activeStation];
  $('#rpmSlider').disabled=s.powered||s.cutting||s.emergencyStopped;
  document.querySelectorAll('[data-rpm]').forEach(button=>button.disabled=s.powered||s.cutting||s.emergencyStopped);
  $('#powerBtn').disabled=s.emergencyStopped||autoRunning(activeStation)||(!s.powered&&(!s.toolInstalled||!s.toolClamped));
  $('#powerBtn').textContent=s.emergencyStopped?'⏻ Bloqueada':(s.powered?'⏻ Desligar máquina':'⏻ Ligar máquina');
  $('#emergencyBtn').textContent=s.emergencyStopped?'↺ Rearmar emergência':'■ Parada de emergência';
  $('#emergencyBtn').setAttribute('aria-pressed',String(s.emergencyStopped));
  $('#machineBtn').disabled=s.emergencyStopped||!s.powered||!s.pieceLoaded||!s.pieceClamped||!s.toolClamped||s.cutting||autoRunning(activeStation)||!validRPM(activeStation);
  $('#machineStatusText').textContent=s.emergencyStopped?'EMERGÊNCIA':(s.cutting?'USINANDO':(s.powered?'LIGADA':'DESLIGADA'));
  $('#machineStatusDot').classList.toggle('on',s.powered&&!s.emergencyStopped);$('#machineStatusDot').classList.toggle('emergency',s.emergencyStopped);
  $('#rpmActual').textContent=s.powered&&!s.emergencyStopped?`${s.rpm} RPM`:'0 RPM';
  $('#sceneStatus').textContent=s.emergencyStopped?'PARADA DE EMERGÊNCIA':(s.cutting?'USINAGEM EM ANDAMENTO':(s.powered?'MÁQUINA LIGADA':'AMBIENTE PRONTO'));
  const panelPulse=$('.card-kicker .pulse');if(panelPulse)panelPulse.classList.toggle('emergency',s.emergencyStopped);
};
$('#emergencyBtn').addEventListener('click',()=>toggleEmergencyStop(activeStation));
$('#autoStartBtn').addEventListener('click',()=>startAutomaticBatch(autoSelectedMachine));
$('#autoStopBtn').addEventListener('click',()=>stopAutomaticBatch('all'));
document.querySelectorAll('[data-auto-machine]').forEach(b=>b.addEventListener('click',()=>{autoSelectedMachine=b.dataset.autoMachine;syncAutomaticControls();}));
const baseChangeVRRPM=changeVRRPM;
changeVRRPM=function(delta){if(currentState().emergencyStopped){notify('Rearme a parada de emergência para ajustar o RPM.','error');return;}baseChangeVRRPM(delta);};
renderer.domElement.addEventListener('pointerdown',event=>{
  if(event.button!==0||renderer.xr.isPresenting)return;
  if(walkControls.isLocked){machineControlPointer.set(0,0);}
  else if(orbitControls.enabled){const rect=renderer.domElement.getBoundingClientRect();machineControlPointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);}
  else return;
  machineControlRaycaster.setFromCamera(machineControlPointer,camera);
  const hit=machineControlRaycaster.intersectObjects(machineControlTargets,false)[0];if(!hit)return;
  event.preventDefault();event.stopImmediatePropagation();const control=hit.object.userData.machineControl;activateMachineControl(control.station,control.action,hit.object);
},true);
function addMillGrooves(){if(!millPart)return;removeGrooves('mill');const n=activeMachines.mill.tool==='facemill'?2:(activeMachines.mill.tool==='drill'?1:3);for(let i=0;i<n;i++){const x=(i-(n-1)/2)*.15;const groove=box(millPart,'machined channel',x,.093,0,activeMachines.mill.tool==='facemill'?.07:.045,.006,activeMachines.mill.tool==='drill'?.08:.32,M.cut,{cast:false});millGrooves.push(groove);}for(let i=0;i<9;i++){const chip=box(millRoot,'metal chip',.1+Math.random()*.55,1.20+Math.random()*.12,.35+Math.random()*.3,.022,.006,.014,i%2?M.steel:M.gold,{cast:false});chip.rotation.y=Math.random()*Math.PI;chipCloud=chip;}}
function addLatheFinish(){if(!latheStock||latheMachinedSection)return;latheMachinedSection=cylinder(latheRotor,'finished reduced diameter section',1.035,0,0,.088,.088,.37,M.steel,'x',40);for(const x of [.85,1.22]){const ring=cylinder(latheRotor,'shoulder finish mark',x,0,0,.135,.135,.025,M.ivory2,'x',40);latheGrooves.push(ring);}}
function endMachining(station){const s=activeMachines[station];s.cutting=false;s.progress=1;s.machined=true;s.passes++;if(station==='mill'){addMillGrooves();if(millToolAssembly)millToolAssembly.position.y=1.44;}else{addLatheFinish();if(latheToolAssembly){latheToolAssembly.position.x=-.12;latheToolAssembly.position.y=0;}if(latheCarriage)latheCarriage.position.x=-.12;}$('#progressBar').style.width='100%';$('#progressPercent').textContent='100%';$('#progressLabel').textContent='Passada concluída';renderStation();notify(station==='mill'?'Passada concluída: superfície usinada marcada na peça.':'Passada concluída: diâmetro reduzido marcado na barra.');if(autoRunning(station))advanceAutomaticBatch(station);}
const baseEndMachining=endMachining;
endMachining=function(station){
  const automatic=autoRunning(station);
  baseEndMachining(station);
  if(automatic)return;
  const s=activeMachines[station];if(!s.machined||!s.pieceLoaded)return;
  s.powered=false;
  const where=deliverAutomaticOutput(station);
  if(!where){renderStation();notify('Caixinha e mochila cheias. Venda uma peça e retire a peça usinada.','error');return;}
  if(s.pieceClamped){s.pieceClamped=false;if(station==='mill')moveVise(false);else moveLatheJaws(false);}
  removeStockPart(station);renderStation();
  notify(where==='bin'?'Usinagem concluída. A peça pronta caiu na caixinha ao lado da máquina (E vende, F guarda).':'Usinagem concluída. A caixinha estava cheia: a peça foi para a mochila.');
};
// Animação de corte independente por máquina (as duas podem usinar ao mesmo tempo).
function updateCutAnimation(now){
  for(const station of ['mill','lathe']){
    const s=activeMachines[station];if(!s.cutting)continue;const st=machiningStates[station];
    const p=Math.min((now-st.start)/st.duration,1);s.progress=p;
    if(station===activeStation){$('#progressBar').style.width=`${Math.round(p*100)}%`;$('#progressPercent').textContent=`${Math.round(p*100)}%`;}
    if(station==='mill'&&millToolAssembly){millToolAssembly.position.x=.34+(-.22+p*.44);millToolAssembly.position.y=1.44-.095*Math.sin(p*Math.PI);}
    if(station==='lathe'&&latheToolAssembly){const x=LATHE_CUT_START+p*(LATHE_CUT_END-LATHE_CUT_START);latheToolAssembly.position.x=x;latheToolAssembly.position.y=-.055*Math.sin(p*Math.PI);if(latheCarriage)latheCarriage.position.x=x;}
    if(p>=1)endMachining(station);
  }
}

function stationLabel(station){return station==='mill'?'Fresadora convencional':'Torno mecânico';}
function switchStation(station){if(station===activeStation){focusScene(station);return;}if(activeMachines[activeStation].cutting&&!autoRunning(activeStation)){notify('Aguarde o fim da passada manual antes de trocar a estação.','error');return;}activeStation=station;setToolOptions(station);$('#stockSelect').value=activeMachines[station].stock;$('#stationTitle').textContent=stationLabel(station);$('#stationTag').textContent=station==='mill'?'FV-02':'TM-01';$('#partSectionTitle').textContent=station==='mill'?'Preparar a peça':'Preparar a barra';$('#fixSectionTitle').textContent=station==='mill'?'Prender na morsa':'Prender no mandril';$('#fixDescription').textContent=station==='mill'?'Coloque o bloco sobre a mesa e feche a morsa para imobilizar a peça.':'Insira a barra no mandril de três castanhas e confirme a fixação.';$('#toolSectionTitle').textContent=station==='mill'?'Instalar ferramenta de corte':'Instalar ferramenta de torneamento';$('#sceneFocus').textContent=station==='mill'?'FRESADORA CONVENCIONAL':'TORNO MECÂNICO';$('#sceneSubfocus').textContent=station==='mill'?'Mesa T, morsa, avanços manuais e ciclo automático':'Mandril, barramento, carro e ferramenta de torneamento';$('#zoneLabel').textContent=station==='mill'?'ESTAÇÃO FV-02':'ESTAÇÃO TM-01';document.querySelectorAll('[data-station]').forEach(b=>b.classList.toggle('active',b.dataset.station===station));focusScene(station);renderStation();setLog(`Estação selecionada: ${stationLabel(station)}.`);}
function focusScene(station){if(mode==='inspect'){const t=stationFocus[station]||stationFocus.room;orbitControls.target.copy(t);camera.position.set(t.x+4.6,t.y+3.2,t.z+5.2);orbitControls.update();}}
function renderStation(){const s=currentState();const station=activeStation;const range=rangeFor(station);$('#stockSelect').disabled=s.pieceLoaded||s.powered;$('#toolSelect').disabled=s.toolInstalled||s.powered;$('#partName').textContent=station==='mill'?`Bloco de ${stockNames[s.stock].toLowerCase()}`:`Peça de ${stockNames[s.stock].toLowerCase()}`;$('#partDimensions').textContent=station==='mill'?'60 × 30 × 18 mm • escala didática':'Ø26 × 115 mm • escala didática';
  $('#loadPieceBtn').disabled=s.pieceLoaded||s.powered;$('#loadPieceBtn').textContent=station==='mill'?'＋ Colocar bloco selecionado':'＋ Colocar barra selecionada';$('#removePieceBtn').disabled=!s.pieceLoaded||s.powered;$('#clampPieceBtn').disabled=!s.pieceLoaded||s.powered;$('#clampPieceBtn').textContent=station==='mill'?(s.pieceClamped?'⊣ Abrir morsa':'⊣ Fechar morsa'):(s.pieceClamped?'⊣ Soltar mandril':'⊣ Apertar mandril');
  $('#toolName').textContent=range.short;$('#toolRange').textContent=`Faixa didática: ${range.min}–${range.max} RPM` ;$('#toolAttachStatus').textContent=!s.toolInstalled?'NÃO INSTALADA':(s.toolClamped?'PRESA':'INSTALADA · SOLTA');$('#toolAttachStatus').classList.toggle('good',s.toolClamped);$('#installToolBtn').disabled=s.toolInstalled||s.powered;$('#clampToolBtn').disabled=!s.toolInstalled||s.powered;$('#clampToolBtn').textContent=s.toolClamped?'✓ Ferramenta presa':'⊣ Prender';$('#removeToolBtn').disabled=!s.toolInstalled||s.powered;
  $('#rpmSlider').value=s.rpm;$('#rpmValue').textContent=s.rpm;$('#rpmActual').textContent=s.powered?`${s.rpm} RPM`:'0 RPM';document.querySelectorAll('[data-rpm]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.rpm)===s.rpm));$('#powerBtn').disabled=!s.toolInstalled||!s.toolClamped||s.cutting;$('#powerBtn').classList.toggle('powered',s.powered);$('#powerBtn').textContent=s.powered?'⏻ Desligar máquina':'⏻ Ligar máquina';$('#machineBtn').disabled=!s.powered||!s.pieceLoaded||!s.pieceClamped||!s.toolClamped||s.cutting||!validRPM(station);$('#machineBtn').textContent=s.cutting?'◌ Usinando…':(s.machined?'↻ Nova passada':'▶ Usinar peça');$('#machineStatusText').textContent=s.cutting?'USINANDO':(s.powered?'LIGADA':'DESLIGADA');$('#machineStatusDot').classList.toggle('on',s.powered);$('#sceneStatus').textContent=s.cutting?'USINAGEM EM ANDAMENTO':(s.powered?'MÁQUINA LIGADA':'AMBIENTE PRONTO');setStatusLamp(station,s.powered);syncVRConsole();
  const steps=[s.pieceLoaded,s.pieceClamped,s.toolInstalled&&s.toolClamped,s.machined];document.querySelectorAll('.step[data-step]').forEach((el,i)=>{el.classList.toggle('done',steps[i]);el.classList.toggle('current',!steps[i]&&(i===0||steps[i-1]));});}

$('#stockSelect').addEventListener('change',()=>{const s=currentState();s.stock=$('#stockSelect').value;$('#partName').textContent=(activeStation==='mill'?'Bloco de ':'Peça de ')+stockNames[s.stock].toLowerCase();});
$('#loadPieceBtn').addEventListener('click',()=>loadPiece(activeStation));$('#removePieceBtn').addEventListener('click',()=>{const s=currentState();if(s.powered){notify('Desligue a máquina primeiro.','error');return;}if(s.pieceLoaded&&typeof collectMachinePart==='function'){if(inventoryItems.length>=MAX_INVENTORY){notify('Inventário cheio. Venda ou solte itens antes de retirar a peça.','error');return;}collectMachinePart(activeStation);}if(s.pieceClamped){s.pieceClamped=false;if(activeStation==='mill')moveVise(false);}removeStockPart(activeStation);notify('Peça retirada da máquina e guardada no inventário.');});
$('#clampPieceBtn').addEventListener('click',()=>clampPiece(activeStation));$('#toolSelect').addEventListener('change',()=>{const s=currentState();s.tool=$('#toolSelect').value;renderStation();});$('#installToolBtn').addEventListener('click',()=>installTool(activeStation));$('#clampToolBtn').addEventListener('click',()=>clampTool(activeStation));$('#removeToolBtn').addEventListener('click',()=>removeTool(activeStation));$('#rpmSlider').addEventListener('input',()=>{const s=currentState();s.rpm=Number($('#rpmSlider').value);renderStation();});document.querySelectorAll('[data-rpm]').forEach(btn=>btn.addEventListener('click',()=>{currentState().rpm=Number(btn.dataset.rpm);renderStation();}));$('#powerBtn').addEventListener('click',()=>powerMachine(activeStation));$('#machineBtn').addEventListener('click',()=>startMachining(activeStation));document.querySelectorAll('[data-station]').forEach(btn=>btn.addEventListener('click',()=>switchStation(btn.dataset.station)));
$('#clearLogBtn').addEventListener('click',()=>{$('#operationLog').innerHTML='';setLog('Registro reiniciado.');});$('#helpBtn').addEventListener('click',()=>$('#helpOverlay').classList.remove('hidden'));$('#closeHelp').addEventListener('click',()=>$('#helpOverlay').classList.add('hidden'));$('#closeHelpBottom').addEventListener('click',()=>$('#helpOverlay').classList.add('hidden'));$('#helpOverlay').addEventListener('click',e=>{if(e.target.id==='helpOverlay')$('#helpOverlay').classList.add('hidden');});

function setMode(next){mode=next;$('#modeLabel').textContent=next==='walk'?'Modo: caminhada':'Modo: inspeção orbital';$('#centerCrosshair').classList.toggle('hidden',next!=='walk');if(next==='inspect'){walkControls.unlock();orbitControls.enabled=true;const t=stationFocus[activeStation];camera.position.set(t.x+4.7,t.y+3.3,t.z+5.4);orbitControls.target.copy(t);orbitControls.update();$('#enterBtn').classList.add('hidden');}else{orbitControls.enabled=false;camera.position.set(0,1.66,5.6);camera.lookAt(0,1.4,-1.2);$('#enterBtn').classList.remove('hidden');if(enteredOnce)walkControls.lock();}}
$('#inspectBtn').addEventListener('click',()=>setMode(mode==='inspect'?'walk':'inspect'));$('#enterBtn').addEventListener('click',()=>{enteredOnce=true;mode='walk';orbitControls.enabled=false;walkControls.lock();$('#enterBtn').classList.add('hidden');$('#modeLabel').textContent='Modo: caminhada (ESC libera o mouse)';});
walkControls.addEventListener('lock',()=>{$('#enterBtn').classList.add('hidden');$('#sceneStatus').textContent='CAMINHADA ATIVA';});walkControls.addEventListener('unlock',()=>{$('#enterBtn').classList.toggle('hidden',mode==='inspect');if(mode==='walk')$('#sceneStatus').textContent='AMBIENTE PRONTO';keys.clear();});
const boundaries={minX:-8.45,maxX:8.45,minZ:-6.95,maxZ:6.65};
const colliders=[{x:-3.55,z:-1.45,r:1.28},{x:3.45,z:-1.5,r:1.12},{x:-7.15,z:-1.75,r:.8},{x:-7.15,z:.34,r:1.05},{x:-.85,z:.70,r:.66},{x:7.75,z:-4.55,r:.75},{x:-5.6,z:3.75,r:.68},{x:2.2,z:4.9,r:.32},{x:6.35,z:3.05,r:.72}];
// Colisão por caixas: cobre o comprimento real das máquinas e móveis (antes era um círculo e dava para entrar no torno).
const boxColliders=[
  {name:'torno',minX:-5.98,maxX:-1.18,minZ:-2.66,maxZ:-.46},
  {name:'fresadora',minX:1.46,maxX:5.68,minZ:-2.52,maxZ:.04},
  {name:'bancada de ferramentas',minX:-8.52,maxX:-5.78,minZ:-2.37,maxZ:-1.13},
  {name:'mesa de materiais',minX:-8.45,maxX:-5.85,minZ:-.1,maxZ:.78},
  {name:'armário',minX:6.98,maxX:8.52,minZ:-5.15,maxZ:-3.9},
  {name:'balcão de venda',minX:5.47,maxX:7.23,minZ:2.52,maxZ:3.58},
  {name:'carrinho',minX:-6.2,maxX:-5.0,minZ:3.39,maxZ:4.11},
  {name:'grade de proteção',minX:1.05,maxX:3.4,minZ:4.84,maxZ:4.96},
  {name:'bancada de materiais',minX:1.03,maxX:3.37,minZ:2.54,maxZ:3.46},
  {name:'mesa de peças prontas',minX:5.35,maxX:7.35,minZ:.87,maxZ:1.83},
];
function blocked(x,z){
  if(x<boundaries.minX||x>boundaries.maxX||z<boundaries.minZ||z>boundaries.maxZ)return true;
  const r=player.radius;
  for(const b of boxColliders)if(x>b.minX-r&&x<b.maxX+r&&z>b.minZ-r&&z<b.maxZ+r)return true;
  return false;
}
const forward=new THREE.Vector3(),right=new THREE.Vector3(),movement=new THREE.Vector3();let nearby=null;
function walkStep(dt){if(!walkControls.isLocked)return;forward.set(0,0,-1).applyQuaternion(camera.quaternion);forward.y=0;forward.normalize();right.set(1,0,0).applyQuaternion(camera.quaternion);right.y=0;right.normalize();movement.set(0,0,0);if(keys.has('KeyW')||keys.has('ArrowUp'))movement.add(forward);if(keys.has('KeyS')||keys.has('ArrowDown'))movement.sub(forward);if(keys.has('KeyD')||keys.has('ArrowRight'))movement.add(right);if(keys.has('KeyA')||keys.has('ArrowLeft'))movement.sub(right);if(movement.lengthSq()){movement.normalize();const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?player.sprint:player.speed;const nx=camera.position.x+movement.x*speed*dt,nz=camera.position.z+movement.z*speed*dt;if(!blocked(nx,camera.position.z))camera.position.x=nx;if(!blocked(camera.position.x,nz))camera.position.z=nz;}camera.position.y=player.height;}
function updateNearby(){if(!walkControls.isLocked)return;let choice=null,dist=3.0;for(const station of ['mill','lathe']){const pos=stationAccess[station];const d=Math.hypot(camera.position.x-pos.x,camera.position.z-pos.z);if(d<dist){dist=d;choice=station;}}nearby=choice;if(choice){$('#zoneLabel').textContent=choice==='mill'?'PRÓXIMO: FRESADORA FV-02':'PRÓXIMO: TORNO TM-01';$('#sceneSubfocus').textContent='Pressione E para selecionar esta estação';}else{$('#zoneLabel').textContent='OFICINA COMPLETA';} }
document.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code))keys.add(e.code);if(e.code==='KeyE'&&nearby&&walkControls.isLocked&&!currentWorldAction)switchStation(nearby);if(e.code==='Escape')keys.clear();});document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
// Oclusão de ambiente em tempo real (GTAO): escurece cantos, encaixes e frestas e dá volume às máquinas.
// Fica desligada automaticamente no VR; o botão "SOMBRA 3D" alterna para PCs mais fracos.
const AO_KEY='oficina3d-ao-v1';
let aoEnabled=true,aoUserChoice=false;try{const saved=localStorage.getItem(AO_KEY);aoUserChoice=saved==='on'||saved==='off';aoEnabled=saved!=='off';}catch(_){}
const aoPerf={frames:0,total:0,done:false};
const composerTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
const composer=new EffectComposer(renderer,composerTarget);
composer.addPass(new RenderPass(scene,camera));
const aoPass=new GTAOPass(scene,camera,1,1);
aoPass.updateGtaoMaterial({radius:1.1,distanceExponent:2,thickness:2.5,scale:2.2,samples:16});
aoPass.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:6,rings:2,samples:16});
aoPass.blendIntensity=1;
composer.addPass(aoPass);
composer.addPass(new OutputPass());
function renderFrame(dt=0){
  if(aoEnabled&&!renderer.xr.isPresenting){
    composer.render();
    // Se o computador não sustentar ~25 fps com a oclusão ligada, muda sozinho para o modo leve (só quando o usuário não escolheu).
    if(!aoUserChoice&&!aoPerf.done&&dt>0&&!document.hidden){aoPerf.frames++;if(aoPerf.frames>30)aoPerf.total+=dt;if(aoPerf.frames>=150){aoPerf.done=true;if(aoPerf.total/120>.04){aoEnabled=false;syncAOButton();notify('Modo leve ativado automaticamente para manter a fluidez. Use “SOMBRA 3D” para religar.','silent');}}}
  } else renderer.render(scene,camera);
}
function syncAOButton(){const b=document.querySelector('#aoBtn');if(b){b.innerHTML=aoEnabled?'&#x25D0; <span>SOMBRA 3D: ALTA</span>':'&#x25CB; <span>SOMBRA 3D: LEVE</span>';b.setAttribute('aria-pressed',String(aoEnabled));}}
document.querySelector('#aoBtn')?.addEventListener('click',()=>{aoEnabled=!aoEnabled;aoUserChoice=true;try{localStorage.setItem(AO_KEY,aoEnabled?'on':'off');}catch(_){}syncAOButton();notify(aoEnabled?'Sombras 3D em alta qualidade (oclusão de ambiente).':'Modo leve: oclusão de ambiente desligada.','silent');});
syncAOButton();
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);}
window.addEventListener('resize',resize);
const fullscreenBtn=$('#fullscreenBtn');
function updateFullscreenButton(){
  const isFullscreen=document.fullscreenElement===viewport;
  fullscreenBtn.innerHTML=isFullscreen?'&#x2715; <span>SAIR DA TELA CHEIA</span>':'&#x26F6; <span>TELA CHEIA</span>';
  fullscreenBtn.setAttribute('aria-label',isFullscreen?'Sair da tela cheia':'Colocar jogo em tela cheia');
  fullscreenBtn.title=isFullscreen?'Sair da tela cheia':'Tela cheia';
}
fullscreenBtn.addEventListener('click',async()=>{
  try{
    if(document.fullscreenElement===viewport)await document.exitFullscreen();
    else if(!document.fullscreenElement)await viewport.requestFullscreen();
    else await document.exitFullscreen();
  }catch(error){notify('O navegador bloqueou a tela cheia.','error');}
});
document.addEventListener('fullscreenchange',()=>{updateFullscreenButton();requestAnimationFrame(resize);});
function animate(now,xrFrame){const dt=Math.min((now-(animate.prev||now))/1000,.04);animate.prev=now;if(renderer.xr.isPresenting)vrWalkStep(dt,xrFrame);else walkStep(dt);
  for(const station of ['mill','lathe']){const s=activeMachines[station];if(s.powered){const speed=s.rpm*Math.PI*2/60*.22;if(station==='mill'&&millToolAssembly)millToolAssembly.rotation.y+=speed*dt;if(station==='lathe')latheRotor.rotation.x+=speed*dt;}else{if(station==='mill'&&millToolAssembly)millToolAssembly.rotation.y*=.93;if(station==='lathe')latheRotor.rotation.x*=.93;}}
  updateCutAnimation(now);syncMillQuill(dt);updateMechanisms(dt);updateNearby();updateGameplayWorld(dt);updateVRControllerRays();if(orbitControls.enabled)orbitControls.update();renderFrame(dt);}
setToolOptions('mill');renderStation();resize();$('#loading').classList.add('hidden');setLog('Oficina pronta. Selecione uma estação para começar.');renderer.setAnimationLoop(animate);


// Biblioteca visual: imagens de pastas locais e visualização separada de modelos GLB.
const assetGrid = $('#assetGrid');
const assetStatus = $('#assetStatus');
const objectUrls = new Set();
const uploadedFilesByUrl = new Map();
let previewRenderer = null, previewScene = null, previewCamera = null, previewControls = null;
let previewModel = null, previewFrame = 0, previewResizeObserver = null;
function makeObjectUrl(file){ const url=URL.createObjectURL(file); objectUrls.add(url); return url; }
function extOf(name){ const i=name.lastIndexOf('.'); return i<0?'':name.slice(i+1).toLowerCase(); }
function addUploadedAsset(file){
  const ext=extOf(file.name); const url=makeObjectUrl(file); uploadedFilesByUrl.set(url,file);
  if(file.type && file.type.startsWith('image/')){
    const card=document.createElement('button'); card.type='button'; card.className='asset-card uploaded-asset';
    card.dataset.imageSrc=url; card.dataset.imageTitle=file.webkitRelativePath || file.name;
    const wrap=document.createElement('span');wrap.className='asset-image-wrap';
    const img=document.createElement('img');img.src=url;img.alt=file.name;img.loading='lazy';wrap.appendChild(img);
    const zoom=document.createElement('span');zoom.className='asset-zoom';zoom.textContent='AMPLIAR ↗';wrap.appendChild(zoom);
    const copy=document.createElement('span');copy.className='asset-card-copy';
    const title=document.createElement('b');title.textContent=file.name;
    const meta=document.createElement('small');meta.textContent=file.webkitRelativePath || `${(file.size/1024).toFixed(0)} KB`;
    copy.append(title,meta);card.append(wrap,copy);assetGrid.appendChild(card);return 'image';
  }
  if(ext==='glb'){
    const card=document.createElement('button');card.type='button';card.className='asset-file-card uploaded-asset model-file-card';card.dataset.glbUrl=url;card.dataset.modelTitle=file.name;
    const icon=document.createElement('span');icon.className='asset-file-icon';icon.textContent='GLB';
    const copy=document.createElement('span');copy.className='asset-card-copy';const title=document.createElement('b');title.textContent=file.name;const meta=document.createElement('small');meta.textContent='Clique para visualizar em 3D';copy.append(title,meta);card.append(icon,copy);assetGrid.appendChild(card);return 'model';
  }
  if(ext==='skp'){
    const card=document.createElement('div');card.className='asset-file-card uploaded-asset';
    const icon=document.createElement('span');icon.className='asset-file-icon';icon.textContent='SKP';
    const copy=document.createElement('span');copy.className='asset-card-copy';const title=document.createElement('b');title.textContent=file.name;const meta=document.createElement('small');meta.textContent='SketchUp • exporte para GLB para visualizar em 3D no navegador';copy.append(title,meta);
    const dl=document.createElement('a');dl.className='asset-download';dl.href=url;dl.download=file.name;dl.textContent='↓';dl.title='Baixar arquivo';card.append(icon,copy,dl);assetGrid.appendChild(card);return 'skp';
  }
  return 'other';
}
function processAssetFiles(fileList){
  const files=Array.from(fileList||[]);if(!files.length)return;
  const clearOld=assetGrid.querySelectorAll('.uploaded-asset');clearOld.forEach(node=>node.remove());
  const viewable=files.filter(f=>(f.type&&f.type.startsWith('image/'))||['glb','skp'].includes(extOf(f.name)));
  const shown=viewable.slice(0,72);let images=0,models=0,skps=0;
  shown.forEach(f=>{const kind=addUploadedAsset(f);if(kind==='image')images++;if(kind==='model')models++;if(kind==='skp')skps++;});
  const capped=viewable.length>shown.length?` Mostrando ${shown.length} de ${viewable.length} arquivos compatíveis.`:'';
  assetStatus.textContent=`Pasta carregada: ${images} imagem(ns), ${models} modelo(s) GLB e ${skps} arquivo(s) SketchUp.${capped} Clique nas imagens para ampliar e nos arquivos GLB para abrir o visualizador 3D.`;
}
$('#chooseFolderBtn').addEventListener('click',()=>$('#folderInput').click());
$('#chooseImagesBtn').addEventListener('click',()=>$('#imagesInput').click());
$('#chooseModelBtn').addEventListener('click',()=>$('#modelInput').click());
$('#folderInput').addEventListener('change',e=>processAssetFiles(e.target.files));
$('#imagesInput').addEventListener('change',e=>processAssetFiles(e.target.files));
$('#modelInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(file){processAssetFiles([file]);openGLBPreview(file);}e.target.value='';});
assetGrid.addEventListener('click',e=>{
  const card=e.target.closest('[data-image-src],[data-glb-url]');if(!card)return;
  if(card.dataset.imageSrc){$('#lightboxImage').src=card.dataset.imageSrc;$('#lightboxImage').alt=card.dataset.imageTitle||'Imagem da biblioteca';$('#lightboxCaption').textContent=card.dataset.imageTitle||'Imagem da biblioteca';$('#imageLightbox').classList.remove('hidden');}
  else if(card.dataset.glbUrl){const file=uploadedFilesByUrl.get(card.dataset.glbUrl);if(file)openGLBPreview(file);else notify('Selecione o arquivo GLB novamente pelo botão “Abrir modelo 3D”.');}
});
function closeImageLightbox(){$('#imageLightbox').classList.add('hidden');}
$('#closeImageLightbox').addEventListener('click',closeImageLightbox);
$('#imageLightbox').addEventListener('click',e=>{if(e.target.id==='imageLightbox')closeImageLightbox();});
function setupModelPreview(){
  if(previewRenderer)return;
  const wrap=$('#modelCanvas');previewScene=new THREE.Scene();previewScene.background=new THREE.Color('#0a1620');previewScene.fog=new THREE.Fog('#0a1620',15,40);
  previewCamera=new THREE.PerspectiveCamera(42,Math.max(1,wrap.clientWidth)/Math.max(1,wrap.clientHeight),.1,1000);previewCamera.position.set(4.5,3.2,5.5);
  previewRenderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));previewRenderer.setSize(wrap.clientWidth,wrap.clientHeight);previewRenderer.outputColorSpace=THREE.SRGBColorSpace;previewRenderer.toneMapping=THREE.ACESFilmicToneMapping;previewRenderer.toneMappingExposure=1.1;previewRenderer.shadowMap.enabled=true;wrap.replaceChildren(previewRenderer.domElement);
  previewScene.add(new THREE.HemisphereLight(0xdbeeff,0x263440,2.1));const l=new THREE.DirectionalLight(0xffe0b6,3.2);l.position.set(5,9,6);l.castShadow=true;previewScene.add(l);const f=new THREE.DirectionalLight(0x64b9ed,1.25);f.position.set(-5,4,-4);previewScene.add(f);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:'#202e39',roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;previewScene.add(floor);
  const grid=new THREE.GridHelper(20,40,0x577084,0x304452);grid.position.y=0;previewScene.add(grid);
  previewControls=new OrbitControls(previewCamera,previewRenderer.domElement);previewControls.enableDamping=true;previewControls.dampingFactor=.06;previewControls.target.set(0,1.5,0);previewControls.minDistance=.5;previewControls.maxDistance=80;
  if(previewResizeObserver)previewResizeObserver.disconnect();
  previewResizeObserver=new ResizeObserver(()=>{if(!previewRenderer)return;const w=Math.max(1,wrap.clientWidth),h=Math.max(1,wrap.clientHeight);previewCamera.aspect=w/h;previewCamera.updateProjectionMatrix();previewRenderer.setSize(w,h);});previewResizeObserver.observe(wrap);
  const draw=()=>{if($('#modelViewerOverlay').classList.contains('hidden')){previewFrame=0;return;}previewFrame=requestAnimationFrame(draw);previewControls.update();previewRenderer.render(previewScene,previewCamera);};
  const start=()=>{if(!previewFrame&&!$('#modelViewerOverlay').classList.contains('hidden'))previewFrame=requestAnimationFrame(draw);};
  previewRenderer.userData={start};
}
function openGLBPreview(file){
  if(extOf(file.name)!=='glb'){notify('O visualizador aceita .GLB. Exporte o arquivo .SKP como .GLB no SketchUp.');return;}
  setupModelPreview();$('#modelViewerTitle').textContent=file.name;$('#modelViewerStatus').textContent='Carregando modelo…';$('#modelViewerOverlay').classList.remove('hidden');
  if(previewFrame)cancelAnimationFrame(previewFrame);previewFrame=0;
  if(previewModel){previewScene.remove(previewModel);previewModel.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});previewModel=null;}
  const loader=new GLTFLoader();file.arrayBuffer().then(buffer=>loader.parse(buffer,'',gltf=>{
    previewModel=gltf.scene;previewScene.add(previewModel);previewModel.updateMatrixWorld(true);
    let bounds=new THREE.Box3().setFromObject(previewModel);const size=bounds.getSize(new THREE.Vector3());const maxSide=Math.max(size.x,size.y,size.z)||1;previewModel.scale.setScalar(4.5/maxSide);previewModel.updateMatrixWorld(true);
    bounds=new THREE.Box3().setFromObject(previewModel);const center=bounds.getCenter(new THREE.Vector3());previewModel.position.x-=center.x;previewModel.position.z-=center.z;previewModel.position.y-=bounds.min.y;previewModel.updateMatrixWorld(true);
    bounds=new THREE.Box3().setFromObject(previewModel);const finalSize=bounds.getSize(new THREE.Vector3());const maxFinal=Math.max(finalSize.x,finalSize.y,finalSize.z);previewCamera.position.set(maxFinal*1.25,maxFinal*.8,maxFinal*1.5);previewCamera.near=Math.max(.01,maxFinal/1000);previewCamera.far=Math.max(100,maxFinal*20);previewCamera.updateProjectionMatrix();previewControls.target.set(0,finalSize.y*.45,0);previewControls.update();
    previewModel.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];list.forEach(m=>{if('side'in m)m.side=THREE.DoubleSide;});}}});
    $('#modelViewerStatus').textContent='Modelo carregado. Arraste para girar, use o scroll para aproximar e o botão direito para deslocar.';previewRenderer.userData.start();
  },err=>{console.error(err);$('#modelViewerStatus').textContent='Não foi possível ler esse GLB. Confira se o arquivo foi exportado corretamente.';previewRenderer.userData.start();})).catch(err=>{console.error(err);$('#modelViewerStatus').textContent='Falha ao ler arquivo: '+err.message;previewRenderer.userData.start();});
}
function closeModelPreview(){if(previewFrame)cancelAnimationFrame(previewFrame);previewFrame=0;$('#modelViewerOverlay').classList.add('hidden');}
$('#closeModelViewer').addEventListener('click',closeModelPreview);$('#modelViewerOverlay').addEventListener('click',e=>{if(e.target.id==='modelViewerOverlay')closeModelPreview();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeImageLightbox();closeModelPreview();}});

// --- Player movement and workshop economy (educational game layer) ---
const MAX_INVENTORY = 5; // mochila com 5 espaços
const INVENTORY_KEY = 'oficina3d-inventory-v2';
const MONEY_KEY = 'oficina3d-wallet-v3'; // v3: saldo zerado
let inventoryItems = [];
let wallet = 0;
let selectedInventoryId = null;
let itemSerial = 1;
let crouched = false;
let jumpOffset = 0;
let jumpVelocity = 0;
let grounded = true;
let currentWorldAction = null;
let quietAction = null; // volante do carro e armário: funcionam com E, sem janela na tela
const saleCounterTargets = [];
const worldActionRange = 1.72;
const saleDeskPoint = new THREE.Vector3(6.35, 0, 3.05);
// Mesa de peças prontas fica longe das máquinas, ao lado do balcão de venda.
const finishedTablePoint = new THREE.Vector3(6.35, 0, 1.35);
const finishedProductSpots = [-.62,0,.62].flatMap(dx=>[-.2,.2].map(dz=>({x:6.35+dx,z:1.35+dz})));
const moneyFormat = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2});

try {
  const savedItems = JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
  if(Array.isArray(savedItems)) inventoryItems=savedItems.slice(0,MAX_INVENTORY).filter(x=>x&&x.id&&x.name&&Number.isFinite(x.value));
  const savedWallet=Number(localStorage.getItem(MONEY_KEY));
  if(Number.isFinite(savedWallet)&&savedWallet>=0)wallet=savedWallet;
} catch(e) { console.warn('Não foi possível restaurar o inventário salvo.',e); }

// First-person gloved hands make crouching, jumping and moving feel more embodied.
const playerHands=new THREE.Group();
playerHands.name='first person operator gloves';
camera.add(playerHands);
function handBox(name,x,y,z,sx,sy,sz,mat,rz=0){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);mesh.name=name;mesh.position.set(x,y,z);mesh.rotation.z=rz;mesh.castShadow=false;mesh.receiveShadow=false;playerHands.add(mesh);return mesh;
}
const gloveMat=material('#8ea0a8',.48,.45);
const gloveDark=material('#263945',.24,.63);
const gloveGrip=material('#e5ad40',.18,.62);
handBox('left forearm',-.37,-.32,-.62,.13,.32,.13,gloveDark,-.28);
handBox('left glove palm',-.32,-.15,-.75,.17,.12,.16,gloveMat,-.28);
handBox('left glove thumb',-.23,-.17,-.70,.065,.12,.08,gloveGrip,-.55);
handBox('right forearm',.37,-.32,-.62,.13,.32,.13,gloveDark,.28);
handBox('right glove palm',.32,-.15,-.75,.17,.12,.16,gloveMat,.28);
handBox('right glove thumb',.23,-.17,-.70,.065,.12,.08,gloveGrip,.55);

// Simple full-body operator rig appears in optional third-person view (V).
let thirdPerson=false; // entra na oficina em primeira pessoa (V alterna)
const playerWorld=new THREE.Vector3(0,0,5.6);
const playerAvatar=new THREE.Group();playerAvatar.name='operator avatar';scene.add(playerAvatar);
const avatarCloth=material('#254d69',.08,.78),avatarPants=material('#202e39',.08,.8),avatarVest=material('#f0ad42',.03,.68),avatarSkin=material('#b88e73',.02,.85),avatarHelmet=material('#e4ad43',.1,.45),avatarShoe=material('#131b22',.03,.86);
const avatarTorso=new THREE.Mesh(new THREE.CapsuleGeometry(.19,.18,4,12),avatarCloth);avatarTorso.name='operator torso';avatarTorso.position.set(0,1.10,0);avatarTorso.castShadow=true;avatarTorso.receiveShadow=true;playerAvatar.add(avatarTorso);
const vestStripe=box(playerAvatar,'hi vis vest front stripe',0,1.10,.198,.31,.42,.016,avatarVest,{cast:false});
const avatarVestBand=box(playerAvatar,'vest reflective band',0,.99,.195,.30,.045,.012,M.ivory2,{cast:false});
const avatarVestStraps=[box(playerAvatar,'vest left strap',-.105,1.30,.16,.055,.19,.012,avatarVest,{cast:false}),box(playerAvatar,'vest right strap',.105,1.30,.16,.055,.19,.012,avatarVest,{cast:false})];
const avatarBackpack=box(playerAvatar,'operator backpack',0,1.13,-.18,.30,.39,.16,avatarPants);
const backpackFlap=box(playerAvatar,'backpack top flap',0,1.36,-.18,.25,.09,.17,gloveDark);
const avatarNeck=cylinder(playerAvatar,'operator neck',0,1.45,0,.075,.075,.12,avatarSkin,'y',18);
const avatarHead=sphere(playerAvatar,'operator head',0,1.63,0,.155,avatarSkin);
const avatarEyeL=sphere(playerAvatar,'left eye',-.052,1.65,.144,.018,M.dark);
const avatarEyeR=sphere(playerAvatar,'right eye',.052,1.65,.144,.018,M.dark);
const avatarNose=sphere(playerAvatar,'operator nose',0,1.615,.153,.022,avatarSkin);
const hardHat=cylinder(playerAvatar,'operator safety helmet',0,1.79,0,.18,.18,.075,avatarHelmet,'y',24);
const hatBrim=cylinder(playerAvatar,'helmet brim',0,1.76,0,.205,.205,.025,avatarHelmet,'y',24);
function avatarLimbPivot(name,x,y,materialBody,sw=0.12,sh=.40,sd=.14){const pivot=new THREE.Group();pivot.name=name;pivot.position.set(x,y,0);playerAvatar.add(pivot);const radius=Math.min(sw*.48,sd*.48);const segment=new THREE.Mesh(new THREE.CapsuleGeometry(radius,Math.max(.04,sh-radius*2),4,8),materialBody);segment.name=`${name} segment`;segment.position.y=-sh*.40;segment.castShadow=true;segment.receiveShadow=true;pivot.add(segment);return pivot;}
const avatarArmL=avatarLimbPivot('left arm',-.29,1.30,avatarCloth,.12,.40,.13);
const avatarArmR=avatarLimbPivot('right arm',.29,1.30,avatarCloth,.12,.40,.13);
sphere(avatarArmL,'left glove',0,-.32,.015,.068,gloveMat);
sphere(avatarArmR,'right glove',0,-.32,.015,.068,gloveMat);
const avatarLegL=avatarLimbPivot('left leg',-.12,.82,avatarPants,.15,.72,.16);
const avatarLegR=avatarLimbPivot('right leg',.12,.82,avatarPants,.15,.72,.16);
const shoeL=box(playerAvatar,'left safety shoe',-.12,.11,.085,.23,.14,.32,avatarShoe);
const shoeR=box(playerAvatar,'right safety shoe',.12,.11,.085,.23,.14,.32,avatarShoe);
const avatarFootPoint=new THREE.Vector3();
function syncAvatarShoes(){
  playerAvatar.updateMatrixWorld(true);
  avatarLegL.localToWorld(avatarFootPoint.set(0,crouched?-.59:-.71,.085));
  playerAvatar.worldToLocal(avatarFootPoint);shoeL.position.copy(avatarFootPoint);
  avatarLegR.localToWorld(avatarFootPoint.set(0,crouched?-.59:-.71,.085));
  playerAvatar.worldToLocal(avatarFootPoint);shoeR.position.copy(avatarFootPoint);
}
const avatarBelt=box(playerAvatar,'tool belt',0,.84,.01,.44,.075,.25,M.dark);
playerAvatar.position.copy(playerWorld);playerAvatar.visible=false;
camera.position.set(playerWorld.x,player.height,playerWorld.z);camera.lookAt(playerWorld.x,1.4,-1.2);
$('#viewModeToggle').textContent='◉ VISTA: 1ª PESSOA';$('#modeLabel').textContent='Vista em primeira pessoa • V alterna';
// Ao clicar em ENTRAR NA OFICINA, sempre começa em primeira pessoa, na altura dos olhos.
$('#enterBtn').addEventListener('click',()=>{if(thirdPerson){thirdPerson=false;playerAvatar.visible=false;}camera.position.set(playerWorld.x,crouched?1.02:player.height,playerWorld.z);levelFirstPersonCamera();$('#viewModeToggle').textContent='◉ VISTA: 1ª PESSOA';});

function formatWallet(){return moneyFormat.format(wallet);}
function persistGame(){try{localStorage.setItem(INVENTORY_KEY,JSON.stringify(inventoryItems));localStorage.setItem(MONEY_KEY,String(wallet));}catch(e){console.warn('Não foi possível salvar o inventário.',e);}}
function itemIcon(kind){return ({tool:'⚒',gear:'⚙',bar:'━',block:'▰',nut:'⬡',wrench:'🔧',finishedMill:'▦',finishedLathe:'⦿',stockBlock:'▰',chip:'⌁'})[kind]||'◆';}
function renderInventory(){
  const target=$('#inventorySlots');if(!target)return;target.replaceChildren();
  if(!inventoryItems.length){const empty=document.createElement('div');empty.className='inventory-empty';empty.textContent='Inventário vazio. Explore a oficina e pressione E perto de uma peça.';target.appendChild(empty);}
  inventoryItems.forEach(item=>{
    const button=document.createElement('button');button.type='button';button.className='inventory-slot'+(item.id===selectedInventoryId?' selected':'');button.dataset.invId=String(item.id);button.title=`${item.name} • ${moneyFormat.format(item.value)}`;
    const icon=document.createElement('span');icon.className='item-emoji';icon.textContent=itemIcon(item.kind);
    const name=document.createElement('b');name.textContent=item.name;
    const value=document.createElement('small');value.textContent=moneyFormat.format(item.value);
    button.append(icon,name,value);target.appendChild(button);
  });
  $('#inventoryCount').textContent=`${inventoryItems.length} / ${MAX_INVENTORY}`;
  $('#inventoryHudCount').textContent=`${inventoryItems.length}/${MAX_INVENTORY}`;
  $('#walletAmount').textContent=formatWallet();
  $('#walletHudAmount').textContent=formatWallet();
  const selected=inventoryItems.find(i=>i.id===selectedInventoryId);
  $('#selectedInventoryLabel').textContent=selected?`Selecionado: ${selected.name} • valor ${moneyFormat.format(selected.value)}`:'Clique em um item do inventário para selecioná-lo.';
  $('#dropItemBtn').disabled=!selected;
  $('#sellAllBtn').disabled=inventoryItems.length===0;
  persistGame();
}
function addInventoryItem(item, quiet=false){
  if(inventoryItems.length>=MAX_INVENTORY){notify('Inventário cheio. Venda ou solte itens antes de pegar mais peças.','error');return false;}
  const normalized={id:item.id||`item-${Date.now()}-${itemSerial++}`,kind:item.kind||'block',name:item.name||'Peça metálica',value:Math.max(0,Number(item.value)||0),material:item.material||'steel',quality:item.quality||'Item coletado'};
  inventoryItems.push(normalized);selectedInventoryId=normalized.id;renderInventory();
  if(!quiet)notify(`${normalized.name} guardado no inventário. Valor de referência: ${moneyFormat.format(normalized.value)}.`);
  return true;
}
// Peças usinadas são colocadas na mesa de peças prontas (ao lado do balcão) para venda direta.
function collectMachinePart(station){
  const s=activeMachines[station],matName=stockNames[s.stock]||'metal';
  return addInventoryItem({kind:station==='mill'?'stockBlock':'bar',name:station==='mill'?`Bloco bruto • ${matName}`:`Barra bruta • ${matName}`,value:stockValues[s.stock]||30,material:s.stock,quality:'Material bruto'},true);
}
function finishedProductCount(){return pickupObjects.filter(obj=>obj.userData.sellableOutput).length;}
function finishedProductPayload(station){
  const s=activeMachines[station],matName=stockNames[s.stock]||'metal',base=station==='mill'?100:110;
  const premium={aluminum:0,steel:35,brass:25,bronze:40,gold:80}[s.stock]||0;
  const value=base+premium+Math.min(5,s.passes-1)*12;
  return {kind:station==='mill'?'finishedMill':'finishedLathe',name:station==='mill'?`Peça fresada • ${matName}`:`Eixo torneado • ${matName}`,value,material:s.stock,quality:`Usinagem concluída (${s.passes} passada${s.passes===1?'':'s'})`};
}
function deliverMachinePart(station){
  const spotIndex=finishedProductSpots.findIndex((_,index)=>!pickupObjects.some(obj=>obj.userData.deliverySlot===index));
  if(spotIndex<0)return false;
  const spot=finishedProductSpots[spotIndex],payload=finishedProductPayload(station);
  const product=spawnPickup(payload.kind,spot.x,spot.z,payload);
  product.position.y=.93;product.userData.baseY=.93;product.userData.sellableOutput=true;product.userData.deliverySlot=spotIndex;
  return 'table';
}
function sellInventory(){
  if(!inventoryItems.length){notify('Não há peças no inventário para vender.','error');return;}
  const total=inventoryItems.reduce((sum,i)=>sum+i.value,0);const sold=inventoryItems.length;
  wallet+=total;inventoryItems=[];selectedInventoryId=null;renderInventory();
  const note=$('#saleNotice');note.textContent=`Venda concluída: ${sold} item(ns) por ${moneyFormat.format(total)}. Saldo atualizado: ${formatWallet()}.`;note.classList.remove('hidden');
  notify(`Você vendeu ${sold} item(ns) e recebeu ${moneyFormat.format(total)}.`);
}
function sellDisplayedProduct(group){
  const item=group?.userData.inventoryPayload;if(!item)return;
  wallet+=Math.max(0,Number(item.value)||0);destroyPickup(group);persistGame();renderStation();
  const note=$('#saleNotice');note.textContent=`Venda concluída: ${item.name} por ${moneyFormat.format(item.value)}. Saldo atualizado: ${formatWallet()}.`;note.classList.remove('hidden');
  notify(`${item.name} vendido por ${moneyFormat.format(item.value)}.`);
}
function storeDisplayedProduct(group){
  if(!group?.userData.inventoryPayload)return;
  const item=group.userData.inventoryPayload;if(!addInventoryItem(item,true))return;
  destroyPickup(group);renderStation();notify(`${item.name} guardado na mochila.`);
}
function dropSelectedItem(){
  const index=inventoryItems.findIndex(i=>i.id===selectedInventoryId);if(index<0){notify('Selecione um item para soltar.','error');return;}
  const item=inventoryItems[index];if(renderer.xr.isPresenting){notify('Para soltar itens no VR, use o painel de inventário do computador.','error');return;}
  // Em vez de largar no chão, o item vai para o encaixe livre mais próximo da bancada de materiais.
  const px=thirdPerson?playerWorld.x:camera.position.x,pz=thirdPerson?playerWorld.z:camera.position.z;
  const slotIndex=freeBenchSlotIndex(px,pz);
  if(slotIndex<0){notify('A bancada de materiais está cheia. Use o material numa máquina ou venda no balcão.','error');return;}
  inventoryItems.splice(index,1);selectedInventoryId=inventoryItems[0]?.id||null;placePickupOnBench(spawnPickup(item.kind,0,0,item),slotIndex);renderInventory();notify(`${item.name} guardado na bancada de materiais.`);
}

function addSaleCounter(){
  // Physical delivery desk, shelf and illuminated sale sign inside the 3D room.
  const counterBody=box(room,'sale counter plinth',6.35,.43,3.05,1.58,.82,.92,M.navy);saleCounterTargets.push(counterBody);
  const counterFront=box(room,'sale counter front panel',6.35,.45,3.525,1.38,.60,.045,M.blue);saleCounterTargets.push(counterFront);
  const counterTop=box(room,'sale counter top',6.35,.90,3.03,1.72,.12,1.02,M.steel);saleCounterTargets.push(counterTop);
  const counterTrim=box(room,'sale counter top trim',6.35,.97,3.03,1.74,.035,1.04,M.gold,{cast:false});saleCounterTargets.push(counterTrim);
  for(const x of [5.82,6.35,6.88])box(room,'sale counter drawer',x,.38,3.55,.43,.19,.035,M.dark);
  const pole=box(room,'sale sign pole',6.35,1.42,2.95,.07,.84,.07,M.steelDark);
  box(room,'sale sign',6.35,1.82,2.95,1.2,.40,.08,M.dark);
  textPlaque(room,'BALCAO DE VENDA',6.35,1.82,3.0,'#80dda5',0);
  cylinder(room,'sale status lamp',6.95,1.0,2.88,.055,.055,.035,M.green,'z',18);
}
function addFinishedPartsTable(){
  const x=finishedTablePoint.x,z=finishedTablePoint.z;
  for(const dx of [-.86,.86])for(const dz of [-.36,.36])box(room,'finished parts table leg',x+dx,.43,z+dz,.085,.82,.085,M.dark);
  box(room,'finished parts table apron',x,.69,z,1.76,.20,.78,M.blue);
  const top=box(room,'finished parts table top',x,.88,z,1.96,.10,.92,M.steel);saleCounterTargets.push(top);
  box(room,'finished parts table cyan edge',x,.94,z+.465,1.94,.025,.025,M.cyan,{cast:false});
  for(const dx of [-.9,.9])box(room,'finished parts sign post',x+dx,1.2,z-.44,.05,.62,.05,M.steelDark);
  textPlaque(room,'PECAS PRONTAS',x,1.42,z-.44,'#29c7df',0).scale.setScalar(.95);
  cylinder(room,'finished parts table sale lamp',x+.86,.98,z-.38,.045,.045,.035,M.cyan,'z',16);
}
function spawnPickup(kind,x,z,payload=null){
  const group=new THREE.Group();group.name=`pickup:${kind}`;group.position.set(x,0,z);
  const actual=payload?{...payload,kind:payload.kind||kind}:pickupDefaults(kind);
  group.userData.inventoryPayload=actual;group.userData.pickup=true;
  if(kind==='gear'){
    cylinder(group,'pickup gear body',0,.105,0,.19,.19,.10,kind==='finishedMill'?M.steel:M.steelDark,'y',32);
    const teeth=10;for(let i=0;i<teeth;i++){const a=i*Math.PI*2/teeth;const t=box(group,'gear tooth',Math.cos(a)*.205,.105,Math.sin(a)*.205,.065,.09,.075,M.steel);t.rotation.y=-a;}
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.105,.025,8,24),M.gold);ring.rotation.x=Math.PI/2;ring.position.y=.16;group.add(ring);
    cylinder(group,'gear bore',0,.166,0,.055,.055,.02,M.black,'y',24);
  } else if(kind==='bar'||kind==='finishedLathe'){
    cylinder(group,'pickup metal bar',0,.105,0,.09,.09,.64,stockMaterials[actual.material]||M.steel,'x',32);
    for(const x of [-.31,.31])cylinder(group,'bar end ring',x,.105,0,.095,.095,.028,M.steelDark,'x',24);
  } else if(kind==='nut'){
    cylinder(group,'hex nut',0,.08,0,.17,.17,.10,M.brass,'y',6);
    cylinder(group,'nut hole',0,.136,0,.075,.075,.012,M.black,'y',18);
    const inner=new THREE.Mesh(new THREE.TorusGeometry(.076,.018,7,20),M.steel);inner.rotation.x=Math.PI/2;inner.position.y=.139;group.add(inner);
  } else if(kind==='wrench'){
    const handle=box(group,'wrench handle',0,.10,0,.08,.07,.53,M.steel);handle.rotation.y=.24;
    cylinder(group,'wrench handle grip',0,.10,-.17,.055,.055,.13,M.dark,'z',18);
    const jaw1=box(group,'wrench jaw',-.075,.10,.24,.065,.07,.13,M.steel);jaw1.rotation.y=.25;
    const jaw2=box(group,'wrench jaw',.075,.10,.24,.065,.07,.13,M.steel);jaw2.rotation.y=-.25;
    cylinder(group,'wrench jaw opening',0,.10,.25,.055,.055,.08,M.dark,'y',6);
  } else {
    const mat=stockMaterials[actual.material]||M.steelStock;
    if(kind==='finishedMill'){
      box(group,'pickup stock block',0,.12,0,.34,.22,.28,mat);
      for(let i=0;i<3;i++)box(group,'machined face groove',-.10+i*.10,.235,0,.024,.008,.22,M.dark,{cast:false});
      for(const x of [-.13,.13])for(const z of [-.10,.10])cylinder(group,'block corner screw',x,.238,z,.018,.018,.014,M.gold,'y',8);
    } else {
      // bloco bruto para a fresadora: só o material, com cantos levemente quebrados
      roundedBox(group,'raw milling block',0,.11,0,.34,.20,.28,mat,.012);
    }
  }
  scene.add(group);pickupObjects.push(group);return group;
}
function pickupDefaults(kind,materialKey='steel'){
  const map={gear:{name:'Engrenagem de aço',value:75,material:'steel',quality:'Peça metálica'},bar:{name:'Cilindro de aço',value:45,material:'steel',quality:'Material bruto'},block:{name:'Bloco de alumínio',value:35,material:'aluminum',quality:'Material bruto'},nut:{name:'Porca de latão',value:12,material:'brass',quality:'Fixador industrial'},wrench:{name:'Chave de manutenção',value:22,material:'steel',quality:'Ferramenta de apoio'},finishedMill:{name:'Peça fresada',value:100,material:'steel',quality:'Peça acabada'},finishedLathe:{name:'Eixo torneado',value:110,material:'steel',quality:'Peça acabada'},stockBlock:{name:'Bloco bruto',value:30,material:'aluminum',quality:'Material bruto'}};
  const item={...(map[kind]||map.block),kind};
  if(kind==='bar'){item.material=materialKey;item.name=`Cilindro de ${(stockNames[materialKey]||'aço').toLowerCase()}`;item.value=stockValues[materialKey]||45;}
  if(kind==='stockBlock'||kind==='block'){item.kind='stockBlock';item.material=materialKey;item.name=`Bloco de ${(stockNames[materialKey]||'aço').toLowerCase()}`;item.value=stockValues[materialKey]||35;item.quality='Material bruto para fresadora';}
  return item;
}
function destroyPickup(group){group.parent?.remove(group);const i=pickupObjects.indexOf(group);if(i>=0)pickupObjects.splice(i,1);group.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
function interactPickup(group){if(inventoryItems.length>=MAX_INVENTORY){notify('Inventário cheio. Venda ou solte algum item antes de pegar mais.','error');return;}const payload=group.userData.inventoryPayload;destroyPickup(group);addInventoryItem(payload);}
addSaleCounter();addFinishedPartsTable();

// Bancada de materiais: cilindros (torno) no tampo e blocos (fresadora) na prateleira de baixo.
// Nada fica no chão: o que você solta com Q volta para um encaixe livre desta bancada, e o
// material pego é reposto sozinho alguns segundos depois.
const partsBenchPoint=new THREE.Vector3(2.2,0,3.0);
const partsBenchSlots=[];
function addPartsBench(){
  const bx=partsBenchPoint.x,bz=partsBenchPoint.z;
  const bench=new THREE.Group();bench.name='parts bench';bench.position.set(bx,0,bz);room.add(bench);
  roundedBox(bench,'parts bench top',0,.895,0,2.3,.07,.86,M.steel,.012);
  box(bench,'parts bench top rubber mat',0,.932,0,2.18,.006,.76,M.rubber,{cast:false});
  roundedBox(bench,'parts bench lower shelf',0,.42,0,2.2,.04,.78,M.steelDark,.01);
  for(const x of [-1.08,1.08])for(const z of [-.36,.36]){roundedBox(bench,'parts bench leg',x,.44,z,.07,.86,.07,M.blue,.015);cylinder(bench,'parts bench foot',x,.02,z,.05,.055,.04,M.rubber,'y',14);}
  for(const z of [-.36,.36])box(bench,'parts bench rail',0,.82,z,2.1,.06,.035,M.blue);
  box(bench,'parts bench back panel',0,1.32,-.42,2.3,.80,.03,M.wallPanel);
  for(let i=0;i<14;i++)for(let j=0;j<4;j++)cylinder(bench,'pegboard hole',-1.04+i*.16,1.04+j*.17,-.403,.012,.012,.006,M.black,'z',8);
  box(bench,'parts bench cyan edge',0,.935,.435,2.28,.02,.02,M.cyan,{cast:false});
  textPlaque(bench,'MATERIAIS BRUTOS',0,1.52,-.395,'#29c7df',0).scale.setScalar(.72);
  for(const [y,label,color] of [[.895,'CILINDROS > TORNO','#efad42'],[.42,'BLOCOS > FRESADORA','#58b9e7']]){const tag=textPlaque(bench,label,.62,y,.455,color,0);tag.scale.set(.30,.30,.30);}
  for(const y of [.935,.445])for(const x of [-.78,-.26,.26,.78])partsBenchSlots.push({x:bx+x,y,z:bz+.04});
  colliders.push({x:bx-.55,z:bz,r:.62},{x:bx+.55,z:bz,r:.62});
}
function freeBenchSlotIndex(nearX=partsBenchPoint.x,nearZ=partsBenchPoint.z){
  let best=-1,bestD=Infinity;
  partsBenchSlots.forEach((slot,index)=>{if(pickupObjects.some(o=>o.userData.benchSlot===index))return;const d=Math.hypot(slot.x-nearX,slot.z-nearZ)+(slot.y<.6?10:0);if(d<bestD){bestD=d;best=index;}});
  return best;
}
function placePickupOnBench(group,index){
  const slot=partsBenchSlots[index];group.position.set(slot.x,slot.y,slot.z);group.userData.baseY=slot.y;group.userData.benchSlot=index;
  if(group.userData.inventoryPayload?.kind==='bar'||group.userData.inventoryPayload?.kind==='finishedLathe')group.rotation.y=Math.PI/2;
  return group;
}
addPartsBench();
const benchSlotMaterial=[...['steel','aluminum','brass','bronze'].map(m=>({kind:'bar',material:m})),...['steel','aluminum','brass','bronze'].map(m=>({kind:'stockBlock',material:m}))];
function spawnBenchMaterial(index){
  const def=benchSlotMaterial[index];const group=spawnPickup(def.kind,0,0,pickupDefaults(def.kind,def.material));
  group.userData.benchMaterial=index;return placePickupOnBench(group,index);
}
benchSlotMaterial.forEach((_,i)=>spawnBenchMaterial(i));

// Enhanced walking: CTRL/C toggles crouch, SPACE jumps with gravity, SHIFT sprints.
const originalWalkStep=walkStep;
walkStep=function enhancedWalkStep(dt){
  if(!walkControls.isLocked)return;
  forward.set(0,0,-1).applyQuaternion(camera.quaternion);forward.y=0;forward.normalize();
  right.set(1,0,0).applyQuaternion(camera.quaternion);right.y=0;right.normalize();
  movement.set(0,0,0);
  if(!handwheelEngaged){
    if(keys.has('KeyW')||keys.has('ArrowUp'))movement.add(forward);
    if(keys.has('KeyS')||keys.has('ArrowDown'))movement.sub(forward);
    if(keys.has('KeyD')||keys.has('ArrowRight'))movement.add(right);
    if(keys.has('KeyA')||keys.has('ArrowLeft'))movement.sub(right);
  }
  const px=thirdPerson?playerWorld.x:camera.position.x;
  const pz=thirdPerson?playerWorld.z:camera.position.z;
  let nextX=px,nextZ=pz;
  if(movement.lengthSq()){
    movement.normalize();const sprint=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&!crouched;const speed=crouched?1.65:(sprint?player.sprint:player.speed);
    const nx=px+movement.x*speed*dt,nz=pz+movement.z*speed*dt;
    if(!blocked(nx,pz))nextX=nx;
    if(!blocked(nextX,nz))nextZ=nz;
  }
  if(!grounded){jumpVelocity-=10.8*dt;jumpOffset+=jumpVelocity*dt;if(jumpOffset<=0){jumpOffset=0;jumpVelocity=0;grounded=true;}}
  if(thirdPerson){
    playerWorld.set(nextX,0,nextZ);
    camera.position.x=playerWorld.x-forward.x*3.25;camera.position.z=playerWorld.z-forward.z*3.25;
    camera.position.y=(crouched?2.0:2.48)+jumpOffset;
    playerAvatar.position.set(playerWorld.x,jumpOffset,playerWorld.z);
    playerAvatar.rotation.y=Math.atan2(forward.x,forward.z);
    const moving=movement.lengthSq()>0;const swing=moving?Math.sin(performance.now()*.012)*(crouched?.18:.48):0;
    avatarArmL.rotation.x=swing;avatarArmR.rotation.x=-swing;avatarLegL.rotation.x=(crouched?.38:0)-swing;avatarLegR.rotation.x=(crouched?.38:0)+swing;avatarTorso.rotation.x=crouched?.13:0;
    avatarTorso.position.y=crouched?.82:1.10;vestStripe.position.y=crouched?.82:1.10;avatarVestBand.position.y=crouched?.71:.99;for(const strap of avatarVestStraps)strap.position.y=crouched?1.03:1.30;avatarBackpack.position.y=crouched?.86:1.13;backpackFlap.position.y=crouched?1.09:1.36;avatarNeck.position.y=crouched?1.12:1.45;avatarHead.position.y=crouched?1.30:1.63;avatarEyeL.position.y=crouched?1.32:1.65;avatarEyeR.position.y=crouched?1.32:1.65;avatarNose.position.y=crouched?1.285:1.615;hardHat.position.y=crouched?1.46:1.79;hatBrim.position.y=crouched?1.43:1.76;
     avatarArmL.position.y=crouched?1.0:1.30;avatarArmR.position.y=crouched?1.0:1.30;avatarLegL.position.y=crouched?.70:.82;avatarLegR.position.y=crouched?.70:.82;avatarBelt.position.y=crouched?.58:.84;
  } else {
    camera.position.x=nextX;camera.position.z=nextZ;playerWorld.set(nextX,0,nextZ);
    camera.position.y=(crouched?1.02:player.height)+jumpOffset;
  }
  if(thirdPerson)syncAvatarShoes();
};

function updateGameplayWorld(dt){
  const xr=renderer.xr.isPresenting;
  playerHands.visible=!xr&&!thirdPerson&&mode==='walk'&&walkControls.isLocked;playerAvatar.visible=!xr&&thirdPerson&&mode==='walk';
  playerHands.position.y+=(crouched?-.075:0-playerHands.position.y)*Math.min(1,dt*8);
  // Small head bob while moving; restrained so it does not cause discomfort.
  if(!xr&&walkControls.isLocked&&(keys.has('KeyW')||keys.has('KeyS')||keys.has('KeyA')||keys.has('KeyD'))&&!crouched){const bob=Math.sin(performance.now()*.012)*.008;playerHands.position.y+=bob;}
  const state=$('#playerStateChip');
  if(state){state.textContent=(thirdPerson?'3ª PESSOA • ':'')+(grounded?(crouched?'AGACHADO':'EM PÉ'):'NO AR')+(handwheelEngaged?' • VOLANTE ENGATADO (A/D, E solta)':'');state.classList.toggle('crouched',crouched);state.classList.toggle('airborne',!grounded);}
  for(const obj of pickupObjects)obj.position.y=obj.userData.baseY||0;
  for(const door of cabinetDoors)door.rotation.y=THREE.MathUtils.damp(door.rotation.y,cabinetOpen?door.userData.openRotation:door.userData.closedRotation,7,dt);
  if(handwheelEngaged){
    const input=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
    if(input)turnLatheHandwheel(input*dt*2.8);
  }
  currentWorldAction=null;
  const prompt=$('#pickupPrompt');
  if(!walkControls.isLocked||mode!=='walk'||xr){prompt.classList.add('hidden');return;}
  const px=thirdPerson?playerWorld.x:camera.position.x,pz=thirdPerson?playerWorld.z:camera.position.z;let closest=null,dist=worldActionRange;
  for(const obj of pickupObjects){const d=Math.hypot(px-obj.position.x,pz-obj.position.z);if(d<dist){dist=d;closest={kind:'pickup',obj,distance:d};}}
  const saleDist=Math.hypot(px-saleDeskPoint.x,pz-saleDeskPoint.z);
  if(saleDist<2.15&&saleDist<dist){closest={kind:'sale',distance:saleDist};}
  const cabinetDist=Math.hypot(px-cabinetFocus.x,pz-cabinetFocus.z);
  latheFeedWheel?.getWorldPosition(handwheelWorldPosition);
  const wheelDist=latheFeedWheel?Math.hypot(px-handwheelWorldPosition.x,pz-handwheelWorldPosition.z):Infinity;
  const carryingLatheStock=Boolean(findLoadStock('lathe'))&&!activeMachines.lathe.pieceLoaded&&!activeMachines.lathe.powered;
  // Sem janela: o volante e o armário ficam como ação "silenciosa" do E (só quando não há outra ação por perto).
  quietAction=(handwheelEngaged||(!carryingLatheStock&&wheelDist<2.0))?'handwheel':(cabinetDist<1.85?'cabinet':null);
  if(!closest){
    let loadStation=null,loadDistance=2.25;
    if(findLoadStock('mill')&&!activeMachines.mill.pieceLoaded&&!activeMachines.mill.powered){const d=Math.hypot(px-stationAccess.mill.x,pz-stationAccess.mill.z);if(d<loadDistance){loadStation='mill';loadDistance=d;}}
    if(findLoadStock('lathe')&&!activeMachines.lathe.pieceLoaded&&!activeMachines.lathe.powered){const d=Math.hypot(px-stationAccess.lathe.x,pz-stationAccess.lathe.z);if(d<loadDistance){loadStation='lathe';loadDistance=d;}}
    if(loadStation)closest={kind:'machineLoad',station:loadStation,distance:loadDistance};
  }
  if(closest){currentWorldAction=closest;prompt.classList.remove('hidden');
    prompt.querySelector('kbd').textContent='E';
    if(closest.kind==='pickup'){$('#pickupPromptTitle').textContent=`Pegar: ${closest.obj.userData.inventoryPayload.name}`;$('#pickupPromptDetail').textContent=`Adicionar à mochila • ${moneyFormat.format(closest.obj.userData.inventoryPayload.value)}`;}
    else if(closest.kind==='sale'){$('#pickupPromptTitle').textContent='Balcão de venda';$('#pickupPromptDetail').textContent=inventoryItems.length?`E vende ${inventoryItems.length} item(ns) • ${moneyFormat.format(inventoryItems.reduce((a,b)=>a+b.value,0))}`:'Inventário vazio • pegue uma peça primeiro';}
    else if(closest.kind==='cabinet'){$('#pickupPromptTitle').textContent=cabinetOpen?'Fechar armário':'Abrir armário';$('#pickupPromptDetail').textContent='E alterna as portas';}
    else if(closest.kind==='handwheel'){$('#pickupPromptTitle').textContent=handwheelEngaged?'Soltar volante do carro':'Pegar volante do carro';$('#pickupPromptDetail').textContent=handwheelEngaged?'Segure A/D para girar e mover o carro':'A/D giram o volante • torno desligado';}
    else{$('#pickupPromptTitle').textContent=closest.station==='mill'?'Colocar bloco na fresadora':'Colocar barra no torno';$('#pickupPromptDetail').textContent='Usar a peça bruta selecionada na mochila';}
  } else prompt.classList.add('hidden');
}
function handleWorldInteraction(){
  if(!currentWorldAction){if(nearby&&walkControls.isLocked)switchStation(nearby);return;}
  if(currentWorldAction.kind==='pickup')interactPickup(currentWorldAction.obj);
  else if(currentWorldAction.kind==='sale')sellInventory();
  else if(currentWorldAction.kind==='cabinet'){cabinetOpen=!cabinetOpen;notify(cabinetOpen?'Armário aberto.':'Armário fechado.');}
  else if(currentWorldAction.kind==='handwheel'){
    if(!handwheelEngaged&&(activeMachines.lathe.powered||activeMachines.lathe.cutting)){notify('Desligue o torno antes de girar o volante.','error');return;}
    handwheelEngaged=!handwheelEngaged;notify(handwheelEngaged?'Volante engatado. Segure A/D para mover o carro.':'Volante liberado.');
  }
  else if(currentWorldAction.kind==='machineLoad'){switchStation(currentWorldAction.station);loadPiece(currentWorldAction.station);}
}
document.addEventListener('keydown',e=>{
  if(e.code==='Space'){
    if(walkControls.isLocked&&!renderer.xr.isPresenting){e.preventDefault();if(grounded&&!crouched){jumpVelocity=4.2;jumpOffset=.015;grounded=false;}}
  }
  if((e.code==='KeyC'||e.code==='ControlLeft')&&!e.repeat&&!renderer.xr.isPresenting&&walkControls.isLocked){crouched=!crouched;$('#modeLabel').textContent=crouched?'Agachado • C para levantar':'Modo: caminhada';notify(crouched?'Você se agachou.':'Você voltou à posição em pé.','silent');}
  if(e.code==='KeyE'&&walkControls.isLocked&&!renderer.xr.isPresenting&&!e.repeat){
    if(handwheelEngaged){e.preventDefault();e.stopImmediatePropagation();handwheelEngaged=false;}
    else if(currentWorldAction){e.preventDefault();e.stopImmediatePropagation();handleWorldInteraction();}
    else if(quietAction==='cabinet'){e.preventDefault();e.stopImmediatePropagation();cabinetOpen=!cabinetOpen;}
    else if(quietAction==='handwheel'){e.preventDefault();e.stopImmediatePropagation();
      if(activeMachines.lathe.powered||activeMachines.lathe.cutting)notify('Desligue o torno antes de girar o volante.','error');else handwheelEngaged=true;}
  }
  if(e.code==='KeyQ'&&!e.repeat&&walkControls.isLocked&&!renderer.xr.isPresenting){e.preventDefault();dropSelectedItem();}
  if(e.code==='KeyI'&&!e.repeat){$('#inventoryPanel').classList.toggle('inventory-highlight');$('#inventoryPanel').scrollIntoView({behavior:'smooth',block:'nearest'});}
  if(e.code==='KeyV'&&!e.repeat&&!renderer.xr.isPresenting){toggleThirdPerson();}
},true);
$('#inventoryPeek').addEventListener('click',()=>{$('#inventoryPanel').classList.toggle('inventory-highlight');$('#inventoryPanel').scrollIntoView({behavior:'smooth',block:'nearest'});});
$('#inventorySlots').addEventListener('click',e=>{const slot=e.target.closest('[data-inv-id]');if(!slot)return;selectedInventoryId=slot.dataset.invId;renderInventory();});
$('#dropItemBtn').addEventListener('click',dropSelectedItem);
$('#sellAllBtn').addEventListener('click',sellInventory);
// A retirada manual entrega a peça acabada na mesa de peças prontas (ao lado do balcão).
$('#removePieceBtn').addEventListener('click',event=>{
  event.stopImmediatePropagation();
  const s=currentState();
  if(s.powered){notify('Desligue a máquina primeiro.','error');return;}
  let delivered=false;
  if(s.pieceLoaded){
    if(s.machined){if(!deliverMachinePart(activeStation)){notify('A mesa de saída está cheia. Venda uma peça antes de retirar esta.','error');return;}delivered=true;}
    else if(!collectMachinePart(activeStation))return;
  }
  if(s.pieceClamped){s.pieceClamped=false;if(activeStation==='mill')moveVise(false);else moveLatheJaws(false);}
  removeStockPart(activeStation);
  notify(delivered?'Peça pronta colocada na caixinha ao lado da máquina.':'Peça retirada da máquina e guardada na mochila.');
},true);

const baseWorldInteraction=handleWorldInteraction;
handleWorldInteraction=function(){
  if(currentWorldAction?.kind==='saleItem'){sellDisplayedProduct(currentWorldAction.obj);currentWorldAction=null;return;}
  baseWorldInteraction();
};
const baseGameplayWorld=updateGameplayWorld;
updateGameplayWorld=function(dt){
  baseGameplayWorld(dt);
  if(!walkControls.isLocked||mode!=='walk'||renderer.xr.isPresenting)return;
  if(currentWorldAction?.kind==='pickup'&&currentWorldAction.obj.userData.sellableOutput)currentWorldAction={...currentWorldAction,kind:'saleItem'};
  const px=thirdPerson?playerWorld.x:camera.position.x,pz=thirdPerson?playerWorld.z:camera.position.z;
  const tableDistance=Math.hypot(px-finishedTablePoint.x,pz-finishedTablePoint.z);
  if(tableDistance<1.72&&(!currentWorldAction||currentWorldAction.kind==='sale'))currentWorldAction={kind:'sale',distance:tableDistance,table:true};
  const prompt=$('#pickupPrompt');
  if(currentWorldAction?.kind==='saleItem'){
    const item=currentWorldAction.obj.userData.inventoryPayload;
    prompt.classList.remove('hidden');$('#pickupPromptTitle').textContent=`Vender: ${item.name}`;
    $('#pickupPromptDetail').textContent=`E vende ${moneyFormat.format(item.value)} • F guarda na mochila`;
  } else if(currentWorldAction?.kind==='sale'&&currentWorldAction.table){
    prompt.classList.remove('hidden');$('#pickupPromptTitle').textContent='Mesa de venda';
    $('#pickupPromptDetail').textContent=inventoryItems.length?`E vende ${inventoryItems.length} item(ns) • ${moneyFormat.format(inventoryItems.reduce((a,b)=>a+b.value,0))}`:'Usinagem concluída? A peça pronta aparece nesta mesa.';
  }
};
const baseInteractPickup=interactPickup;
interactPickup=function(group){if(group?.userData.sellableOutput){sellDisplayedProduct(group);return;}baseInteractPickup(group);};
// Barras da mesa de materiais voltam sozinhas alguns segundos depois de pegas (o material nunca acaba).
function spawnRackBar(stock,x){
  const group=new THREE.Group();group.name=`barra de ${stockNames[stock].toLowerCase()}`;group.position.set(x,0,.34);
  cylinder(group,'raw material bar',0,1.065,0,.075,.075,.86,stockMaterials[stock],'x',28);
  for(const dx of [-.43,.43])cylinder(group,'bar end collar',dx,1.065,0,.078,.078,.035,M.steelDark,'x',20);
  group.userData.pickup=true;group.userData.rackStock=stock;group.userData.rackX=x;
  group.userData.inventoryPayload={...pickupDefaults('bar'),name:`Cilindro de ${stockNames[stock].toLowerCase()}`,material:stock,value:stockValues[stock]};
  room.add(group);pickupObjects.push(group);return group;
}
for(const o of [...pickupObjects]){const m=o.parent===room&&o.name.startsWith('barra de ')&&o.userData.inventoryPayload?.material;if(m){o.userData.rackStock=m;o.userData.rackX=o.position.x;}}
const rackInteractPickup=interactPickup;
interactPickup=function(group){
  rackInteractPickup(group);
  const bi=group?.userData.benchMaterial;
  if(bi!==undefined&&!pickupObjects.includes(group))setTimeout(()=>{if(!pickupObjects.some(o=>o.userData.benchSlot===bi))spawnBenchMaterial(bi);},3500);
  if(group?.userData.rackStock&&!pickupObjects.includes(group))setTimeout(()=>{if(!pickupObjects.some(o=>o.userData.rackX===group.userData.rackX))spawnRackBar(group.userData.rackStock,group.userData.rackX);},3500);
};
document.addEventListener('keydown',event=>{
  if(event.code==='KeyF'&&walkControls.isLocked&&!renderer.xr.isPresenting&&currentWorldAction?.kind==='saleItem'){
    event.preventDefault();event.stopImmediatePropagation();storeDisplayedProduct(currentWorldAction.obj);currentWorldAction=null;
  }
},true);
function levelFirstPersonCamera(){
  camera.up.set(0,1,0);
  camera.rotation.order='YXZ';
  const viewDirection=new THREE.Vector3();
  camera.getWorldDirection(viewDirection);
  viewDirection.y=0;
  if(viewDirection.lengthSq()<1e-6)viewDirection.set(0,0,-1);
  viewDirection.normalize();
  camera.rotation.set(0,Math.atan2(-viewDirection.x,-viewDirection.z),0,'YXZ');
}
function toggleThirdPerson(){
  if(renderer.xr.isPresenting){notify('A visão em terceira pessoa é para computador; no VR, a câmera acompanha seu headset.','error');return;}
  if(mode==='inspect')setMode('walk');
  thirdPerson=!thirdPerson;
  if(thirdPerson){playerWorld.set(camera.position.x,0,camera.position.z);playerAvatar.visible=true;playerHands.visible=false;if(!walkControls.isLocked){enteredOnce=true;walkControls.lock();}const f=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);f.y=0;f.normalize();camera.position.set(playerWorld.x-f.x*3.25,2.48,playerWorld.z-f.z*3.25);camera.lookAt(playerWorld.x,1.15,playerWorld.z);}
  else{camera.position.set(playerWorld.x,crouched?1.02:player.height,playerWorld.z);levelFirstPersonCamera();playerAvatar.visible=false;if(!walkControls.isLocked&&enteredOnce)walkControls.lock();}
  $('#viewModeToggle').textContent=thirdPerson?'◉ VISTA: 3ª PESSOA':'◉ VISTA: 1ª PESSOA';$('#modeLabel').textContent=thirdPerson?'Vista em terceira pessoa • V alterna':'Vista em primeira pessoa • V alterna';
}
const originalSetMode=setMode;
setMode=function(next){originalSetMode(next);thirdPerson=false;playerAvatar.visible=false;$('#viewModeToggle').textContent='◉ VISTA: 1ª PESSOA';if(next==='walk'){playerWorld.set(camera.position.x,0,camera.position.z);}}
const baseSetModeWithLevelCamera=setMode;
setMode=function(next){baseSetModeWithLevelCamera(next);if(next==='walk')levelFirstPersonCamera();};
$('#viewModeToggle').addEventListener('click',toggleThirdPerson);
const baseUpdateNearby=updateNearby;
updateNearby=function(){
  if(!thirdPerson){baseUpdateNearby();return;}
  if(!walkControls.isLocked)return;
  let choice=null,dist=2.65;
  for(const station of ['mill','lathe']){const pos=stationAccess[station];const d=Math.hypot(playerWorld.x-pos.x,playerWorld.z-pos.z);if(d<dist){dist=d;choice=station;}}
  nearby=choice;
  if(choice){$('#zoneLabel').textContent=choice==='mill'?'PRÓXIMO: FRESADORA FV-02':'PRÓXIMO: TORNO TM-01';$('#sceneSubfocus').textContent='Pressione E para selecionar esta estação';}
  else $('#zoneLabel').textContent='OFICINA COMPLETA';
};

// ===========================================================================
// v5: lado esquerdo limpo, armário com ferramentas 3D + janela, todas as manivelas
// da fresadora giram (com setas mostrando o que girar) e caixinha de peças usinadas.
// ===========================================================================

// 1) Remove a mesa de MATERIAIS (barras) e a bancada com cabos de ferramenta ao lado esquerdo do torno.
(function clearLeftSide(){
  removeNamed(room,['raw material table top','raw material table leg','raw material table apron','workbench top','bench leg','bench drawer','tool handle','tool tip','cabinet stored stock']);
  for(const o of [...room.children]){
    const nearMaterials=Math.abs(o.position.x+7.15)<.05&&(Math.abs(o.position.z-.77)<.05||Math.abs(o.position.z-.34)<.05||Math.abs(o.position.z+1.75)<.05);
    if(o.isMesh&&(o.geometry?.type==='PlaneGeometry')&&nearMaterials){room.remove(o);}
  }
  for(const o of [...pickupObjects])if(o.userData.rackStock)destroyPickup(o);
  for(let i=boxColliders.length-1;i>=0;i--)if(['bancada de ferramentas','mesa de materiais'].includes(boxColliders[i].name))boxColliders.splice(i,1);
})();

// 2) Ferramentas 3D no armário + janela com o modelo girando.
const TOOL_CATALOG=[
  {key:'endmill10',name:'Fresa de topo Ø10 mm',machine:'mill',tool:'endmill',desc:'Corta com a ponta e com a lateral: faz canais, rasgos, rebaixos e contornos. Os canais em espiral tiram o cavaco da região de corte.'},
  {key:'endmill6',name:'Fresa de topo Ø6 mm',machine:'mill',tool:'endmill',desc:'Versão menor da fresa de topo, para canais estreitos e detalhes. É mais frágil: pede avanço menor.'},
  {key:'facemill',name:'Fresa de face Ø25 mm',machine:'mill',tool:'facemill',desc:'Cabeçote com pastilhas intercambiáveis. Usada para deixar a face do bloco plana e lisa (faceamento).'},
  {key:'drill8',name:'Broca helicoidal Ø8 mm',machine:'mill',tool:'drill',desc:'Faz furos. A ponta cônica centraliza o furo e os dois canais helicoidais levam o cavaco para fora.'},
  {key:'drill5',name:'Broca helicoidal Ø5 mm',machine:'mill',tool:'drill',desc:'Broca menor para furos de fixação. Em furos fundos, recue a broca de vez em quando para tirar o cavaco.'},
  {key:'turning',name:'Ferramenta de torneamento',machine:'lathe',tool:'turning',desc:'Haste com pastilha de metal duro. Reduz o diâmetro do cilindro (torneamento externo) e faceia a ponta da peça.'},
  {key:'boring',name:'Barra de mandrilar',machine:'lathe',tool:'boring',desc:'Haste longa e fina para alargar e dar acabamento em furos, trabalhando por dentro da peça.'},
  {key:'groove',name:'Ferramenta de canal',machine:'lathe',tool:'groove',desc:'Lâmina estreita para abrir canais (por exemplo, para anéis de trava) e para cortar a peça (sangrar).'},
  {key:'facing',name:'Ferramenta de facear',machine:'lathe',tool:'turning',desc:'Pastilha em losango de 80°. Faceia a ponta da peça e também desbasta o diâmetro. Fica no armário como ferramenta extra do torno.'},
  {key:'threading',name:'Ferramenta de rosca 60°',machine:'lathe',tool:'turning',desc:'Pastilha com ponta em 60° para abrir roscas métricas. No simulador ela usina como uma ferramenta de tornear.'},
  {key:'parting',name:'Bedame de sangrar 3 mm',machine:'lathe',tool:'groove',desc:'Lâmina fina e comprida para cortar (sangrar) a peça no final e abrir canais fundos.'},
  {key:'chuckKey',name:'Chave da placa',machine:null,desc:'Aperta e solta as castanhas do torno. Nunca deixe a chave encaixada na placa: retire antes de ligar a máquina.'},
  {key:'caliper',name:'Paquímetro',machine:null,desc:'Mede diâmetros, comprimentos, furos e profundidades com resolução de 0,05 mm. Meça sempre com a máquina parada.'},
];
function makeToolModel(key){
  const g=new THREE.Group();g.name=`tool model ${key}`;
  if(key==='endmill10'||key==='endmill6'){
    const r=key==='endmill10'?.024:.016;
    cylinder(g,'tool shank',0,.075,0,.019,.019,.12,M.steel,'y',24);
    cylinder(g,'tool neck',0,.012,0,.019,r*.85,.01,M.steel,'y',24);
    cylinder(g,'cutter core',0,-.045,0,r*.78,r*.78,.105,M.steelDark,'y',24);
    for(let i=0;i<4;i++)addHelicalThread(g,'y',-.097,.005,0,0,r*.86,1,.0055,M.steel,i*Math.PI/2);
  } else if(key==='facemill'){
    cylinder(g,'face mill arbor',0,.05,0,.022,.022,.06,M.steel,'y',24);
    lathed(g,'face mill body',[[0,-.03],[.06,-.03],[.065,-.02],[.065,.01],[.035,.025],[0,.025]],M.steelDark,0,0,0,'y',40);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const ins=box(g,'face mill insert',Math.cos(a)*.058,-.022,Math.sin(a)*.058,.018,.012,.018,M.gold);ins.rotation.y=-a;}
  } else if(key==='drill8'||key==='drill5'){
    const r=key==='drill8'?.014:.009;
    cylinder(g,'drill shank',0,.08,0,r,r,.10,M.steel,'y',20);
    cylinder(g,'drill core',0,-.03,0,r*.55,r*.55,.12,M.steelDark,'y',16);
    for(let i=0;i<2;i++)addHelicalThread(g,'y',-.09,.03,0,0,r*.8,2.2,r*.32,M.steel,i*Math.PI);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(r,.022,20),M.steel);tip.position.y=-.101;tip.rotation.x=Math.PI;tip.castShadow=true;g.add(tip);
  } else if(key==='turning'){
    box(g,'turning tool shank',0,0,0,.026,.026,.17,M.steelDark);
    const ins=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.007,3),M.gold);ins.position.set(.004,.012,.088);ins.rotation.y=Math.PI/6;g.add(ins);
    cylinder(g,'insert screw',.004,.0165,.088,.004,.004,.003,M.dark,'y',8);
    box(g,'shank label',0,.0135,-.03,.02,.001,.06,M.cyan,{cast:false});
  } else if(key==='boring'){
    cylinder(g,'boring bar',0,0,0,.011,.011,.18,M.steel,'z',20);
    box(g,'boring bar flat',0,.0105,-.04,.016,.002,.08,M.steelDark,{cast:false});
    box(g,'boring bar head',.008,.002,.094,.02,.014,.016,M.steelDark);box(g,'boring insert',.019,.004,.1,.008,.006,.008,M.gold);
  } else if(key==='groove'){
    box(g,'groove holder',0,0,-.02,.026,.03,.12,M.steelDark);
    box(g,'groove blade',.006,.004,.06,.006,.024,.06,M.steel);box(g,'groove tip',.006,.006,.092,.007,.012,.008,M.gold);
  } else if(key==='facing'){
    box(g,'facing tool shank',0,0,0,.026,.026,.17,M.steelDark);
    const ins=box(g,'facing insert',.002,.012,.088,.02,.007,.02,M.gold);ins.rotation.y=Math.PI/4;
    cylinder(g,'insert screw',.002,.0162,.088,.004,.004,.003,M.dark,'y',8);
    box(g,'shank label',0,.0135,-.03,.02,.001,.06,M.red,{cast:false});
  } else if(key==='threading'){
    box(g,'threading tool shank',0,0,0,.026,.026,.17,M.steelDark);
    const ins=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.007,3),M.gold);ins.position.set(0,.012,.084);ins.rotation.y=-Math.PI/2;g.add(ins);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(.005,.018,4),M.gold);tip.position.set(0,.012,.1);tip.rotation.x=Math.PI/2;g.add(tip);
    box(g,'shank label',0,.0135,-.03,.02,.001,.06,M.green,{cast:false});
  } else if(key==='parting'){
    box(g,'parting holder',0,0,-.03,.026,.034,.11,M.steelDark);
    box(g,'parting blade',.004,.003,.06,.004,.03,.09,M.steel);box(g,'parting tip',.004,.006,.106,.005,.012,.008,M.gold);
    box(g,'shank label',0,.0175,-.04,.02,.001,.05,M.gold,{cast:false});
  } else if(key==='chuckKey'){
    cylinder(g,'chuck key bar',0,.06,0,.008,.008,.16,M.steel,'x',16);
    for(const s of [-1,1])cylinder(g,'chuck key grip',s*.06,.06,0,.012,.012,.045,M.red,'x',16);
    cylinder(g,'chuck key shaft',0,0,0,.009,.009,.11,M.steel,'y',16);
    box(g,'chuck key square',0,-.06,0,.012,.02,.012,M.steelDark);
  } else if(key==='caliper'){
    box(g,'caliper beam',0,0,0,.22,.014,.004,M.steel);
    for(let i=0;i<18;i++)box(g,'caliper graduation',-.09+i*.01,.005,.0025,.0012,i%5===0?.006:.004,.001,M.dark,{cast:false});
    box(g,'caliper fixed jaw',-.105,-.022,0,.01,.04,.004,M.steel);
    const slider=new THREE.Group();slider.position.x=-.04;g.add(slider);
    box(slider,'caliper slider',0,0,0,.04,.022,.008,M.steelDark);box(slider,'caliper moving jaw',-.012,-.022,0,.01,.04,.004,M.steel);
    cylinder(slider,'caliper thumb wheel',.012,-.013,0,.006,.006,.006,M.gold,'z',12);
    box(g,'caliper depth rod',.12,0,0,.03,.003,.002,M.steel);
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return g;
}
// Prateleiras do armário: suportes com as ferramentas (cada uma clicável).
(function stockCabinet(){
  const cx=7.75,cz=-4.57;
  const holder=(x,y,w)=>roundedBox(room,'tool holder block',x,y+.03,cz,w,.06,.14,M.black,.01);
  const place=(key,x,y,z,ry=0,rx=0,scale=1.25)=>{
    const m=makeToolModel(key);m.position.set(x,y,z);m.rotation.set(rx,ry,0);m.scale.setScalar(scale);room.add(m);
    const info=TOOL_CATALOG.find(t=>t.key===key);
    m.traverse(o=>{if(o.isMesh){o.userData.toolKey=key;registerMachineControl(o,info.machine||'mill','toolInfo',`ver ${info.name}`);}});
    return m;
  };
  // prateleira 1,60: fresas (em pé num suporte) e fresa de face
  holder(cx-.22,1.6225,.66);
  place('endmill10',cx-.42,1.855,cz+.08,0,0,1.7);place('endmill6',cx-.14,1.855,cz+.08,0,0,1.7);
  place('facemill',cx+.36,1.69,cz+.08,0,0,2.2);
  // prateleira 1,04: brocas num suporte
  holder(cx-.1,1.0625,.6);
  place('drill8',cx-.28,1.31,cz+.08,0,0,1.7);place('drill5',cx+.04,1.31,cz+.08,0,0,1.7);
  // prateleira 0,48: ferramentas do torno deitadas numa bandeja
  box(room,'lathe tool tray',cx,.51,cz+.08,1.16,.02,.56,M.navy);
  place('turning',cx-.475,.555,cz+.08,0,0,1.8);place('boring',cx-.285,.552,cz+.08,0,0,1.8);place('groove',cx-.095,.555,cz+.08,0,0,1.8);
  place('facing',cx+.095,.555,cz+.08,0,0,1.8);place('threading',cx+.285,.555,cz+.08,0,0,1.8);place('parting',cx+.475,.562,cz+.08,0,0,1.8);
  // prateleira 2,16: chave da placa e paquímetro (deitados)
  place('chuckKey',cx-.36,2.21,cz+.08,0,Math.PI/2,1.4);
  place('caliper',cx+.2,2.19,cz+.08,0,-Math.PI/2,1.8);
  // luz interna para as ferramentas aparecerem
  for(const y of [.85,1.45,2.0]){const l=new THREE.PointLight(0xfff1d6,1.6,1.6,2);l.position.set(cx,y,cz+.35);room.add(l);}
  textPlaque(room,'CLIQUE NA FERRAMENTA',cx,2.98,cz+.66,'#29c7df',0).scale.setScalar(.45);
})();

let toolWin=null;let toolWinIndex=0;let toolWinWasLocked=false;
function setupToolWindow(){
  if(toolWin)return toolWin;
  const wrap=$('#toolWinCanvas');const w=Math.max(200,wrap.clientWidth||248),h=Math.max(110,wrap.clientHeight||150);
  const r=new THREE.WebGLRenderer({antialias:true,alpha:true});r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(w,h);r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;
  wrap.replaceChildren(r.domElement);
  const sc=new THREE.Scene();const pm=new THREE.PMREMGenerator(r);sc.environment=pm.fromScene(new RoomEnvironment(),.04).texture;
  sc.add(new THREE.HemisphereLight(0xdbeeff,0x223040,1.2));const dl=new THREE.DirectionalLight(0xffe4c2,2.4);dl.position.set(2,3,2);sc.add(dl);
  const cam=new THREE.PerspectiveCamera(32,w/h,.01,10);cam.position.set(0,.03,.66);cam.lookAt(0,0,0);
  const pivot=new THREE.Group();sc.add(pivot);
  toolWin={renderer:r,scene:sc,camera:cam,pivot,frame:0};
  return toolWin;
}
function showToolInWindow(index){
  const tw=setupToolWindow();toolWinIndex=(index+TOOL_CATALOG.length)%TOOL_CATALOG.length;const info=TOOL_CATALOG[toolWinIndex];
  tw.pivot.clear();const m=makeToolModel(info.key);
  // Centraliza e ajusta o tamanho para caber na janelinha.
  const b=new THREE.Box3().setFromObject(m),size=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
  m.position.sub(c);const holder=new THREE.Group();holder.add(m);const horiz=Math.max(size.x,size.z);holder.scale.setScalar(Math.min(.22/size.y,.38/horiz));
  if(info.key==='turning'||info.key==='boring'||info.key==='groove')holder.rotation.set(.5,0,0);
  tw.pivot.add(holder);
  $('#toolWinName').textContent=info.name;$('#toolWinDesc').textContent=info.desc;
  $('#toolWinIndex').textContent=`${toolWinIndex+1} / ${TOOL_CATALOG.length}`;
  if(info.machine){const range=rpmRanges[info.machine][info.tool];$('#toolWinMachine').textContent=info.machine==='mill'?'FRESADORA FV-02':'TORNO TM-01';$('#toolWinRpm').textContent=`${range.min}–${range.max} RPM (didático)`;$('#toolWinUse').hidden=false;$('#toolWinUse').textContent=info.machine==='mill'?'Instalar na fresadora':'Instalar no torno';}
  else{$('#toolWinMachine').textContent='INSTRUMENTO / ACESSÓRIO';$('#toolWinRpm').textContent='';$('#toolWinUse').hidden=true;}
}
function openToolWindow(key){
  const i=Math.max(0,TOOL_CATALOG.findIndex(t=>t.key===key));
  $('#toolWindow').classList.remove('hidden');
  if(walkControls.isLocked){toolWinWasLocked=true;walkControls.unlock();}
  showToolInWindow(i);
  const tw=toolWin;cancelAnimationFrame(tw.frame);
  const loop=()=>{if($('#toolWindow').classList.contains('hidden'))return;tw.pivot.rotation.y+=.012;tw.renderer.render(tw.scene,tw.camera);tw.frame=requestAnimationFrame(loop);};
  loop();
}
function closeToolWindow(){
  if($('#toolWindow').classList.contains('hidden'))return;
  $('#toolWindow').classList.add('hidden');if(toolWin)cancelAnimationFrame(toolWin.frame);
  if(toolWinWasLocked&&mode==='walk'&&!renderer.xr.isPresenting){toolWinWasLocked=false;walkControls.lock();}
}
function installCatalogTool(){
  const info=TOOL_CATALOG[toolWinIndex];if(!info.machine)return;
  const st=info.machine,s=activeMachines[st];
  if(s.powered||s.cutting||autoRunning(st)){notify('Pare e desligue a máquina antes de trocar a ferramenta.','error');return;}
  if(activeStation!==st)switchStation(st);if(activeStation!==st)return;
  if(s.toolInstalled)removeTool(st);
  s.tool=info.tool;setToolOptions(st);$('#toolSelect').value=info.tool;installTool(st);clampTool(st);
  notify(`${info.name} instalada e presa na ${st==='mill'?'fresadora':'máquina (torno)'}.`);
}
$('#toolWinClose').addEventListener('click',closeToolWindow);
$('#toolWinPrev').addEventListener('click',()=>showToolInWindow(toolWinIndex-1));
$('#toolWinNext').addEventListener('click',()=>showToolInWindow(toolWinIndex+1));
$('#toolWinUse').addEventListener('click',installCatalogTool);
$('#toolsBtn').addEventListener('click',()=>{if($('#toolWindow').classList.contains('hidden'))openToolWindow(TOOL_CATALOG[toolWinIndex].key);else closeToolWindow();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeToolWindow();});

// 3) Fresadora: joelho (eixo Z) e volante fino do mangote também giram.
let millKneeOffset=0;const MILL_KNEE_MAX=.10;
const millKnee=new THREE.Group();millKnee.name='mill knee assembly';millRoot.add(millKnee);
const millKneeWheel=millRoot.children.find(o=>o.isGroup&&Math.abs(o.position.x-1.22)<.01&&Math.abs(o.position.y-.68)<.01);
const millHeadWheel=millRoot.children.find(o=>o.isGroup&&Math.abs(o.position.x+.58)<.01&&Math.abs(o.position.z-.93)<.01);
for(const o of [...millRoot.children]){
  if(['knee','cross slide','mill Y axle extension','Y feed bearing block','Y dial collar','mill table Y feed axle','mill knee handwheel axle','Z dial collar'].includes(o.name)||o===millTableCarrier||o===millYWheel||o===millKneeWheel)millKnee.add(o);
}
millKneeWheel?.traverse(o=>{if(o.isMesh)registerMachineControl(o,'mill','millZ','Volante do joelho (sobe/desce a mesa)');});
millHeadWheel?.traverse(o=>{if(o.isMesh)registerMachineControl(o,'mill','millFine','Volante fino do mangote');});
function moveMillKnee(){
  const s=activeMachines.mill;if(s.powered||s.cutting){notify('Desligue a fresadora antes de girar o volante do joelho.','error');return;}
  const cur=millKneeOffset,wanted=cur+.01*(crankDirs.millZ??1),next=THREE.MathUtils.clamp(wanted,0,MILL_KNEE_MAX);
  if(next>cur&&millToolAssembly){millKneeOffset=next;const blocked=millToolAssembly.position.y<millToolMinY(millManualOffset.x,millManualOffset.y);millKneeOffset=cur;if(blocked){crankDirs.millZ=-1;limitNotice('mill-z','Fim de curso: a peça encostaria na ferramenta. Gire de novo para descer a mesa.');return;}}
  millKneeOffset=next;if(millKneeWheel)millKneeWheel.rotation.z+=(next-cur)/.008;
  if(Math.abs(wanted-next)>1e-6){crankDirs.millZ=-(crankDirs.millZ??1);limitNotice('mill-z',next>=MILL_KNEE_MAX?'Mesa no ponto mais alto do joelho.':'Mesa no ponto mais baixo.');}
}
crankDirs.millZ=1;
const baseStartMachiningKnee=startMachining;
startMachining=function(station,automatic=false){if(station==='mill')millKneeOffset=0;return baseStartMachiningKnee(station,automatic);};
REPEATABLE_CONTROLS.add('millZ');REPEATABLE_CONTROLS.add('millFine');
const baseActivateV5=activateMachineControl;
activateMachineControl=function(station,action,target=null){
  if(action==='toolInfo'){openToolWindow(target?.userData.toolKey);return;}
  if(action==='millZ'){moveMillKnee();return;}
  if(action==='millFine'){feedMillQuill(.005);if(millHeadWheel&&millToolAssembly&&!activeMachines.mill.powered)millHeadWheel.rotation.z+=.35*crankDirs.millFeed;return;}
  return baseActivateV5(station,action,target);
};

// Setas animadas ao redor de cada manivela/volante: mostram o que dá para girar quando você está perto.
const turnIndicatorMat=new THREE.MeshBasicMaterial({color:'#29e0ff',transparent:true,opacity:.9,depthWrite:false});
const turnIndicators=[];
function addTurnIndicator(group,radius,machine,plane='xy'){
  if(!group)return;
  const holder=new THREE.Group();holder.name='turn indicator';if(plane==='yz')holder.rotation.y=Math.PI/2;
  const spin=new THREE.Group();holder.add(spin);
  spin.add(new THREE.Mesh(new THREE.TorusGeometry(radius,.007,6,48,Math.PI*1.45),turnIndicatorMat));
  const a=Math.PI*1.45,tip=new THREE.Mesh(new THREE.ConeGeometry(.022,.05,12),turnIndicatorMat);
  tip.position.set(Math.cos(a)*radius,Math.sin(a)*radius,0);tip.rotation.z=a;spin.add(tip);
  holder.visible=false;group.add(holder);turnIndicators.push({holder,spin,machine});
}
addTurnIndicator(latheFeedWheel,.30,'lathe');addTurnIndicator(tailWheelGroup,.26,'lathe');
addTurnIndicator(millXWheel,.26,'mill');addTurnIndicator(millYWheel,.26,'mill');addTurnIndicator(millKneeWheel,.26,'mill');
addTurnIndicator(millHeadWheel,.25,'mill');addTurnIndicator(millQuillLever,.40,'mill');addTurnIndicator(viseCrank,.14,'mill','yz');
const machineCenters={lathe:new THREE.Vector2(-3.55,-1.45),mill:new THREE.Vector2(3.45,-1.5)};

// Destaque + dica ao mirar (1ª pessoa) ou passar o mouse (órbita) num controle.
const hoverMat=new THREE.MeshStandardMaterial({color:'#9ff6ff',emissive:'#29c7df',emissiveIntensity:1.3,metalness:.2,roughness:.35});
const HIGHLIGHT_ACTIONS=new Set(['handwheel','tailWheel','millX','millY','millZ','millFine','millFeedLever','viseCrank','toolInfo','latheFeedLever','selector']);
const hoverPointer=new THREE.Vector2();let hoverPointerInside=false;let hoveredMeshes=[];let hoverFrame=0;
renderer.domElement.addEventListener('pointermove',e=>{const r=renderer.domElement.getBoundingClientRect();hoverPointer.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);hoverPointerInside=true;});
renderer.domElement.addEventListener('pointerleave',()=>{hoverPointerInside=false;});
function setHovered(list){
  for(const m of hoveredMeshes)if(m.userData.preHoverMat){m.material=m.userData.preHoverMat;delete m.userData.preHoverMat;}
  hoveredMeshes=list;for(const m of list){m.userData.preHoverMat=m.material;m.material=hoverMat;}
}
function updateControlHover(dt){
  // setas: visíveis perto da máquina (ou na órbita da estação selecionada) com a máquina desligada
  const px=thirdPerson?playerWorld.x:camera.position.x,pz=thirdPerson?playerWorld.z:camera.position.z;
  for(const t of turnIndicators){
    const s=activeMachines[t.machine];const near=(mode==='walk'&&!renderer.xr.isPresenting&&Math.hypot(px-machineCenters[t.machine].x,pz-machineCenters[t.machine].y)<3.9)||(mode==='inspect'&&activeStation===t.machine);
    t.holder.visible=near&&!s.powered&&!s.cutting;if(t.holder.visible)t.spin.rotation.z+=dt*2.2;
  }
  turnIndicatorMat.opacity=.55+.35*Math.sin(performance.now()*.006);
  if((hoverFrame++)%2)return;
  const hint=$('#crankHint');let ptr=null;
  if(!renderer.xr.isPresenting&&$('#toolWindow').classList.contains('hidden')){if(walkControls.isLocked)ptr=new THREE.Vector2(0,0);else if(orbitControls.enabled&&hoverPointerInside)ptr=hoverPointer;}
  let hit=null;
  if(ptr){machineControlRaycaster.setFromCamera(ptr,camera);hit=machineControlRaycaster.intersectObjects(machineControlTargets,false)[0]||null;if(hit&&walkControls.isLocked&&hit.distance>3.4)hit=null;}
  const control=hit?.object.userData.machineControl;hoverControlHit=control?hit:null;
  if(!control){if(hoveredMeshes.length)setHovered([]);hint.classList.add('hidden');return;}
  if(HIGHLIGHT_ACTIONS.has(control.action)){
    const root=control.action==='toolInfo'?(()=>{let n=hit.object;while(n.parent&&n.parent!==room)n=n.parent;return n;})():hit.object.parent;
    const list=machineControlTargets.filter(m=>m.userData.machineControl.action===control.action&&(()=>{let n=m;while(n){if(n===root)return true;n=n.parent;}return false;})());
    if(list.length!==hoveredMeshes.length||list.some((m,i)=>m!==hoveredMeshes[i]))setHovered(list);
  } else if(hoveredMeshes.length)setHovered([]);
  const hold=REPEATABLE_CONTROLS.has(control.action);
  hint.innerHTML='';const b=document.createElement('b');b.textContent=hold?'SEGURE O CLIQUE':'CLIQUE';hint.append(b,document.createTextNode(' • '+control.label));
  if(control.action==='toolInfo'&&walkControls.isLocked){const b2=document.createElement('b');b2.textContent='  E';hint.append(b2,document.createTextNode(' • pegar para a mochila'));}
  if((control.action==='epiGoggles'||control.action==='epiMuffs')&&walkControls.isLocked){const b3=document.createElement('b');b3.textContent='  E';hint.append(b3,document.createTextNode(' • equipar'));}
  hint.classList.toggle('orbit',!walkControls.isLocked);hint.classList.remove('hidden');
}
const baseUpdateMechanismsV5=updateMechanisms;
updateMechanisms=function(dt){
  baseUpdateMechanismsV5(dt);
  millKnee.position.y=THREE.MathUtils.damp(millKnee.position.y,activeMachines.mill.cutting?0:millKneeOffset,7,dt);
  updateControlHover(dt);
};

// 4) Caixinha de peças usinadas ao lado de cada máquina (a do torno fica do lado direito dele).
const partBins={lathe:{x:-.72,z:-1.25,label:'PECAS PRONTAS'},mill:{x:1.02,z:-1.0,label:'PECAS PRONTAS'}};
for(const [station,bin] of Object.entries(partBins)){
  const g=new THREE.Group();g.name=`${station} parts bin`;g.position.set(bin.x,0,bin.z);room.add(g);
  for(const sx of [-1,1])for(const sz of [-1,1])box(g,'bin stand leg',sx*.24,.27,sz*.40,.04,.54,.04,M.steelDark);
  box(g,'bin stand shelf',0,.20,0,.52,.03,.84,M.steelDark);
  box(g,'bin floor',0,.555,0,.56,.03,.92,M.blue);
  for(const sx of [-1,1])box(g,'bin side wall',sx*.27,.65,0,.02,.2,.92,M.blue);
  for(const sz of [-1,1])box(g,'bin end wall',0,.65,sz*.45,.56,.2,.02,M.blue2);
  box(g,'bin lip',0,.755,.46,.58,.02,.03,M.cyan,{cast:false});
  const tag=textPlaque(g,bin.label,0,.64,.465,'#29c7df',0);tag.scale.set(.3,.3,.3);
  bin.slots=[-.3,-.1,.1,.3].map(dz=>({x:bin.x,y:.575,z:bin.z+dz}));
  boxColliders.push({name:`caixinha ${station}`,minX:bin.x-.3,maxX:bin.x+.3,minZ:bin.z-.48,maxZ:bin.z+.48});
}
{const shadowMat=room.children.find(o=>o.name==='contact shadow')?.material;if(shadowMat)for(const b of Object.values(partBins)){const p=new THREE.Mesh(new THREE.PlaneGeometry(.9,1.25),shadowMat);p.name='contact shadow';p.rotation.x=-Math.PI/2;p.position.set(b.x,.021,b.z);room.add(p);}}
for(const o of [...room.children])if(o.name==='contact shadow'&&Math.abs(o.position.x+7.15)<.01)room.remove(o);
const baseDeliverMachinePartV5=deliverMachinePart;
deliverMachinePart=function(station){
  const bin=partBins[station];
  const free=bin.slots.findIndex((_,i)=>!pickupObjects.some(o=>o.userData.binSlot===`${station}:${i}`));
  if(free>=0){
    const slot=bin.slots[free],payload=finishedProductPayload(station);
    const product=spawnPickup(payload.kind,slot.x,slot.z,payload);product.scale.setScalar(.72);
    product.position.y=slot.y;product.userData.baseY=slot.y;product.userData.sellableOutput=true;product.userData.binSlot=`${station}:${free}`;
    return 'bin';
  }
  return baseDeliverMachinePartV5(station);
};


// ===========================================================================
// v6: mochila de 5 espaços com barra rápida, cavaco voando na usinagem, bandeja de
// cavaco do torno que enche em 5 peças e esvazia com X, sem carrinho e sem mesa de peças prontas.
// ===========================================================================

// 1) Remove o carrinho e a mesa de peças prontas atrás do balcão.
(function removeCartAndTable(){
  const cart=room.children.find(o=>o.isGroup&&Math.abs(o.position.x+5.6)<.01&&Math.abs(o.position.z-3.75)<.01);
  if(cart){room.remove(cart);disposeGroup(cart);}
  removeNamed(room,['finished parts table leg','finished parts table apron','finished parts table top','finished parts table cyan edge','finished parts sign post','finished parts table sale lamp']);
  for(const o of [...room.children]){
    if(o.isMesh&&o.geometry?.type==='PlaneGeometry'&&Math.abs(o.position.x-6.35)<.05&&Math.abs(o.position.z-.91)<.05)room.remove(o);
    if(o.name==='contact shadow'&&((Math.abs(o.position.x+5.6)<.01&&Math.abs(o.position.z-3.75)<.01)||(Math.abs(o.position.x-6.35)<.01&&Math.abs(o.position.z-1.35)<.01)))room.remove(o);
  }
  for(let i=saleCounterTargets.length-1;i>=0;i--)if(!saleCounterTargets[i].parent)saleCounterTargets.splice(i,1);
  for(let i=boxColliders.length-1;i>=0;i--)if(['carrinho','mesa de peças prontas'].includes(boxColliders[i].name))boxColliders.splice(i,1);
  finishedProductSpots.length=0;finishedTablePoint.set(9999,0,9999);
})();

// 2) Cavaco voando: partículas instanciadas saindo da ferramenta, caindo e sumindo.
const CHIP_MAX=420;
const chipGeo=new THREE.TorusGeometry(.022,.0035,4,12,Math.PI*1.4);
const chipFxMat=new THREE.MeshStandardMaterial({color:'#ffffff',metalness:.85,roughness:.3});
const chipFx=new THREE.InstancedMesh(chipGeo,chipFxMat,CHIP_MAX);chipFx.name='flying chips';chipFx.frustumCulled=false;chipFx.count=0;
chipFx.setColorAt(0,new THREE.Color('#ffffff'));scene.add(chipFx);
const flyingChips=[];const chipDummy=new THREE.Object3D();const chipTmp=new THREE.Vector3();const chipSpawnAcc={mill:0,lathe:0};
function spawnChip(station,origin){
  if(flyingChips.length>=CHIP_MAX)flyingChips.shift();
  const color=(stockMaterials[activeMachines[station].stock]||M.steelStock).color;
  let v;
  if(station==='lathe')v=new THREE.Vector3((Math.random()-.5)*.8,.9+Math.random()*.9,-.1+Math.random()*.55);
  else{const a=Math.random()*Math.PI*2,sp=.45+Math.random()*.9;v=new THREE.Vector3(Math.cos(a)*sp,.3+Math.random()*.6,Math.sin(a)*sp);}
  flyingChips.push({p:origin.clone().add(new THREE.Vector3((Math.random()-.5)*.02,0,(Math.random()-.5)*.02)),v,r:new THREE.Euler(Math.random()*6,Math.random()*6,Math.random()*6),w:new THREE.Vector3((Math.random()-.5)*16,(Math.random()-.5)*16,(Math.random()-.5)*16),life:0,rest:-1,scale:(station==='lathe'?1.8:1.4)*(.7+Math.random()*.6),color,station});
}
function chipFloorY(ch){
  const p=ch.p;
  if(ch.station==='lathe'){
    const lx=p.x-latheRoot.position.x,lz=p.z-latheRoot.position.z;
    // o cavaco do torno cai entre as guias e vai parar na bandeja embaixo
    if(Math.abs(lx)<.72&&Math.abs(lz)<.54)return .36+panPile.count/CHIPS_PER_LEVEL*.013;
    return Math.abs(lx)<2.3&&Math.abs(lz)<.6?.36:.02;
  }
  const kneeY=millKnee.position.y;
  const lx=p.x-millRoot.position.x-millTableCarrier.position.x,lz=p.z-millRoot.position.z-millTableCarrier.position.z;
  if(lx>-.73&&lx<1.29&&lz>.08&&lz<.92&&p.y>.9+kneeY){
    if(activeMachines.mill.pieceLoaded&&Math.abs(lx-.28)<.285&&Math.abs(lz-.5)<.24)return 1.199+kneeY;
    return 1.0+kneeY;
  }
  const bx=p.x-millRoot.position.x,bz=p.z-millRoot.position.z;
  if(Math.abs(bx)<1.12&&Math.abs(bz)<.87)return .55;
  return .02;
}
function updateChips(dt){
  for(const st of ['lathe','mill']){
    const s=activeMachines[st];if(!s.cutting){chipSpawnAcc[st]=0;continue;}
    const p=s.progress||0;if(p<.04||p>.97)continue;
    const origin=st==='lathe'
      ?latheRoot.localToWorld(chipTmp.set(latheToolAssembly?latheToolAssembly.position.x:latheCarriage.position.x,1.56+(latheToolAssembly?latheToolAssembly.position.y:0),.02)).clone()
      :millRoot.localToWorld(chipTmp.set(.34,(millToolAssembly?millToolAssembly.position.y:1.44)-millToolBottomOffset()+.012,.52)).clone();
    chipSpawnAcc[st]+=dt*(st==='lathe'?80:65);
    while(chipSpawnAcc[st]>=1){chipSpawnAcc[st]--;spawnChip(st,origin);}
  }
  for(let i=flyingChips.length-1;i>=0;i--){
    const ch=flyingChips[i];ch.life+=dt;
    if(ch.rest<0){
      ch.v.y-=6.5*dt;ch.p.addScaledVector(ch.v,dt);ch.r.x+=ch.w.x*dt;ch.r.y+=ch.w.y*dt;ch.r.z+=ch.w.z*dt;
      const fy=chipFloorY(ch);if(ch.p.y<=fy&&ch.v.y<0){ch.p.y=fy;ch.rest=0;}
    } else ch.rest+=dt;
    if(ch.rest>2.2||ch.life>6)flyingChips.splice(i,1);
  }
  for(let i=0;i<flyingChips.length;i++){
    const ch=flyingChips[i];const fade=ch.rest>1.5?Math.max(0,1-(ch.rest-1.5)/.7):1;
    chipDummy.position.copy(ch.p);chipDummy.rotation.copy(ch.r);chipDummy.scale.setScalar(ch.scale*fade);chipDummy.updateMatrix();
    chipFx.setMatrixAt(i,chipDummy.matrix);chipFx.setColorAt(i,ch.color);
  }
  chipFx.count=flyingChips.length;chipFx.instanceMatrix.needsUpdate=true;if(chipFx.instanceColor)chipFx.instanceColor.needsUpdate=true;
}

// 3) Bandeja de cavaco do torno: enche a cada peça torneada (cheia em 5) e esvazia com X.
const LATHE_PAN_MAX=5,CHIPS_PER_LEVEL=70;
removeNamed(latheRoot,['spiral chip']);
const panPile=new THREE.InstancedMesh(chipGeo,chipFxMat,LATHE_PAN_MAX*CHIPS_PER_LEVEL);panPile.name='lathe chip pile';panPile.frustumCulled=false;
{
  const tints=[M.steelStock.color,M.brass.color,M.bronze.color,M.aluminum.color];const o=new THREE.Object3D();
  for(let i=0;i<LATHE_PAN_MAX*CHIPS_PER_LEVEL;i++){
    const layer=Math.floor(i/CHIPS_PER_LEVEL);const spread=1-layer*.12;
    const rr=Math.sqrt(Math.random()),aa=Math.random()*Math.PI*2;const px=Math.cos(aa)*rr*.66*spread,pz=Math.sin(aa)*rr*.47*spread;
    o.position.set(px,.35+(layer+1)*.016*(1-rr*rr*.7)+Math.random()*.01,pz);
    o.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);o.scale.setScalar(1.6+Math.random()*1.0);o.updateMatrix();
    panPile.setMatrixAt(i,o.matrix);panPile.setColorAt(i,tints[Math.floor(Math.random()*tints.length)]);
  }
}
panPile.count=0;latheRoot.add(panPile);
// monte de cavaco (volume) que cresce junto com o nível da bandeja
const panMound=new THREE.Mesh(new THREE.SphereGeometry(1,28,14,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#9aa3a9',metalness:.75,roughness:.5}));
panMound.name='lathe chip mound';panMound.position.set(0,.345,0);panMound.scale.set(.001,.001,.001);panMound.receiveShadow=true;latheRoot.add(panMound);
let lathePanLevel=0,panShown=0;
function lathePanFull(){return lathePanLevel>=LATHE_PAN_MAX;}
function syncChipPanUI(){
  $('#chipPanLevel').textContent=`${lathePanLevel} / ${LATHE_PAN_MAX}`;$('#chipPanBar').style.width=`${lathePanLevel/LATHE_PAN_MAX*100}%`;
  $('.chip-pan-row')?.classList.toggle('full',lathePanFull());$('#emptyChipsBtn').disabled=lathePanLevel===0;
}
function emptyLathePan(){
  if(lathePanLevel===0){notify('A bandeja de cavaco do torno já está vazia.');return;}
  if(activeMachines.lathe.cutting){notify('Espere a passada terminar para esvaziar a bandeja.','error');return;}
  lathePanLevel=0;syncChipPanUI();notify('Bandeja de cavaco do torno esvaziada.');
}
$('#emptyChipsBtn').addEventListener('click',emptyLathePan);
const baseEndMachiningV6=endMachining;
endMachining=function(station){
  if(station==='lathe'&&activeMachines.lathe.cutting){lathePanLevel=Math.min(LATHE_PAN_MAX,lathePanLevel+1);syncChipPanUI();
    if(lathePanFull())notify('Bandeja de cavaco do torno CHEIA! Aperte X perto do torno (ou "Esvaziar cavaco") para esvaziar.','error');}
  return baseEndMachiningV6(station);
};
const baseStartMachiningV6=startMachining;
startMachining=function(station,automatic=false){
  if(station==='lathe'&&lathePanFull()){notify('Bandeja de cavaco do torno cheia: aperte X perto do torno para esvaziar antes de usinar.','error');return;}
  return baseStartMachiningV6(station,automatic);
};
function nearLathe(){const px=thirdPerson?playerWorld.x:camera.position.x,pz=thirdPerson?playerWorld.z:camera.position.z;return Math.hypot(px-latheRoot.position.x,pz-latheRoot.position.z)<3.4;}
document.addEventListener('keydown',e=>{
  if(e.code!=='KeyX'||e.repeat||renderer.xr.isPresenting||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
  if((mode==='walk'&&walkControls.isLocked&&nearLathe())||(mode==='inspect'&&activeStation==='lathe'))emptyLathePan();
  else if(lathePanLevel>0)notify('Chegue perto do torno para esvaziar o cavaco (ou use o botão "Esvaziar cavaco").','error');
});
const baseGameplayV6=updateGameplayWorld;
updateGameplayWorld=function(dt){
  baseGameplayV6(dt);
  if(!walkControls.isLocked||mode!=='walk'||renderer.xr.isPresenting||currentWorldAction)return;
  if(lathePanLevel>0&&nearLathe()){
    const prompt=$('#pickupPrompt');prompt.classList.remove('hidden');prompt.querySelector('kbd').textContent='X';
    $('#pickupPromptTitle').textContent=lathePanFull()?'Bandeja de cavaco CHEIA':'Esvaziar bandeja de cavaco';
    $('#pickupPromptDetail').textContent=`Cavaco do torno: ${lathePanLevel}/${LATHE_PAN_MAX} peças`;
  }
};
const baseMechanismsV6=updateMechanisms;
updateMechanisms=function(dt){
  baseMechanismsV6(dt);updateChips(dt);
  const target=lathePanLevel*CHIPS_PER_LEVEL;
  if(panShown!==target){panShown+=Math.sign(target-panShown)*Math.min(Math.abs(target-panShown),dt*(target<panShown?300:120));panPile.count=Math.round(panShown);}
  const lvl=panShown/CHIPS_PER_LEVEL;panMound.visible=lvl>.05;panMound.scale.set(.32+lvl*.07,Math.max(.001,lvl*.015),.24+lvl*.045);
};
syncChipPanUI();

// 4) Mochila com 5 espaços: barra rápida na tela, teclas 1 a 5 escolhem o item.
const baseRenderInventoryV6=renderInventory;
renderInventory=function(){
  baseRenderInventoryV6();
  const bar=$('#hotbar');if(!bar)return;bar.replaceChildren();
  for(let i=0;i<MAX_INVENTORY;i++){
    const item=inventoryItems[i];const slot=document.createElement('button');slot.type='button';
    slot.className='hot-slot'+(item?'':' empty')+(item&&item.id===selectedInventoryId?' selected':'');
    slot.title=item?`${item.name} • ${moneyFormat.format(item.value)}`:`Espaço ${i+1} vazio`;
    const hk=document.createElement('span');hk.className='hk';hk.textContent=String(i+1);
    const ic=document.createElement('span');ic.className='ic';ic.textContent=item?itemIcon(item.kind):'·';
    const nm=document.createElement('span');nm.className='nm';nm.textContent=item?item.name.replace(/^(Cilindro|Bloco|Peça fresada|Eixo torneado) (de |• )?/,''):'';
    slot.append(hk,ic,nm);if(item)slot.addEventListener('click',()=>{selectedInventoryId=item.id;renderInventory();});bar.appendChild(slot);
  }
};
document.addEventListener('keydown',e=>{
  const m=/^Digit([1-5])$/.exec(e.code);if(!m||renderer.xr.isPresenting||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
  const item=inventoryItems[Number(m[1])-1];if(item){selectedInventoryId=item.id;renderInventory();notify(`Selecionado: ${item.name}`,'silent');}
});


// ===========================================================================
// v7: botão para apertar/soltar o mandril (placa) do torno, nomes "cilindro".
// ===========================================================================
for(const it of inventoryItems)if(typeof it.name==='string')it.name=it.name.replace(/Tarugo/g,'Cilindro').replace(/tarugo/g,'cilindro');

// Botão físico amarelo "MANDRIL" no painel do torno + clique direto na placa + tecla M perto do torno.
const chuckButton=cylinder(latheRoot,'chuck clamp button',-1.47,1.52,.87,.05,.05,.045,M.yellow,'z',24);
cylinder(latheRoot,'chuck clamp button bezel',-1.47,1.52,.852,.062,.062,.012,M.dark,'z',24);
{const tag=textPlaque(latheRoot,'MANDRIL',-1.47,1.452,.858,'#efad42',0);tag.scale.set(.12,.12,.12);}
registerMachineControl(chuckButton,'lathe','chuckClamp','Botão do mandril: apertar / soltar a placa');
for(const name of ['chuck body profile','chuck backplate profile']){const m=latheRotor.getObjectByName(name);if(m)registerMachineControl(m,'lathe','chuckClamp','Placa (mandril): apertar / soltar');}
for(const jaw of latheJaws)registerMachineControl(jaw,'lathe','chuckClamp','Placa (mandril): apertar / soltar');
function toggleLatheChuck(){
  const s=activeMachines.lathe;
  if(autoRunning('lathe')){notify('O automático está controlando o torno. Aperte o vermelho para parar antes de mexer no mandril.','error');return;}
  if(s.cutting||s.powered){notify('Desligue o torno antes de apertar ou soltar o mandril.','error');return;}
  if(!s.pieceLoaded){notify('Coloque um cilindro no torno antes de apertar o mandril (pegue na bancada de materiais).','error');return;}
  if(activeStation!=='lathe')switchStation('lathe');
  clampPiece('lathe');
  chuckButton.position.z=chuckButton.userData.restZ-.018;setTimeout(()=>{chuckButton.position.z=chuckButton.userData.restZ;},180);
}
const baseActivateV7=activateMachineControl;
activateMachineControl=function(station,action,target=null){
  if(action==='chuckClamp'){toggleLatheChuck();return;}
  return baseActivateV7(station,action,target);
};
HIGHLIGHT_ACTIONS.add('chuckClamp');
document.addEventListener('keydown',e=>{
  if(e.code!=='KeyM'||e.repeat||renderer.xr.isPresenting||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
  if((mode==='walk'&&walkControls.isLocked&&nearLathe())||(mode==='inspect'&&activeStation==='lathe'))toggleLatheChuck();
});
// Lembrete do botão quando há cilindro solto no torno.
const baseGameplayV7=updateGameplayWorld;
updateGameplayWorld=function(dt){
  baseGameplayV7(dt);
  if(!walkControls.isLocked||mode!=='walk'||renderer.xr.isPresenting||currentWorldAction)return;
  const s=activeMachines.lathe;
  if(nearLathe()&&s.pieceLoaded&&!s.pieceClamped&&!s.powered&&!autoRunning('lathe')){
    const prompt=$('#pickupPrompt');prompt.classList.remove('hidden');prompt.querySelector('kbd').textContent='M';
    $('#pickupPromptTitle').textContent='Apertar o mandril';$('#pickupPromptDetail').textContent='M ou o botão amarelo MANDRIL no painel do torno';
  }
};


// ===========================================================================
// v9: ferramentas do armário vão para a mochila; placa "USE EPI" com protetor
// ocular e protetor auricular na parede (e os EPIs pendurados).
// ===========================================================================
let hoverControlHit=null;

// --- Ferramentas: pegar no armário (E mirando), devolver (Q), instalar na máquina (E perto dela) ---
const toolHomes={};
for(const o of room.children){const m=/^tool model (.+)$/.exec(o.name||'');if(m)toolHomes[m[1]]={group:o,meshes:machineControlTargets.filter(t=>{let n=t;while(n&&n!==o)n=n.parent;return n===o;})};}
function setToolOnShelf(key,onShelf){
  const h=toolHomes[key];if(!h)return;h.group.visible=onShelf;
  for(const m of h.meshes){const i=machineControlTargets.indexOf(m);if(onShelf&&i<0)machineControlTargets.push(m);if(!onShelf&&i>=0)machineControlTargets.splice(i,1);}
}
const toolInfoByKey=k=>TOOL_CATALOG.find(t=>t.key===k);
const baseAddInventoryV9=addInventoryItem;
addInventoryItem=function(item,quiet=false){const ok=baseAddInventoryV9(item,quiet);if(ok&&item.toolKey){inventoryItems[inventoryItems.length-1].toolKey=item.toolKey;persistGame();}return ok;};
function pickToolFromCabinet(key){
  const info=toolInfoByKey(key);if(!info)return;
  if(!toolHomes[key]?.group.visible||inventoryItems.some(x=>x.kind==='tool'&&x.toolKey===key))return; // já foi pega
  if(inventoryItems.length>=MAX_INVENTORY){notify('Mochila cheia (5 espaços). Solte (Q) ou venda algo antes de pegar a ferramenta.','error');return;}
  addInventoryItem({kind:'tool',toolKey:key,name:info.name,value:0,material:'steel',quality:'Ferramenta do armário'},true);
  setToolOnShelf(key,false);setHovered([]);hoverControlHit=null;notify(`${info.name} na mochila.`);
}
function returnToolToCabinet(key){setToolOnShelf(key,true);}
// Ferramentas que já estavam na mochila (jogo salvo) não aparecem duplicadas no armário.
for(const it of inventoryItems)if(it.kind==='tool'&&it.toolKey)setToolOnShelf(it.toolKey,false);
const installedToolKey={mill:null,lathe:null};
function installToolFromKey(key,fromInventoryId=null){
  const info=toolInfoByKey(key);if(!info?.machine)return false;
  const st=info.machine,s=activeMachines[st];
  if(s.powered||s.cutting||autoRunning(st)){notify('Pare e desligue a máquina antes de trocar a ferramenta.','error');return false;}
  if(activeStation!==st)switchStation(st);if(activeStation!==st)return false;
  if(s.toolInstalled)removeTool(st);
  s.tool=info.tool;setToolOptions(st);$('#toolSelect').value=info.tool;installTool(st);clampTool(st);
  installedToolKey[st]=key;
  if(fromInventoryId){const i=inventoryItems.findIndex(x=>x.id===fromInventoryId);if(i>=0){inventoryItems.splice(i,1);selectedInventoryId=inventoryItems[0]?.id||null;renderInventory();}}
  else setToolOnShelf(key,false);
  notify(`${info.name} instalada e presa na ${st==='mill'?'fresadora':'placa do torno'}.`);return true;
}
// Retirar a ferramenta da máquina devolve ela ao armário.
const baseRemoveToolV9=removeTool;
removeTool=function(station){const s=activeMachines[station];const had=s.toolInstalled&&!s.powered;baseRemoveToolV9(station);if(had&&installedToolKey[station]){returnToolToCabinet(installedToolKey[station]);installedToolKey[station]=null;}};
// Botão "Instalar" da janelinha usa a ferramenta da mochila se ela estiver lá; senão pega do armário.
const originalInstallCatalogTool=installCatalogTool;
$('#toolWinUse').removeEventListener('click',originalInstallCatalogTool);
$('#toolWinUse').addEventListener('click',()=>installCatalogTool());
installCatalogTool=function(){
  const info=TOOL_CATALOG[toolWinIndex];if(!info?.machine)return;
  const inBag=inventoryItems.find(x=>x.kind==='tool'&&x.toolKey===info.key);
  if(!inBag&&toolHomes[info.key]&&!toolHomes[info.key].group.visible&&installedToolKey[info.machine]!==info.key){notify('Essa ferramenta não está no armário nem na mochila.','error');return;}
  installToolFromKey(info.key,inBag?.id||null);
};
// Q com ferramenta selecionada: devolve ao armário (não vai para a bancada).
const baseDropV9=dropSelectedItem;
dropSelectedItem=function(){
  const it=inventoryItems.find(x=>x.id===selectedInventoryId);
  if(it?.kind==='tool'){inventoryItems.splice(inventoryItems.indexOf(it),1);selectedInventoryId=inventoryItems[0]?.id||null;returnToolToCabinet(it.toolKey);renderInventory();notify(`${it.name} devolvida ao armário.`);return;}
  return baseDropV9();
};
// Ferramentas não são vendidas no balcão (ficam na mochila).
const baseSellV9=sellInventory;
sellInventory=function(){
  const tools=inventoryItems.filter(x=>x.kind==='tool');
  if(tools.length&&tools.length===inventoryItems.length){notify('Ferramentas não são vendidas. Use na máquina ou devolva ao armário (Q).','error');return;}
  inventoryItems=inventoryItems.filter(x=>x.kind!=='tool');baseSellV9();inventoryItems.push(...tools);renderInventory();
};
// Os botões do painel estavam ligados às funções antigas: religa nas novas.
$('#sellAllBtn').removeEventListener('click',baseSellV9);$('#sellAllBtn').addEventListener('click',()=>sellInventory());
$('#dropItemBtn').removeEventListener('click',baseDropV9);$('#dropItemBtn').addEventListener('click',()=>dropSelectedItem());
// E: mirando numa ferramenta do armário pega; com ferramenta selecionada perto da máquina, instala.
window.addEventListener('keydown',e=>{
  if(e.code!=='KeyE'||e.repeat||!walkControls.isLocked||renderer.xr.isPresenting||mode!=='walk')return;
  const ctl=hoverControlHit?.object.userData.machineControl;
  if(ctl?.action==='toolInfo'&&hoverControlHit.distance<3.4&&machineControlTargets.includes(hoverControlHit.object)){e.preventDefault();e.stopPropagation();pickToolFromCabinet(hoverControlHit.object.userData.toolKey);return;}
  if(currentWorldAction?.kind==='toolInstall'){e.preventDefault();e.stopPropagation();installToolFromKey(currentWorldAction.key,currentWorldAction.itemId);currentWorldAction=null;}
},true);
const baseGameplayV9=updateGameplayWorld;
updateGameplayWorld=function(dt){
  baseGameplayV9(dt);
  if(!walkControls.isLocked||mode!=='walk'||renderer.xr.isPresenting)return;
  const prompt=$('#pickupPrompt');
  if(currentWorldAction?.kind==='sale'){const sellable=inventoryItems.filter(x=>x.kind!=='tool');$('#pickupPromptDetail').textContent=sellable.length?`E vende ${sellable.length} item(ns) • ${moneyFormat.format(sellable.reduce((a,b)=>a+b.value,0))}`:'Nada para vender (ferramentas não são vendidas)';}
  if(currentWorldAction&&currentWorldAction.kind!=='toolInstall')return;
  const sel=inventoryItems.find(x=>x.id===selectedInventoryId&&x.kind==='tool');const info=sel&&toolInfoByKey(sel.toolKey);
  if(info?.machine){
    const px=thirdPerson?playerWorld.x:camera.position.x,pz=thirdPerson?playerWorld.z:camera.position.z;const c=machineCenters[info.machine];const s=activeMachines[info.machine];
    if(Math.hypot(px-c.x,pz-c.y)<3.4&&!s.powered&&!s.cutting&&!autoRunning(info.machine)){
      currentWorldAction={kind:'toolInstall',key:sel.toolKey,itemId:sel.id};prompt.classList.remove('hidden');prompt.querySelector('kbd').textContent='E';
      $('#pickupPromptTitle').textContent=`Instalar: ${info.name}`;$('#pickupPromptDetail').textContent=info.machine==='mill'?'Coloca e prende na fresadora':'Coloca e prende no torno';return;
    }
  }
  if(currentWorldAction?.kind==='toolInstall'){currentWorldAction=null;prompt.classList.add('hidden');}
};

// --- Placa de EPI obrigatório: protetor ocular + protetor auricular ---
removeNamed(room,['safety sign','safety sign inset']);
for(const o of [...room.children])if(o.isMesh&&o.geometry?.type==='PlaneGeometry'&&Math.abs(o.position.x+8.65)<.05&&Math.abs(o.position.y-3.8)<.05)room.remove(o);
function makeEpiPosterTexture(){
  const c=document.createElement('canvas');c.width=640;c.height=800;const g=c.getContext('2d');
  g.fillStyle='#f7f8f6';g.fillRect(0,0,640,800);
  g.fillStyle='#1d5fae';g.fillRect(0,0,640,150);
  g.fillStyle='#ffffff';g.font='bold 92px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('USE EPI',320,80);
  g.fillStyle='#1d5fae';g.font='bold 30px Arial';g.fillText('OBRIGATÓRIO NESTA ÁREA',320,195);
  const circle=(cx,cy)=>{g.fillStyle='#1d5fae';g.beginPath();g.arc(cx,cy,118,0,Math.PI*2);g.fill();g.strokeStyle='#ffffff';g.lineWidth=10;g.beginPath();g.arc(cx,cy,104,0,Math.PI*2);g.stroke();};
  // protetor ocular (óculos de segurança)
  circle(170,400);g.fillStyle='#ffffff';g.strokeStyle='#ffffff';g.lineWidth=12;
  const lens=(x)=>{g.beginPath();g.ellipse(x,405,40,30,0,0,Math.PI*2);g.fill();};lens(128);lens(212);
  g.lineWidth=10;g.beginPath();g.moveTo(152,398);g.quadraticCurveTo(170,384,188,398);g.stroke();
  g.beginPath();g.moveTo(88,398);g.lineTo(70,390);g.moveTo(252,398);g.lineTo(270,390);g.stroke();
  g.fillStyle='#1d5fae';g.beginPath();g.ellipse(128,405,26,17,0,0,Math.PI*2);g.ellipse(212,405,26,17,0,0,Math.PI*2);g.fill();
  // protetor auricular (concha)
  circle(470,400);g.strokeStyle='#ffffff';g.fillStyle='#ffffff';g.lineWidth=16;
  g.beginPath();g.arc(470,410,62,Math.PI*1.05,Math.PI*1.95);g.stroke();
  g.beginPath();g.ellipse(410,425,22,36,0,0,Math.PI*2);g.fill();g.beginPath();g.ellipse(530,425,22,36,0,0,Math.PI*2);g.fill();
  g.fillStyle='#1b2733';g.font='bold 34px Arial';g.fillText('PROTETOR',170,565);g.fillText('OCULAR',170,606);g.fillText('PROTETOR',470,565);g.fillText('AURICULAR',470,606);
  g.fillStyle='#efad42';g.fillRect(0,690,640,110);
  for(let x=-80;x<700;x+=80){g.fillStyle='#1b2733';g.beginPath();g.moveTo(x,690);g.lineTo(x+40,690);g.lineTo(x+80,800);g.lineTo(x+40,800);g.fill();}
  g.strokeStyle='#1b2733';g.lineWidth=10;g.strokeRect(5,5,630,790);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
const epiTexture=makeEpiPosterTexture();
function addEpiPoster(x,y,z,ry){
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;room.add(g);
  box(g,'epi poster frame',0,0,-.012,1.06,1.31,.02,M.dark);
  const poster=new THREE.Mesh(new THREE.PlaneGeometry(.98,1.225),new THREE.MeshStandardMaterial({map:epiTexture,roughness:.55,metalness:0}));poster.name='epi poster';poster.position.z=.001;g.add(poster);
  return g;
}
const leftPoster=addEpiPoster(-8.84,2.15,-1.55,Math.PI/2);   // parede esquerda, ao lado do torno
addEpiPoster(8.84,2.15,-1.5,-Math.PI/2);                      // parede direita, ao lado da fresadora
// EPIs de verdade pendurados embaixo da placa da esquerda (decoração 3D).
{
  const rack=new THREE.Group();rack.position.set(-8.78,1.25,-1.55);rack.rotation.y=Math.PI/2;rack.scale.setScalar(1.7);room.add(rack);
  box(rack,'epi hook board',0,0,-.01,.9,.16,.03,M.wallPanel);
  for(const x of [-.22,.22])cylinder(rack,'epi hook',x,.02,.05,.012,.012,.1,M.steel,'z',10);
  // óculos de segurança
  const goggles=new THREE.Group();goggles.position.set(-.22,-.04,.1);rack.add(goggles);
  const lensMat=new THREE.MeshPhysicalMaterial({color:'#bfe8ff',transparent:true,opacity:.45,roughness:.05,clearcoat:1});
  for(const s of [-1,1]){const l=new THREE.Mesh(new THREE.SphereGeometry(.05,20,12,0,Math.PI*2,0,Math.PI/2),lensMat);l.rotation.x=Math.PI/2;l.scale.set(1,.55,.8);l.position.set(s*.052,0,0);goggles.add(l);}
  box(goggles,'goggles frame',0,.028,.0,.21,.014,.03,M.yellow);box(goggles,'goggles bridge',0,0,.006,.03,.03,.02,M.yellow);
  const strap=new THREE.Mesh(new THREE.TorusGeometry(.11,.006,6,30,Math.PI),M.black);strap.rotation.x=-Math.PI/2;strap.position.z=-.01;goggles.add(strap);
  // abafador (protetor auricular tipo concha)
  const muff=new THREE.Group();muff.position.set(.22,-.06,.1);rack.add(muff);
  const band=new THREE.Mesh(new THREE.TorusGeometry(.085,.012,8,30,Math.PI),M.red);band.position.y=.0;muff.add(band);
  for(const s of [-1,1]){const cup=cylinder(muff,'ear cup',s*.088,-.03,0,.042,.046,.05,M.red,'x',24);cylinder(muff,'ear cushion',s*.062,-.03,0,.04,.04,.012,M.black,'x',24);}
  const tag=textPlaque(rack,'OCULOS / ABAFADOR',0,-.19,.0,'#1d5fae',0);tag.scale.set(.3,.3,.3);
}


// ===========================================================================
// v10: janelas discretas. Dicas aparecem por 5 s (ou enquanto você mira no objeto)
// e ficam embaixo, perto da mochila, sem tampar o meio da tela.
// ===========================================================================
const SOFT_MS=5000;
const promptGov={key:'',since:0,aiming:false,frame:0};
const aimRaycaster=new THREE.Raycaster();aimRaycaster.far=4.2;
function promptAimTargets(){
  const a=currentWorldAction,kbd=$('#pickupPrompt kbd')?.textContent;
  if(a){
    if(a.kind==='pickup'||a.kind==='saleItem')return [a.obj];
    if(a.kind==='sale')return saleCounterTargets;
    if(a.kind==='machineLoad')return [a.station==='mill'?millRoot:latheRoot];
    if(a.kind==='toolInstall')return [toolInfoByKey(a.key)?.machine==='mill'?millRoot:latheRoot];
    return null;
  }
  if(kbd==='X'||kbd==='M')return [latheRoot];
  return null;
}
let aimedPickup=null;
function pickupRootOf(o){while(o&&!o.userData.pickup)o=o.parent;return o;}
function applyAimedPickup(){
  // O objeto que você está mirando vira o alvo do E (pegar / vender), mesmo que não seja o mais próximo.
  if(!walkControls.isLocked||mode!=='walk'||renderer.xr.isPresenting)return;
  if(promptGov.frame%3===0){aimRaycaster.setFromCamera(new THREE.Vector2(0,0),camera);const hit=aimRaycaster.intersectObjects(pickupObjects,true)[0];aimedPickup=hit&&hit.distance<3.2?pickupRootOf(hit.object):null;}
  if(!aimedPickup||!pickupObjects.includes(aimedPickup))return;
  const item=aimedPickup.userData.inventoryPayload;if(!item)return;
  const sell=Boolean(aimedPickup.userData.sellableOutput);
  currentWorldAction={kind:sell?'saleItem':'pickup',obj:aimedPickup,distance:0};
  const prompt=$('#pickupPrompt');prompt.classList.remove('hidden');prompt.querySelector('kbd').textContent='E';
  $('#pickupPromptTitle').textContent=`${sell?'Vender':'Pegar'}: ${item.name}`;
  $('#pickupPromptDetail').textContent=sell?`E vende ${moneyFormat.format(item.value)} • F guarda na mochila`:`Adicionar à mochila • ${moneyFormat.format(item.value)}`;
}
function updatePromptVisibility(){
  const prompt=$('#pickupPrompt');if(!prompt)return;
  applyAimedPickup();
  if(prompt.classList.contains('hidden')){promptGov.key='';promptGov.aiming=false;prompt.classList.remove('soft-hidden');return;}
  const key=`${prompt.querySelector('kbd')?.textContent}|${$('#pickupPromptTitle').textContent}`;
  const now=performance.now();if(key!==promptGov.key){promptGov.key=key;promptGov.since=now;}
  if((promptGov.frame++)%3===0){
    const targets=promptAimTargets();promptGov.aiming=Boolean(aimedPickup&&currentWorldAction?.obj===aimedPickup);
    if(!promptGov.aiming&&targets&&walkControls.isLocked){aimRaycaster.setFromCamera(new THREE.Vector2(0,0),camera);promptGov.aiming=aimRaycaster.intersectObjects(targets.filter(Boolean),true).length>0;}
  }
  prompt.classList.toggle('soft-hidden',!(now-promptGov.since<SOFT_MS||promptGov.aiming));
}
const baseGameplayV10=updateGameplayWorld;
updateGameplayWorld=function(dt){baseGameplayV10(dt);updatePromptVisibility();};

// Janelinha da ferramenta: fecha sozinha se o mouse não estiver em cima dela.
let toolWinTimer=0;
function armToolWindowTimer(ms=SOFT_MS+1000){clearTimeout(toolWinTimer);toolWinTimer=setTimeout(()=>{if(!$('#toolWindow').matches(':hover'))closeToolWindow();},ms);}
const baseOpenToolWindowV10=openToolWindow;
openToolWindow=function(key){baseOpenToolWindowV10(key);armToolWindowTimer();};
$('#toolWindow').addEventListener('mouseenter',()=>clearTimeout(toolWinTimer));
$('#toolWindow').addEventListener('mouseleave',()=>armToolWindowTimer(2500));
for(const id of ['#toolWinPrev','#toolWinNext'])$(id).addEventListener('click',()=>armToolWindowTimer());

// Faixas fixas (dicas de teclas, estação em foco, botões de vista): aparecem por 5 s e somem.
// H mostra de novo; passar o mouse por cima (fora do modo mira) também mostra.
const softPanels=['.body-hint','.move-hint','.scene-label'].map(sel=>$(sel)).filter(Boolean); // saldo (faixa de cima) fica sempre visível
const softTimers=new Map();
function flashPanel(el,ms=SOFT_MS){el.classList.remove('soft-hidden');clearTimeout(softTimers.get(el));softTimers.set(el,setTimeout(()=>el.classList.add('soft-hidden'),ms));}
function flashAllPanels(){softPanels.forEach(el=>flashPanel(el));}
flashAllPanels();
$('#enterBtn').addEventListener('click',flashAllPanels);
document.addEventListener('keydown',e=>{if(e.code==='KeyH'&&!e.repeat&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))flashAllPanels();});
viewport.addEventListener('mousemove',e=>{
  if(walkControls.isLocked)return;const r=viewport.getBoundingClientRect(),y=e.clientY-r.top,h=r.height;
  if(y>h-90)['.body-hint','.move-hint','.scene-label'].forEach(s=>{const el=$(s);if(el)flashPanel(el,2500);});
});
// A etiqueta da estação aparece de novo por 5 s quando muda (ex.: ao chegar perto de outra máquina).
{const label=$('.scene-label');if(label)new MutationObserver(()=>flashPanel(label)).observe(label,{subtree:true,childList:true,characterData:true});}


// ===========================================================================
// v11: EPIs para pegar e equipar no início (na mesa de EPI da entrada),
// ferramenta visível na mão, Esc pausa com "Redefinir do zero", sem a lâmpada vermelha do painel.
// ===========================================================================

// 1) Tira a bolinha vermelha (lâmpada de status) do canto do painel da fresadora.
if(machinePowerLights.mill){machinePowerLights.mill.visible=false;}

// 2) EPIs: óculos de proteção e protetor auricular (abafador) na mesa de EPI da entrada.
const epi={goggles:false,muffs:false};
function epiReady(){return epi.goggles&&epi.muffs;}
function makeGogglesModel(){
  const g=new THREE.Group();const lensMat=new THREE.MeshPhysicalMaterial({color:'#bfe8ff',transparent:true,opacity:.5,roughness:.05,clearcoat:1});
  for(const s of [-1,1]){const l=new THREE.Mesh(new THREE.SphereGeometry(.05,20,12,0,Math.PI*2,0,Math.PI/2),lensMat);l.rotation.x=Math.PI/2;l.scale.set(1,.55,.8);l.position.set(s*.052,0,0);g.add(l);}
  box(g,'goggles frame',0,.028,0,.21,.014,.03,M.yellow);box(g,'goggles bridge',0,0,.006,.03,.03,.02,M.yellow);
  const strap=new THREE.Mesh(new THREE.TorusGeometry(.11,.006,6,30,Math.PI),M.black);strap.rotation.x=-Math.PI/2;strap.position.z=-.01;g.add(strap);
  return g;
}
function makeMuffsModel(){
  const g=new THREE.Group();const band=new THREE.Mesh(new THREE.TorusGeometry(.085,.012,8,30,Math.PI),M.red);g.add(band);
  for(const s of [-1,1]){cylinder(g,'ear cup',s*.088,-.03,0,.042,.046,.05,M.red,'x',24);cylinder(g,'ear cushion',s*.062,-.03,0,.04,.04,.012,M.black,'x',24);}
  return g;
}
const epiSources=[];
function addEpiSource(kind,model,parent,x,y,z,ry=0,scale=1){
  model.position.set(x,y,z);model.rotation.y=ry;model.scale.setScalar(scale);parent.add(model);
  const label=kind==='goggles'?'Óculos de proteção (EPI)':'Protetor auricular (EPI)';
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;if(o.material===M.steelDark)o.material=M.steel;registerMachineControl(o,'mill',kind==='goggles'?'epiGoggles':'epiMuffs',label);}});
  epiSources.push({kind,model});return model;
}
// bandeja na mesa de EPI da entrada (lado esquerdo do painel)
box(millRoot,'epi tray',-1.62,1.815,.28,.56,.025,.2,M.steelDark);
box(millRoot,'epi tray lip',-1.62,1.84,.375,.56,.03,.012,M.yellow);
{const tag=textPlaque(millRoot,'EPI',-1.62,1.91,.40,'#efad42',0);tag.scale.set(.12,.12,.12);}
addEpiSource('goggles',makeGogglesModel(),millRoot,-1.75,1.855,.28,0,1);
addEpiSource('muffs',makeMuffsModel(),millRoot,-1.48,1.895,.28,0,1);
// marcador piscando em cima dos EPIs até você equipar
const epiMarker=new THREE.Mesh(new THREE.ConeGeometry(.045,.1,16),new THREE.MeshBasicMaterial({color:'#29e0ff',transparent:true,opacity:.85}));
epiMarker.rotation.x=Math.PI;epiMarker.position.set(-1.62,2.12,.28);millRoot.add(epiMarker);
// os EPIs pendurados na parede da esquerda também podem ser pegos
for(const o of room.children){if(o.isGroup&&o.children.some(c=>c.name==='epi hook board')){
  for(const c of [...o.children]){if(!c.isGroup)continue;const isGoggles=c.children.some(m=>m.name==='goggles frame');const isMuffs=c.children.some(m=>m.name==='ear cup');
    if(isGoggles||isMuffs){const kind=isGoggles?'goggles':'muffs';c.traverse(m=>{if(m.isMesh)registerMachineControl(m,'mill',isGoggles?'epiGoggles':'epiMuffs',isGoggles?'Óculos de proteção (EPI)':'Protetor auricular (EPI)');});epiSources.push({kind,model:c});}}
}}
function syncEpiUI(){
  const g=$('#epiGogglesState'),m=$('#epiMuffsState');
  g.textContent=epi.goggles?'ÓCULOS ✓':'ÓCULOS ✗';g.className=epi.goggles?'on':'off';
  m.textContent=epi.muffs?'PROTETOR AURICULAR ✓':'PROTETOR AURICULAR ✗';m.className=epi.muffs?'on':'off';
  epiMarker.visible=!epiReady();
}
function equipEpi(kind){
  if(epi[kind]){notify(kind==='goggles'?'Você já está com os óculos de proteção.':'Você já está com o protetor auricular.');return;}
  epi[kind]=true;
  // o item some do lugar de onde foi pego (o mais próximo da mira)
  const src=epiSources.find(s=>s.kind===kind&&s.model.visible&&hoverControlHit&&(()=>{let n=hoverControlHit.object;while(n){if(n===s.model)return true;n=n.parent;}return false;})())||epiSources.find(s=>s.kind===kind&&s.model.visible);
  if(src){src.model.visible=false;src.model.traverse(o=>{const i=machineControlTargets.indexOf(o);if(i>=0)machineControlTargets.splice(i,1);});}
  setHovered([]);hoverControlHit=null;syncEpiUI();
  notify(epiReady()?'EPIs equipados: óculos e protetor auricular. Pode ligar as máquinas.':(kind==='goggles'?'Óculos de proteção equipados. Falta o protetor auricular.':'Protetor auricular equipado. Faltam os óculos de proteção.'));
}
HIGHLIGHT_ACTIONS.add('epiGoggles');HIGHLIGHT_ACTIONS.add('epiMuffs');
const baseActivateV11=activateMachineControl;
activateMachineControl=function(station,action,target=null){
  if(action==='epiGoggles'){equipEpi('goggles');return;}
  if(action==='epiMuffs'){equipEpi('muffs');return;}
  return baseActivateV11(station,action,target);
};
window.addEventListener('keydown',e=>{
  if(e.code!=='KeyE'||e.repeat||!walkControls.isLocked||renderer.xr.isPresenting)return;
  const act=hoverControlHit?.object.userData.machineControl?.action;
  if((act==='epiGoggles'||act==='epiMuffs')&&hoverControlHit.distance<3.4&&machineControlTargets.includes(hoverControlHit.object)){e.preventDefault();e.stopPropagation();equipEpi(act==='epiGoggles'?'goggles':'muffs');}
},true);
// EPI obrigatório para ligar as máquinas (manual e automático).
function epiBlock(){if(epiReady()||renderer.xr.isPresenting)return false;$('#epiChip').classList.remove('pulse');void $('#epiChip').offsetWidth;$('#epiChip').classList.add('pulse');notify('Equipe os EPIs antes de ligar: óculos e protetor auricular ficam na mesa de EPI da entrada (mire e aperte E).','error');return true;}
const basePowerV11=powerMachine;
powerMachine=function(station){if(!activeMachines[station].powered&&epiBlock())return;return basePowerV11(station);};
const baseStartAutoForV11=startAutomaticFor;
startAutomaticFor=function(station,material,quantity){if(!epiReady()&&!renderer.xr.isPresenting){epiBlock();setAutomaticStatus('Equipe os EPIs (na mesa de EPI da entrada) para iniciar.','error',station);return false;}return baseStartAutoForV11(station,material,quantity);};
$('#enterBtn').addEventListener('click',()=>{if(!epiReady())setTimeout(()=>notify('Primeiro passo: pegue e equipe os EPIs na mesa de EPI da entrada (seta azul). G tira e coloca.','silent'),600);});
syncEpiUI();

// Lentes dos óculos: moldura bem leve nas bordas da tela (sem atrapalhar a visão).
const baseMechanismsV11=updateMechanisms;
updateMechanisms=function(dt){
  baseMechanismsV11(dt);
  toolHand.visible=Boolean(heldKey)&&walkControls.isLocked&&!thirdPerson&&mode==='walk'&&!renderer.xr.isPresenting;
  $('#gogglesOverlay').classList.toggle('hidden',!(epi.goggles&&walkControls.isLocked&&!thirdPerson&&mode==='walk'&&!renderer.xr.isPresenting));
  if(epiMarker.visible){epiMarker.position.y=2.12+Math.sin(performance.now()*.005)*.03;epiMarker.rotation.y+=dt*2;}
};
// 3) Ferramenta na mão: a ferramenta selecionada aparece pequena na luva direita.
// A câmera precisa estar na cena para desenhar o que está preso nela (mão com a ferramenta).
if(!camera.parent)scene.add(camera);
// As luvas grandes antigas ficam escondidas; só aparece uma luva pequena com a ferramenta, no canto.
playerHands.traverse(o=>{if(o.isMesh)o.visible=false;});
const toolHand=new THREE.Group();toolHand.name='tool hand';toolHand.position.set(.34,-.27,-.62);toolHand.scale.setScalar(.72);toolHand.visible=false;camera.add(toolHand);
function onTopOfScene(root){root.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.depthTest=false;o.material.depthWrite=false;o.renderOrder=999;o.castShadow=false;o.receiveShadow=false;}});}
{const palm=new THREE.Mesh(new THREE.BoxGeometry(.075,.05,.08),gloveMat);palm.rotation.z=.3;toolHand.add(palm);
 const thumb=new THREE.Mesh(new THREE.BoxGeometry(.03,.055,.035),gloveGrip);thumb.position.set(-.04,.01,-.01);thumb.rotation.z=.6;toolHand.add(thumb);
 const cuff=new THREE.Mesh(new THREE.BoxGeometry(.08,.06,.09),gloveDark);cuff.position.set(.03,-.045,.04);cuff.rotation.z=.3;toolHand.add(cuff);}
const heldTool=new THREE.Group();heldTool.name='held tool';heldTool.position.set(0,.045,-.02);heldTool.rotation.set(-.9,.3,-.2);toolHand.add(heldTool);
onTopOfScene(toolHand);
const heldToolAvatar=new THREE.Group();heldToolAvatar.name='held tool avatar';heldToolAvatar.position.set(0,-.36,.06);heldToolAvatar.rotation.set(-1.2,0,0);avatarArmR.add(heldToolAvatar);
let heldKey=null;
function fitToolModel(key,size){const m=makeToolModel(key);m.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});const b=new THREE.Box3().setFromObject(m),sz=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());m.position.sub(c);const h=new THREE.Group();h.add(m);h.scale.setScalar(size/Math.max(sz.x,sz.y,sz.z));return h;}
function syncHeldTool(){
  const sel=inventoryItems.find(x=>x.id===selectedInventoryId);const key=sel?.kind==='tool'?sel.toolKey:null;
  if(key===heldKey)return;heldKey=key;heldTool.clear();heldToolAvatar.clear();
  if(key){const fp=fitToolModel(key,.12);onTopOfScene(fp);heldTool.add(fp);heldToolAvatar.add(fitToolModel(key,.2));}
}
const baseRenderInventoryV11=renderInventory;
renderInventory=function(){baseRenderInventoryV11();syncHeldTool();};

// 4) Esc: pausa com "Continuar" e "Redefinir do zero".
let resetArmed=false,resetTimer=0;
function showPause(){if(!enteredOnce||renderer.xr.isPresenting||!$('#toolWindow').classList.contains('hidden'))return;$('#pauseMenu').classList.remove('hidden');$('#enterBtn').classList.add('hidden');}
function hidePause(){$('#pauseMenu').classList.add('hidden');resetArmed=false;$('#resetSimBtn').classList.remove('confirm');$('#resetSimBtn').textContent='↺ Redefinir do zero';}
walkControls.addEventListener('unlock',()=>{if(mode==='walk')setTimeout(showPause,30);});
walkControls.addEventListener('lock',hidePause);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mode==='inspect'&&!e.repeat){if($('#pauseMenu').classList.contains('hidden')){enteredOnce=true;showPause();}else hidePause();}});
$('#resumeBtn').addEventListener('click',()=>{hidePause();if(mode==='walk'&&!renderer.xr.isPresenting)walkControls.lock();});
function resetSimulation(){
  // Apaga tudo o que foi salvo (saldo, mochila, progresso) e recomeça; mantém só a preferência de sombra 3D.
  try{for(const k of Object.keys(localStorage))if(k.startsWith('oficina3d')&&k!==AO_KEY)localStorage.removeItem(k);}catch(_){}
  location.reload();
}
$('#resetSimBtn').addEventListener('click',()=>{
  if(!resetArmed){resetArmed=true;$('#resetSimBtn').classList.add('confirm');$('#resetSimBtn').textContent='Clique de novo para confirmar';clearTimeout(resetTimer);resetTimer=setTimeout(()=>{resetArmed=false;$('#resetSimBtn').classList.remove('confirm');$('#resetSimBtn').textContent='↺ Redefinir do zero';},3500);return;}
  resetSimulation();
});


// ===========================================================================
// v12: mesa de EPI na entrada (G tira/coloca), XYZ visível em cima do painel, botões maiores,
// item na mão, boneco detalhado com EPI, vista estilo Minecraft (V/F5), sem VR, sem biblioteca
// visual, sem cerca amarela e menos lag.
// ===========================================================================

// --- 1) Limpeza: botão VR, biblioteca visual, cerca amarela, EPI do painel ---
vrButton.remove();
{const lib=document.querySelector('.asset-library');if(lib){lib.hidden=true;lib.style.display='none';}}
removeNamed(room,['safety post','safety top rail','safety lower rail']);
for(let i=boxColliders.length-1;i>=0;i--)if(boxColliders[i].name==='grade de proteção')boxColliders.splice(i,1);
removeNamed(millRoot,['epi tray','epi tray lip']);
for(const o of [...millRoot.children])if(o.isMesh&&o.geometry?.type==='PlaneGeometry'&&Math.abs(o.position.x+1.62)<.02&&Math.abs(o.position.y-1.91)<.02)millRoot.remove(o);
millRoot.remove(epiMarker);
function unregisterTree(root){root.traverse(o=>{const i=machineControlTargets.indexOf(o);if(i>=0)machineControlTargets.splice(i,1);});}
for(let i=epiSources.length-1;i>=0;i--){const s=epiSources[i];unregisterTree(s.model);if(s.model.parent===millRoot)millRoot.remove(s.model);epiSources.splice(i,1);} // os da parede viram só enfeite

// --- 2) Mesa pequena de EPI na entrada ---
const epiOwned={goggles:false,muffs:false};
const epiTablePos=new THREE.Vector3(-1.25,0,4.7);
{
  const t=new THREE.Group();t.name='epi start table';t.position.copy(epiTablePos);room.add(t);
  roundedBox(t,'epi table top',0,.84,0,.76,.04,.48,M.steel,.01);
  box(t,'epi table apron',0,.78,0,.68,.08,.40,M.blue);
  for(const x of [-.33,.33])for(const z of [-.19,.19])box(t,'epi table leg',x,.4,z,.04,.8,.04,M.steelDark);
  box(t,'epi table shelf',0,.25,0,.66,.02,.38,M.steelDark);
  for(const x of [-.36,.36])box(t,'epi sign post',x,1.08,-.22,.025,.48,.025,M.steelDark);
  const sign=textPlaque(t,'EPI OBRIGATORIO',0,1.22,-.22,'#efad42',0);sign.scale.set(.42,.42,.42);
  box(t,'epi table mat',0,.863,.02,.66,.006,.36,M.rubber,{cast:false});
  addEpiSource('goggles',makeGogglesModel(),t,-.17,.895,.04,0,1.05);
  addEpiSource('muffs',makeMuffsModel(),t,.18,.94,.02,0,1.05);
  boxColliders.push({name:'mesa de EPI',minX:epiTablePos.x-.4,maxX:epiTablePos.x+.4,minZ:epiTablePos.z-.27,maxZ:epiTablePos.z+.27});
  const shadowMat=room.children.find(o=>o.name==='contact shadow')?.material;
  if(shadowMat){const p=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.8),shadowMat);p.name='contact shadow';p.rotation.x=-Math.PI/2;p.position.set(epiTablePos.x,.021,epiTablePos.z);room.add(p);}
}
const epiTableMarker=new THREE.Mesh(new THREE.ConeGeometry(.045,.1,16),new THREE.MeshBasicMaterial({color:'#29e0ff',transparent:true,opacity:.85}));
epiTableMarker.rotation.x=Math.PI;epiTableMarker.position.set(epiTablePos.x,1.2,epiTablePos.z+.02);scene.add(epiTableMarker);
const baseEquipEpiV12=equipEpi;
equipEpi=function(kind){baseEquipEpiV12(kind);if(epi[kind])epiOwned[kind]=true;syncEpiUI();};
const baseSyncEpiUIV12=syncEpiUI;
syncEpiUI=function(){
  baseSyncEpiUIV12();
  const g=$('#epiGogglesState'),m=$('#epiMuffsState');
  if(!epi.goggles&&epiOwned.goggles){g.textContent='ÓCULOS – G coloca';g.className='off';}
  if(!epi.muffs&&epiOwned.muffs){m.textContent='PROTETOR – G coloca';m.className='off';}
  if(typeof avatarEpi!=='undefined'){avatarEpi.goggles.visible=epi.goggles;avatarEpi.muffs.visible=epi.muffs;}
  epiTableMarker.visible=!(epiOwned.goggles&&epiOwned.muffs);
};
function toggleWearEpi(){
  if(!epiOwned.goggles&&!epiOwned.muffs){notify('Pegue os EPIs na mesa da entrada primeiro (mire e aperte E).','error');return;}
  const anyWorn=epi.goggles||epi.muffs;
  for(const k of ['goggles','muffs'])if(epiOwned[k])epi[k]=!anyWorn;
  syncEpiUI();
  const running=['mill','lathe'].some(st=>activeMachines[st].powered);
  notify(anyWorn?(running?'EPIs retirados. Atenção: máquina ligada sem EPI!':'EPIs retirados (G coloca de novo).'):'EPIs colocados.',anyWorn&&running?'error':'ok');
}
document.addEventListener('keydown',e=>{if(e.code==='KeyG'&&!e.repeat&&!renderer.xr.isPresenting&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))toggleWearEpi();});

// --- 3) Painel da fresadora: XYZ (DRO) em cima do painel, visor verde maior, botões maiores com nome ---
{
  removeNamed(millRoot,['DRO arm']);
  const housing=millRoot.getObjectByName('DRO housing');if(housing)housing.position.set(-1.47,1.95,.29);
  const scr=millRoot.children.find(o=>o.isMesh&&o.geometry?.type==='PlaneGeometry'&&Math.abs(o.position.x+1.0)<.02&&Math.abs(o.position.y-1.865)<.02);
  if(scr)scr.position.set(-1.47,1.955,.327);
  box(millRoot,'DRO stand',-1.47,1.81,.29,.22,.02,.1,M.steelDark);
  const disp=machineDisplays.mill?.mesh;if(disp){disp.position.set(-1.47,1.64,.378);disp.scale.set(1.5,1.5,1);}
  const glass=millRoot.getObjectByName('console display');if(glass){glass.position.y=1.64;glass.scale.set(1.5,1.5,1);}
  const btns=millRoot.children.filter(o=>o.name==='mill console button').sort((a,b)=>b.position.y-a.position.y);
  const labels=['LIGA / DESLIGA','RPM -','USINAR'];
  btns.forEach((b,i)=>{b.position.set(-1.68,1.43-i*.12,b.position.z);b.scale.set(1.4,1,1.4);
    const tag=textPlaque(millRoot,labels[i],-1.42,1.43-i*.12,.392,'#d8e3e8',0);tag.scale.set(.15,.15,.15);});
}

// --- 4) Item na mão (qualquer item selecionado, não só ferramentas) ---
function makeHeldItemModel(item){
  if(item.kind==='tool')return makeToolModel(item.toolKey);
  const mat=stockMaterials[item.material]||M.steelStock;const g=new THREE.Group();
  if(item.kind==='bar'){cylinder(g,'held cylinder',0,0,0,.075,.075,.6,mat,'x',24);for(const dx of [-.3,.3])cylinder(g,'held cap',dx,0,0,.077,.077,.02,M.steelDark,'x',20);}
  else if(item.kind==='finishedLathe'){for(const dx of [-.22,.22])cylinder(g,'held shaft end',dx,0,0,.075,.075,.18,mat,'x',24);cylinder(g,'held shaft neck',0,0,0,.052,.052,.27,mat,'x',24);}
  else if(item.kind==='finishedMill'){box(g,'held block',0,0,0,.34,.2,.28,mat);for(let i=0;i<3;i++)box(g,'held groove',-.1+i*.1,.101,0,.024,.006,.22,M.dark);}
  else roundedBox(g,'held block',0,0,0,.34,.2,.28,mat,.012);
  return g;
}
function fitModel(m,size){m.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});const b=new THREE.Box3().setFromObject(m),sz=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());m.position.sub(c);const h=new THREE.Group();h.add(m);h.scale.setScalar(size/Math.max(sz.x,sz.y,sz.z));return h;}
syncHeldTool=function(){
  const sel=inventoryItems.find(x=>x.id===selectedInventoryId);const key=sel?`${sel.id}`:null;
  if(key===heldKey)return;heldKey=key;heldTool.clear();heldToolAvatar.clear();
  if(sel){const fp=fitModel(makeHeldItemModel(sel),.12);onTopOfScene(fp);heldTool.add(fp);heldToolAvatar.add(fitModel(makeHeldItemModel(sel),sel.kind==='tool'?.2:.24));}
};

// --- 5) Boneco detalhado (macacão, colete refletivo, capacete, luvas, botas) com EPI visível ---
const EMPTY_GEO=new THREE.BufferGeometry();EMPTY_GEO.setAttribute('position',new THREE.BufferAttribute(new Float32Array(0),3));
function ghost(m){if(m&&m.isMesh){m.geometry=EMPTY_GEO;m.castShadow=false;}}
[avatarTorso,vestStripe,avatarVestBand,...avatarVestStraps,avatarBackpack,backpackFlap,avatarHead,avatarEyeL,avatarEyeR,avatarNose,hardHat,hatBrim,shoeL,shoeR,avatarBelt].forEach(ghost);
for(const pv of [avatarArmL,avatarArmR,avatarLegL,avatarLegR])for(const c of [...pv.children])if(c.isMesh)ghost(c);
const avM={
  suit:new THREE.MeshPhysicalMaterial({color:'#23445d',roughness:.82,metalness:0,sheen:.6,sheenColor:new THREE.Color('#4d7a96')}),
  pants:new THREE.MeshPhysicalMaterial({color:'#1d2a35',roughness:.85,metalness:0,sheen:.5,sheenColor:new THREE.Color('#3b5468')}),
  vest:new THREE.MeshStandardMaterial({color:'#f39a2b',roughness:.6,emissive:'#5a2a00',emissiveIntensity:.25}),
  reflect:new THREE.MeshStandardMaterial({color:'#e9eef0',roughness:.25,metalness:.6}),
  skin:new THREE.MeshStandardMaterial({color:'#c79a7c',roughness:.7}),
  hair:new THREE.MeshStandardMaterial({color:'#2b1d14',roughness:.9}),
  eyeW:new THREE.MeshStandardMaterial({color:'#f4f2ee',roughness:.4}),
  eyeP:new THREE.MeshStandardMaterial({color:'#1c2630',roughness:.3}),
  lip:new THREE.MeshStandardMaterial({color:'#8c4a42',roughness:.6}),
  helmet:new THREE.MeshPhysicalMaterial({color:'#f2b632',roughness:.35,clearcoat:.8,clearcoatRoughness:.2}),
  glove:new THREE.MeshStandardMaterial({color:'#7f8e96',roughness:.75}),
  gloveCuff:new THREE.MeshStandardMaterial({color:'#e5ad40',roughness:.6}),
  boot:new THREE.MeshStandardMaterial({color:'#3a2a1e',roughness:.75}),
  sole:new THREE.MeshStandardMaterial({color:'#111518',roughness:.9}),
  pad:new THREE.MeshStandardMaterial({color:'#20262b',roughness:.6}),
};
function avMesh(parent,geo,mat,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
// tronco (macacão) com perfil torneado, gola, ombros, zíper, bolsos e colete refletivo
avMesh(avatarTorso,new THREE.LatheGeometry([[0,-.30],[.165,-.30],[.176,-.22],[.162,-.10],[.172,0],[.196,.12],[.2,.22],[.186,.30],[.13,.355],[.07,.372],[0,.372]].map(([r,h])=>new THREE.Vector2(r,h)),32),avM.suit,0,0,0,1,1,.72);
avMesh(avatarTorso,new THREE.LatheGeometry([[.17,-.24],[.182,-.22],[.17,-.1],[.18,0],[.204,.12],[.208,.22],[.19,.29],[.15,.31]].map(([r,h])=>new THREE.Vector2(r,h)),32,0,Math.PI*1.8),avM.vest,0,0,0,1,1,.75).rotation.y=Math.PI*1.1;
for(const [y,r] of [[-.13,.176],[.07,.2]])avMesh(avatarTorso,new THREE.TorusGeometry(r,.012,6,40),avM.reflect,0,y,0,1,1,.76).rotation.x=Math.PI/2;
avMesh(avatarTorso,new THREE.TorusGeometry(.075,.022,8,24),avM.suit,0,.35,0,1,1,.9).rotation.x=Math.PI/2;
for(const s of [-1,1])avMesh(avatarTorso,new THREE.SphereGeometry(.08,16,12),avM.suit,s*.195,.26,0,1,.85,.9);
box(avatarTorso,'zipper',0,.05,.147,.012,.5,.006,M.dark,{cast:false});
box(avatarTorso,'chest pocket',-.08,.16,.151,.07,.07,.008,avM.suit,{cast:false});
box(avatarTorso,'logo patch',.08,.18,.152,.06,.03,.004,M.cyan,{cast:false});
box(avatarTorso,'name tag',.08,.13,.152,.06,.016,.004,M.ivory2,{cast:false});
// cabeça: rosto com olhos, sobrancelhas, nariz, boca, orelhas; capacete com aba e logotipo
const headG=avatarHead;
avMesh(headG,new THREE.SphereGeometry(.13,28,20),avM.skin,0,0,0,1,1.1,1.05);
avMesh(headG,new THREE.SphereGeometry(.1,20,14),avM.skin,0,-.065,.03,1,.78,1);
for(const s of [-1,1]){avMesh(headG,new THREE.SphereGeometry(.03,12,10),avM.skin,s*.128,-.005,0,.5,1,.8);
  avMesh(headG,new THREE.SphereGeometry(.021,12,10),avM.eyeW,s*.045,.02,.112,1,.8,.6);avMesh(headG,new THREE.SphereGeometry(.011,10,8),avM.eyeP,s*.045,.02,.126);
  box(headG,'eyebrow',s*.046,.055,.122,.045,.01,.01,avM.hair,{cast:false});box(headG,'sideburn',s*.118,.02,.03,.014,.05,.03,avM.hair,{cast:false});}
avMesh(headG,new THREE.ConeGeometry(.02,.05,10),avM.skin,0,-.01,.135,1,1,1).rotation.x=Math.PI/2.4;
box(headG,'mouth',0,-.06,.118,.05,.009,.01,avM.lip,{cast:false});
avMesh(headG,new THREE.SphereGeometry(.135,24,12,0,Math.PI*2,0,Math.PI/2),avM.hair,0,.02,-.01,1,.9,1.05);
const helmet=new THREE.Group();helmet.position.set(0,.045,0);headG.add(helmet);
avMesh(helmet,new THREE.SphereGeometry(.155,28,14,0,Math.PI*2,0,Math.PI/2),avM.helmet,0,0,0,1,.85,1.08);
avMesh(helmet,new THREE.CylinderGeometry(.172,.175,.014,32),avM.helmet,0,.004,.012,1,1,1.12);
avMesh(helmet,new THREE.BoxGeometry(.03,.02,.26),avM.helmet,0,.13,0);
avMesh(helmet,new THREE.CircleGeometry(.03,20),M.cyan,0,.07,.164).rotation.x=-.45;
// EPI no boneco: óculos e protetor auricular (aparecem quando equipados)
const avatarEpi={goggles:new THREE.Group(),muffs:new THREE.Group()};
avatarEpi.goggles.position.set(0,.02,.118);headG.add(avatarEpi.goggles);
{const lensMat=new THREE.MeshPhysicalMaterial({color:'#bfe8ff',transparent:true,opacity:.55,roughness:.05,clearcoat:1});
 for(const s of [-1,1]){const l=avMesh(avatarEpi.goggles,new THREE.SphereGeometry(.036,16,10,0,Math.PI*2,0,Math.PI/2),lensMat,s*.042,0,0,1,.6,.7);l.rotation.x=Math.PI/2;}
 box(avatarEpi.goggles,'goggle frame',0,.02,0,.17,.012,.02,M.yellow,{cast:false});
 const strap=avMesh(avatarEpi.goggles,new THREE.TorusGeometry(.135,.006,6,32,Math.PI),M.black,0,0,-.11);strap.rotation.x=-Math.PI/2;strap.rotation.z=Math.PI;}
headG.add(avatarEpi.muffs);
{const band=avMesh(avatarEpi.muffs,new THREE.TorusGeometry(.17,.013,8,32,Math.PI),M.red,0,0,0);
 for(const s of [-1,1]){const cup=avMesh(avatarEpi.muffs,new THREE.CylinderGeometry(.045,.05,.05,24),M.red,s*.158,-.005,0);cup.rotation.z=Math.PI/2;}}
// braços: manga, cotovelo, antebraço levemente dobrado, punho e luva com dedos
const avatarHandAnchor={};
for(const [pv,side] of [[avatarArmL,-1],[avatarArmR,1]]){
  avMesh(pv,new THREE.CapsuleGeometry(.056,.18,4,12),avM.suit,0,-.13,0);
  avMesh(pv,new THREE.SphereGeometry(.054,14,10),avM.suit,0,-.26,0);
  const fore=new THREE.Group();fore.position.set(0,-.26,0);fore.rotation.x=-.35;pv.add(fore);
  avMesh(fore,new THREE.CapsuleGeometry(.048,.13,4,12),avM.suit,0,-.1,0);
  avMesh(fore,new THREE.CylinderGeometry(.052,.05,.05,16),avM.gloveCuff,0,-.19,0);
  avMesh(fore,new THREE.BoxGeometry(.07,.085,.045),avM.glove,0,-.25,0);
  for(let f=0;f<4;f++)avMesh(fore,new THREE.BoxGeometry(.015,.045,.02),avM.glove,-.025+f*.017,-.31,.005);
  avMesh(fore,new THREE.BoxGeometry(.02,.045,.02),avM.glove,-side*.042,-.245,.02).rotation.z=side*.6;
  const anchor=new THREE.Group();anchor.position.set(0,-.29,.05);fore.add(anchor);avatarHandAnchor[side]=anchor;
}
avatarHandAnchor[1].add(heldToolAvatar);heldToolAvatar.position.set(0,0,.03);heldToolAvatar.rotation.set(-1.2,0,0);
// pernas: coxa, joelheira, canela
for(const pv of [avatarLegL,avatarLegR]){
  avMesh(pv,new THREE.CapsuleGeometry(.076,.22,4,12),avM.pants,0,-.17,0);
  avMesh(pv,new THREE.SphereGeometry(.07,14,10),avM.pants,0,-.36,0);
  avMesh(pv,new THREE.BoxGeometry(.11,.11,.03),avM.pad,0,-.37,.07);
  box(pv,'knee pad stripe',0,-.37,.087,.1,.018,.004,avM.vest,{cast:false});
  avMesh(pv,new THREE.CapsuleGeometry(.064,.2,4,12),avM.pants,0,-.52,0);
  box(pv,'leg reflective band',0,-.56,0,.135,.02,.135,avM.reflect,{cast:false});
}
// botas de segurança com biqueira e cadarço
for(const shoe of [shoeL,shoeR]){
  avMesh(shoe,new THREE.BoxGeometry(.13,.035,.29),avM.sole,0,-.052,0);
  avMesh(shoe,new THREE.BoxGeometry(.12,.12,.2),avM.boot,0,.005,-.03);
  avMesh(shoe,new THREE.SphereGeometry(.062,16,10,0,Math.PI*2,0,Math.PI/2),avM.boot,0,-.035,.075,1,1,1.25);
  for(let i=0;i<3;i++)box(shoe,'boot lace',0,.02+i*.025,.072-i*.012,.07,.006,.01,M.ivory2,{cast:false});
  avMesh(shoe,new THREE.CylinderGeometry(.068,.07,.06,16),avM.boot,0,.08,-.04);
}
// cinto com fivela, porta-ferramentas e trena
box(avatarBelt,'belt band',0,0,0,.36,.045,.26,M.dark);box(avatarBelt,'belt buckle',0,0,.133,.05,.035,.01,M.gold,{cast:false});
avMesh(avatarBelt,new THREE.BoxGeometry(.08,.11,.07),M.black,.2,-.05,.04);
avMesh(avatarBelt,new THREE.CylinderGeometry(.03,.03,.025,16),M.yellow,-.2,-.03,.06).rotation.z=Math.PI/2;
// mochila arredondada com bolso e faixa refletiva
roundedBox(avatarBackpack,'pack body',0,0,0,.3,.38,.15,avM.pants,.04);
roundedBox(avatarBackpack,'pack pocket',0,-.08,-.085,.22,.14,.04,avM.suit,.015);
box(avatarBackpack,'pack reflective',0,.1,-.078,.24,.02,.01,avM.reflect,{cast:false});
for(const s of [-1,1])box(avatarBackpack,'pack strap',s*.1,.06,.09,.04,.32,.02,avM.pants);
syncEpiUI();

// --- 6) Vista estilo Minecraft: V ou F5 alternam 1ª pessoa → costas → frente ---
let viewMode='first';
function applyViewLabel(){$('#viewModeToggle').textContent=viewMode==='first'?'◉ VISTA: 1ª PESSOA':(viewMode==='back'?'◉ VISTA: 3ª (COSTAS)':'◉ VISTA: 3ª (FRENTE)');$('#modeLabel').textContent='V ou F5 trocam a vista';}
function cycleView(){
  if(renderer.xr.isPresenting)return;
  if(viewMode==='first'){if(!thirdPerson)toggleThirdPerson();viewMode=thirdPerson?'back':'first';}
  else if(viewMode==='back')viewMode='front';
  else{if(thirdPerson)toggleThirdPerson();viewMode='first';}
  applyViewLabel();
}
window.addEventListener('keydown',e=>{
  if((e.code==='KeyV'||e.key==='F5')&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||'')){e.preventDefault();e.stopPropagation();if(!e.repeat)cycleView();}
},true);
$('#viewModeToggle').addEventListener('click',e=>{e.stopImmediatePropagation();cycleView();},true);
const frontQ=new THREE.Quaternion(),frontP=new THREE.Vector3(),yAxis=new THREE.Vector3(0,1,0),fwdTmp=new THREE.Vector3();
let shadowFrame=0;
const baseRenderFrameV12=renderFrame;
renderFrame=function(dt){
  if(!thirdPerson&&viewMode!=='first'){viewMode='first';applyViewLabel();}
  // sombras atualizadas a cada 2 quadros (bem mais leve, sem diferença visível)
  if((shadowFrame++)%2===0)renderer.shadowMap.needsUpdate=true;
  if(viewMode==='front'&&thirdPerson&&mode==='walk'&&!renderer.xr.isPresenting){
    frontQ.copy(camera.quaternion);frontP.copy(camera.position);
    fwdTmp.set(0,0,-1).applyQuaternion(frontQ);fwdTmp.y=0;if(fwdTmp.lengthSq()<1e-6)fwdTmp.set(0,0,-1);fwdTmp.normalize();
    camera.position.set(playerWorld.x+fwdTmp.x*2.4,(crouched?1.45:1.82)+jumpOffset,playerWorld.z+fwdTmp.z*2.4);
    camera.rotateOnWorldAxis(yAxis,Math.PI);camera.updateMatrixWorld();
    baseRenderFrameV12(dt);
    camera.quaternion.copy(frontQ);camera.position.copy(frontP);camera.updateMatrixWorld();
  } else baseRenderFrameV12(dt);
};
applyViewLabel();

// --- 7) Menos lag ---
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
mainLight.shadow.mapSize.set(2048,2048);if(mainLight.shadow.map){mainLight.shadow.map.dispose();mainLight.shadow.map=null;}
for(const o of [...room.children])if(o.isPointLight)room.remove(o);   // luzes internas do armário custavam caro em todos os materiais
if(!aoUserChoice){aoEnabled=false;syncAOButton();}                    // oclusão de ambiente começa desligada (botão SOMBRA 3D liga)
// tudo que é fixo na sala deixa de recalcular matriz a cada quadro (as portas do armário continuam animadas)
{const moving=new Set();for(const d of cabinetDoors)d.traverse(o=>moving.add(o));
 room.updateMatrixWorld(true);room.traverse(o=>{if(o===room||moving.has(o))return;o.matrixAutoUpdate=false;o.updateMatrix();});}
resize();
const baseMechanismsV12=updateMechanisms;
updateMechanisms=function(dt){
  baseMechanismsV12(dt);
  if(epiTableMarker.visible){epiTableMarker.position.y=1.2+Math.sin(performance.now()*.005)*.03;epiTableMarker.rotation.y+=dt*2;}
};


// ===========================================================================
// v13: guardar (R = mão livre, T = guardar tudo) e leitor X/Y/Z que começa zerado e acompanha a mesa.
// ===========================================================================
let lastHeldId=null;
function toggleHandFree(){
  if(selectedInventoryId&&inventoryItems.some(x=>x.id===selectedInventoryId)){
    lastHeldId=selectedInventoryId;selectedInventoryId=null;renderInventory();notify('Item guardado na mochila. Mão livre (R tira de novo).','silent');
  } else {
    const back=inventoryItems.find(x=>x.id===lastHeldId)||inventoryItems[0];
    if(!back){notify('A mochila está vazia.');return;}
    selectedInventoryId=back.id;renderInventory();notify(`Na mão: ${back.name}`,'silent');
  }
}
function returnEpiToTable(){
  let returned=0;
  for(const src of epiSources){
    if(!epiOwned[src.kind])continue;
    epi[src.kind]=false;epiOwned[src.kind]=false;src.model.visible=true;returned++;
    src.model.traverse(o=>{if(o.isMesh&&o.userData.machineControl&&!machineControlTargets.includes(o))machineControlTargets.push(o);});
  }
  syncEpiUI();return returned;
}
function stowAll(){
  const msgs=[];let tools=0,stock=0,parts=0;
  for(const it of [...inventoryItems]){
    if(it.kind==='tool'){returnToolToCabinet(it.toolKey);inventoryItems.splice(inventoryItems.indexOf(it),1);tools++;continue;}
    if(it.kind==='bar'||it.kind==='stockBlock'||it.kind==='block'){
      const slot=freeBenchSlotIndex(partsBenchPoint.x,partsBenchPoint.z);
      if(slot>=0)placePickupOnBench(spawnPickup(it.kind==='block'?'stockBlock':it.kind,0,0,it),slot);
      inventoryItems.splice(inventoryItems.indexOf(it),1);stock++;continue;
    }
    if(it.kind==='finishedLathe'||it.kind==='finishedMill'){
      const station=it.kind==='finishedLathe'?'lathe':'mill';const bin=partBins[station];
      const free=bin.slots.findIndex((_,i)=>!pickupObjects.some(o=>o.userData.binSlot===`${station}:${i}`));
      if(free<0)continue;
      const slot=bin.slots[free];const product=spawnPickup(it.kind,slot.x,slot.z,it);product.scale.setScalar(.72);
      product.position.y=slot.y;product.userData.baseY=slot.y;product.userData.sellableOutput=true;product.userData.binSlot=`${station}:${free}`;
      inventoryItems.splice(inventoryItems.indexOf(it),1);parts++;
    }
  }
  const epiBack=returnEpiToTable();
  selectedInventoryId=inventoryItems[0]?.id||null;renderInventory();
  if(tools)msgs.push(`${tools} ferramenta(s) no armário`);if(stock)msgs.push(`${stock} material(is) na bancada`);
  if(parts)msgs.push(`${parts} peça(s) na caixinha`);if(epiBack)msgs.push('EPI na mesa da entrada');
  notify(msgs.length?`Guardado: ${msgs.join(' • ')}.`:'Nada para guardar.');
}
$('#handFreeBtn').addEventListener('click',toggleHandFree);
$('#stowAllBtn').addEventListener('click',stowAll);
document.addEventListener('keydown',e=>{
  if(e.repeat||renderer.xr.isPresenting||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
  if(e.code==='KeyR')toggleHandFree();
  if(e.code==='KeyT')stowAll();
});

// Leitor digital (DRO) da fresadora: começa em 0,000 e mostra o deslocamento real em mm.
const droScreenMesh=millRoot.children.find(o=>o.isMesh&&o.material?.map?.image?.width===256&&o.material.map.image.height===160);
const droLast={x:NaN,y:NaN,z:NaN};
function fmtDro(v){const s=v<0?'-':'+';return `${s}${Math.abs(v).toFixed(3).padStart(7,'0')}`;}
function drawDro(x,y,z){
  const tex=droScreenMesh?.material.map;if(!tex)return;const c=tex.image,g=c.getContext('2d');
  g.fillStyle='#04110b';g.fillRect(0,0,c.width,c.height);
  g.font='bold 30px monospace';g.textBaseline='alphabetic';
  [['X',x],['Y',y],['Z',z]].forEach(([axis,v],i)=>{g.fillStyle='#ff5b4d';g.fillText(`${axis}  ${fmtDro(v)}`,14,44+i*46);});
  g.fillStyle='#7f9a8c';g.font='14px monospace';g.fillText('mm',214,152);
  tex.needsUpdate=true;
}
function updateDro(){
  const x=millTableCarrier.position.x*1000,y=millTableCarrier.position.z*1000;
  const toolY=millToolAssembly?millToolAssembly.position.y:1.44;
  const z=(millKnee.position.y-(1.44-toolY))*1000;
  const r=v=>Math.round(v*1000)/1000;
  if(r(x)===droLast.x&&r(y)===droLast.y&&r(z)===droLast.z)return;
  droLast.x=r(x);droLast.y=r(y);droLast.z=r(z);drawDro(x,y,z);
}
updateDro();
const baseMechanismsV13=updateMechanisms;
updateMechanisms=function(dt){baseMechanismsV13(dt);updateDro();};

// ===========================================================================
// v14: torre porta-ferramentas do torno (4 posições T1–T4) bem visível,
// girar a torre e botão "Pegar / Guardar" que devolve a ferramenta ao mesmo lugar.
// ===========================================================================
const TURRET_HOME={turning:0,boring:1,groove:2};
const TURRET_S=1.5,TURRET_BASE_Y=1.525,TURRET_HALF=.095,TURRET_TOOL_OFF=.07,TURRET_SHANK_Y=(1.572-1.525)/1.5,TURRET_Z=1.5*(.07+.088);
const isLatheToolKey=k=>TOOL_CATALOG.some(t=>t.key===k&&t.machine==='lathe');
const turretMemory={}; // posição de onde cada ferramenta saiu da torre
// 1) Sai o porta-ferramentas achatado antigo, a alavanca alta e a mangueira que passava por cima.
for(const n of ['four way tool post','tool holder','tool insert placeholder','tool post stud','carriage coolant hose','carriage coolant nozzle']){
  let o;while((o=latheCarriage.getObjectByName(n))){o.parent.remove(o);o.geometry?.dispose();}
}
{const lever=latheCarriage.getObjectByName('tool post lever');if(lever){latheCarriage.remove(lever);disposeGroup(lever);}}
for(const o of [...latheCarriage.children])if(o.isMesh&&o.geometry?.type==='TorusGeometry'&&Math.abs((o.geometry.parameters.radius||0)-.018)<1e-4&&o.position.y>1.4)latheCarriage.remove(o);
// Mangueira de fluido refeita por trás da peça, sem cobrir a torre.
hoseWithRibs(latheCarriage,'carriage coolant hose',[[.32,1.42,.04],[.37,1.55,-.03],[.33,1.67,-.10],[.22,1.70,-.12],[.14,1.66,-.10]],.014,M.blue,M.steelDark,7);
{const nz=lathed(latheCarriage,'carriage coolant nozzle',[[.005,0],[.014,0],[.016,.04],[.007,.058]],M.gold,.14,1.66,-.10,'y',14);
 nz.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-.55,-.55,.62).normalize());}
// A alavanca preta do avanço ficava na frente da torre: fica menor.
if(latheFeedLever?.pivot)latheFeedLever.pivot.scale.setScalar(.66);

// 2) Torre: base fixa no carro superior + cabeçote amarelo que gira de 90° em 90°.
const latheTurret=new THREE.Group();latheTurret.name='lathe tool turret';latheTurret.position.set(0,TURRET_BASE_Y,TURRET_Z);latheTurret.scale.setScalar(TURRET_S);latheCarriage.add(latheTurret);
cylinder(latheTurret,'turret base ring',0,.006,0,.105,.11,.012,M.steelDark,'y',40);
{const mark=new THREE.Mesh(new THREE.ConeGeometry(.016,.034,3),M.red);mark.name='turret index mark';mark.position.set(0,.006,-.122);mark.rotation.x=-Math.PI/2;latheTurret.add(mark);}
const turretHead=new THREE.Group();turretHead.name='turret head';latheTurret.add(turretHead);
const turretBody=box(turretHead,'turret body',0,.052,0,TURRET_HALF*2,.08,TURRET_HALF*2,M.yellow);
for(const sx of [-1,1])for(const sz of [-1,1]){const c=cylinder(turretHead,'turret corner',sx*TURRET_HALF*.94,.052,sz*TURRET_HALF*.94,.012,.012,.08,M.yellow,'y',12);c.userData.turretPart=true;}
const turretTop=cylinder(turretHead,'turret top plate',0,.095,0,.07,.075,.008,M.steel,'y',36);
const turretNut=cylinder(turretHead,'turret clamp nut',0,.111,0,.032,.032,.026,M.steel,'y',6);
const turretLever=new THREE.Group();turretLever.name='turret clamp lever';turretLever.position.set(0,.118,0);turretHead.add(turretLever);
{const rod=cylinder(turretLever,'turret lever rod',.09,.012,0,.009,.011,.15,M.steel,'x',12);rod.rotation.z=-Math.PI/2+.12;
 const knob=sphere(turretLever,'turret lever knob',.165,.022,0,.022,M.red);
 for(const m of [rod,knob])registerMachineControl(m,'lathe','turretIndex','Girar a torre (próxima posição)');}
function turretLabelTexture(text){
  const c=document.createElement('canvas');c.width=128;c.height=96;const g=c.getContext('2d');
  g.fillStyle='#10161c';g.fillRect(0,0,128,96);g.strokeStyle='#ffffff';g.lineWidth=7;g.strokeRect(5,5,118,86);
  g.fillStyle='#ffffff';g.font='bold 62px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(text,64,52);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const turretSlotParts=[];
for(let i=0;i<4;i++){
  const g=new THREE.Group();g.name=`turret slot T${i+1}`;g.rotation.y=i*Math.PI/2;turretHead.add(g);
  box(g,'turret slot groove',0,TURRET_SHANK_Y,-TURRET_HALF-.0012,.036,.034,.004,M.dark,{cast:false});
  const screws=[-.072,-.036].map(z=>{const s=cylinder(g,'turret clamp screw',0,.096,z,.0105,.0105,.012,M.steel,'y',6);cylinder(g,'turret screw socket',0,.1025,z,.0045,.0045,.002,M.dark,'y',6);return s;});
  const mat=new THREE.MeshBasicMaterial({map:turretLabelTexture(`T${i+1}`),side:THREE.DoubleSide});
  const face=new THREE.Mesh(new THREE.PlaneGeometry(.044,.033),mat);face.position.set(.062,.06,-TURRET_HALF-.0012);face.rotation.y=Math.PI;g.add(face);
  const top=new THREE.Mesh(new THREE.PlaneGeometry(.04,.03),mat);top.position.set(.058,.0928,-.066);top.rotation.x=-Math.PI/2;g.add(top);
  const holder=new THREE.Group();holder.name='turret tool holder';g.add(holder);
  turretSlotParts.push({group:g,screws,label:mat,holder});
}
for(const m of [turretBody,turretTop,turretNut,...turretHead.children.filter(o=>o.userData.turretPart)])registerMachineControl(m,'lathe','turretTool','Torre de ferramentas');
const turretSlots=[null,null,null,null];
let turretActive=0,turretAngle=0,turretTarget=0,turretKick=0,lastTurretTaken=null;
const turretToolName=k=>toolInfoByKey(k)?.name||'Ferramenta';
function turretBusy(){const s=activeMachines.lathe;return s.powered||s.cutting||autoRunning('lathe');}
function unregisterControlsUnder(obj){
  if(hoveredMeshes.some(m=>{let n=m;while(n){if(n===obj)return true;n=n.parent;}return false;}))setHovered([]);
  obj.traverse(o=>{const i=machineControlTargets.indexOf(o);if(i>=0)machineControlTargets.splice(i,1);});
  if(hoverControlHit&&!machineControlTargets.includes(hoverControlHit.object))hoverControlHit=null;
}
function turretSlotFor(key,prefer=null){
  const cur=turretSlots.indexOf(key);if(cur>=0)return cur;
  const bag=inventoryItems.find(x=>x.kind==='tool'&&x.toolKey===key);const m=/T(\d)/.exec(bag?.quality||'');
  for(const c of [turretMemory[key],m?+m[1]-1:null,TURRET_HOME[key],prefer,turretActive,3,0,1,2])if(c!=null&&c>=0&&c<4&&!turretSlots[c])return c;
  return -1;
}
function mountTurretTool(key,quiet=true,prefer=null){
  if(!isLatheToolKey(key))return -1;
  const slot=turretSlotFor(key,prefer);if(slot<0)return -1;
  if(turretSlots[slot]===key)return slot;
  const idx=inventoryItems.findIndex(x=>x.kind==='tool'&&x.toolKey===key);
  if(idx>=0){inventoryItems.splice(idx,1);if(!inventoryItems.some(x=>x.id===selectedInventoryId))selectedInventoryId=inventoryItems[0]?.id||null;renderInventory();}
  setToolOnShelf(key,false);
  const p=turretSlotParts[slot];const model=makeToolModel(key);model.name=`turret tool ${key}`;
  model.rotation.y=Math.PI;model.position.set(0,TURRET_SHANK_Y,-TURRET_TOOL_OFF);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;if(o.material===M.steelDark)o.material=M.steel;registerMachineControl(o,'lathe','turretTool','Torre de ferramentas');}});
  p.holder.add(model);turretSlots[slot]=key;
  if(!quiet)notify(`${turretToolName(key)} presa na posição T${slot+1} da torre.`);
  return slot;
}
function unmountTurretTool(slot){
  const key=turretSlots[slot];if(!key)return null;const p=turretSlotParts[slot];
  for(const m of [...p.holder.children]){unregisterControlsUnder(m);p.holder.remove(m);disposeGroup(m);}
  turretSlots[slot]=null;return key;
}
function ensureLatheCutOffset(){
  if(!latheToolAssembly){latheToolAssembly=new THREE.Group();latheToolAssembly.name='lathe tool cut offset';latheToolAssembly.position.set(latheCarriage.position.x,0,0);latheRoot.add(latheToolAssembly);}
}
function dropLatheCutOffset(){if(latheToolAssembly){latheRoot.remove(latheToolAssembly);latheToolAssembly=null;}}
// Cores e textos da torre (sem mexer nos estados da máquina).
function applyTurretVisual(){
  const s=activeMachines.lathe;const key=turretSlots[turretActive];
  latheToolBits=key?turretSlotParts[turretActive].screws.slice():[];
  if(key)ensureLatheCutOffset();else dropLatheCutOffset();
  for(let i=0;i<4;i++){
    const k=turretSlots[i],p=turretSlotParts[i];
    for(const sc of p.screws)sc.material=!k?M.steel:(i===turretActive&&!s.toolClamped?M.gold:M.green);
    p.label.color.set(i===turretActive?'#7dffaa':'#ffffff');
  }
  const k=turretSlots[turretActive];
  const lbl=`Torre T${turretActive+1}: ${k?turretToolName(k):'vazia'} — clique para ${k?'pegar':'guardar'} a ferramenta`;
  for(const m of machineControlTargets)if(m.userData.machineControl?.action==='turretTool')m.userData.machineControl.label=lbl;
}
// A posição de corte (virada para a placa) define a ferramenta ativa do torno.
function syncLatheFromTurret(){
  const s=activeMachines.lathe;const key=turretSlots[turretActive];
  if(key){s.toolInstalled=true;s.toolClamped=true;s.tool=toolInfoByKey(key)?.tool||'turning';installedToolKey.lathe=key;}
  else{s.toolInstalled=false;s.toolClamped=false;installedToolKey.lathe=null;}
  applyTurretVisual();
  if(activeStation==='lathe'){setToolOptions('lathe');$('#toolSelect').value=s.tool;}
  renderStation();
}
function indexTurretTo(slot){
  if(slot===turretActive){syncLatheFromTurret();return;}
  const steps=(slot-turretActive+4)%4;turretTarget-=steps*Math.PI/2;turretActive=slot;turretKick=1;syncLatheFromTurret();
}
function turretRotateNext(){
  if(turretBusy()){notify('Desligue o torno antes de girar a torre.','error');return;}
  indexTurretTo((turretActive+1)%4);const k=turretSlots[turretActive];
  notify(`Torre girada: posição T${turretActive+1} ${k?'• '+turretToolName(k):'(vazia)'} virada para a peça.`);
}
function turretTakeOrStore(){
  if(turretBusy()){notify('Desligue o torno antes de mexer na torre.','error');return;}
  const key=turretSlots[turretActive];
  if(key){
    if(inventoryItems.length>=MAX_INVENTORY){notify('Mochila cheia (5 espaços). Libere um espaço para pegar a ferramenta.','error');return;}
    const slot=turretActive;unmountTurretTool(slot);turretMemory[key]=slot;syncLatheFromTurret();lastTurretTaken=key;
    addInventoryItem({kind:'tool',toolKey:key,name:turretToolName(key),value:0,material:'steel',quality:`Ferramenta da torre (T${slot+1})`},true);
    syncTurretUI();notify(`${turretToolName(key)} retirada da posição T${slot+1}. Gire e aperte de novo para pegar outra; com a posição vazia, o mesmo botão guarda todas no lugar.`);return;
  }
  const isLt=it=>it.kind==='tool'&&isLatheToolKey(it.toolKey);
  const it=inventoryItems.find(x=>x.id===selectedInventoryId&&isLt(x))||inventoryItems.find(x=>isLt(x)&&x.toolKey===lastTurretTaken)||inventoryItems.find(isLt);
  if(!it){
    const other=turretSlots.findIndex(Boolean);
    notify(other>=0?`Posição T${turretActive+1} vazia. Gire a torre (↻) para usar outra ferramenta ou pegue uma no armário.`:'Torre vazia. Pegue uma ferramenta de torno no armário.','error');return;
  }
  // O mesmo botão guarda TODAS as ferramentas que saíram da torre, cada uma na posição de onde saiu.
  const fromTurret=inventoryItems.filter(x=>isLt(x)&&/^Ferramenta da torre/.test(x.quality||''));
  if(fromTurret.length){
    const keys=[...new Set(fromTurret.map(x=>x.toolKey))];const slots=keys.map(k=>mountTurretTool(k)).filter(x=>x>=0);
    if(!slots.length){notify('Torre cheia: pegue uma ferramenta da torre antes de guardar outra.','error');return;}
    indexTurretTo(slots.includes(turretActive)?turretActive:slots[slots.length-1]);
    notify(slots.length>1?`${slots.length} ferramentas guardadas de volta nas posições ${slots.map(x=>'T'+(x+1)).join(', ')} e presas.`:`${turretToolName(turretSlots[slots[0]])} guardada de volta na posição T${slots[0]+1} e presa.`);
    return;
  }
  // Ferramenta que veio do armário: monta na posição vazia que está virada para a peça.
  const slot=mountTurretTool(it.toolKey,true,turretActive);
  if(slot<0){notify('Torre cheia: pegue uma ferramenta da torre antes de colocar outra.','error');return;}
  indexTurretTo(slot);notify(`${turretToolName(it.toolKey)} colocada na posição T${slot+1} da torre e presa.`);
}
// 3) As funções antigas do torno passam a usar a torre.
addLatheTool=function(tool){const key=isLatheToolKey(tool)?tool:'turning';let slot=mountTurretTool(key,true,turretActive);if(slot<0)slot=turretActive;
  if(slot!==turretActive){turretTarget-=((slot-turretActive+4)%4)*Math.PI/2;turretActive=slot;turretKick=1;}applyTurretVisual();};
clearLatheTool=function(){unmountTurretTool(turretActive);latheToolBits=[];dropLatheCutOffset();applyTurretVisual();};
const baseInstallFromKeyV14=installToolFromKey;
installToolFromKey=function(key,fromInventoryId=null){
  if(!isLatheToolKey(key))return baseInstallFromKeyV14(key,fromInventoryId);
  if(turretBusy()){notify('Pare e desligue o torno antes de trocar a ferramenta.','error');return false;}
  if(activeStation!=='lathe')switchStation('lathe');
  const slot=mountTurretTool(key,true,turretActive);if(slot<0){notify('Torre cheia (4 posições). Pegue uma ferramenta da torre antes.','error');return false;}indexTurretTo(slot);
  notify(`${turretToolName(key)} presa na posição T${slot+1} da torre e virada para a peça.`);return true;
};
const baseInstallCatalogV14=installCatalogTool;
installCatalogTool=function(){
  const info=TOOL_CATALOG[toolWinIndex];const slot=turretSlots.indexOf(info?.key);
  if(info&&slot>=0){if(turretBusy()){notify('Desligue o torno antes de girar a torre.','error');return;}if(activeStation!=='lathe')switchStation('lathe');indexTurretTo(slot);notify(`${info.name} já está na torre: posição T${slot+1} virada para a peça.`);return;}
  return baseInstallCatalogV14();
};
// Guardar tudo (T): ferramentas de torno voltam para a posição delas na torre.
const baseStowAllV14=stowAll;
stowAll=function(){
  let mounted=0;
  if(!turretBusy())for(const it of [...inventoryItems])if(it.kind==='tool'&&isLatheToolKey(it.toolKey)&&/^Ferramenta da torre/.test(it.quality||'')&&mountTurretTool(it.toolKey)>=0)mounted++;
  if(mounted)syncLatheFromTurret();
  const realNotify=notify;let msg='';notify=(t)=>{msg=t;};
  try{baseStowAllV14();}finally{notify=realNotify;}
  if(mounted){const rest=msg.startsWith('Guardado: ')?' • '+msg.slice(10).replace(/\.$/,''):'';notify(`Guardado: ${mounted} ferramenta(s) na torre do torno${rest}.`);}
  else notify(msg);
};
$('#stowAllBtn').removeEventListener('click',baseStowAllV14);$('#stowAllBtn').addEventListener('click',()=>stowAll());
// v17: a torre começa vazia; todas as ferramentas do torno ficam no armário.
{const start=TURRET_HOME[activeMachines.lathe.tool];turretActive=start!=null&&turretSlots[start]?start:Math.max(0,turretSlots.findIndex(Boolean));
 turretTarget=turretAngle=-turretActive*Math.PI/2;turretHead.rotation.y=turretAngle;syncLatheFromTurret();}

// 4) Cliques, tecla E/Y e destaque.
HIGHLIGHT_ACTIONS.add('turretTool');HIGHLIGHT_ACTIONS.add('turretIndex');
const baseActivateV14=activateMachineControl;
activateMachineControl=function(station,action,target=null){
  if(action==='turretTool'){turretTakeOrStore();return;}
  if(action==='turretIndex'){turretRotateNext();return;}
  return baseActivateV14(station,action,target);
};
window.addEventListener('keydown',e=>{
  if(e.code!=='KeyE'||e.repeat||e.defaultPrevented||!walkControls.isLocked||renderer.xr.isPresenting)return;
  const act=hoverControlHit?.object.userData.machineControl?.action;
  if((act==='turretTool'||act==='turretIndex')&&hoverControlHit.distance<3.4&&machineControlTargets.includes(hoverControlHit.object)){
    e.preventDefault();e.stopImmediatePropagation();if(act==='turretTool')turretTakeOrStore();else turretRotateNext();
  }
},true);
document.addEventListener('keydown',e=>{
  if(e.repeat||renderer.xr.isPresenting||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
  if(e.code==='KeyY'&&((mode==='walk'&&nearLathe())||(mode==='inspect'&&activeStation==='lathe')))turretTakeOrStore();
});
const baseHoverV14=updateControlHover;
updateControlHover=function(dt){
  baseHoverV14(dt);
  const act=hoverControlHit?.object.userData.machineControl?.action;const hint=$('#crankHint');
  if((act==='turretTool'||act==='turretIndex')&&walkControls.isLocked&&!hint.querySelector('.turret-e')){
    const b=document.createElement('b');b.className='turret-e';b.textContent='  E';hint.append(b,document.createTextNode(act==='turretTool'?' • pegar/guardar':' • girar'));
  }
};
// Aviso "Instalar" perto do torno passa a dizer em qual posição da torre a ferramenta vai.
const baseGameplayV14=updateGameplayWorld;
updateGameplayWorld=function(dt){
  baseGameplayV14(dt);
  if(currentWorldAction?.kind==='toolInstall'&&isLatheToolKey(currentWorldAction.key)){
    $('#pickupPromptTitle').textContent=`Guardar na torre: ${turretToolName(currentWorldAction.key)}`;
    {const sl=turretSlotFor(currentWorldAction.key,turretActive);$('#pickupPromptDetail').textContent=sl>=0?`Vai para a posição T${sl+1} e fica presa`:'Torre cheia: pegue uma ferramenta da torre antes';}
  }
};

// 5) Animação: giro suave do cabeçote, "tranco" da alavanca e mergulho da ferramenta no corte.
const baseMechanismsV14=updateMechanisms;
updateMechanisms=function(dt){
  baseMechanismsV14(dt);
  if(Math.abs(turretTarget-turretAngle)>1e-4){turretAngle+=(turretTarget-turretAngle)*Math.min(1,dt*9);if(Math.abs(turretTarget-turretAngle)<1e-3)turretAngle=turretTarget;turretHead.rotation.y=turretAngle;}
  if(turretKick>0){turretKick=Math.max(0,turretKick-dt*3);turretLever.rotation.y=Math.sin((1-turretKick)*Math.PI)*.9;}
  latheTurret.position.y=TURRET_BASE_Y+(latheToolAssembly&&activeMachines.lathe.cutting?latheToolAssembly.position.y:0);
};

// 6) Painel e botões na tela.
const turretBtn=$('#turretBtn'),turretViewBtn=$('#turretViewBtn');
function syncTurretUI(){
  const show=activeStation==='lathe';$('#turretRow').classList.toggle('hidden',!show);$('#turretMap').classList.toggle('hidden',!show);
  const key=turretSlots[turretActive],busy=turretBusy();
  const nBag=new Set(inventoryItems.filter(x=>x.kind==='tool'&&isLatheToolKey(x.toolKey)&&/^Ferramenta da torre/.test(x.quality||'')).map(x=>x.toolKey)).size;
  const storeTxt=nBag>1?`GUARDAR ${nBag} FERRAMENTAS`:nBag===1?'GUARDAR FERRAMENTA':'COLOCAR FERRAMENTA';
  $('#turretTakeBtn').textContent=key?`⇄ Pegar T${turretActive+1}`:(nBag>1?`⇄ Guardar ${nBag}`:nBag===1?'⇄ Guardar ferramenta':'⇄ Colocar ferramenta');
  $('#turretTakeBtn').disabled=busy;$('#turretRotateBtn').disabled=busy;
  const short={turning:'Tornear',boring:'Mandrilar',groove:'Canal',facing:'Facear',threading:'Rosca',parting:'Bedame'};
  $('#turretMap').innerHTML=turretSlots.map((k,i)=>`<span class="${i===turretActive?'active':''} ${k?'':'empty'}"><b>T${i+1}</b>${k?short[k]:'vazia'}</span>`).join('');
  turretBtn.querySelector('span').textContent=key?`PEGAR FERRAMENTA T${turretActive+1} (Y)`:`${storeTxt} (Y)`;
}
const baseRenderStationV14=renderStation;
renderStation=function(){baseRenderStationV14();syncTurretUI();};
$('#turretTakeBtn').addEventListener('click',turretTakeOrStore);
$('#turretRotateBtn').addEventListener('click',turretRotateNext);
turretBtn.addEventListener('click',turretTakeOrStore);
function viewTurret(){
  if(activeStation!=='lathe')switchStation('lathe');
  if(mode!=='inspect')setMode('inspect');
  const t=latheTurret.localToWorld(new THREE.Vector3(0,.05,-.05));
  orbitControls.minDistance=.45;orbitControls.target.copy(t);
  camera.position.copy(latheTurret.localToWorld(new THREE.Vector3(.30,.30,.52)));orbitControls.update();
  notify('Vista da torre: clique no cabeçote amarelo para pegar/guardar e na alavanca vermelha para girar.');
}
turretViewBtn.addEventListener('click',viewTurret);
const baseFocusV14=focusScene;
focusScene=function(station){orbitControls.minDistance=2.5;return baseFocusV14(station);};
let turretUiFrame=0;
const baseGameplayV14b=updateGameplayWorld;
updateGameplayWorld=function(dt){
  baseGameplayV14b(dt);
  if((turretUiFrame++)%12)return;
  const show=(mode==='walk'&&nearLathe())||(mode==='inspect'&&activeStation==='lathe');
  turretBtn.classList.toggle('hidden',!show);turretViewBtn.classList.toggle('hidden',!show);
};
syncTurretUI();

// ===========================================================================
// v15: cavaco não fica mais no ar, indicador de EPI legível e menos lag.
// ===========================================================================
// 1) Cavaco: na fresadora sai mais devagar (cai na peça/mesa); o que sai da mesa cai até o chão;
//    se a peça sai ou a mesa muda de altura, o cavaco parado em cima cai junto.
spawnChip=function(station,origin){
  if(flyingChips.length>=CHIP_MAX_V15)flyingChips.shift();
  const color=(stockMaterials[activeMachines[station].stock]||M.steelStock).color;
  let v;
  if(station==='lathe')v=new THREE.Vector3((Math.random()-.5)*.6,.8+Math.random()*.7,-.1+Math.random()*.4);
  else{const a=Math.random()*Math.PI*2,sp=.18+Math.random()*.42;v=new THREE.Vector3(Math.cos(a)*sp,.25+Math.random()*.45,Math.sin(a)*sp);}
  flyingChips.push({p:origin.clone().add(new THREE.Vector3((Math.random()-.5)*.02,0,(Math.random()-.5)*.02)),v,r:new THREE.Euler(Math.random()*6,Math.random()*6,Math.random()*6),w:new THREE.Vector3((Math.random()-.5)*16,(Math.random()-.5)*16,(Math.random()-.5)*16),life:0,rest:-1,scale:(station==='lathe'?1.8:1.4)*(.7+Math.random()*.6),color,station});
};
const CHIP_MAX_V15=240;
chipFloorY=function(ch){
  const p=ch.p;
  if(ch.station==='lathe'){
    const lx=p.x-latheRoot.position.x,lz=p.z-latheRoot.position.z;
    if(Math.abs(lx)<.72&&Math.abs(lz)<.54)return .36+panPile.count/CHIPS_PER_LEVEL*.013;
    return Math.abs(lx)<2.3&&Math.abs(lz)<.6?.36:.02;
  }
  const kneeY=millKnee.position.y;
  const lx=p.x-millRoot.position.x-millTableCarrier.position.x,lz=p.z-millRoot.position.z-millTableCarrier.position.z;
  if(lx>-.73&&lx<1.29&&lz>.08&&lz<.92&&p.y>.95+kneeY){
    if(activeMachines.mill.pieceLoaded&&millPart?.visible!==false&&Math.abs(lx-.28)<.285&&Math.abs(lz-.5)<.24)return 1.199+kneeY;
    return 1.0+kneeY;
  }
  return .02; // fora da mesa: chão (antes parava a 55 cm, flutuando)
};
updateChips=function(dt){
  for(const st of ['lathe','mill']){
    const s=activeMachines[st];if(!s.cutting){chipSpawnAcc[st]=0;continue;}
    const p=s.progress||0;if(p<.04||p>.97)continue;
    const origin=st==='lathe'
      ?latheRoot.localToWorld(chipTmp.set(latheToolAssembly?latheToolAssembly.position.x:latheCarriage.position.x,1.56+(latheToolAssembly?latheToolAssembly.position.y:0),.02)).clone()
      :millRoot.localToWorld(chipTmp.set(.34,(millToolAssembly?millToolAssembly.position.y:1.44)-millToolBottomOffset()+.012,.52)).clone();
    chipSpawnAcc[st]+=dt*(st==='lathe'?45:38);
    while(chipSpawnAcc[st]>=1){chipSpawnAcc[st]--;spawnChip(st,origin);}
  }
  for(let i=flyingChips.length-1;i>=0;i--){
    const ch=flyingChips[i];ch.life+=dt;
    if(ch.rest<0){
      ch.v.y-=6.5*dt;ch.p.addScaledVector(ch.v,dt);ch.r.x+=ch.w.x*dt;ch.r.y+=ch.w.y*dt;ch.r.z+=ch.w.z*dt;
      const fy=chipFloorY(ch);if(ch.p.y<=fy&&ch.v.y<0){ch.p.y=fy;ch.rest=0;ch.v.set(0,0,0);}
    } else {
      ch.rest+=dt;
      if(chipFloorY(ch)<ch.p.y-.008){ch.rest=-1;ch.v.set(0,0,0);} // o apoio sumiu: volta a cair
    }
    if(ch.rest>1.6||ch.life>5)flyingChips.splice(i,1);
  }
  for(let i=0;i<flyingChips.length;i++){
    const ch=flyingChips[i];const fade=ch.rest>1.1?Math.max(0,1-(ch.rest-1.1)/.5):1;
    chipDummy.position.copy(ch.p);chipDummy.rotation.copy(ch.r);chipDummy.scale.setScalar(ch.scale*fade);chipDummy.updateMatrix();
    chipFx.setMatrixAt(i,chipDummy.matrix);chipFx.setColorAt(i,ch.color);
  }
  chipFx.count=flyingChips.length;chipFx.instanceMatrix.needsUpdate=true;if(chipFx.instanceColor)chipFx.instanceColor.needsUpdate=true;
};

// 1b) Cavaco da fresadora pousa na superfície real que está embaixo dele (mesa, morsa, peça, carro, joelho);
//     se não tiver nada embaixo, cai até o chão. Nada de cavaco parado no ar.
const chipSurfaceMeshes=[];
millRoot.traverse(o=>{if(o.isMesh&&/^(T-slot milling table|vise base|vise fixed jaw|vise movable jaw|cross slide|knee)$/.test(o.name))chipSurfaceMeshes.push(o);});
const chipBoxPool=[];let chipBoxes=[];
function refreshChipBoxes(){
  chipBoxes=[];let i=0;
  const add=o=>{const b=chipBoxPool[i]||(chipBoxPool[i]=new THREE.Box3());b.setFromObject(o);chipBoxes.push(b);i++;};
  for(const o of chipSurfaceMeshes)if(o.visible)add(o);
  if(activeMachines.mill.pieceLoaded&&millPart&&millPart.visible!==false)add(millPart);
}
const baseChipFloorV15b=chipFloorY;
chipFloorY=function(ch){
  if(ch.station==='lathe')return baseChipFloorV15b(ch);
  const p=ch.p;let y=.02;
  for(const b of chipBoxes)if(p.x>=b.min.x&&p.x<=b.max.x&&p.z>=b.min.z&&p.z<=b.max.z&&b.max.y<=p.y+.03&&b.max.y>y)y=b.max.y;
  return y+.004;
};
const baseUpdateChipsV15b=updateChips;
updateChips=function(dt){
  if(activeMachines.mill.cutting||flyingChips.some(c=>c.station==='mill'))refreshChipBoxes();
  baseUpdateChipsV15b(dt);
};

// 2) Indicador de EPI: texto branco legível, sem quebrar linha; bolinha verde/vermelha mostra o estado.
const baseSyncEpiUIV15=syncEpiUI;
syncEpiUI=function(){
  baseSyncEpiUIV15();
  for(const el of [$('#epiGogglesState'),$('#epiMuffsState')])el.textContent=el.textContent.replace(/\s*[✓✗]\s*$/,'');
};
syncEpiUI();

// 3) Menos lag.
// 3a) As 6 lâmpadas do teto (luzes pontuais) pesavam em todos os materiais: troca por luz ambiente equivalente.
for(const o of [...scene.children])if(o.isPointLight)scene.remove(o);
for(const o of scene.children)if(o.isHemisphereLight)o.intensity=1.25;
scene.environmentIntensity=1.0;
// 3b) Peças pequenas não projetam sombra (parafusos, botões, cavaco…): menos trabalho no mapa de sombras.
{const tmpS=new THREE.Sphere();
 scene.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||!o.castShadow)return;const g=o.geometry;if(!g.boundingSphere)g.computeBoundingSphere();
   tmpS.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);if(tmpS.radius<.045)o.castShadow=false;});}
// 3c) A sala (paredes, piso, bancadas, prateleiras, placas…) vira poucos objetos: um por material.
function mergeMeshesInto(parent,list){
  parent.updateMatrixWorld(true);
  const inv=new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const buckets=new Map();
  for(const o of list){
    if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.isSkinnedMesh)continue;
    const g=o.geometry;if(!g?.attributes?.position||!g.attributes.normal)continue;
    const key=`${o.material.uuid}|${o.castShadow?1:0}|${o.receiveShadow?1:0}|${o.renderOrder}`;
    if(!buckets.has(key))buckets.set(key,{mat:o.material,cast:o.castShadow,recv:o.receiveShadow,ro:o.renderOrder,items:[]});
    buckets.get(key).items.push(o);
  }
  let removed=0,made=0;const m4=new THREE.Matrix4(),nm=new THREE.Matrix3(),v=new THREE.Vector3();
  for(const b of buckets.values()){
    if(b.items.length<2)continue;
    let total=0;const parts=[];
    for(const o of b.items){const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry;parts.push([o,g]);total+=g.attributes.position.count;}
    const pos=new Float32Array(total*3),nor=new Float32Array(total*3),uv=new Float32Array(total*2);let off=0;
    for(const [o,g] of parts){
      m4.multiplyMatrices(inv,o.matrixWorld);nm.getNormalMatrix(m4);
      const P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv;
      for(let i=0;i<P.count;i++){
        const k=off+i;
        v.fromBufferAttribute(P,i).applyMatrix4(m4);pos[k*3]=v.x;pos[k*3+1]=v.y;pos[k*3+2]=v.z;
        v.fromBufferAttribute(N,i).applyMatrix3(nm).normalize();nor[k*3]=v.x;nor[k*3+1]=v.y;nor[k*3+2]=v.z;
        if(U){uv[k*2]=U.getX(i);uv[k*2+1]=U.getY(i);}
      }
      off+=P.count;if(g!==o.geometry)g.dispose();
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    geo.computeBoundingSphere();geo.computeBoundingBox();
    const mesh=new THREE.Mesh(geo,b.mat);mesh.name='merged static';mesh.castShadow=b.cast;mesh.receiveShadow=b.recv;mesh.renderOrder=b.ro;
    mesh.matrixAutoUpdate=false;mesh.updateMatrix();parent.add(mesh);made++;
    for(const o of b.items){o.parent.remove(o);o.geometry.dispose();removed++;}
  }
  return {removed,made};
}
function mergeStaticRoom(){
  const keep=new Set();
  const mark=o=>o.traverse(c=>keep.add(c));
  for(const d of cabinetDoors)mark(d);
  for(const k in toolHomes)mark(toolHomes[k].group);
  for(const p of pickupObjects)mark(p);
  for(const b of Object.values(partBins||{}))if(b.group)mark(b.group);
  for(const t of machineControlTargets){let n=t;while(n&&n!==room){keep.add(n);n=n.parent;}mark(t);}
  for(const top of room.children){let special=false;top.traverse(c=>{if(keep.has(c)||c.visible===false||c.isLight||c.isInstancedMesh||c.isSprite||c.isPoints||c.isLine)special=true;});if(special)mark(top);}
  const list=[];room.traverse(o=>{if(o.isMesh&&!keep.has(o))list.push(o);});
  const r=mergeMeshesInto(room,list);
  const empties=[];room.traverse(o=>{if(o!==room&&o.isGroup&&!keep.has(o)){let has=false;o.traverse(c=>{if(c!==o&&!c.isGroup)has=true;});if(!has)empties.push(o);}});
  for(const e of empties)e.parent?.remove(e);
  return r;
}
// Estrutura fixa das máquinas (base, barramento, coluna, parafusos…) também vira poucos objetos.
function mergeStaticMachine(root){
  const live=/display|screen|button|lamp|stop|LED|needle|pile|mound|quill|live center|blank|accordion|depth|nose|hose|nozzle|DRO|drawbar|chip|cable|label|decal|glass|guard/i;
  const swap=new Set([M.red,M.green,M.yellow,M.cyan,M.gold]);
  const refs=new Set([...Object.values(machinePowerLights),...Object.values(machineEmergencyButtons)].filter(Boolean));
  const list=root.children.filter(o=>o.isMesh&&o.name&&!live.test(o.name)&&!swap.has(o.material)&&!machineControlTargets.includes(o)&&!refs.has(o)&&o.visible&&!o.material.map);
  return mergeMeshesInto(root,list);
}
const mergeInfoV15=[mergeStaticRoom(),mergeStaticMachine(latheRoot),mergeStaticMachine(millRoot)];
renderer.shadowMap.needsUpdate=true;

const baseRenderInventoryV15=renderInventory;
renderInventory=function(){baseRenderInventoryV15();syncTurretUI();};

// ===========================================================================
// v16: E pega e também guarda no lugar, botão RPM + ao lado do amarelo,
// "Ver torre" vai e volta, F11 tela cheia (Esc sai).
// ===========================================================================
// 1) E guarda o item selecionado no lugar de onde ele saiu (quando você está perto desse lugar).
const CABINET_POINT=new THREE.Vector2(7.75,-4.57);
function playerXZ(){return thirdPerson?[playerWorld.x,playerWorld.z]:[camera.position.x,camera.position.z];}
function putBackTargetFor(it){
  if(!it)return null;const [px,pz]=playerXZ();const d=(x,z)=>Math.hypot(px-x,pz-z);
  if(it.kind==='tool'){
    if(/^Ferramenta da torre/.test(it.quality||''))return null; // volta para a torre pelo E perto do torno (instalar) ou botão ⇄
    return d(CABINET_POINT.x,CABINET_POINT.y)<2.7?{where:'no armário',kind:'cabinet'}:null;
  }
  if(it.kind==='bar'||it.kind==='stockBlock'||it.kind==='block')return d(partsBenchPoint.x,partsBenchPoint.z)<2.6?{where:'na bancada de materiais',kind:'bench'}:null;
  if(it.kind==='finishedLathe'||it.kind==='finishedMill'){
    const st=it.kind==='finishedLathe'?'lathe':'mill';const sl=partBins[st]?.slots?.[0];
    return sl&&d(sl.x,sl.z)<2.3?{where:'na caixinha de peças',kind:'bin',station:st}:null;
  }
  return null;
}
function putBackItem(it){
  const t=putBackTargetFor(it);if(!t)return false;
  if(t.kind==='cabinet'){returnToolToCabinet(it.toolKey);}
  else if(t.kind==='bench'){const slot=freeBenchSlotIndex(partsBenchPoint.x,partsBenchPoint.z);if(slot<0){notify('A bancada de materiais está cheia.','error');return false;}placePickupOnBench(spawnPickup(it.kind==='block'?'stockBlock':it.kind,0,0,it),slot);}
  else if(t.kind==='bin'){
    const bin=partBins[t.station];const free=bin.slots.findIndex((_,i)=>!pickupObjects.some(o=>o.userData.binSlot===`${t.station}:${i}`));
    if(free<0){notify('A caixinha de peças está cheia.','error');return false;}
    const slot=bin.slots[free];const product=spawnPickup(it.kind,slot.x,slot.z,it);product.scale.setScalar(.72);
    product.position.y=slot.y;product.userData.baseY=slot.y;product.userData.sellableOutput=true;product.userData.binSlot=`${t.station}:${free}`;
  }
  inventoryItems.splice(inventoryItems.indexOf(it),1);selectedInventoryId=inventoryItems[0]?.id||null;renderInventory();persistGame();
  notify(`${it.name} guardado ${t.where}.`);return true;
}
const baseGameplayV16=updateGameplayWorld;
updateGameplayWorld=function(dt){
  baseGameplayV16(dt);
  if(!walkControls.isLocked||mode!=='walk'||renderer.xr.isPresenting)return;
  if(aimedPickup&&pickupObjects.includes(aimedPickup))return; // mirando num item: E pega
  if(currentWorldAction&&!['cabinet','pickup','putBack'].includes(currentWorldAction.kind))return;
  const it=inventoryItems.find(x=>x.id===selectedInventoryId);const t=putBackTargetFor(it);
  const prompt=$('#pickupPrompt');
  if(!t){if(currentWorldAction?.kind==='putBack'){currentWorldAction=null;prompt.classList.add('hidden');}return;}
  currentWorldAction={kind:'putBack',itemId:it.id};
  prompt.classList.remove('hidden');prompt.querySelector('kbd').textContent='E';
  $('#pickupPromptTitle').textContent=`Guardar no lugar: ${it.name}`;$('#pickupPromptDetail').textContent=`Volta ${t.where} • mire em outro item para pegar`;
};
const baseWorldInteractionV16=handleWorldInteraction;
handleWorldInteraction=function(){
  if(currentWorldAction?.kind==='putBack'){const it=inventoryItems.find(x=>x.id===currentWorldAction.itemId);currentWorldAction=null;if(it)putBackItem(it);return;}
  baseWorldInteractionV16();
};

// 2) Botão RPM + ao lado do amarelo (RPM −), nos dois painéis, com sinal de + e − na tampa.
function symbolTexture(sym){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
  g.fillStyle='#ffffff';g.font='bold 54px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(sym,32,35);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const symPlus=new THREE.MeshBasicMaterial({map:symbolTexture('+'),transparent:true,depthWrite:false});
const symMinus=new THREE.MeshBasicMaterial({map:symbolTexture('−'),transparent:true,depthWrite:false});
function capSymbol(button,mat,size){
  button.updateWorldMatrix(true,false);
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(size,size),mat);pl.name='button symbol';
  const box3=new THREE.Box3().setFromObject(button);const c=box3.getCenter(new THREE.Vector3());
  pl.position.set(c.x,c.y,box3.max.z+.002);button.parent.updateWorldMatrix(true,false);
  button.parent.worldToLocal(pl.position);button.parent.add(pl);button.attach(pl);return pl;
}
{
  // Torno: linha de botões reorganizada para caber o RPM +.
  const btn=a=>latheRoot.children.find(o=>o.userData.machineControl?.action===a&&o.name==='control pushbutton');
  const pw=btn('power'),dn=btn('rpmDown'),ct=btn('cut');
  if(pw&&dn&&ct){
    pw.position.x=-2.0;dn.position.x=-1.85;ct.position.x=-1.55;
    const up=registerMachineControl(cylinder(latheRoot,'control pushbutton',-1.70,1.79,.87,.04,.04,.035,M.cyan,'z',24),'lathe','rpmUp','Aumentar RPM');
    for(const [b,txt] of [[pw,'LIGA'],[dn,'RPM −'],[up,'RPM +'],[ct,'USINAR']]){const tag=textPlaque(latheRoot,txt,b.position.x+.05,1.725,.875,'#d8e3e8',0);tag.scale.setScalar(.083);tag.name='lathe button label';}
    capSymbol(dn,symMinus,.05);capSymbol(up,symPlus,.05);
  }
  // Fresadora: RPM + à esquerda do amarelo, na mesma linha.
  const mb=a=>millRoot.children.find(o=>o.userData.machineControl?.action===a&&o.name==='mill console button');
  const mdn=mb('rpmDown');
  if(mdn){
    const up=registerMachineControl(cylinder(millRoot,'mill console button',-1.83,mdn.position.y,mdn.position.z,.035,.035,.03,M.cyan,'z',16),'mill','rpmUp','Aumentar RPM');
    up.scale.copy(mdn.scale);
    capSymbol(mdn,symMinus,.055);capSymbol(up,symPlus,.055);
    // a etiqueta "RPM -" vira "RPM − / +"
    const tag=millRoot.children.find(o=>o.isMesh&&o.material?.map?.image&&Math.abs(o.position.y-mdn.position.y)<.01&&Math.abs(o.position.x+1.42)<.02);
    if(tag){const t2=textPlaque(millRoot,'RPM +  /  −',tag.position.x,tag.position.y,tag.position.z,'#d8e3e8',0);t2.scale.copy(tag.scale);millRoot.remove(tag);}
  }
}
const baseActivateV16=activateMachineControl;
activateMachineControl=function(station,action,target=null){
  if(action==='rpmUp'){
    if(station!==activeStation){if(activeMachines[activeStation].cutting){notify('Conclua ou interrompa a passada atual antes de trocar de máquina.','error');return;}switchStation(station);}
    changeMachineRPM(station,100);return;
  }
  return baseActivateV16(station,action,target);
};
HIGHLIGHT_ACTIONS.add('rpmUp');HIGHLIGHT_ACTIONS.add('rpmDown');

// 3) "Ver torre" agora vai e volta (o mesmo botão vira "VOLTAR").
let turretViewPrev=null;
function setTurretViewLabel(){
  turretViewBtn.innerHTML=turretViewPrev?'↩ <span>VOLTAR</span>':'🔍 <span>VER TORRE</span>';
  turretViewBtn.title=turretViewPrev?'Volta para a vista de antes':'Aproxima a câmera da torre de ferramentas do torno';
}
const baseViewTurretV16=viewTurret;
viewTurret=function(){
  const prev={mode,station:activeStation,pos:camera.position.clone(),target:orbitControls.target.clone()};
  baseViewTurretV16();turretViewPrev=prev;setTurretViewLabel();
};
function leaveTurretView(){
  const p=turretViewPrev;turretViewPrev=null;setTurretViewLabel();if(!p)return;
  orbitControls.minDistance=2.5;
  if(p.mode==='walk'){setMode('walk');return;}
  if(p.station!==activeStation)switchStation(p.station);
  camera.position.copy(p.pos);orbitControls.target.copy(p.target);orbitControls.update();
}
turretViewBtn.removeEventListener('click',baseViewTurretV16);
turretViewBtn.addEventListener('click',()=>{if(turretViewPrev)leaveTurretView();else viewTurret();});
const baseFocusV16=focusScene;
focusScene=function(station){if(turretViewPrev){turretViewPrev=null;setTurretViewLabel();}return baseFocusV16(station);};
const baseSetModeV16=setMode;
setMode=function(m,...rest){if(turretViewPrev&&m==='walk'){turretViewPrev=null;setTurretViewLabel();orbitControls.minDistance=2.5;}return baseSetModeV16(m,...rest);};
const baseGameplayV16b=updateGameplayWorld;
updateGameplayWorld=function(dt){baseGameplayV16b(dt);if(turretViewPrev)turretViewBtn.classList.remove('hidden');};

// 4) F11 = tela cheia do jogo; Esc sai (o menu de pausa não abre junto).
let pauseOpenedAt=0;
const baseShowPauseV16=showPause;
showPause=function(...a){pauseOpenedAt=performance.now();return baseShowPauseV16(...a);};
let leftFullscreenAt=0;
window.addEventListener('keydown',async e=>{
  if(e.key!=='F11')return;
  e.preventDefault();e.stopImmediatePropagation();
  try{if(document.fullscreenElement)await document.exitFullscreen();else await viewport.requestFullscreen();}
  catch(err){notify('O navegador bloqueou a tela cheia. Use o botão ⛶ no canto do jogo.','error');}
},true);
document.addEventListener('fullscreenchange',()=>{
  if(document.fullscreenElement){notify('Tela cheia: aperte Esc (ou F11) para sair.');return;}
  leftFullscreenAt=performance.now();
  if(performance.now()-pauseOpenedAt<500)hidePause();
});
// Esc que acabou de tirar da tela cheia não abre a pausa logo em seguida.
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&performance.now()-leftFullscreenAt<350)e.stopImmediatePropagation();},true);
setTurretViewLabel();

// ===========================================================================
// v17: tecla " (aspas) e botão FERRAMENTAS abrem a janela de ferramentas.
// ===========================================================================
function toggleToolsWindow(){
  if(!$('#toolWindow').classList.contains('hidden')){closeToolWindow();return;}
  const sel=inventoryItems.find(x=>x.id===selectedInventoryId&&x.kind==='tool');
  const inst=installedToolKey[activeStation];
  openToolWindow(sel?.toolKey||inst||TOOL_CATALOG[0].key);
}
window.addEventListener('keydown',e=>{
  if(e.repeat||renderer.xr.isPresenting||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
  const isQuote=e.key==='"'||e.key==="'"||e.code==='Quote'||e.code==='Backquote'||(e.key==='Dead'&&(e.code==='Quote'||e.code==='Backquote'));
  if(!isQuote)return;
  e.preventDefault();e.stopImmediatePropagation();toggleToolsWindow();
},true);

// ===========================================================================
// v18: boneco em blocos (estilo voxel), agachar inclinando o corpo,
// e E na mesa de EPI pega e guarda.
// ===========================================================================
// 1) O boneco antigo sai de cena (o código antigo continua animando as peças, só que fora da cena).
const legacyAvatarParts=new THREE.Group();
for(const c of [...playerAvatar.children])legacyAvatarParts.add(c);
const PX=.05625; // 1 "pixel" do boneco
function pixelTexture(rows,palette){
  const h=rows.length,w=rows[0].length;const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){g.fillStyle=palette[rows[y][x]];g.fillRect(x,y,1,1);}
  const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;return t;
}
const vxPal={s:'#c99a78',S:'#b48362',h:'#4a2f1f',H:'#5b3a26',w:'#f4f4f4',e:'#2b4c7e',m:'#8a4b3c',n:'#b07a5c',b:'#3a2416'};
const faceTex=pixelTexture(['hhhhhhhh','hhhhhhhh','hssssssh','ssssssss','swessews','sssnnsss','ssmmmmss','ssssssss'],vxPal);
const sideTex=pixelTexture(['hhhhhhhh','hhhhhhhh','hhhhhhss','hhhhhsss','hhhhssss','hhhsssss','hhssssss','ssssssss'],vxPal);
const backTex=pixelTexture(['hhhhhhhh','hHhhhhHh','hhhhhhhh','hhhhhhhh','hhhhhhhh','hHhhhhHh','hhhhhhhh','SSSSSSSS'],vxPal);
const vxM={
  skin:new THREE.MeshStandardMaterial({color:'#c99a78',roughness:.9}),
  face:new THREE.MeshStandardMaterial({map:faceTex,roughness:.9}),
  side:new THREE.MeshStandardMaterial({map:sideTex,roughness:.9}),
  sideM:new THREE.MeshStandardMaterial({map:sideTex,roughness:.9}),
  back:new THREE.MeshStandardMaterial({map:backTex,roughness:.9}),
  hair:new THREE.MeshStandardMaterial({color:'#4a2f1f',roughness:.95}),
  suit:new THREE.MeshStandardMaterial({color:'#24486a',roughness:.88}),
  suitDark:new THREE.MeshStandardMaterial({color:'#1b3650',roughness:.9}),
  pants:new THREE.MeshStandardMaterial({color:'#1e2c3a',roughness:.9}),
  vest:new THREE.MeshStandardMaterial({color:'#f39a2b',roughness:.7,emissive:'#5a2a00',emissiveIntensity:.2}),
  reflect:new THREE.MeshStandardMaterial({color:'#e8edf0',roughness:.3,metalness:.3}),
  boot:new THREE.MeshStandardMaterial({color:'#4b3021',roughness:.85}),
  sole:new THREE.MeshStandardMaterial({color:'#1a1512',roughness:.9}),
  glove:new THREE.MeshStandardMaterial({color:'#8d969c',roughness:.85}),
  helmet:new THREE.MeshStandardMaterial({color:'#f2c230',roughness:.45}),
  muff:new THREE.MeshStandardMaterial({color:'#d63a2f',roughness:.6}),
  lens:new THREE.MeshPhysicalMaterial({color:'#9fe3ff',transparent:true,opacity:.55,roughness:.05,clearcoat:1}),
  black:new THREE.MeshStandardMaterial({color:'#15191c',roughness:.8}),
  gold:new THREE.MeshStandardMaterial({color:'#d6a640',roughness:.4,metalness:.6})
};
sideTex.wrapS=THREE.RepeatWrapping;
vxM.sideM.map=sideTex.clone();vxM.sideM.map.wrapS=THREE.RepeatWrapping;vxM.sideM.map.repeat.x=-1;vxM.sideM.map.needsUpdate=true;
function vbox(parent,w,h,d,mat,x,y,z,name='voxel part'){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
const vx=new THREE.Group();vx.name='voxel operator';vx.scale.setScalar(.93);playerAvatar.add(vx);
// pernas (pivô no quadril)
const vxHips=new THREE.Group();vxHips.position.y=12*PX;vx.add(vxHips);
const vxLegs=[-1,1].map(s=>{
  const p=new THREE.Group();p.position.x=s*2*PX;vxHips.add(p);
  vbox(p,4*PX,9*PX,4*PX,vxM.pants,0,-4.5*PX,0,'leg');
  vbox(p,4.2*PX,.6*PX,4.2*PX,vxM.reflect,0,-7*PX,0,'leg reflective band');
  vbox(p,4.3*PX,3*PX,4.4*PX,vxM.boot,0,-10.5*PX,.1*PX,'boot');
  vbox(p,4.4*PX,.7*PX,4.8*PX,vxM.sole,0,-11.7*PX,.25*PX,'boot sole');
  vbox(p,3.6*PX,1.1*PX,.3*PX,vxM.gold,0,-10*PX,2.3*PX,'boot toe cap');
  return p;
});
// tronco (pivô no quadril: inclina para frente ao agachar)
const vxTorso=new THREE.Group();vxTorso.position.y=12*PX;vx.add(vxTorso);
vbox(vxTorso,8*PX,12*PX,4*PX,vxM.suit,0,6*PX,0,'body');
vbox(vxTorso,8.3*PX,7.4*PX,4.35*PX,vxM.vest,0,7.4*PX,0,'hi vis vest');
for(const y of [5.1,8.6])vbox(vxTorso,8.42*PX,.75*PX,4.45*PX,vxM.reflect,0,y*PX,0,'vest reflective stripe');
vbox(vxTorso,.35*PX,7.4*PX,.2*PX,vxM.suitDark,0,7.4*PX,2.22*PX,'vest zipper');
vbox(vxTorso,1.6*PX,1.1*PX,.2*PX,vxM.reflect,-2.2*PX,9.8*PX,2.22*PX,'badge');
vbox(vxTorso,8.4*PX,1*PX,4.4*PX,vxM.black,0,1.3*PX,0,'belt');
vbox(vxTorso,1.3*PX,1*PX,.3*PX,vxM.gold,0,1.3*PX,2.25*PX,'belt buckle');
vbox(vxTorso,2.2*PX,2.2*PX,1.6*PX,vxM.black,3.2*PX,.6*PX,2.6*PX,'tool pouch');
vbox(vxTorso,6*PX,7*PX,2.4*PX,vxM.pants,0,7*PX,-3.2*PX,'backpack');
vbox(vxTorso,4.4*PX,.6*PX,.3*PX,vxM.reflect,0,8.2*PX,-4.45*PX,'backpack reflective');
// braços (pivô no ombro)
const vxArms=[-1,1].map(s=>{
  const p=new THREE.Group();p.position.set(s*6*PX,10*PX,0);vxTorso.add(p);
  vbox(p,4*PX,4.5*PX,4*PX,vxM.vest,0,-.1*PX,0,'sleeve top');
  vbox(p,3.9*PX,6.5*PX,3.9*PX,vxM.suit,0,-5.4*PX,0,'arm');
  vbox(p,4.2*PX,3*PX,4.2*PX,vxM.glove,0,-9.2*PX,0,'glove');
  const hand=new THREE.Group();hand.position.set(0,-9.6*PX,1.6*PX);p.add(hand);p.userData.hand=hand;
  return p;
});
// cabeça (pivô no pescoço)
const vxHead=new THREE.Group();vxHead.position.y=12*PX;vxTorso.add(vxHead);
{const g=new THREE.BoxGeometry(8*PX,8*PX,8*PX);
 // ordem das faces: +x, -x, +y, -y, +z (rosto), -z (nuca)
 const head=new THREE.Mesh(g,[vxM.sideM,vxM.side,vxM.hair,vxM.skin,vxM.face,vxM.back]);head.name='head';head.position.y=4*PX;head.castShadow=true;vxHead.add(head);}
// capacete
vbox(vxHead,8.8*PX,2.4*PX,8.8*PX,vxM.helmet,0,8.6*PX,0,'helmet shell');
vbox(vxHead,9.8*PX,.6*PX,10.4*PX,vxM.helmet,0,7.5*PX,.5*PX,'helmet brim');
vbox(vxHead,1.2*PX,1*PX,8.4*PX,vxM.helmet,0,10.2*PX,0,'helmet ridge');
vbox(vxHead,1.6*PX,1.2*PX,.3*PX,vxM.gold,0,8.6*PX,4.5*PX,'helmet badge');
// EPI: óculos e protetor auricular (aparecem quando equipados)
const vxGoggles=new THREE.Group();vxGoggles.name='voxel goggles';vxHead.add(vxGoggles);
vbox(vxGoggles,7*PX,1.6*PX,.5*PX,vxM.lens,0,4.6*PX,4.2*PX,'goggle lens');
vbox(vxGoggles,7.6*PX,.4*PX,.6*PX,vxM.black,0,5.5*PX,4.2*PX,'goggle frame');
for(const s of [-1,1])vbox(vxGoggles,.3*PX,.6*PX,8.4*PX,vxM.black,s*4.15*PX,4.8*PX,0,'goggle strap');
vbox(vxGoggles,8.4*PX,.6*PX,.3*PX,vxM.black,0,4.8*PX,-4.15*PX,'goggle strap back');
const vxMuffs=new THREE.Group();vxMuffs.name='voxel ear muffs';vxHead.add(vxMuffs);
for(const s of [-1,1]){vbox(vxMuffs,1.4*PX,3*PX,3*PX,vxM.muff,s*4.7*PX,3.6*PX,0,'ear cup');vbox(vxMuffs,.5*PX,4.6*PX,1*PX,vxM.black,s*4.6*PX,6.6*PX,0,'muff arm');}
// item na mão: vai para a mão direita do boneco novo
vxArms[1].userData.hand.add(heldToolAvatar);heldToolAvatar.position.set(0,0,.03);heldToolAvatar.rotation.set(-1.25,0,0);

// 2) Animação: andar balançando braços e pernas; agachar = corpo inclinado e pernas para trás.
let vxCrouch=0,vxWalkAmp=0;
function updateVoxelAvatar(dt){
  if(!playerAvatar.visible)return;
  vxCrouch+=((crouched?1:0)-vxCrouch)*Math.min(1,dt*12);
  const k=vxCrouch;
  const moving=walkControls.isLocked&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(c=>keys.has(c));
  vxWalkAmp+=((moving?(crouched?.35:.75):0)-vxWalkAmp)*Math.min(1,dt*10);
  const swing=Math.sin(performance.now()*(crouched?.008:.012))*vxWalkAmp;
  vxTorso.rotation.x=.5*k;
  vxTorso.position.set(0,12*PX-1.6*PX*k,0);
  vxHips.position.set(0,12*PX-1.6*PX*k,-2.2*PX*k);
  vxLegs[0].rotation.x=swing;vxLegs[1].rotation.x=-swing;
  const holding=heldToolAvatar.children.length>0;
  vxArms[0].rotation.x=-swing*.9+.35*k;vxArms[0].rotation.z=-.05;
  vxArms[1].rotation.x=(holding?-.55:swing*.9)+.35*k;vxArms[1].rotation.z=.05;
  vxHead.rotation.x=-.42*k;
  vxGoggles.visible=!!epi.goggles;vxMuffs.visible=!!epi.muffs;
}
const baseRenderFrameV18=renderFrame;
let vxPrev=performance.now();
renderFrame=function(dt){const now=performance.now();updateVoxelAvatar(Math.min(.05,(now-vxPrev)/1000));vxPrev=now;return baseRenderFrameV18(dt);};

// 3) Mesa de EPI: mirar na mesa (ou chegar perto) e apertar E pega os EPIs; apertar E de novo guarda na mesa.
const epiTableGroup=room.children.find(o=>o.name==='epi start table');
const epiTableMeshes=[];
if(epiTableGroup)for(const c of epiTableGroup.children){if(c.isMesh&&/epi table (top|mat|apron)/.test(c.name)){registerMachineControl(c,'mill','epiTable','Mesa de EPI');epiTableMeshes.push(c);}}
HIGHLIGHT_ACTIONS.add('epiTable');
function epiAnyOwned(){return epiOwned.goggles||epiOwned.muffs;}
function epiTableLabel(){const l=epiAnyOwned()?'Mesa de EPI: E guarda os EPIs aqui':'Mesa de EPI: E pega óculos e protetor';for(const m of epiTableMeshes)m.userData.machineControl.label=l;}
function epiTableToggle(){
  if(epiAnyOwned()){
    if(['lathe','mill'].some(st=>activeMachines[st].powered)){notify('Desligue as máquinas antes de tirar o EPI.','error');return;}
    returnEpiToTable();epiTableLabel();notify('EPIs guardados de volta na mesa. Aperte E de novo para pegar.');return;
  }
  const realNotify=notify;notify=()=>{};
  const inTable=o=>{let n=o;while(n){if(n===epiTableGroup)return true;n=n.parent;}return false;};
  try{for(const k of ['goggles','muffs'])if(!epi[k]){
    const src=epiSources.find(s=>s.kind===k&&s.model.visible&&inTable(s.model));let mesh=null;src?.model.traverse(o=>{if(!mesh&&o.isMesh)mesh=o;});
    if(mesh)hoverControlHit={object:mesh,distance:0};equipEpi(k);
  }}finally{notify=realNotify;}
  epiTableLabel();notify('EPIs equipados: óculos e protetor auricular. Aperte E na mesa para guardar de volta.');
}
const baseActivateV18=activateMachineControl;
activateMachineControl=function(station,action,target=null){
  if(action==='epiTable'){epiTableToggle();return;}
  return baseActivateV18(station,action,target);
};
window.addEventListener('keydown',e=>{
  if(e.code!=='KeyE'||e.repeat||e.defaultPrevented||!walkControls.isLocked||renderer.xr.isPresenting)return;
  const act=hoverControlHit?.object.userData.machineControl?.action;
  const aimTable=act==='epiTable'&&hoverControlHit.distance<3.4&&machineControlTargets.includes(hoverControlHit.object);
  const aimOther=act&&act!=='epiTable'&&hoverControlHit.distance<3.4;
  const [px,pz]=playerXZ();const nearTable=Math.hypot(px-epiTablePos.x,pz-epiTablePos.z)<1.9;
  // perto da mesa e sem mirar em outra coisa: E guarda (se estiver com EPI)
  if(aimTable||(nearTable&&!aimOther&&epiAnyOwned()&&!(aimedPickup&&pickupObjects.includes(aimedPickup)))){
    e.preventDefault();e.stopImmediatePropagation();epiTableToggle();
  }
},true);
const baseGameplayV18=updateGameplayWorld;
updateGameplayWorld=function(dt){
  baseGameplayV18(dt);
  if(!walkControls.isLocked||mode!=='walk'||renderer.xr.isPresenting)return;
  if(aimedPickup&&pickupObjects.includes(aimedPickup))return;
  const [px,pz]=playerXZ();
  if(Math.hypot(px-epiTablePos.x,pz-epiTablePos.z)<1.9&&epiAnyOwned()&&(!currentWorldAction||['cabinet','pickup','putBack','sale'].includes(currentWorldAction.kind))){
    const prompt=$('#pickupPrompt');prompt.classList.remove('hidden');prompt.querySelector('kbd').textContent='E';
    $('#pickupPromptTitle').textContent='Guardar EPI na mesa';$('#pickupPromptDetail').textContent='E devolve óculos e protetor • E de novo pega';
  }
};
const baseSyncEpiV18=syncEpiUI;
syncEpiUI=function(){baseSyncEpiV18();if(typeof epiTableLabel==='function'&&epiTableMeshes.length)epiTableLabel();};
epiTableLabel();

renderInventory();
