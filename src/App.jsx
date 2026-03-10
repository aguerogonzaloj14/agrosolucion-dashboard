import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";

// ─── Leaflet fix ───────────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Constantes ───────────────────────────────────────────────────────────────
const HECTAREAS           = 100;
const LITROS_TRADICIONAL  = 6000;
const LITROS_AGROSOLUCION = 2200;
const WS_URL              = "wss://agrosolucion-servidor.onrender.com";

// ─── Base de datos de cultivos ─────────────────────────────────────────────────
const CULTIVOS = {
  "Soja":             { emoji:"🫘", humedad:[25,35,55,70,80], temp:[15,20,30,35], cond:[0.5,0.8,1.8,2.5], nota:"Sensible al estrés hídrico en floración." },
  "Maíz":             { emoji:"🌽", humedad:[30,40,60,75,85], temp:[18,22,32,38], cond:[0.5,0.8,1.8,2.5], nota:"Mayor demanda hídrica durante la polinización." },
  "Trigo":            { emoji:"🌾", humedad:[20,30,50,65,75], temp:[5,10,22,30],  cond:[0.5,1.0,2.0,3.0], nota:"Tolera temperaturas bajas. Sensible al exceso de agua." },
  "Girasol":          { emoji:"🌻", humedad:[25,35,50,65,75], temp:[15,20,28,35], cond:[0.5,0.8,1.5,2.5], nota:"Alta tolerancia a la sequía. Raíces profundas." },
  "Arroz":            { emoji:"🍚", humedad:[60,75,85,95,100],temp:[20,25,35,40], cond:[0.3,0.5,1.5,2.0], nota:"Requiere suelos saturados. Alta demanda hídrica." },
  "Caña de azúcar":   { emoji:"🎋", humedad:[40,55,70,85,90], temp:[20,25,35,40], cond:[0.5,1.0,2.0,3.0], nota:"Alta demanda hídrica y térmica." },
  "Vid / Uva":        { emoji:"🍇", humedad:[30,40,55,65,75], temp:[15,18,28,35], cond:[0.5,1.0,2.5,3.5], nota:"Tolera cierta sequía. Cuidar exceso de humedad." },
  "Tomate":           { emoji:"🍅", humedad:[50,60,70,80,90], temp:[18,22,28,35], cond:[0.8,1.5,2.5,3.5], nota:"Alta sensibilidad a fluctuaciones de humedad." },
  "Papa":             { emoji:"🥔", humedad:[55,65,75,85,90], temp:[10,15,22,28], cond:[0.5,1.0,2.0,3.0], nota:"Sensible al estrés hídrico en tuberización." },
  "Sorgo":            { emoji:"🌿", humedad:[20,30,50,65,75], temp:[18,24,32,40], cond:[0.5,1.0,2.5,4.0], nota:"Alta tolerancia a la sequía y calor." },
  "Cebada":           { emoji:"🌱", humedad:[25,35,50,65,75], temp:[5,10,20,28],  cond:[0.5,1.0,2.0,3.0], nota:"Similar al trigo pero más tolerante a salinidad." },
  "Algodón":          { emoji:"🤍", humedad:[35,45,60,70,80], temp:[20,25,32,38], cond:[0.5,1.0,2.5,4.0], nota:"Tolera bien el calor. Sensible a heladas." },
  "Poroto / Frijol":  { emoji:"🫛", humedad:[40,50,65,75,85], temp:[15,20,28,35], cond:[0.5,0.8,1.5,2.5], nota:"Sensible al encharcamiento. Requiere drenaje." },
  "Lechuga":          { emoji:"🥬", humedad:[60,70,80,90,95], temp:[10,15,20,25], cond:[0.8,1.5,2.0,2.5], nota:"Alta sensibilidad al calor. Riego frecuente." },
  "Cebolla":          { emoji:"🧅", humedad:[50,60,70,80,85], temp:[12,18,24,30], cond:[0.5,1.0,2.0,3.0], nota:"Raíces superficiales. Riego regular y uniforme." },
  "Ajo":              { emoji:"🧄", humedad:[40,50,65,75,80], temp:[10,16,24,28], cond:[0.5,1.0,2.0,3.0], nota:"Sensible al exceso de humedad. Buen drenaje." },
  "Espinaca":         { emoji:"🥗", humedad:[55,65,75,85,90], temp:[8,12,20,25],  cond:[0.8,1.5,2.0,2.5], nota:"Prefiere clima fresco. Sensible al calor." },
  "Pimiento":         { emoji:"🌶️", humedad:[55,65,75,85,90], temp:[18,22,28,35], cond:[0.8,1.5,2.5,3.5], nota:"Alta demanda hídrica en fructificación." },
  "Zapallo":          { emoji:"🎃", humedad:[45,55,65,75,80], temp:[18,22,30,38], cond:[0.5,1.0,2.0,3.0], nota:"Tolera calor. Sensible al frío y heladas." },
  "Yerba mate":       { emoji:"🧉", humedad:[60,70,80,90,95], temp:[20,24,30,36], cond:[0.3,0.5,1.0,1.5], nota:"Requiere alta humedad y suelos ácidos." },
  "Olivo":            { emoji:"🫒", humedad:[25,35,50,60,70], temp:[10,18,30,38], cond:[0.8,1.5,3.0,5.0], nota:"Alta tolerancia a la sequía. Ideal para zonas áridas." },
  "Durazno":          { emoji:"🍑", humedad:[40,50,65,75,80], temp:[12,18,26,32], cond:[0.5,1.0,2.0,3.0], nota:"Requiere frío invernal para la floración." },
  "Manzana":          { emoji:"🍎", humedad:[45,55,65,75,80], temp:[8,15,24,30],  cond:[0.5,1.0,2.0,3.0], nota:"Requiere clima templado-frío. Riego uniforme." },
  "Pera":             { emoji:"🍐", humedad:[45,55,65,75,80], temp:[8,14,24,30],  cond:[0.5,1.0,2.0,3.0], nota:"Similar a la manzana. Muy cultivada en Patagonia." },
  "Ciruela":          { emoji:"🫐", humedad:[40,50,65,75,80], temp:[10,16,26,32], cond:[0.5,1.0,2.0,3.0], nota:"Tolera climas fríos. Sensible al exceso de agua." },
  "Espárrago":        { emoji:"🌿", humedad:[50,60,70,80,85], temp:[15,20,28,35], cond:[0.8,1.5,2.5,4.0], nota:"Tolera cierta salinidad. Riego por goteo ideal." },
  "Tabaco":           { emoji:"🍂", humedad:[45,55,65,75,80], temp:[18,22,30,35], cond:[0.5,1.0,2.0,3.0], nota:"Sensible al exceso de lluvia en cosecha." },
  "Arándano":         { emoji:"🫐", humedad:[55,65,75,85,90], temp:[12,18,24,30], cond:[0.3,0.5,1.0,1.5], nota:"Requiere suelo ácido y alta humedad." },
};

const CULTIVO_DEFAULT = "Soja";

const SENSORES_INIT = [
  { id:"sensor-01", nombre:"Campo Norte",    parcela:"A", provincia:"Buenos Aires", cultivo:"Soja",       lat:-34.6,  lng:-60.2  },
  { id:"sensor-02", nombre:"Campo Sur",      parcela:"B", provincia:"Córdoba",      cultivo:"Maíz",       lat:-31.4,  lng:-63.8  },
  { id:"sensor-03", nombre:"Campo Este",     parcela:"C", provincia:"Santa Fe",     cultivo:"Girasol",    lat:-31.6,  lng:-60.7  },
  { id:"sensor-04", nombre:"Campo Arrocero", parcela:"D", provincia:"Entre Ríos",   cultivo:"Arroz",      lat:-32.1,  lng:-58.9  },
  { id:"sensor-05", nombre:"Campo Pampeano", parcela:"E", provincia:"La Pampa",     cultivo:"Trigo",      lat:-36.6,  lng:-64.3  },
  { id:"sensor-06", nombre:"Finca Andina",   parcela:"F", provincia:"Mendoza",      cultivo:"Vid / Uva",  lat:-33.0,  lng:-68.8  },
  { id:"sensor-07", nombre:"Finca Sanjuanina",parcela:"G",provincia:"San Juan",     cultivo:"Olivo",      lat:-31.5,  lng:-68.5  },
  { id:"sensor-08", nombre:"Campo Norteño",  parcela:"H", provincia:"Tucumán",      cultivo:"Caña de azúcar", lat:-26.8, lng:-65.2 },
  { id:"sensor-09", nombre:"Campo Misionero",parcela:"I", provincia:"Misiones",     cultivo:"Yerba mate", lat:-27.4,  lng:-55.9  },
  { id:"sensor-10", nombre:"Chacra Patagónica",parcela:"J",provincia:"Río Negro",   cultivo:"Manzana",    lat:-39.0,  lng:-67.5  },
  { id:"sensor-11", nombre:"Campo Chaqueño", parcela:"K", provincia:"Chaco",        cultivo:"Algodón",    lat:-27.4,  lng:-59.0  },
  { id:"sensor-12", nombre:"Campo Salteño",  parcela:"L", provincia:"Salta",        cultivo:"Tabaco",     lat:-24.8,  lng:-65.4  },
];

const MENU_ITEMS = [
  { id:"dashboard", label:"Dashboard",     icon:"📊" },
  { id:"mapa",      label:"Mapa",          icon:"🗺️" },
  { id:"ahorro",    label:"Ahorro Agua",   icon:"💧" },
  { id:"historico", label:"Histórico",     icon:"📈" },
  { id:"ia",        label:"Predicción IA", icon:"🤖" },
  { id:"log",       label:"Registro",      icon:"📋" },
  { id:"guia",      label:"Guía de uso",   icon:"ℹ️" },
];

// ─── Temas ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:"#0d1117", panel:"#161b22", panelAlt:"#1c2128", border:"#21262d",
    accent:"#3fb950", accentCyan:"#39d5c4", accentGold:"#d4a017",
    danger:"#f85149", warn:"#d29922", text:"#e6edf3", textMuted:"#7d8590", textDim:"#484f58",
    water:"#39d5c4", temp:"#d4a017", cond:"#a78bfa",
    cardShadow:"0 4px 24px rgba(0,0,0,0.5)", chartGrid:"#21262d",
    mapTile:"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    menuBtn:"#21262d",
  },
  light: {
    bg:"#f4f6f8", panel:"#ffffff", panelAlt:"#f0f4f8", border:"#d0d7de",
    accent:"#1a7f37", accentCyan:"#0969da", accentGold:"#9a6700",
    danger:"#cf222e", warn:"#9a6700", text:"#1f2328", textMuted:"#656d76", textDim:"#adb5bc",
    water:"#0969da", temp:"#9a6700", cond:"#7c3aed",
    cardShadow:"0 2px 12px rgba(0,0,0,0.08)", chartGrid:"#eaeef2",
    mapTile:"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    menuBtn:"#eaeef2",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generarLectura(base = {}) {
  const hora = new Date().getHours();
  const baseHum = 45 + 15 * (1 - Math.abs(hora - 12) / 12);
  const humedad      = +Math.max(20, Math.min(80, (base.humedad      || baseHum) + (Math.random()*6-3))).toFixed(2);
  const temperatura  = +Math.max(10, Math.min(40, (base.temperatura  || 25)      + (Math.random()*4-2))).toFixed(1);
  const conductividad= +Math.max(0.3,Math.min(3,  (base.conductividad|| 1.5)     + (Math.random()*0.4-0.2))).toFixed(2);
  return { humedad, temperatura, conductividad, bomba: humedad < 35 ? "ON" : "OFF", alerta: humedad < 25 };
}

// ─── Componentes reutilizables ────────────────────────────────────────────────
function Card({ children, C, style = {} }) {
  return (
    <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:"12px",
      padding:"20px", boxShadow:C.cardShadow, ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, C }) {
  return <div style={{ color:C.textMuted, fontSize:"10px", letterSpacing:"2px",
    textTransform:"uppercase", marginBottom:"16px" }}>{children}</div>;
}

function Gauge({ value, min=0, max=100, color, label, unit, C }) {
  const pct = Math.max(0, Math.min(1, (value-min)/(max-min)));
  const r=40, cx=56, cy=56;
  const rad = d => (d*Math.PI)/180;
  const arc = (s,e) => {
    const [x1,y1] = [cx+r*Math.cos(rad(s-90)), cy+r*Math.sin(rad(s-90))];
    const [x2,y2] = [cx+r*Math.cos(rad(e-90)), cy+r*Math.sin(rad(e-90))];
    return `M ${x1} ${y1} A ${r} ${r} 0 ${e-s>180?1:0} 1 ${x2} ${y2}`;
  };
  const angle = -135 + pct*270;
  const [nx,ny] = [cx+24*Math.cos(rad(angle-90)), cy+24*Math.sin(rad(angle-90))];
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <svg width="112" height="84" viewBox="0 0 112 84">
        <path d={arc(-135,135)} fill="none" stroke={C.border} strokeWidth="4" strokeLinecap="round"/>
        <path d={arc(-135,-135+pct*270)} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"/>
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="3.5" fill={color}/>
        <text x={cx} y={cy+20} textAnchor="middle" fill={C.text} fontSize="12" fontWeight="600"
          fontFamily="Inter,system-ui,sans-serif">{value}{unit}</text>
      </svg>
      <span style={{ color:C.textMuted, fontSize:"9px", letterSpacing:"1.5px", textTransform:"uppercase" }}>{label}</span>
    </div>
  );
}

function Sparkline({ data, color, height=40 }) {
  if (data.length < 2) return null;
  const min=Math.min(...data), max=Math.max(...data);
  const w=200, h=height;
  const coords = data.map((v,i) => ({
    x:(i/(data.length-1))*w,
    y: h-((v-min)/(max-min||1))*(h*0.8)-h*0.1
  }));
  const pts  = coords.map(c=>`${c.x},${c.y}`).join(" ");
  const area = `M 0,${h} L ${coords.map(c=>`${c.x},${c.y}`).join(" L ")} L ${w},${h} Z`;
  const gid  = `sp${color.replace(/[^a-z0-9]/gi,"")}`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{display:"block"}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

function StatCard({ label, value, unit, color, history, icon, C }) {
  return (
    <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:"12px",
      padding:"16px", position:"relative", overflow:"hidden",
      flex:"1 1 130px", minWidth:"130px", boxShadow:C.cardShadow }}>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, opacity:0.7 }}>
        <Sparkline data={history} color={color} height={44}/>
      </div>
      <div style={{ position:"relative", zIndex:1 }}>
        <div style={{ fontSize:"16px", marginBottom:"4px" }}>{icon}</div>
        <div style={{ color:C.textMuted, fontSize:"9px", letterSpacing:"1.5px",
          textTransform:"uppercase", marginBottom:"6px" }}>{label}</div>
        <div style={{ fontSize:"24px", fontWeight:"700" }}>
          <span style={{color}}>{value}</span>
          <span style={{ fontSize:"11px", marginLeft:"2px", color:C.textMuted }}>{unit}</span>
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, C }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.panelAlt, border:`1px solid ${C.border}`, borderRadius:"8px",
      padding:"10px 14px", fontSize:"11px", boxShadow:C.cardShadow }}>
      <div style={{ color:C.textMuted, marginBottom:"6px" }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{color:p.color}}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
}

// ─── Sección: Dashboard ───────────────────────────────────────────────────────
function ViewDashboard({ latest, readings, notifPermiso, setNotifPermiso, enviarNotificacion, cultivoGlobal, setCultivoGlobal, rangos, C, dark }) {
  const hum = latest.humedad;
  const humEstado = hum < rangos.humedad[0] ? { label:"CRÍTICO", color:C.danger }
    : hum < rangos.humedad[1] ? { label:"BAJO", color:C.warn }
    : hum < rangos.humedad[3] ? { label:"ÓPTIMO", color:C.accent }
    : { label:"ALTO", color:C.accentCyan };

  return (
    <>
      <Card C={C} style={{ marginBottom:"14px", padding:"14px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:"10px", color:C.textMuted, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:"6px" }}>
              🌱 Cultivo del campo principal
            </div>
            <select
              value={cultivoGlobal}
              onChange={e => setCultivoGlobal(e.target.value)}
              style={{ background:C.panelAlt, border:`1px solid ${C.border}`, borderRadius:"8px",
                padding:"8px 12px", color:C.text, fontSize:"13px", fontWeight:"600",
                fontFamily:"Inter,system-ui,sans-serif", cursor:"pointer", outline:"none",
                minWidth:"200px" }}>
              {Object.entries(CULTIVOS).map(([nombre, datos]) => (
                <option key={nombre} value={nombre}>{datos.emoji} {nombre}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize:"11px", color:C.textMuted, background:C.panelAlt,
            padding:"8px 14px", borderRadius:"8px", border:`1px solid ${C.border}`,
            borderLeft:`2px solid ${C.accentCyan}`, maxWidth:"360px", lineHeight:"1.5" }}>
            📌 {CULTIVOS[cultivoGlobal]?.nota}
          </div>
          <div style={{ marginLeft:"auto", textAlign:"center" }}>
            <div style={{ fontSize:"22px", fontWeight:"700", color:humEstado.color }}>{humEstado.label}</div>
            <div style={{ fontSize:"9px", color:C.textMuted, letterSpacing:"1px", textTransform:"uppercase" }}>Estado humedad</div>
          </div>
        </div>
      </Card>
      <Card C={C} style={{ marginBottom:"14px", display:"flex", justifyContent:"space-around",
        alignItems:"center", flexWrap:"wrap", gap:"16px" }}>
        <Gauge value={latest.humedad}      min={rangos.humedad[0]}  max={rangos.humedad[4]}  color={C.water} label="Humedad"       unit="%"   C={C}/>
        <div style={{ width:"1px", height:"70px", background:C.border }}/>
        <Gauge value={latest.temperatura}  min={rangos.temp[0]}    max={rangos.temp[3]}    color={C.temp}  label="Temperatura"   unit="°C"  C={C}/>
        <div style={{ width:"1px", height:"70px", background:C.border }}/>
        <Gauge value={latest.conductividad} min={rangos.cond[0]}   max={rangos.cond[3]}    color={C.cond}  label="Conductividad" unit=" mS" C={C}/>
        <div style={{ width:"1px", height:"70px", background:C.border }}/>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"56px", height:"56px", borderRadius:"50%",
            border:`2px solid ${latest.bomba==="ON" ? C.accent : C.border}`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px",
            background: latest.bomba==="ON" ? (dark?"rgba(63,185,80,0.1)":"rgba(26,127,55,0.08)") : "transparent",
            transition:"all 0.4s" }}>💧</div>
          <div style={{ textAlign:"center" }}>
            <div style={{ color: latest.bomba==="ON" ? C.accent : C.textMuted,
              fontWeight:"600", fontSize:"11px", letterSpacing:"1.5px" }}>BOMBA {latest.bomba}</div>
            <div style={{ color:C.textMuted, fontSize:"9px" }}>RIEGO</div>
          </div>
        </div>
      </Card>

      <div style={{ display:"flex", gap:"12px", flexWrap:"wrap", marginBottom:"14px" }}>
        <StatCard label="Humedad"      value={latest.humedad}      unit="%"     color={C.water} history={readings.map(r=>r.humedad)}       icon="💧" C={C}/>
        <StatCard label="Temperatura"  value={latest.temperatura}  unit="°C"    color={C.temp}  history={readings.map(r=>r.temperatura)}    icon="🌡️" C={C}/>
        <StatCard label="Conductividad" value={latest.conductividad} unit="mS/cm" color={C.cond} history={readings.map(r=>r.conductividad)} icon="⚡" C={C}/>
      </div>

      <Card C={C} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:"12px" }}>
        <div>
          <div style={{ fontSize:"14px", fontWeight:"600", marginBottom:"4px" }}>🔔 Alertas de humedad crítica</div>
          <div style={{ fontSize:"11px", color:C.textMuted }}>
            {notifPermiso==="granted"
              ? "Recibirás notificaciones cuando la humedad baje del umbral crítico"
              : notifPermiso==="denied"
              ? "Permiso denegado — habilitalo desde la configuración del navegador"
              : "Activá las alertas para recibir notificaciones en tiempo real"}
          </div>
        </div>
        <button
          disabled={notifPermiso==="denied"}
          onClick={() => {
            if (notifPermiso==="granted") { setNotifPermiso("default"); }
            else { Notification.requestPermission().then(p => setNotifPermiso(p)); }
          }}
          style={{
            background: notifPermiso==="granted"
              ? (dark?"rgba(248,81,73,0.15)":"#fff0f0")
              : `linear-gradient(135deg, ${C.accent}, ${C.accentCyan})`,
            border: notifPermiso==="granted" ? `1px solid ${C.danger}` : "none",
            borderRadius:"10px", padding:"12px 24px", cursor: notifPermiso==="denied"?"not-allowed":"pointer",
            color: notifPermiso==="granted" ? C.danger : "#fff",
            fontSize:"13px", fontWeight:"600", fontFamily:"Inter,system-ui,sans-serif",
            opacity: notifPermiso==="denied" ? 0.5 : 1, minWidth:"160px",
          }}>
          {notifPermiso==="granted" ? "🔕 Desactivar alertas" : notifPermiso==="denied" ? "🚫 Permiso denegado" : "🔔 Activar alertas"}
        </button>
      </Card>
    </>
  );
}

// ─── Sección: Mapa ────────────────────────────────────────────────────────────
function ViewMapa({ sensoresData, sensores, setCultivoSensor, C }) {
  return (
    <Card C={C} style={{ padding:0, overflow:"hidden" }}>
      <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`,
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <SectionTitle C={C}>🗺️ Red de Sensores — Argentina</SectionTitle>
        <span style={{ color:C.textMuted, fontSize:"10px" }}>{sensores.length} campos activos</span>
      </div>
      <div style={{ height:"520px" }}>
        <MapContainer center={[-33.0,-64.0]} zoom={4} style={{ height:"100%", width:"100%" }}>
          <TileLayer url={C.mapTile} attribution="&copy; CARTO"/>
          {sensores.map(s => {
            const d = sensoresData[s.id];
            const color = !d ? "#7d8590" : d.alerta ? "#f85149" : d.bomba==="ON" ? "#d4a017" : "#3fb950";
            return (
              <div key={s.id}>
                <Circle center={[s.lat,s.lng]} radius={35000} color={color} fillColor={color} fillOpacity={0.12} weight={1.5}/>
                <Marker position={[s.lat,s.lng]}>
                  <Popup>
                    <div style={{ fontFamily:"system-ui,sans-serif", minWidth:"200px" }}>
                      <strong>{s.nombre} — {s.provincia}</strong><br/>
                      <div style={{ margin:"6px 0" }}>
                        <label style={{ fontSize:"11px", display:"block", marginBottom:"3px" }}>Cultivo:</label>
                        <select
                          value={s.cultivo}
                          onChange={e => setCultivoSensor(s.id, e.target.value)}
                          style={{ width:"100%", padding:"4px 6px", borderRadius:"4px", fontSize:"12px" }}>
                          {Object.entries(CULTIVOS).map(([nombre, datos]) => (
                            <option key={nombre} value={nombre}>{datos.emoji} {nombre}</option>
                          ))}
                        </select>
                      </div>
                      {d ? <>💧 {d.humedad}% · 🌡️ {d.temperatura}°C · 🚰 {d.bomba}
                        {d.alerta && <><br/><span style={{color:"red"}}>⚠️ Alerta crítica</span></>}
                      </> : "Sin datos"}
                    </div>
                  </Popup>
                </Marker>
              </div>
            );
          })}
        </MapContainer>
      </div>
      <div style={{ padding:"10px 20px", borderTop:`1px solid ${C.border}`,
        display:"flex", gap:"14px", flexWrap:"wrap" }}>
        {sensores.map(s => {
          const d = sensoresData[s.id];
          const color = !d ? C.textMuted : d.alerta ? C.danger : d.bomba==="ON" ? C.warn : C.accent;
          return (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:color }}/>
              <span style={{ fontSize:"10px", color:C.textMuted }}>{s.provincia}</span>
              {d && <span style={{ fontSize:"10px", color }}>{d.humedad}%</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Sección: Ahorro de agua ──────────────────────────────────────────────────
function ViewAhorro({ readings, C, dark }) {
  const horas           = readings.length * (5/3600);
  const litrosTrad      = Math.round(HECTAREAS * LITROS_TRADICIONAL  * horas);
  const litrosAgro      = Math.round(HECTAREAS * LITROS_AGROSOLUCION * horas);
  const ahorrado        = litrosTrad - litrosAgro;
  const porcentaje      = litrosTrad > 0 ? Math.round((ahorrado/litrosTrad)*100) : 63;
  const piletas         = (ahorrado/2500000).toFixed(3);

  const items = [
    { icon:"💧", value:ahorrado.toLocaleString("es-AR"), label:"Litros ahorrados",       color:C.accent },
    { icon:"📉", value:`${porcentaje}%`,                  label:"Reducción consumo",      color:C.accentCyan },
    { icon:"🏊", value:piletas,                            label:"Piletas olímpicas",      color:C.cond },
    { icon:"🌾", value:HECTAREAS,                          label:"Hectáreas monitoreadas", color:C.accentGold },
  ];

  return (
    <Card C={C} style={{ borderLeft:`3px solid ${C.accent}` }}>
      <SectionTitle C={C}>💧 Impacto Hídrico Estimado · {HECTAREAS} hectáreas</SectionTitle>
      <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
        {items.map(({ icon,value,label,color }) => (
          <div key={label} style={{ flex:"1 1 130px", textAlign:"center", padding:"16px 12px",
            background:C.panelAlt, borderRadius:"10px", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:"26px", marginBottom:"8px" }}>{icon}</div>
            <div style={{ color, fontSize:"22px", fontWeight:"700", marginBottom:"4px" }}>{value}</div>
            <div style={{ color:C.textMuted, fontSize:"9px", letterSpacing:"1px", textTransform:"uppercase" }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:"14px", padding:"10px 14px", background:C.panelAlt,
        borderRadius:"8px", fontSize:"11px", color:C.textMuted, borderLeft:`2px solid ${C.accentGold}` }}>
        📌 Riego tradicional: {LITROS_TRADICIONAL.toLocaleString()} L/ha·h &nbsp;·&nbsp;
        AGroSoluc: {LITROS_AGROSOLUCION.toLocaleString()} L/ha·h &nbsp;·&nbsp;
        Ahorro del {Math.round((1-LITROS_AGROSOLUCION/LITROS_TRADICIONAL)*100)}%
      </div>
    </Card>
  );
}

// ─── Sección: Histórico ───────────────────────────────────────────────────────
function ViewHistorico({ readings, rangos, cultivoGlobal, C }) {
  const charts = [
    { key:"humedad",       label:"💧 Humedad del Suelo", color:C.water, unit:"%",   domain:[rangos.humedad[0]-5, rangos.humedad[4]+5], refMin:rangos.humedad[2], refMax:rangos.humedad[3] },
    { key:"temperatura",   label:"🌡️ Temperatura",       color:C.temp,  unit:"°C",  domain:[rangos.temp[0]-2,   rangos.temp[3]+2],    refMin:rangos.temp[1],    refMax:rangos.temp[2]    },
    { key:"conductividad", label:"⚡ Conductividad",      color:C.cond,  unit:" mS", domain:[rangos.cond[0]-0.2, rangos.cond[3]+0.2],  refMin:rangos.cond[1],    refMax:rangos.cond[2]    },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
      {charts.map(({ key,label,color,unit,domain,refMin,refMax }) => (
        <Card key={key} C={C}>
          <SectionTitle C={C}>{label} — {CULTIVOS[cultivoGlobal]?.emoji} {cultivoGlobal} · {readings.length} lecturas</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={readings}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid}/>
              <XAxis dataKey="hora" tick={{ fill:C.textMuted, fontSize:10 }} interval="preserveStartEnd"/>
              <YAxis domain={domain} tick={{ fill:C.textMuted, fontSize:10 }} unit={unit}/>
              <Tooltip content={<ChartTooltip C={C}/>}/>
              <ReferenceLine y={refMin} stroke={C.accent} strokeDasharray="3 3"
                label={{ value:"Óptimo mín", fill:C.accent, fontSize:9, position:"insideTopRight" }}/>
              <ReferenceLine y={refMax} stroke={C.accentCyan} strokeDasharray="3 3"
                label={{ value:"Óptimo máx", fill:C.accentCyan, fontSize:9, position:"insideTopRight" }}/>
              <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} name={label}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      ))}
    </div>
  );
}

// ─── Sección: Predicción IA ───────────────────────────────────────────────────
function ViewIA({ readings, rangos, C }) {
  const umbralCritico = rangos.humedad[0];
  if (readings.length < 5) {
    return (
      <Card C={C} style={{ textAlign:"center", padding:"40px" }}>
        <div style={{ fontSize:"32px", marginBottom:"12px" }}>🤖</div>
        <div style={{ fontSize:"14px", marginBottom:"8px" }}>Recopilando datos para el modelo...</div>
        <div style={{ fontSize:"11px", color:C.textMuted }}>
          Se necesitan al menos 5 lecturas. Actuales: {readings.length}
        </div>
      </Card>
    );
  }

  const data = readings.slice(-20).map((r,i) => ({ x:i, y:r.humedad }));
  const n    = data.length;
  const sumX = data.reduce((a,d)=>a+d.x,0);
  const sumY = data.reduce((a,d)=>a+d.y,0);
  const sumXY= data.reduce((a,d)=>a+d.x*d.y,0);
  const sumX2= data.reduce((a,d)=>a+d.x*d.x,0);
  const slope     = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
  const intercept = (sumY - slope*sumX) / n;

  const predicciones = Array.from({length:12},(_,i) => ({
    label: `+${((i+1)*5/60).toFixed(1)}m`,
    pred:  +Math.max(0,Math.min(100, slope*(n+i)+intercept)).toFixed(2),
  }));

  const tendencia      = slope > 0.1 ? "subiendo" : slope < -0.1 ? "bajando" : "estable";
  const tendenciaColor = tendencia==="subiendo" ? C.accent : tendencia==="bajando" ? C.danger : C.warn;
  const tendenciaIcon  = tendencia==="subiendo" ? "📈" : tendencia==="bajando" ? "📉" : "➡️";
  const humedadPred    = predicciones[predicciones.length-1].pred;

  let tiempoAlerta = "Sin riesgo";
  if (slope < 0) {
    const lecturasFaltantes = (umbralCritico - intercept) / slope - n;
    if (lecturasFaltantes > 0) {
      const minutos = Math.round(lecturasFaltantes * 5 / 60);
      const h = Math.floor(minutos/60), m = minutos%60;
      tiempoAlerta = h > 0 ? `${h}h ${m}min` : `${m} minutos`;
    }
  }

  const reales = readings.slice(-10).map(r => ({ label:r.hora, real:r.humedad, pred:null }));
  const preds  = predicciones.map(p => ({ label:p.label, real:null, pred:p.pred }));
  const chartData = [...reales, ...preds];
  const allVals = [...reales.map(r=>r.real), ...preds.map(p=>p.pred), 25];
  const yMin = Math.floor(Math.min(...allVals)-3);
  const yMax = Math.ceil(Math.max(...allVals)+3);

  const kpis = [
    { icon:tendenciaIcon, value:tendencia,    label:"Tendencia",             color:tendenciaColor },
    { icon:"💧",           value:`${humedadPred}%`, label:"Humedad en 1 min", color:C.accentCyan },
    { icon:"⏱️",           value:tiempoAlerta, label:"Tiempo al umbral",     color:tiempoAlerta!=="Sin riesgo"?C.danger:C.accent },
    { icon:"📊",           value:(slope>=0?"+":"")+slope.toFixed(3), label:"Pendiente del modelo", color:C.accentGold },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
      <Card C={C} style={{ borderLeft:`3px solid ${C.accentCyan}` }}>
        <SectionTitle C={C}>🤖 Modelo Predictivo — Regresión Lineal</SectionTitle>
        <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
          {kpis.map(({ icon,value,label,color }) => (
            <div key={label} style={{ flex:"1 1 130px", textAlign:"center", padding:"16px",
              background:C.panelAlt, borderRadius:"10px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:"22px", marginBottom:"6px" }}>{icon}</div>
              <div style={{ color, fontSize:"18px", fontWeight:"700", marginBottom:"4px",
                textTransform:"capitalize" }}>{value}</div>
              <div style={{ color:C.textMuted, fontSize:"9px", letterSpacing:"1px",
                textTransform:"uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card C={C}>
        <SectionTitle C={C}>📈 Proyección de Humedad — Próximos 60 segundos</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top:10, right:20, left:0, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid}/>
            <XAxis dataKey="label" tick={{ fill:C.textMuted, fontSize:9 }} interval="preserveStartEnd"/>
            <YAxis domain={[yMin,yMax]} tick={{ fill:C.textMuted, fontSize:10 }} unit="%"/>
            <Tooltip content={<ChartTooltip C={C}/>}/>
            <ReferenceLine y={umbralCritico} stroke={C.danger} strokeDasharray="4 4"
              label={{ value:`Umbral ${umbralCritico}%`, fill:C.danger, fontSize:10, position:"insideTopLeft" }}/>
            <Line type="monotone" dataKey="real" stroke={C.accentCyan} strokeWidth={2.5}
              dot={false} name="Humedad real" connectNulls={false}/>
            <Line type="monotone" dataKey="pred" stroke={C.accentGold} strokeWidth={2.5}
              strokeDasharray="6 3" dot={false} name="Predicción" connectNulls={false}/>
          </LineChart>
        </ResponsiveContainer>
        <div style={{ marginTop:"10px", display:"flex", gap:"16px", fontSize:"10px",
          color:C.textMuted, flexWrap:"wrap" }}>
          {[
            { color:C.accentCyan, label:"Datos reales" },
            { color:C.accentGold, label:"Predicción" },
            { color:C.danger,     label:"Umbral crítico" },
          ].map(({ color,label }) => (
            <span key={label} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <span style={{ width:"18px", height:"2px", background:color, display:"inline-block" }}/>
              {label}
            </span>
          ))}
        </div>
      </Card>

      <div style={{ padding:"12px 16px", background:C.panelAlt, border:`1px solid ${C.border}`,
        borderLeft:`2px solid ${C.accentCyan}`, borderRadius:"8px", fontSize:"11px", color:C.textMuted }}>
        📌 Modelo basado en regresión lineal sobre las últimas {Math.min(readings.length,20)} lecturas.
        Se actualiza en tiempo real con cada nuevo dato del sensor.
      </div>
    </div>
  );
}

// ─── Sección: Registro ────────────────────────────────────────────────────────
function ViewLog({ readings, C }) {
  return (
    <Card C={C}>
      <SectionTitle C={C}>Registro completo de telemetría</SectionTitle>
      <div style={{ overflowY:"auto", maxHeight:"500px" }}>
        {[...readings].reverse().map((r,i) => (
          <div key={i} style={{ display:"flex", gap:"12px", padding:"6px 0",
            borderBottom:`1px solid ${C.border}`, fontSize:"11px",
            opacity:Math.max(0.35,1-i*0.03), flexWrap:"wrap", color:C.textMuted }}>
            <span style={{ minWidth:"75px" }}>{r.hora}</span>
            <span style={{ color:C.water  }}>Hum: {r.humedad}%</span>
            <span style={{ color:C.temp   }}>Temp: {r.temperatura}°C</span>
            <span style={{ color:C.cond   }}>Cond: {r.conductividad} mS</span>
            <span style={{ color:r.bomba==="ON"?C.accent:C.textMuted }}>Bomba: {r.bomba}</span>
            {r.alerta && <span style={{ color:C.danger }}>⚠ Alerta</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Sección: Guía de uso ─────────────────────────────────────────────────────
function ViewGuia({ C }) {
  const [abierta, setAbierta] = useState(null);

  const secciones = [
    { id:"dashboard", icon:"📊", titulo:"Dashboard",
      resumen:"Panel principal con el estado en tiempo real del campo.",
      contenido:[
        { sub:"¿Qué muestra?", texto:"Los indicadores más importantes del suelo en este momento: humedad, temperatura, conductividad eléctrica y estado de la bomba de riego." },
        { sub:"Selector de cultivo global", texto:"En la parte superior del dashboard podés elegir el tipo de cultivo de tu campo principal. Al cambiar el cultivo, los gauges, rangos óptimos, alertas y predicción IA se ajustan automáticamente a ese cultivo." },
        { sub:"Estado de humedad", texto:"Junto al selector verás el estado actual: ÓPTIMO (verde), BAJO (amarillo), CRÍTICO (rojo) o ALTO (cyan)." },
        { sub:"Las tarjetas inferiores", texto:"Muestran el valor actual con un mini gráfico de tendencia. Si la línea baja sostenidamente, el suelo se está secando." },
      ]
    },
    { id:"cultivos", icon:"🌱", titulo:"Selección de Cultivo",
      resumen:"Rangos adaptativos para más de 28 cultivos distintos.",
      contenido:[
        { sub:"¿Para qué sirve?", texto:"Cada cultivo tiene necesidades hídricas, térmicas y de nutrientes distintas. Al seleccionar el cultivo correcto, AGroSoluc ajusta automáticamente todos los umbrales." },
        { sub:"Cultivo global vs. por campo", texto:"Podés elegir un cultivo global desde el Dashboard. Y desde el Mapa podés asignarle un cultivo diferente a cada sensor." },
        { sub:"Cultivos disponibles", texto:"Soja, Maíz, Trigo, Girasol, Arroz, Caña de azúcar, Vid/Uva, Tomate, Papa, Sorgo, Cebada, Algodón, Poroto, Lechuga, Cebolla, Ajo, Espinaca, Pimiento, Zapallo, Yerba mate, Olivo, Durazno, Manzana, Pera, Ciruela, Espárrago, Tabaco, Arándano." },
        { sub:"¿Qué se adapta?", texto:"• Los gauges ajustan su escala.\n• Los gráficos históricos muestran líneas de rango óptimo.\n• La Predicción IA usa el umbral crítico del cultivo.\n• Las alertas se disparan al umbral crítico correcto." },
      ]
    },
    { id:"humedad", icon:"💧", titulo:"Humedad del Suelo",
      resumen:"El indicador más importante para decidir cuándo regar.",
      contenido:[
        { sub:"¿Qué significa?", texto:"Mide el porcentaje de agua disponible en el suelo." },
        { sub:"Rangos según cultivo", texto:"Los rangos varían por cultivo:\n• Arroz: óptimo 85–95%\n• Trigo: óptimo 50–65%\n• Tomate: óptimo 70–80%\n• Olivo: óptimo 50–60% (tolera sequía)" },
        { sub:"¿Cómo actuar?", texto:"AGroSoluc activa la bomba automáticamente cuando la humedad baja del umbral bajo del cultivo seleccionado." },
      ]
    },
    { id:"mapa", icon:"🗺️", titulo:"Mapa de Sensores",
      resumen:"12 campos activos en todo el país con gestión individual de cultivos.",
      contenido:[
        { sub:"¿Qué muestra?", texto:"Un mapa interactivo con 12 sensores distribuidos en Buenos Aires, Córdoba, Santa Fe, Entre Ríos, La Pampa, Mendoza, San Juan, Tucumán, Misiones, Río Negro, Chaco y Salta." },
        { sub:"Cambiar cultivo por campo", texto:"Hacé click en cualquier sensor para abrir su popup y asignarle el cultivo específico de ese campo." },
        { sub:"Colores", texto:"• Verde: humedad óptima.\n• Amarillo: bomba activa, regando.\n• Rojo: alerta crítica." },
      ]
    },
    { id:"ahorro", icon:"💧", titulo:"Ahorro de Agua",
      resumen:"Cuantifica el impacto ambiental del riego inteligente.",
      contenido:[
        { sub:"¿Qué mide?", texto:"Compara riego tradicional (horario fijo) versus AGroSoluc (solo cuando el suelo lo necesita)." },
        { sub:"¿Por qué importa?", texto:"En Argentina, la agricultura consume el 70% del agua dulce. AGroSoluc puede reducir ese consumo hasta un 63%." },
      ]
    },
    { id:"ia", icon:"🤖", titulo:"Predicción IA",
      resumen:"Anticipa problemas antes de que ocurran.",
      contenido:[
        { sub:"¿Cómo funciona?", texto:"Regresión lineal sobre las últimas lecturas para predecir la evolución de la humedad." },
        { sub:"Umbral dinámico", texto:"El umbral crítico se ajusta al cultivo seleccionado automáticamente." },
        { sub:"Indicadores", texto:"• Tendencia: sube/baja/estable.\n• Humedad predicha en 1 minuto.\n• Tiempo estimado al umbral crítico.\n• Pendiente del modelo." },
      ]
    },
    { id:"alertas", icon:"🔔", titulo:"Sistema de Alertas",
      resumen:"Notificaciones push para actuar a tiempo.",
      contenido:[
        { sub:"¿Cómo funciona?", texto:"Cuando la humedad baja del umbral crítico del cultivo, el sistema envía una notificación push al dispositivo." },
        { sub:"¿Cómo activarlas?", texto:"Clickeá 'Activar alertas' en el Dashboard y aceptá el permiso del navegador." },
      ]
    },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
      <Card C={C} style={{ borderLeft:`3px solid ${C.accentCyan}` }}>
        <div style={{ fontSize:"16px", fontWeight:"700", marginBottom:"6px" }}>Guía de uso de AGroSoluc</div>
        <div style={{ fontSize:"12px", color:C.textMuted, lineHeight:"1.6" }}>
          Explicación de cada variable y cómo interpretarla. Hacé click en cualquier sección para expandirla.
        </div>
      </Card>
      {secciones.map(s => (
        <div key={s.id} style={{ background:C.panel,
          border:`1px solid ${abierta===s.id ? C.accentCyan : C.border}`,
          borderRadius:"12px", overflow:"hidden", boxShadow:C.cardShadow, transition:"border 0.2s" }}>
          <button onClick={() => setAbierta(abierta===s.id ? null : s.id)} style={{
            width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"16px 20px", background:"transparent", border:"none", cursor:"pointer",
            color:C.text, fontFamily:"Inter,system-ui,sans-serif", gap:"12px",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
              <span style={{ fontSize:"20px" }}>{s.icon}</span>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:"14px", fontWeight:"600" }}>{s.titulo}</div>
                <div style={{ fontSize:"11px", color:C.textMuted, marginTop:"2px" }}>{s.resumen}</div>
              </div>
            </div>
            <span style={{ color:C.textMuted, fontSize:"14px", transition:"transform 0.2s",
              transform: abierta===s.id ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </button>
          {abierta===s.id && (
            <div style={{ padding:"0 20px 20px", borderTop:`1px solid ${C.border}` }}>
              {s.contenido.map((c,i) => (
                <div key={i} style={{ marginTop:"14px" }}>
                  <div style={{ fontSize:"12px", fontWeight:"600", color:C.accentCyan, marginBottom:"6px" }}>{c.sub}</div>
                  <div style={{ fontSize:"12px", color:C.textMuted, lineHeight:"1.7", whiteSpace:"pre-line" }}>{c.texto}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── App principal ────────────────────────────────────────────────────────────
export default function App() {
  const [theme,          setTheme]          = useState("dark");
  const [readings,       setReadings]       = useState([]);
  const [sensoresData,   setSensoresData]   = useState({});
  const [wsStatus,       setWsStatus]       = useState("conectando");
  const [vista,          setVista]          = useState("dashboard");
  const [menuAbierto,    setMenuAbierto]    = useState(false);
  const [notifPermiso,   setNotifPermiso]   = useState("default");
  const [cultivoGlobal,  setCultivoGlobal]  = useState(CULTIVO_DEFAULT);
  const [sensores,       setSensores]       = useState(SENSORES_INIT);
  const ultimaAlertaRef = useRef(false);
  const wsRef   = useRef(null);
  const menuRef = useRef(null);
  const C    = THEMES[theme];
  const dark = theme === "dark";

  const cultivoPrincipal = cultivoGlobal;
  const rangos = CULTIVOS[cultivoPrincipal];

  function setCultivoSensor(sensorId, cultivo) {
    setSensores(prev => prev.map(s => s.id === sensorId ? { ...s, cultivo } : s));
  }

  useEffect(() => {
    const init = {};
    sensores.forEach(s => { init[s.id] = generarLectura(); });
    setSensoresData(init);
    const id = setInterval(() => {
      setSensoresData(prev => {
        const next = { ...prev };
        sensores.slice(1).forEach(s => { next[s.id] = generarLectura(prev[s.id]); });
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if ("Notification" in window) setNotifPermiso(Notification.permission);
  }, []);

  function enviarNotificacion(humedad) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    new Notification("⚠️ AGroSoluc — Alerta Crítica", {
      body: `Humedad del suelo: ${humedad}% — Activar riego inmediatamente.`,
      tag:  "agrosolucion-alerta",
    });
  }

  useEffect(() => {
    function conectar() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen  = () => setWsStatus("conectado");
      ws.onmessage = (event) => {
        try {
          const dato = JSON.parse(event.data);
          const r = {
            timestamp:    new Date(),
            hora:         new Date().toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit", second:"2-digit" }),
            humedad:      dato.sensores?.humedad_suelo       ?? 0,
            temperatura:  dato.sensores?.temperatura_suelo   ?? 0,
            conductividad:dato.sensores?.conductividad_electrica ?? 0,
            bomba:        dato.estado_bomba ?? "OFF",
            alerta:       dato.alerta       ?? false,
            ubicacion:    dato.ubicacion    ?? "Campo Norte",
            cultivo:      dato.cultivo      ?? "Soja",
          };
          setReadings(prev => [...prev, r].slice(-50));
          setSensoresData(prev => ({ ...prev, "sensor-01": {
            humedad:r.humedad, temperatura:r.temperatura,
            conductividad:r.conductividad, bomba:r.bomba, alerta:r.alerta
          }}));
          if (r.alerta && !ultimaAlertaRef.current) enviarNotificacion(r.humedad);
          ultimaAlertaRef.current = r.alerta;
        } catch(e) {}
      };
      ws.onclose = () => { setWsStatus("reconectando"); setTimeout(conectar, 3000); };
      ws.onerror = () => ws.close();
    }
    conectar();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const latest  = readings[readings.length-1];
  const sinDatos = readings.length === 0;
  const vistaInfo = MENU_ITEMS.find(m => m.id === vista);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"Inter,system-ui,sans-serif", padding:"20px",
      boxSizing:"border-box", transition:"background 0.3s, color 0.3s" }}>
      <div style={{ maxWidth:"100%", margin:"0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:"20px", paddingBottom:"16px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <div style={{ width:"32px", height:"32px", borderRadius:"8px",
                background:`linear-gradient(135deg,${C.accent},${C.accentCyan})`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px" }}>🌱</div>
              <div>
                <div style={{ display:"flex", alignItems:"baseline", gap:"4px" }}>
                  <span style={{ fontSize:"17px", fontWeight:"700", color:C.accent, letterSpacing:"1px" }}>AGRO</span>
                  <span style={{ fontSize:"17px", fontWeight:"300", letterSpacing:"1px" }}>SOLUC</span>
                  <span style={{ fontSize:"9px", color:C.accentGold,
                    background: dark?"rgba(212,160,23,0.15)":"rgba(154,103,0,0.1)",
                    padding:"2px 6px", borderRadius:"4px", marginLeft:"4px" }}>BETA</span>
                </div>
                <div style={{ color:C.textMuted, fontSize:"9px", letterSpacing:"1.5px", textTransform:"uppercase" }}>
                  Telemetría Agrícola · Edge Computing
                </div>
              </div>
            </div>
            <div ref={menuRef} style={{ position:"relative" }}>
              <button onClick={() => setMenuAbierto(m => !m)} style={{
                background: menuAbierto ? C.accent : C.menuBtn,
                border:`1px solid ${menuAbierto ? C.accent : C.border}`,
                borderRadius:"8px", padding:"6px 14px", cursor:"pointer",
                color: menuAbierto ? "#fff" : C.text,
                fontSize:"17px", fontWeight:"700", letterSpacing:"3px",
                fontFamily:"Inter,system-ui,sans-serif", transition:"all 0.2s",
              }}>···</button>
              {menuAbierto && (
                <div style={{ position:"absolute", left:0, top:"44px", zIndex:1000,
                  background:C.panel, border:`1px solid ${C.border}`, borderRadius:"12px",
                  padding:"6px", minWidth:"210px",
                  boxShadow: dark?"0 8px 32px rgba(0,0,0,0.7)":"0 8px 32px rgba(0,0,0,0.15)" }}>
                  {MENU_ITEMS.map(item => (
                    <button key={item.id} onClick={() => { setVista(item.id); setMenuAbierto(false); }} style={{
                      width:"100%", display:"flex", alignItems:"center", gap:"10px",
                      padding:"10px 14px", borderRadius:"8px", cursor:"pointer",
                      background: vista===item.id ? (dark?"rgba(63,185,80,0.12)":"rgba(26,127,55,0.08)") : "transparent",
                      border:"none", color: vista===item.id ? C.accent : C.text,
                      fontSize:"13px", textAlign:"left", fontFamily:"Inter,system-ui,sans-serif",
                      fontWeight: vista===item.id ? "600" : "400",
                    }}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                      {vista===item.id && <span style={{ marginLeft:"auto", color:C.accent, fontSize:"8px" }}>●</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"6px",
              background:C.panel, border:`1px solid ${C.border}`, borderRadius:"20px", padding:"5px 12px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%",
                background: wsStatus==="conectado" ? C.accent : C.warn,
                animation:"pulse 2s infinite" }}/>
              <span style={{ fontSize:"10px", color: wsStatus==="conectado" ? C.accent : C.warn }}>
                {wsStatus==="conectado" ? "Azure IoT · Online" : "Reconectando..."}
              </span>
            </div>
            <button onClick={() => setTheme(t => t==="dark"?"light":"dark")} style={{
              background:C.menuBtn, border:`1px solid ${C.border}`, borderRadius:"8px",
              padding:"6px 14px", cursor:"pointer", color:C.text, fontSize:"11px",
              fontFamily:"Inter,system-ui,sans-serif",
            }}>
              {dark ? "☀️ Modo claro" : "🌙 Modo oscuro"}
            </button>
          </div>
        </div>

        {/* ── Título vista ── */}
        <div style={{ marginBottom:"14px", display:"flex", alignItems:"center", gap:"8px" }}>
          <span>{vistaInfo?.icon}</span>
          <span style={{ fontSize:"14px", fontWeight:"600" }}>{vistaInfo?.label}</span>
          <span style={{ fontSize:"11px", color:C.textMuted, marginLeft:"8px" }}>
            {CULTIVOS[cultivoGlobal]?.emoji} {cultivoGlobal}
          </span>
        </div>

        {!sinDatos && vista !== "mapa" && (
          <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:"10px",
            padding:"10px 16px", marginBottom:"14px", display:"flex", gap:"20px",
            flexWrap:"wrap", fontSize:"11px", color:C.textMuted }}>
            <span>📍 {latest?.ubicacion} · {latest?.cultivo}</span>
            <span>📡 sensor-humedad-01</span>
            <span>🕐 {latest?.timestamp.toLocaleTimeString("es-AR")}</span>
            <span>📊 {readings.length} lecturas</span>
          </div>
        )}

        {!sinDatos && latest?.alerta && vista !== "mapa" && (
          <div style={{ background: dark?"rgba(248,81,73,0.1)":"#fff0f0",
            border:`1px solid ${C.danger}`, borderLeft:`3px solid ${C.danger}`,
            borderRadius:"8px", padding:"10px 16px", marginBottom:"14px",
            display:"flex", alignItems:"center", gap:"10px" }}>
            <span>⚠️</span>
            <span style={{ color:C.danger, fontWeight:"600", fontSize:"12px" }}>
              Humedad crítica — Activar riego de inmediato
            </span>
          </div>
        )}

        {sinDatos && vista !== "mapa" && vista !== "guia" && (
          <Card C={C} style={{ textAlign:"center", padding:"40px" }}>
            <div style={{ fontSize:"32px", marginBottom:"12px" }}>📡</div>
            <div style={{ fontSize:"14px", marginBottom:"8px" }}>Esperando datos del sensor...</div>
            <div style={{ fontSize:"11px", color:C.textMuted }}>
              Asegurate de que el simulador Python y el servidor estén corriendo.
            </div>
          </Card>
        )}

        {vista === "mapa"      && <ViewMapa      sensoresData={sensoresData} sensores={sensores} setCultivoSensor={setCultivoSensor} C={C}/>}
        {vista === "guia"      && <ViewGuia      C={C}/>}
        {!sinDatos && (
          <>
            {vista === "dashboard" && <ViewDashboard latest={latest} readings={readings}
              notifPermiso={notifPermiso} setNotifPermiso={setNotifPermiso}
              enviarNotificacion={enviarNotificacion} cultivoGlobal={cultivoGlobal}
              setCultivoGlobal={setCultivoGlobal} rangos={rangos} C={C} dark={dark}/>}
            {vista === "ahorro"    && <ViewAhorro    readings={readings} C={C} dark={dark}/>}
            {vista === "historico" && <ViewHistorico readings={readings} rangos={rangos} cultivoGlobal={cultivoGlobal} C={C}/>}
            {vista === "ia"        && <ViewIA        readings={readings} rangos={rangos} C={C}/>}
            {vista === "log"       && <ViewLog       readings={readings} C={C}/>}
          </>
        )}

        <div style={{ textAlign:"center", marginTop:"20px", color:C.textDim, fontSize:"9px", letterSpacing:"2px" }}>
          AGROSOLUCION · RED BULL BASEMENT 2026 · AZURE IOT HUB · EDGE COMPUTING
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:${C.bg};}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        body{margin:0;}
        .leaflet-container{background:${C.bg};}
      `}</style>
    </div>
  );
}
