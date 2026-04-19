import { useState, useRef, useEffect } from "react";

const WHATSAPP_NUMBER = "31628619699";
const G = "#2D6A4F", GL = "#B7E4C7", GC = "#F8F4EE", GD = "#1B3A2E";

const LOADING_STEPS = [
  "Profiel van je dier analyseren…",
  "Beste voedingscombinatie zoeken…",
  "Portiegrootte berekenen…",
  "Advies op maat samenstellen…",
  "Bijna klaar…",
];

const BREED_KNOWLEDGE = `
RAS & GEZONDHEID KENNISBANK:

HONDEN — rasspecifiek:
- Labrador/Golden Retriever: sterke aanleg overgewicht + heupdysplasie. Kies weight-control of joint-variant. Portie strict volgen.
- Chihuahua/toy-rassen <3kg: klein maagje, hypoglykemie-risico. Kleine maaltijden, Mini of X-Small kibble formaat.
- Pomchi/Maltipoo en andere kleine kruisingen: behandel als miniaturras. Gevoelig voor tandproblemen → dental snack aanbevelen.
- Franse Bulldog/Mopshond/Pekingees (brachycefaal): platte bek, moeite met ronde kibble. Specifieke ras-kibble voorkeur.
- Dachshund/Teckel: rugproblemen. Gewicht cruciaal. Nooit overvoeren.
- Border Collie/Herder/Malinois: hoog energieverbruik. Sport & Agility of hogere portie.
- Senior klein ras (7+ jaar): nierondersteuning, gewrichten. Altijd senior-variant.
- Senior groot ras (5+ jaar): idem, eerder overstappen.
- Puppy: NOOIT volwassen voer. Klein ras tot 10 mnd, medium tot 12 mnd, groot ras tot 18-24 mnd.

KATTEN — rasspecifiek:
- Gesteriliseerd/gecastreerd: stofwisseling 20-30% trager. ALTIJD sterilised-variant. Portie 20% omlaag.
- Binnenkat: minder beweging, haarballen. Indoor of Hairball variant.
- Buitenkat: hogere caloriebehoefte. Outdoor variant.
- Maine Coon: groot ras, taurine cruciaal voor hart. Grote kibble.
- British Shorthair: aanleg voor overgewicht en nieraandoening. Sterilised + gewichtscontrole.
- Senior kat 7-10 jaar: Senior Stage 1. 10+ jaar: hogere fosfor-restrictie.
- Kitten tot 12 maanden: altijd kitten-voer.

GEZONDHEID → VOEDING:
- Overgewicht hond: Light/Weight Control variant. Portie 15% omlaag.
- Overgewicht kat: Sterilised. Maaltijdvoeding, geen vreetbak. Dierenarts voor plan.
- Diarree/gevoelige buik: Sensitive (lam of zalm). Geleidelijke overgang 10-14 dagen.
- Voedselallergie: Acana Singles (1 eiwit). Advance Hypoallergenic Snack.
- Gewrichtsproblemen: Advance Articular Stick als aanvulling. Visolie-rijk voer.
- Haarballen kat: Hairball-variant. Extra vocht via natvoer.
- Tandproblemen hond: Advance Dental Stick. Royal Canin Oral Sensitive.
- Urinary/plasproblemen kat: Royal Canin Urinary Care + natvoer voor vocht. Dierenarts verplicht.
- Nierprobleem: Veel natvoer/vocht. Altijd dierenarts.

COMBINATIES droog + nat:
- Standaard: 70% droogvoer + 30% natvoer (smakelijkheid + extra vocht)
- Urinary-problemen kat: 50% droog Urinary + 50% natvoer
- Kieskeurige eter: natvoer als topper over droogvoer
- Puppy: droogvoer + beetje warm water voor zachte textuur
- Natvoer volledig voor kat: 1 pouch 85g per 4kg lichaamsgewicht

LEVENSFASE OVERGANGEN:
- Puppy → adult: klein ras op 10 mnd, medium op 12 mnd, groot ras op 18-24 mnd
- Adult → senior: groot ras op 5 jaar, klein ras op 7-8 jaar
- Voor/na castratie: direct overschakelen naar sterilised-variant
- Voerwisseling: altijd 10-14 dagen geleidelijk (dag 1-3: 25% nieuw, dag 4-7: 50%, dag 8-10: 75%, dag 11+: 100%)
`;

function buildSystemPrompt(products, returningPet) {
  const byCat = {};
  (Array.isArray(products) ? products : []).forEach(p => {
    if (!byCat[p.category]) byCat[p.category] = [];
    byCat[p.category].push(p);
  });
  const fmt = list => (list || []).map(p =>
    `  - ${p.name} [${p.shopify_handle}]${p.portion_per_kg ? ` (${p.portion_per_kg}g/kg/dag)` : ""}${p.unit==="L"?` (kattenbak, ${p.litter_days||30} dgn)`:""}`)
    .join("\n");

  const ret = returningPet
    ? `\nTERUGKERENDE KLANT — gebruik UITSLUITEND de onderstaande gegevens. Verzin NOOIT details die er niet instaan.
Naam dier: ${returningPet.name}
Soort: ${returningPet.species || "onbekend"}
Ras: ${returningPet.breed || "onbekend"}
Gewicht: ${returningPet.weight_kg ? returningPet.weight_kg + "kg" : "onbekend"}
Gesteriliseerd: ${returningPet.neutered ? "ja" : "nee/onbekend"}
Gezondheid: ${returningPet.health_notes || "geen notities"}
Leefstijl: ${returningPet.lifestyle || "onbekend"}

Begin het gesprek met EXACT dit profiel. Zeg alleen wat je weet. Vul NIETS in wat niet bovenstaande staat.
Begroet de klant terug: "Welkom terug! Ik heb ${returningPet.name} nog in mijn geheugen (${returningPet.breed || returningPet.species}, ${returningPet.weight_kg ? returningPet.weight_kg + "kg" : "gewicht onbekend"}). Zoeken we weer voor hem/haar, of is er iets veranderd?"\n`
    : "";

  return `Je bent Snuf — de AI voedingsadviseur van PetsRefill Westland, hyperlokalale bezorgservice in Westland (NL).
${ret}
VRAAGVOLGORDE (max 1 vraag per beurt):
1. Naam van het dier
2. Ras — altijd vragen. Bij kruising: herken naam, bevestig, en vraag leeftijd+gewicht in HETZELFDE bericht.
3. Leeftijd + gewicht samen
4. Bijzonderheden: gesteriliseerd, gezondheid, leefstijl

GROOTTE-CATEGORIE (intern gebruiken, NIET vragen aan klant):
Na ontvangst van ras + gewicht, categoriseer stilzwijgend:
- Mini/klein: volwassen gewicht < 10 kg
- Medium: 10-25 kg
- Maxi/groot: 25-45 kg
- Giant: > 45 kg
Bij een pup: leid af uit RAS, niet uit huidig gewicht. Een Labrador-pup van 6mnd
weegt hetzelfde als een volwassen Jack Russell maar heeft compleet andere behoeften.
Gebruik deze categorie alléén om de juiste product-variant (Mini/Medium/Maxi) te
kiezen — noem het niet aan de klant, dat is onze slimheid.

FOTO: Analyseer ras zo goed mogelijk. Eerlijk bij twijfel.
GEZONDHEID: Verwijs ALTIJD naar dierenarts bij klachten. Daarna aanvullend advies. Nooit dierenarts spelen.

${BREED_KNOWLEDGE}

ASSORTIMENT (gebruik EXACT deze handles in DATA-blok):
DROOGVOER HOND:\n${fmt(byCat["droogvoer_hond"])}
DROOGVOER KAT:\n${fmt(byCat["droogvoer_kat"])}
NATVOER HOND:\n${fmt(byCat["natvoer_hond"])}
NATVOER KAT:\n${fmt(byCat["natvoer_kat"])}
KATTENBAK:\n${fmt(byCat["kattenbak"])}
SNACKS:\n${fmt(byCat["snack"])}

ADVIESREGELS — STRIKT VOLGEN:
1. Geef ALTIJD twee voer-producten: primair (Royal Canin — bewezen, herkenbaar) + alternatief (Advance of Acana — hogere marge)
2. Overweeg een COMBINATIE droog+nat als dat beter is voor het dier
3. Voeg een relevante snack of aanvulling toe als dat meerwaarde heeft (dental, articular, beloning)
4. ABSOLUUT VERBOD: je mag UITSLUITEND producten aanbevelen die letterlijk in bovenstaand assortiment staan, met een handle die je daar ziet. Noem NOOIT producten, merken of handles die niet in de lijst staan — ook niet ter vergelijking of informatie. Hill's, Eukanuba, Purina, Orijen, Farmina, Royal Canin Veterinary en andere niet-gelistede producten zijn verboden.
5. Als het ideale product niet in het assortiment zit: zeg dit eerlijk en bied het beste beschikbare alternatief aan. Zeg: "Dat product voeren wij niet, maar het beste alternatief uit ons assortiment is [product] omdat..."
6. Als een klant vraagt naar een specifiek niet-aangeboden product: geef het dichtstbijzijnde alternatief en leg uit waarom.

EINDADVIES — gebruik dit EXACTE formaat:
[schrijf warm persoonlijk advies]

---SNUF_DATA---
NAAM:[naam]
SPECIES:[hond of kat]
BREED:[ras]
WEIGHT:[kg als getal]
NEUTERED:[true/false]
HEALTH:[notities of geen]
LIFESTYLE:[binnen/buiten/actief/rustig]
P1_HANDLE:[shopify_handle]
P1_NAME:[productnaam]
P1_DOSIS:[gram/dag of 0]
P1_LABEL:[badge max 4 woorden]
P2_HANDLE:[shopify_handle of GEEN]
P2_NAME:[naam of GEEN]
P2_DOSIS:[gram/dag of 0]
P2_LABEL:[badge]
EX_HANDLE:[extra product handle of GEEN]
EX_NAME:[naam of GEEN]
EX_LABEL:[bijv. Dagelijkse dental snack]
---EINDE---

Sluit het eindadvies altijd af met deze vaste serviceinfo (compacte versie, na het advies):
"📦 Bestel vóór donderdag 12:00 — bezorging zaterdag aan huis in Westland.
🚗 Eerste levering gratis met code REFILL · Abonneer & bespaar 5%
💬 Vragen? App Marc — geen callcenter, gewoon direct contact.

Vraag daarna vriendelijk en optioneel of de klant zijn profiel wil opslaan voor een bezorgherinnering.

Toon: warm, persoonlijk, kort. Je/jouw.`;
}

const parseData = t => {
  const m = t.match(/---SNUF_DATA---([\s\S]*?)---EINDE---/);
  if (!m) return null;
  const g = k => { const r = m[1].match(new RegExp(`${k}:(.+)`)); return r ? r[1].trim() : null; };
  return {
    name:g("NAAM"), species:g("SPECIES"), breed:g("BREED"),
    weight:parseFloat(g("WEIGHT"))||0, neutered:g("NEUTERED")==="true",
    health:g("HEALTH"), lifestyle:g("LIFESTYLE"),
    p1h:g("P1_HANDLE"), p1n:g("P1_NAME"), p1d:parseInt(g("P1_DOSIS"))||0, p1l:g("P1_LABEL"),
    p2h:g("P2_HANDLE"), p2n:g("P2_NAME"), p2d:parseInt(g("P2_DOSIS"))||0, p2l:g("P2_LABEL"),
    exh:g("EX_HANDLE"), exn:g("EX_NAME"), exl:g("EX_LABEL"),
  };
};

const cleanTxt = t => t.replace(/---SNUF_DATA---[\s\S]*?---EINDE---/g,"").replace(/\n{3,}/g,"\n\n").trim();
const isFinal  = t => t.includes("---SNUF_DATA---");
const fmtBag   = g => g>=1000 ? `${g/1000}kg` : `${g}g`;

function sugBag(prod, dosis) {
  if (!prod || prod.unit==="L") return prod?.bag_sizes_g?.[0]||null;
  return prod.bag_sizes_g?.find(b=>b/dosis>=28) || prod.bag_sizes_g?.[prod.bag_sizes_g.length-1] || null;
}

function PCard({ handle, name, dosis, label, petName, products, isPrimary, isExtra }) {
  const prod = products?.find(p=>p.shopify_handle===handle);
  if (!handle||handle==="GEEN"||!name||name==="GEEN") return null;

  if (products?.length > 0 && !prod) {
    return (
      <div style={{ background:"#fff8f0", borderRadius:12, padding:"12px 14px", border:"2px solid #f59e0b" }}>
        <div style={{ fontSize:13, color:"#92400e", fontFamily:"Georgia,serif" }}>
          ⚠️ <strong>{name}</strong> staat momenteel niet in ons assortiment. Marc kijkt of dit te sourcen valt via VDM.
        </div>
      </div>
    );
  }
  const isL  = prod?.unit==="L";
  const sb   = prod ? sugBag(prod, dosis) : null;
  const days = sb&&dosis>0&&!isL ? Math.round(sb/dosis) : null;
  const others = prod?.bag_sizes_g?.filter(b=>b!==sb)||[];
  const waMsg = `Hoi Marc! Ik wil graag bestellen voor aankomende zaterdag.\n\nProduct: ${name}${sb?` (${isL?`${sb/1000}L`:fmtBag(sb)})`:""}\nVoor: ${petName||"mijn dier"}\nAdres: [vul in]\n\nAdvies via Snuf 🐾`;
  const row = { display:"flex", justifyContent:"space-between", fontSize:13, color:GD, marginBottom:5, fontFamily:"Georgia,serif" };
  const btn = (bg,col,brd) => ({ display:"block", textAlign:"center", padding:"9px 12px", borderRadius:9, background:bg, color:col, border:brd||"none", fontFamily:"Georgia,serif", fontSize:13, fontWeight:600, textDecoration:"none" });
  const bc  = isPrimary?G:isExtra?"#A07C3A":GL;
  return (
    <div style={{ background:"#fff", borderRadius:12, padding:"12px 14px", border:`2px solid ${bc}`, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, right:0, background:bc, color:isPrimary||isExtra?"#fff":GD, fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:"0 10px 0 8px", fontFamily:"Georgia,serif" }}>
        {label||(isPrimary?"Aanbevolen":isExtra?"Aanvulling":"Alternatief")}
      </div>
      <div style={{ fontWeight:700, fontSize:14, color:GD, marginBottom:8, marginTop:4, fontFamily:"Georgia,serif", paddingRight:80 }}>{name}</div>
      {isL ? <div style={row}><span>Gebruik</span><span>±{prod?.litter_days||30} dagen per bak</span></div> : (
        <>
          {dosis>0&&<div style={row}><span>Dagelijkse portie</span><strong>{dosis}g/dag</strong></div>}
          {sb&&<div style={row}><span>Aanbevolen maat</span><strong>{fmtBag(sb)}</strong></div>}
          {days&&<div style={row}><span>Gaat mee</span><strong>±{days} dagen</strong></div>}
          {others.length>0&&<div style={{ fontSize:11, color:"#aaa", marginBottom:4 }}>Ook: {others.map(b=>fmtBag(b)).join(" · ")}</div>}
        </>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:7, marginTop:11 }}>
        <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer" style={btn("#25D366","#fff")}>📲 Bestel via WhatsApp bij Marc</a>
        <a href={`https://petsrefillwestland.nl/products/${handle}`} target="_blank" rel="noopener noreferrer" style={btn("transparent",G,`2px solid ${G}`)}>🛒 Bekijk in de webshop</a>
      </div>
    </div>
  );
}

function RequestForm({ petName, petId, customerId }) {
  const [open, setOpen]     = useState(false);
  const [text, setText]     = useState("");
  const [sent, setSent]     = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_text: text.trim(), pet_name: petName || null, customer_id: customerId || null, pet_id: petId || null }),
      });
    } catch {}
    setSaving(false);
    setSent(true);
  };

  const waMsg = encodeURIComponent(`Hoi Marc! Ik wil graag een product aanvragen dat Snuf niet aanbeval.\n\nAanvraag: ${text.trim()}\nVoor: ${petName || "mijn dier"}\nAdres: [vul in]\n\nVerzonden via Snuf op petsrefillwestland.nl 🐾`);

  if (sent) return (
    <div style={{ background:"#f0faf4", border:`1px solid ${GL}`, borderRadius:10, padding:"12px 14px", fontSize:13, fontFamily:"Georgia,serif" }}>
      <div style={{ color:G, fontWeight:700, marginBottom:6 }}>✅ Aanvraag ontvangen!</div>
      <div style={{ color:"#555", marginBottom:10 }}>Marc bekijkt of hij dit kan sourcen en laat het weten.</div>
      <a href={`https://wa.me/31600000000?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
        style={{ display:"block", textAlign:"center", padding:"9px 12px", borderRadius:9, background:"#25D366", color:"#fff", fontWeight:600, textDecoration:"none", fontSize:13 }}>
        📲 Stuur ook een WhatsApp naar Marc
      </a>
    </div>
  );

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px dashed ${GL}`, background:"transparent", color:"#888", fontFamily:"Georgia,serif", fontSize:13, cursor:"pointer", textAlign:"left" }}>
      🔍 Ander product zoeken of aanvragen bij Marc?
    </button>
  );

  return (
    <div style={{ background:"#fafafa", border:`1.5px solid ${GL}`, borderRadius:12, padding:"12px 14px" }}>
      <div style={{ fontWeight:700, fontSize:13, color:G, marginBottom:6, fontFamily:"Georgia,serif" }}>📋 Product aanvragen</div>
      <div style={{ fontSize:12, color:"#888", fontFamily:"Georgia,serif", marginBottom:10 }}>Zoek je iets specifieks? Omschrijf het zo goed mogelijk — merk, type, maat — en Marc kijkt of hij het kan sourcen.</div>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder={`Bijv: "Hills Science Diet voor katten met nierprobleem, 1,5kg"`}
        rows={3}
        style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${GL}`, fontFamily:"Georgia,serif", fontSize:13, color:GD, outline:"none", background:"#fff", resize:"none", boxSizing:"border-box" }}
        onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=GL}/>
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <button onClick={submit} disabled={saving || !text.trim()} style={{ flex:1, padding:"10px", borderRadius:9, border:"none", background:!text.trim()?"#ccc":G, color:"#fff", fontFamily:"Georgia,serif", fontSize:13, fontWeight:600, cursor:!text.trim()?"default":"pointer" }}>
          {saving ? "Versturen…" : "Aanvraag versturen"}
        </button>
        <button onClick={() => setOpen(false)} style={{ padding:"10px 14px", borderRadius:9, border:`1.5px solid #ddd`, background:"transparent", color:"#aaa", fontFamily:"Georgia,serif", fontSize:13, cursor:"pointer" }}>✕</button>
      </div>
    </div>
  );
}

function ResultCards({ data, products }) {
  if (!data) return null;
  return (
    <div style={{ marginLeft:35, width:"calc(100% - 35px)", display:"flex", flexDirection:"column", gap:10, marginTop:10 }}>
      <div style={{ fontSize:12, color:"#999", fontFamily:"Georgia,serif", marginBottom:2 }}>🧮 Advies voor {data.name||"je dier"}</div>
      <PCard handle={data.p1h} name={data.p1n} dosis={data.p1d} label={data.p1l} petName={data.name} products={products} isPrimary/>
      <PCard handle={data.p2h} name={data.p2n} dosis={data.p2d} label={data.p2l} petName={data.name} products={products}/>
      <PCard handle={data.exh} name={data.exn} dosis={0} label={data.exl} petName={data.name} products={products} isExtra/>
      <RequestForm petName={data.name}/>
    </div>
  );
}

function SaveForm({ snufData, messages, onSaved }) {
  const [name,setName]=useState(""); const [phone,setPhone]=useState("");
  const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false);
  const save = async () => {
    if (!name||!phone) return; setSaving(true);
    try {
      const res = await fetch("/api/customer",{ method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ customerData:{name:name.trim(),phone}, petData:snufData?{name:snufData.name,species:snufData.species,breed:snufData.breed,weight_kg:snufData.weight,neutered:snufData.neutered,health_notes:snufData.health,lifestyle:snufData.lifestyle}:null, sessionData:{messages,recommendation:snufData} })
      });
      const data = await res.json();
      if (data?.customer?.id && onSaved) onSaved({ customer_id: data.customer.id, pet_id: data.pet?.id || null });
      setSaved(true);
    } catch {} setSaving(false);
  };
  if (saved) return <div style={{ background:"#f0faf4", border:`1px solid ${GL}`, borderRadius:10, padding:"10px 14px", fontSize:13, color:G, fontFamily:"Georgia,serif", marginLeft:35, marginTop:8 }}>✅ Profiel opgeslagen! Marc weet wie je bent bij de volgende levering.</div>;
  const inp = { padding:"9px 12px", borderRadius:9, border:`1.5px solid ${GL}`, fontFamily:"Georgia,serif", fontSize:13, outline:"none", background:GC, color:GD, width:"100%", boxSizing:"border-box" };
  return (
    <div style={{ background:"#f8f4ee", border:`1px solid ${GL}`, borderRadius:12, padding:"12px 14px", marginLeft:35, width:"calc(100% - 35px)", marginTop:8 }}>
      <div style={{ fontWeight:700, fontSize:13, color:G, marginBottom:8, fontFamily:"Georgia,serif" }}>📋 Profiel opslaan (optioneel)</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <input style={inp} placeholder="Jouw naam" value={name} onChange={e=>setName(e.target.value)}/>
        <input style={inp} placeholder="Telefoonnummer" value={phone} onChange={e=>setPhone(e.target.value)} type="tel"/>
        <button onClick={save} disabled={saving||!name||!phone} style={{ padding:"10px", borderRadius:9, border:"none", background:!name||!phone?"#ccc":G, color:"#fff", fontFamily:"Georgia,serif", fontSize:13, fontWeight:600, cursor:"pointer" }}>
          {saving?"Opslaan…":"Opslaan & onthouden"}
        </button>
      </div>
      <div style={{ fontSize:11, color:"#aaa", marginTop:6, fontFamily:"Georgia,serif" }}>Alleen gebruikt voor bezorgherinnering. Nooit gedeeld.</div>
    </div>
  );
}

function Dots() {
  return (
    <div style={{ display:"flex", gap:4, alignItems:"center", padding:"4px 0" }}>
      {[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:"50%", background:G, animation:`b 1.2s ease-in-out ${i*.2}s infinite` }}/>)}
      <style>{`@keyframes b{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}@keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

function LoadingCard({ petName }) {
  const [step,setStep]=useState(0);
  useEffect(()=>{ const id=setInterval(()=>setStep(s=>(s+1)%LOADING_STEPS.length),2000); return()=>clearInterval(id); },[]);
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:7, marginBottom:12 }}>
      <div style={{ width:28, height:28, borderRadius:"50%", background:G, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0, marginTop:2 }}>🐾</div>
      <div style={{ background:"#fff", borderRadius:"4px 13px 13px 13px", padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.07)", minWidth:200 }}>
        <div style={{ fontWeight:700, fontSize:13, color:G, marginBottom:8, fontFamily:"Georgia,serif" }}>🐾 Snuf stelt jouw advies op…</div>
        <div style={{ fontSize:12, color:"#888", fontFamily:"Georgia,serif", marginBottom:10, minHeight:18 }}>{LOADING_STEPS[step]}</div>
        <div style={{ height:4, background:GL, borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", background:G, borderRadius:4, width:`${((step+1)/LOADING_STEPS.length)*100}%`, transition:"width 1.8s ease" }}/>
        </div>
        <div style={{ fontSize:11, color:"#bbb", marginTop:6, fontFamily:"Georgia,serif" }}>Voor {petName||"je dier"} — zo nauwkeurig mogelijk.</div>
      </div>
    </div>
  );
}

function Bubble({ msg, isNew, calcData, showSave, products, messages, onSaved }) {
  const isBot = msg.role==="assistant";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:isBot?"flex-start":"flex-end", marginBottom:9, animation:isNew?"fu .3s ease forwards":"none" }}>
      <div style={{ display:"flex", justifyContent:isBot?"flex-start":"flex-end", width:"100%" }}>
        {isBot&&<div style={{ width:28, height:28, borderRadius:"50%", background:G, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, marginRight:7, flexShrink:0, marginTop:2 }}>🐾</div>}
        <div style={{ maxWidth:"78%", padding:"9px 12px", borderRadius:isBot?"4px 13px 13px 13px":"13px 4px 13px 13px", background:isBot?"#fff":G, color:isBot?GD:"#fff", fontSize:14, lineHeight:1.65, boxShadow:"0 1px 3px rgba(0,0,0,.07)", whiteSpace:"pre-wrap", fontFamily:"Georgia,serif" }}>
          {msg.image&&<img src={msg.image} alt="dier" style={{ width:"100%", borderRadius:8, marginBottom:6, display:"block" }}/>}
          {isBot?cleanTxt(msg.content):msg.content}
        </div>
      </div>
      {isBot&&calcData&&<ResultCards data={calcData} products={products}/>}
      {isBot&&showSave&&calcData&&<SaveForm snufData={calcData} messages={messages} onSaved={onSaved}/>}
    </div>
  );
}

function PhoneLookup({ onFound, onSkip }) {
  const [phone,setPhone]=useState(""); const [loading,setLoading]=useState(false); const [notFound,setNotFound]=useState(false);
  const lookup = async () => {
    const c=phone.replace(/\D/g,""); if(c.length<9)return;
    setLoading(true); setNotFound(false);
    try { const r=await fetch(`/api/customer?phone=${c}`); const d=await r.json(); if(d.found)onFound(d); else setNotFound(true); } catch {}
    setLoading(false);
  };
  return (
    <div style={{ padding:"16px 12px", background:"#f0faf4", borderRadius:12, marginBottom:12, border:`1px solid ${GL}` }}>
      <div style={{ fontWeight:700, fontSize:13, color:G, marginBottom:4, fontFamily:"Georgia,serif" }}>🐾 Al eerder advies gehad van Snuf?</div>
      <div style={{ fontSize:12, color:"#888", fontFamily:"Georgia,serif", marginBottom:10 }}>Vul je nummer in en ik herken je dier direct.</div>
      <div style={{ display:"flex", gap:7 }}>
        <input value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>e.key==="Enter"&&lookup()} placeholder="0612345678" type="tel"
          style={{ flex:1, padding:"9px 12px", borderRadius:9, border:`1.5px solid ${GL}`, fontFamily:"Georgia,serif", fontSize:13, outline:"none" }}/>
        <button onClick={lookup} disabled={loading} style={{ padding:"9px 14px", borderRadius:9, border:"none", background:G, color:"#fff", fontFamily:"Georgia,serif", fontSize:13, fontWeight:600, cursor:"pointer" }}>{loading?"…":"→"}</button>
      </div>
      {notFound&&<div style={{ fontSize:12, color:"#aaa", marginTop:6, fontFamily:"Georgia,serif" }}>Niet gevonden — geen probleem, we beginnen gewoon opnieuw.</div>}
      <button onClick={onSkip} style={{ background:"none", border:"none", color:"#aaa", fontSize:12, cursor:"pointer", marginTop:8, fontFamily:"Georgia,serif", textDecoration:"underline" }}>Overslaan — direct beginnen</button>
    </div>
  );
}

function ServiceInfo() {
  const items = [
    { icon:"📦", text:"Bestel voor donderdag 12:00 · bezorging zaterdag" },
    { icon:"🚗", text:"Eerste levering gratis met code REFILL" },
    { icon:"💳", text:"Abonneer & bespaar 5%" },
    { icon:"💬", text:"Vragen? App Marc — geen callcenter" },
  ];
  return (
    <div style={{ background:"#2D6A4F", borderRadius:10, padding:"10px 14px", margin:"10px 0 6px", display:"flex", flexDirection:"column", gap:5 }}>
      {items.map((it,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, color:"#fff", fontFamily:"Georgia,serif" }}>
          <span>{it.icon}</span><span style={{ color:GL }}>{it.text}</span>
        </div>
      ))}
    </div>
  );
}

function Disclaimer() {
  const [open,setOpen]=useState(false);
  return (
    <div style={{ marginTop:10, padding:"0 4px" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ background:"none", border:"none", cursor:"pointer", color:"#bbb", fontSize:11, textDecoration:"underline", fontFamily:"Georgia,serif", padding:0, display:"block", margin:"0 auto" }}>
        ⚠️ AI-gegenereerd advies door Snuf — lees disclaimer
      </button>
      {open&&<div style={{ marginTop:8, padding:"10px 12px", borderRadius:10, background:"#f0ede7", border:"1px solid #ddd", fontSize:11, color:"#777", lineHeight:1.6, fontFamily:"Georgia,serif" }}>
        <strong style={{ color:"#555" }}>Disclaimer</strong><br/><br/>
        De adviezen van Snuf worden gegenereerd door kunstmatige intelligentie en zijn uitsluitend bedoeld als algemene oriëntatie. Aan de verstrekte informatie kunnen geen rechten worden ontleend. PetsRefill Westland is niet aansprakelijk voor onjuistheden. Bij gezondheidsklachten altijd een dierenarts raadplegen.
      </div>}
    </div>
  );
}

const INIT = [{ role:"assistant", content:"Hoi! 👋 Ik ben Snuf, de AI voedingsadviseur van PetsRefill Westland.\n\nIk help je in een paar vragen het perfecte voer vinden. Wat voor dier heb je?", id:0 }];

export default function App() {
  const [products,setProducts]           = useState([]);
  const [phase,setPhase]                 = useState("animal");
  const [showPhoneLookup,setShowPhoneLookup] = useState(true);
  const [api,setApi]                     = useState([]);
  const [display,setDisplay]             = useState(INIT);
  const [calc,setCalc]                   = useState(null);
  const [input,setInput]                 = useState("");
  const [loading,setLoading]             = useState(false);
  const [genFinal,setGenFinal]           = useState(false);
  const [done,setDone]                   = useState(false);
  const [lastId,setLastId]               = useState(null);
  const [animal,setAnimal]               = useState("");
  const [petName,setPetName]             = useState("");
  const [returningPet,setReturningPet]   = useState(null);
  const [savedProfile,setSavedProfile]   = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);

  useEffect(()=>{
    fetch("/api/products")
      .then(r=>{ if(!r.ok) throw new Error("products fetch failed"); return r.json(); })
      .then(d=>{ if(Array.isArray(d)) setProducts(d); })
      .catch(()=>{});
  },[]);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[display,loading,calc]);
  useEffect(()=>{ if(!loading&&phase==="chat"&&!done)inputRef.current?.focus(); },[loading,phase,done]);

  const push=(role,content,image)=>{ const id=Date.now()+Math.random(); setLastId(id); setDisplay(d=>[...d,{role,content,id,image}]); };

  const callClaude = async (msgs, petOverride) => {
    const final = msgs.filter(m=>m.role==="user").length>=4;
    setLoading(true); if(final) setGenFinal(true);
    const prompt = buildSystemPrompt(products, petOverride !== undefined ? petOverride : returningPet);
    try {
      const res=await fetch("/api/chat",{ method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1600, system:prompt, messages:msgs }) });
      const data=await res.json();
      const text=data.content?.[0]?.text||"Er ging iets mis. Probeer het opnieuw.";
      setApi([...msgs,{role:"assistant",content:text}]);
      setLoading(false); setGenFinal(false);
      setTimeout(()=>{
        push("assistant",text);
        if(isFinal(text)){ const p=parseData(text); if(p){setCalc(p);if(p.name)setPetName(p.name);} setDone(true); }
      },150);
    } catch { setLoading(false); setGenFinal(false); push("assistant","Er ging iets mis. Probeer het opnieuw."); }
  };

  const handleAnimal = a => {
    setAnimal(a); push("user",`${a} 🐾`);
    const msgs=[{role:"user",content:`Ik heb een ${a}.`}]; setApi(msgs); setPhase("chat");
    setTimeout(()=>{ const q=`Leuk! En hoe heet je ${a.toLowerCase()}?`; push("assistant",q); setApi(m=>[...m,{role:"assistant",content:q}]); },350);
  };

  const handleSend = async () => {
    const val=input.trim(); if(!val||loading) return;
    setInput(""); push("user",val);
    const msgs=[...api,{role:"user",content:val}]; setApi(msgs); await callClaude(msgs);
  };

  const handlePhoto = async e => {
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=async ev=>{
      const b64=ev.target.result.split(",")[1];
      push("user","📷 Foto geüpload — Snuf analyseert het ras…",ev.target.result);
      const msg={role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type||"image/jpeg",data:b64}},{type:"text",text:`Dit is een foto van mijn ${animal||"dier"}. Kun je het ras herkennen?`}]};
      const msgs=[...api,msg]; setApi(msgs); await callClaude(msgs);
    };
    reader.readAsDataURL(file); e.target.value="";
  };

  const reset = () => {
    setPhase("animal"); setApi([]); setDisplay(INIT); setInput(""); setLoading(false);
    setGenFinal(false); setDone(false); setCalc(null); setAnimal(""); setPetName("");
    setReturningPet(null); setSavedProfile(null); setShowPhoneLookup(true);
  };

  const handleStartAbonnement = async () => {
    if (!calc) return;
    const customerId = savedProfile?.customer_id || returningPet?.customer_id;
    const petId      = savedProfile?.pet_id      || returningPet?.id;
    if (!customerId) {
      alert("Sla eerst je profiel op (naam + telefoonnummer) via het formulier hierboven.");
      return;
    }
    try {
      const r = await fetch("https://ftmyxsnrzudigtlrgntc.supabase.co/functions/v1/create-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId, pet_id: petId, recommendation: calc }),
      });
      const d = await r.json();
      if (d.success) {
        const days = d.items?.[0]?.days_supply || 30;
        alert(`✓ Gelukt! Eerste levering staat gepland voor aanstaande zaterdag. Over ~${days} dagen ontvang je een email om de volgende levering te bevestigen.`);
      } else {
        alert("Er ging iets mis: " + (d.error || "onbekende fout"));
      }
    } catch(e) {
      alert("Netwerkfout: " + e.message);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:GC, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif", padding:12 }}>
      <div style={{ width:"100%", maxWidth:400 }}>

        <div style={{ background:G, borderRadius:"14px 14px 0 0", padding:"13px 16px", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:24 }}>🐾</div>
          <div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:16 }}>Snuf</div>
            <div style={{ color:GL, fontSize:11, marginTop:1 }}>AI Voedingsadviseur · PetsRefill Westland</div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
            {products.length>0&&<div style={{ fontSize:10, color:GL }}>{products.length} producten</div>}
            <div style={{ width:8, height:8, borderRadius:"50%", background:products.length>0?"#4ade80":"#fbbf24", boxShadow:"0 0 0 3px rgba(74,222,128,.25)" }}/>
          </div>
        </div>

        <div style={{ background:"#EDE9E2", padding:"13px 10px", minHeight:340, maxHeight:460, overflowY:"auto", display:"flex", flexDirection:"column" }}>
          {phase==="animal"&&showPhoneLookup&&(
            <PhoneLookup
              onFound={data=>{
                const pet=data.customer?.pets?.[0];
                if(pet){setReturningPet(pet);setPetName(pet.name);}
                setSavedProfile({ customer_id: data.customer?.id, pet_id: pet?.id||null });
                setShowPhoneLookup(false);
                setPhase("chat");
                const msgs=[{role:"user",content:pet?`Ik ben terug voor ${pet.name}.`:"Ik wil advies."}];
                setApi(msgs);
                callClaude(msgs, pet||null);
              }}
              onSkip={()=>setShowPhoneLookup(false)}
            />
          )}
          {display.map((msg,i)=>(
            <Bubble key={msg.id} msg={msg} isNew={msg.id===lastId}
              calcData={done&&i===display.length-1&&msg.role==="assistant"?calc:null}
              showSave={done&&i===display.length-1&&msg.role==="assistant"}
              products={products} messages={api}
              onSaved={(profile)=>setSavedProfile(profile)}
            />
          ))}
          {loading&&genFinal&&<LoadingCard petName={petName}/>}
          {loading&&!genFinal&&(
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:9 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:G, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🐾</div>
              <div style={{ background:"#fff", padding:"9px 12px", borderRadius:"4px 13px 13px 13px", boxShadow:"0 1px 3px rgba(0,0,0,.07)" }}><Dots/></div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        <div style={{ background:"#fff", borderRadius:"0 0 14px 14px", padding:10, borderTop:"1px solid rgba(0,0,0,.05)", boxShadow:"0 4px 16px rgba(0,0,0,.07)" }}>
          {phase==="animal"&&!showPhoneLookup&&(
            <div style={{ display:"flex", gap:8 }}>
              {["Hond 🐕","Kat 🐈"].map(opt=>(
                <button key={opt} onClick={()=>handleAnimal(opt.split(" ")[0])}
                  style={{ flex:1, padding:"10px 6px", borderRadius:10, border:`2px solid ${G}`, background:"transparent", color:G, fontFamily:"Georgia,serif", fontSize:14, fontWeight:600, cursor:"pointer" }}
                  onMouseOver={e=>{e.currentTarget.style.background=G;e.currentTarget.style.color="#fff";}}
                  onMouseOut={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=G;}}
                >{opt}</button>
              ))}
            </div>
          )}
          {phase==="chat"&&!done&&(
            <div style={{ display:"flex", gap:7, alignItems:"center" }}>
              <button onClick={()=>fileRef.current?.click()} title="Foto van je dier"
                style={{ width:38, height:38, borderRadius:10, border:`1.5px solid ${GL}`, background:GC, color:G, fontSize:18, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>📷</button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:"none" }}/>
              <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSend()}
                placeholder={loading?"Snuf denkt na…":"Typ je antwoord…"} disabled={loading}
                style={{ flex:1, padding:"10px 12px", borderRadius:10, border:`1.5px solid ${GL}`, fontFamily:"Georgia,serif", fontSize:14, color:GD, outline:"none", background:loading?"#f5f5f5":GC, minWidth:0 }}
                onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=GL}/>
              <button onClick={handleSend} disabled={loading||!input.trim()}
                style={{ width:38, height:38, borderRadius:10, border:"none", background:loading||!input.trim()?"#ccc":G, color:"#fff", fontSize:18, cursor:"pointer", flexShrink:0 }}>→</button>
            </div>
          )}
          {done&&(
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <button onClick={handleStartAbonnement}
                style={{ width:"100%", padding:"12px", borderRadius:10, border:"none", background:G, color:"#fff", fontFamily:"Georgia,serif", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                ✓ Start abonnement — plan eerste levering
              </button>
              <button onClick={reset}
                style={{ width:"100%", padding:"10px", borderRadius:10, border:`2px solid ${G}`, background:"transparent", color:G, fontFamily:"Georgia,serif", fontSize:14, fontWeight:600, cursor:"pointer" }}>
                🔄 Nieuw dier adviseren
              </button>
            </div>
          )}
        </div>
        <ServiceInfo/>
        <Disclaimer/>
      </div>
    </div>
  );
}
