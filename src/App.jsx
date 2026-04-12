import { useState, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// ⚙️  INSTELLINGEN — alleen deze twee regels hoef je aan te passen
// ─────────────────────────────────────────────────────────────────────────────
const WHATSAPP_NUMBER = "31600000000"; // ← jouw zakelijk WhatsApp-nummer (zonder + of spaties)
// Product-URL's: vul de juiste Shopify-slug in nadat je live bent.
// Ga in Shopify naar elk product → kopieer het stukje na /products/ in de URL.
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTS = {
  // ── HOND · Royal Canin ────────────────────────────────────────────────────
  "Royal Canin X-Small Adult":           { url: "/products/rc-x-small-adult-15kg",         bags: [1500],                ppkg: 12 },
  "Royal Canin Mini Adult":              { url: "/products/rc-mini-adult",                  bags: [2000,4000,8000],      ppkg: 11 },
  "Royal Canin Mini Adult 8+":           { url: "/products/rc-mini-adult-8-2kg",            bags: [2000],                ppkg: 10 },
  "Royal Canin Mini Ageing 12+":         { url: "/products/rc-mini-ageing-12-1-5kg",        bags: [1500],                ppkg: 9  },
  "Royal Canin Mini Light Weight Care":  { url: "/products/rc-mini-light-weight-care-3kg",  bags: [3000],                ppkg: 9  },
  "Royal Canin Mini Puppy":              { url: "/products/rc-mini-puppy-junior-2kg",       bags: [2000],                ppkg: 16 },
  "Royal Canin Medium Adult":            { url: "/products/rc-medium-adult",                bags: [4000,15000],          ppkg: 10 },
  "Royal Canin Medium Puppy":            { url: "/products/rc-medium-puppy-4kg",            bags: [4000],                ppkg: 15 },
  "Royal Canin Maxi Adult":              { url: "/products/rc-maxi-adult-15kg",             bags: [15000],               ppkg: 9  },
  "Royal Canin Maxi Puppy":              { url: "/products/rc-maxi-puppy-4kg",              bags: [4000],                ppkg: 13 },
  "Royal Canin Chihuahua Adult":         { url: "/products/rc-chihuahua",                   bags: [500,1500,3000],       ppkg: 12 },
  "Royal Canin Dachshund Adult":         { url: "/products/rc-dachshund-adult-1-5kg",       bags: [1500],                ppkg: 11 },
  "Royal Canin French Bulldog Adult":    { url: "/products/rc-french-bulldog-ad-3kg",       bags: [3000],                ppkg: 10 },
  "Royal Canin Labrador Retriever Adult":{ url: "/products/rc-labrador-retr-ad-12kg",       bags: [12000],               ppkg: 9  },
  "Royal Canin Sensible":                { url: "/products/rc-sensible",                    bags: [2000,10000],          ppkg: 10 },
  "Royal Canin Oral Sensitive":          { url: "/products/rc-oral-sensitive-1-5kg",        bags: [1500],                ppkg: 11 },
  // ── HOND · Advance ────────────────────────────────────────────────────────
  "Advance Mini Adult":                  { url: "/products/advance-mini-adult",             bags: [1500,3000,7000],      ppkg: 11 },
  "Advance Mini Sensitive":              { url: "/products/advance-mini-sensitive",          bags: [3000,7000],           ppkg: 11 },
  "Advance Mini Senior":                 { url: "/products/advance-mini-senior-3kg",        bags: [3000],                ppkg: 9  },
  "Advance Mini Light":                  { url: "/products/advance-mini-light-15kg",        bags: [1500],                ppkg: 9  },
  "Advance Medium Adult":                { url: "/products/advance-medium-adult",           bags: [3000,14000],          ppkg: 10 },
  "Advance Medium Senior":               { url: "/products/advance-medium-senior-12kg",     bags: [12000],               ppkg: 9  },
  "Advance Maxi Adult":                  { url: "/products/advance-maxi-adult-14kg",        bags: [14000],               ppkg: 9  },
  "Advance Maxi Senior":                 { url: "/products/advance-maxi-senior-12kg",       bags: [12000],               ppkg: 8  },
  "Advance Maxi Light":                  { url: "/products/advance-maxi-light-12kg",        bags: [12000],               ppkg: 8  },
  "Advance Sensitive Lamb/Rice":         { url: "/products/advance-sensitive-lambrice",     bags: [3000,12000],          ppkg: 11 },
  "Advance Sensitive Salmon/Rice":       { url: "/products/advance-sensitive-salmonrice-12kg", bags: [12000],            ppkg: 11 },
  "Advance Puppy Mini":                  { url: "/products/adv-puppy-protect-mini",         bags: [3000,7000],           ppkg: 16 },
  "Advance Puppy Medium":                { url: "/products/advance-puppy-protect-medium-12kg", bags: [12000],            ppkg: 15 },
  "Advance Puppy Maxi":                  { url: "/products/advance-puppy-protect-maxi-12kg",   bags: [12000],            ppkg: 13 },
  "Advance French Bulldog Adult":        { url: "/products/advance-ad-french-bulldog-7-5kg",    bags: [7500],             ppkg: 10 },
  "Advance Labrador Retriever Adult":    { url: "/products/advance-ad-labrador-retriever-11-5k",bags: [11500],            ppkg: 9  },
  // ── HOND · Acana ─────────────────────────────────────────────────────────
  "Acana Dog Adult":                     { url: "/products/acana-dog-adult-dog",            bags: [6000,11400,17000],    ppkg: 10 },
  "Acana Dog Adult Small Breed":         { url: "/products/acana-adult-small-breed",        bags: [2000,6000],           ppkg: 11 },
  "Acana Dog Adult Large Breed":         { url: "/products/acana-adult-large-breed-17kg",   bags: [17000],               ppkg: 9  },
  "Acana Dog Senior":                    { url: "/products/acana-senior-dog",               bags: [6000,11400],          ppkg: 9  },
  "Acana Dog Puppy":                     { url: "/products/acana-puppy",                    bags: [2000,6000,17000],     ppkg: 16 },
  "Acana Dog Puppy Large Breed":         { url: "/products/acana-puppy-large-breed-17kg",   bags: [17000],               ppkg: 15 },
  "Acana Dog Light & Fit":               { url: "/products/acana-light-fit",                bags: [6000,11400],          ppkg: 9  },
  "Acana Dog Sport & Agility":           { url: "/products/acana-sport-agility-17kg",       bags: [17000],               ppkg: 11 },
  "Acana Classics Classic Red":          { url: "/products/acana-classic-red",              bags: [2000,9700,14500],     ppkg: 10 },
  "Acana Classics Prairie Poultry":      { url: "/products/acana-clas-prairie-poultry",     bags: [2000,9700,14500],     ppkg: 10 },
  "Acana Classics Wild Coast":           { url: "/products/acana-clas-wild-coast",          bags: [2000,9700,14500],     ppkg: 10 },
  "Acana HP Grasslands Dog":             { url: "/products/acana-hp-grasslands-dog-114kg",  bags: [11400],               ppkg: 10 },
  "Acana HP Pacifica Dog":               { url: "/products/acana-hp-pacifica-dog-11-4kg",   bags: [11400],               ppkg: 10 },
  "Acana HP Wild Prairie Dog":           { url: "/products/acana-hp-wild-prairie-dog-11-4kg",  bags: [11400],            ppkg: 10 },
  "Acana HP Ranchlands Dog":             { url: "/products/acana-hp-ranchlands-dog-11-4kg", bags: [11400],               ppkg: 10 },
  "Acana Singles Free-Run Duck":         { url: "/products/acana-singles-free-run-duck",    bags: [2000,11400],          ppkg: 10 },
  "Acana Singles Grass-Fed Lamb":        { url: "/products/acana-singles-grass-fed-lamb",   bags: [2000,11400,17000],    ppkg: 10 },
  "Acana Singles Yorkshire Pork":        { url: "/products/acana-singles-yorkshire-pork-6kg",  bags: [6000],             ppkg: 10 },
  // ── KAT · Royal Canin ─────────────────────────────────────────────────────
  "Royal Canin Babycat":                 { url: "/products/rc-babycat-400gr",               bags: [400],                 ppkg: 18 },
  "Royal Canin Kitten":                  { url: "/products/rc-kitten",                      bags: [400,2000],            ppkg: 16 },
  "Royal Canin Indoor":                  { url: "/products/rc-indoor",                      bags: [400,2000,4000],       ppkg: 12 },
  "Royal Canin Fit":                     { url: "/products/rc-fit",                         bags: [2000,4000,10000],     ppkg: 12 },
  "Royal Canin Outdoor":                 { url: "/products/rc-outdoor-2kg",                 bags: [2000],                ppkg: 13 },
  "Royal Canin Sterilised":              { url: "/products/rc-sterilised",                  bags: [2000,4000,10000],     ppkg: 11 },
  "Royal Canin British Shorthair":       { url: "/products/rc-british-shorthair-2kg",       bags: [2000],                ppkg: 11 },
  "Royal Canin Maine Coon":              { url: "/products/rc-maine-coon-4kg",              bags: [4000],                ppkg: 11 },
  "Royal Canin Urinary Care":            { url: "/products/rc-urinary-care-2kg",            bags: [2000],                ppkg: 11 },
  // ── KAT · Advance ─────────────────────────────────────────────────────────
  "Advance Cat Adult Chicken/Rice":      { url: "/products/advance-cat-adult-chickrice",    bags: [1500,3000,10000,15000], ppkg: 12 },
  "Advance Cat Kitten":                  { url: "/products/advance-kitten-chickenrice",      bags: [1500,10000],          ppkg: 16 },
  "Advance Cat Sterilized Turkey":       { url: "/products/advance-cat-sterilized-turkey",  bags: [3000,10000,15000],    ppkg: 11 },
  "Advance Cat Sterilized Hairball":     { url: "/products/advance-cat-sterili-hairball",   bags: [1500,10000],          ppkg: 11 },
  "Advance Cat Sterilized Sensitive Salmon": { url: "/products/advance-cat-sterilized-sensi", bags: [1500,10000],        ppkg: 11 },
  "Advance Cat Sterilized Senior 10+":   { url: "/products/advance-cat-sterilized-senior10",bags: [1500,10000],          ppkg: 10 },
  // ── KAT · Acana ───────────────────────────────────────────────────────────
  "Acana Cat Grasslands":                { url: "/products/acana-cat-grasslands-4-5kg",     bags: [4500],                ppkg: 12 },
  "Acana Cat Wild Prairie":              { url: "/products/acana-cat-wild-prairie-4-5kg",   bags: [4500],                ppkg: 12 },
  "Acana Cat Kitten":                    { url: "/products/acana-kitten-chickherring",       bags: [340,1800],            ppkg: 16 },
  // ── KATTENBAK ─────────────────────────────────────────────────────────────
  "BioKat's Classic":                   { url: "/products/biokats-classic",                bags: [10000,18000],         ppkg: null, unit:"L", usage:"±30 dagen per bak" },
  "BioKat's Classic 2-pak":             { url: "/products/biokats-classic-2-stuks-voor-25",bags: [20000],               ppkg: null, unit:"L", usage:"±60 dagen (2 zakken van 10L)" },
  "BioKat's Fresh":                     { url: "/products/biokats-fresh",                  bags: [10000,18000],         ppkg: null, unit:"L", usage:"±30 dagen per bak" },
  "BioKat's Diamond Classic":           { url: "/products/biokaats-diamond-classic-8ltr",  bags: [8000],                ppkg: null, unit:"L", usage:"±25 dagen per bak" },
  "BioKat's Diamond Fresh":             { url: "/products/biokaats-diamond-fresh-8ltr",    bags: [8000],                ppkg: null, unit:"L", usage:"±25 dagen per bak" },
  "BioKat's Micro Classic":             { url: "/products/biokaats-micro-classic-14ltr",   bags: [14000],               ppkg: null, unit:"L", usage:"±35 dagen per bak" },
  "BioKat's Micro Fresh":               { url: "/products/biokaats-micro-fresh-14ltr",     bags: [14000],               ppkg: null, unit:"L", usage:"±35 dagen per bak" },
  "BioKat's Natural Care":              { url: "/products/biokaats-natural-care-30ltr",    bags: [30000],               ppkg: null, unit:"L", usage:"±75 dagen per bak" },
  "Catsan Hygiëne Plus":                 { url: "/products/catsan-hygiene-plus-kattenbakvulling-20-ltr", bags: [20000], ppkg: null, unit:"L", usage:"±30 dagen per bak" },
  "Agriselect Basic Grey":               { url: "/products/agriselect-basic-grey-kattenbakvulling-20-ltr", bags: [20000], ppkg: null, unit:"L", usage:"±30 dagen per bak" },
  // ── SNACKS ────────────────────────────────────────────────────────────────
  "I Am Chicken Bites":                  { url: "/products/i-am-chicken-bites-300-gr",      bags: [300],                 ppkg: null, usage:"Als beloning naast hoofdvoer" },
  "Inaba Churu Chicken":                 { url: "/products/inaba-churu-chicken-4x14-gr",    bags: [56],                  ppkg: null, usage:"Als smaakmaker of beloning" },
  "Advance Dental Stick Mini":           { url: "/products/advance-dental-stick-mini-7st-90g",    bags: [90],            ppkg: null, usage:"1 stick per dag — kleine honden" },
  "Advance Dental Stick Medium/Maxi":    { url: "/products/adv-dental-stick-medmax-7st-180gr",    bags: [180],           ppkg: null, usage:"1 stick per dag — middelgrote/grote honden" },
  "Advance Hypoallergenic Snack":        { url: "/products/advance-hypoallergenic-snack-150gr",   bags: [150],           ppkg: null, usage:"Voor honden met voedselallergie" },
  "Advance Sensitive Snack":             { url: "/products/advance-sensitive-snack-7x150gr",       bags: [150],           ppkg: null, usage:"Voor honden met gevoelige spijsvertering" },
  "Advance Weight Control Snack":        { url: "/products/adv-weight-control-snack-7x150gr",      bags: [150],           ppkg: null, usage:"Voor honden op dieet" },
  "Advance Articular Stick":             { url: "/products/advance-articular-stick-155gr",          bags: [155],           ppkg: null, usage:"Ondersteunt gewrichten" },
  "Renske Hartjes Zalm Mini":            { url: "/products/renske-hond-gezonde-beloning-mini-hartjes-zalm-100-gr", bags: [100], ppkg: null, usage:"Gezonde beloning kleine honden" },
  "Josera Crunchies Chicken":            { url: "/products/josera-crunchies-chicken-60-gr",  bags: [60],                  ppkg: null, usage:"Als beloning" },
  "Josera Meat Bites Mini":              { url: "/products/josera-meat-bites-mini-chicken-70-gr", bags: [70],             ppkg: null, usage:"Als beloning kleine honden" },
  "Catisfactions Kip":                   { url: "/products/catisfactions-kip-60-gr",         bags: [60],                  ppkg: null, usage:"Als kattenbeloning" },
};

const G="#2D6A4F", GL="#B7E4C7", GC="#F8F4EE", GD="#1B3A2E";

const LOADING_STEPS = [
  "We analyseren het profiel van je dier\u2026",
  "We zoeken de beste voedingskeuze\u2026",
  "We berekenen de perfecte portiegrootte\u2026",
  "We stellen de productselectie op maat samen\u2026",
  "Bijna klaar \u2014 we ronden het advies af\u2026",
];

const SYSTEM = `Je bent Snuf — de AI Voedingsadviseur van PetsRefill Westland, een hyperlokalale bezorgservice in 's-Gravenzande, Monster, Naaldwijk, Poeldijk en Honselersdijk.

VRAAGVOLGORDE — max 1 vraag per beurt:
1. Naam van het dier
2. Ras — altijd vragen. Bij een kruising: herken de rassenaam, bevestig die, en vraag in HETZELFDE bericht de leeftijd en het gewicht ("Dat klinkt als een Pomchi! Klopt dat? En hoe oud is [naam] en wat weegt hij/zij?")
3. Leeftijd + gewicht samen als ze nog niet gegeven zijn
4. Bijzonderheden: gesteriliseerd/gecastreerd, gevoelige buik, allergie, leefstijl

FOTOBEOORDELING: Analyseer ras zo goed mogelijk. Wees eerlijk bij twijfel. Ga daarna verder met de vragenflow.

GEZONDHEIDSKLACHTEN: Verwijs ALTIJD eerst naar een dierenarts bij plasproblemen, diarree, braken, huidproblemen of gedragsverandering. Geef daarna aanvullend voedingsadvies. Speel nooit de rol van dierenarts.

ASSORTIMENT:
HOND — Royal Canin: X-Small Adult, Mini Adult, Mini Adult 8+, Mini Ageing 12+, Mini Light Weight Care, Mini Puppy, Medium Adult, Medium Puppy, Maxi Adult, Maxi Puppy, Chihuahua Adult, Dachshund Adult, French Bulldog Adult, Labrador Retriever Adult, Sensible, Oral Sensitive
HOND — Advance: Mini Adult, Mini Sensitive, Mini Senior, Mini Light, Medium Adult, Medium Senior, Maxi Adult, Maxi Senior, Maxi Light, Sensitive Lamb/Rice, Sensitive Salmon/Rice, Puppy Mini/Medium/Maxi, French Bulldog Adult, Labrador Retriever Adult
HOND — Acana: Dog Adult, Dog Adult Small Breed, Dog Adult Large Breed, Dog Senior, Dog Puppy, Dog Puppy Large Breed, Dog Light & Fit, Dog Sport & Agility, Classics Classic Red, Classics Prairie Poultry, Classics Wild Coast, HP Grasslands/Pacifica/Wild Prairie/Ranchlands, Singles Free-Run Duck/Grass-Fed Lamb/Yorkshire Pork
KAT — Royal Canin: Babycat, Kitten, Indoor, Fit, Outdoor, Sterilised, British Shorthair, Maine Coon, Urinary Care
KAT — Advance: Cat Adult Chicken/Rice, Cat Kitten, Cat Sterilized Turkey, Cat Sterilized Hairball, Cat Sterilized Sensitive Salmon, Cat Sterilized Senior 10+
KAT — Acana: Cat Grasslands, Cat Wild Prairie, Cat Kitten
KATTENBAK: BioKat's Classic, BioKat's Fresh, BioKat's Diamond Classic/Fresh, BioKat's Micro Classic/Fresh, BioKat's Natural Care, Catsan Hygiëne Plus, Agriselect Basic Grey
SNACKS HOND: I Am Chicken Bites, Advance Dental Stick Mini/Medium Maxi, Advance Hypoallergenic/Sensitive/Weight Control Snack, Advance Articular Stick, Renske Hartjes Zalm Mini, Josera Crunchies/Meat Bites
SNACKS KAT: Catisfactions Kip, Inaba Churu Chicken
Snacks: Royal Canin Dental Snacks, I Am Chicken Bites 300g

TWEE PRODUCTEN — VERPLICHT bij voer (niet bij kattenbak):
- PRODUCT1: primaire aanbeveling (Royal Canin — bewezen, herkenbaar, dierenartsen aanbevolen)
- PRODUCT2: eerlijk alternatief van ander merk (Advance of Acana — hoger vleesgehalte of andere samenstelling)
Leg kort het verschil uit zodat de klant zelf een weloverwogen keuze maakt. Wees nooit misleidend.

PRODUCTEN BUITEN ASSORTIMENT: Wees eerlijk. Zeg dat PetsRefill dit (nog) niet voert maar dat Marc kan kijken of het te sourcen is. Geef daarna het beste beschikbare alternatief.

EINDADVIES — gebruik dit exacte formaat nadat alle vragen beantwoord zijn:
[schrijf je warme advies met uitleg over beide producten]

---SNUF_DATA---
NAAM:[naam van het dier]
GEWICHT:[lichaamsgewicht in kg als getal, 0 voor kattenbak]
PRODUCT1:[exacte naam product 1 uit assortiment]
DOSIS1:[dagportie in gram als getal]
LABEL1:[korte badge max 4 woorden, bijv. "Dierenarts aanbevolen"]
PRODUCT2:[exacte naam product 2, of GEEN]
DOSIS2:[dagportie in gram, of 0]
LABEL2:[korte badge max 4 woorden, bijv. "Meer vlees, meer smaak"]
---EINDE---

💬 Wil je [naam] aanmelden voor een bezorgherinnering? Dan seint Marc je automatisch op tijd als de zak bijna op is — gewoon terugappen.

Toon: warm, persoonlijk, kort. Je/jouw. Noem het dier bij naam.`;

const isFinal = t => t.includes("---SNUF_DATA---");

const parseData = t => {
  const m = t.match(/---SNUF_DATA---([\s\S]*?)---EINDE---/);
  if (!m) return null;
  const g = k => { const r = m[1].match(new RegExp(`${k}:(.+)`)); return r ? r[1].trim() : null; };
  return {
    name: g("NAAM"), weight: parseFloat(g("GEWICHT")) || 0,
    product1: g("PRODUCT1"), dosis1: parseInt(g("DOSIS1")) || 0, label1: g("LABEL1"),
    product2: g("PRODUCT2"), dosis2: parseInt(g("DOSIS2")) || 0, label2: g("LABEL2"),
  };
};

const clean = t => t.replace(/---SNUF_DATA---[\s\S]*?---EINDE---/g, "").replace(/\n{3,}/g, "\n\n").trim();
const fmtBag = (g, u) => u === "L" ? `${g / 1000}L` : g >= 1000 ? `${g / 1000}kg` : `${g}g`;
const sugBag = (productName, dosis) => {
  const p = PRODUCTS[productName];
  if (!p || !dosis) return null;
  return p.bags.find(b => b / dosis >= 28) || p.bags[p.bags.length > 1 ? 1 : 0];
};

// ── Loading card shown while final advice is being generated ─────────────────
function AdviceLoadingCard({ petName }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % LOADING_STEPS.length), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginTop: 2 }}>🐾</div>
      <div style={{ background: "#fff", borderRadius: "4px 13px 13px 13px", padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,.07)", minWidth: 220 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: G, marginBottom: 8, fontFamily: "Georgia,serif" }}>
          🐾 Snuf stelt jouw advies op…
        </div>
        <div style={{ fontSize: 12, color: "#888", fontFamily: "Georgia,serif", marginBottom: 10, minHeight: 18, transition: "opacity .3s" }}>
          {LOADING_STEPS[step]}
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: GL, borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", background: G, borderRadius: 4,
            width: `${((step + 1) / LOADING_STEPS.length) * 100}%`,
            transition: "width 1.8s ease",
          }} />
        </div>
        <div style={{ fontSize: 11, color: "#bbb", marginTop: 6, fontFamily: "Georgia,serif" }}>
          Dit duurt even — we maken het zo nauwkeurig mogelijk voor {petName || "je dier"}.
        </div>
      </div>
    </div>
  );
}

// ── Simple typing dots for intermediate questions ────────────────────────────
function Dots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: G, animation: `b 1.2s ease-in-out ${i * .2}s infinite` }} />)}
      <style>{`@keyframes b{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}@keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ productName, dosis, label, petName, isPrimary }) {
  const p = PRODUCTS[productName];
  if (!p || productName === "GEEN") return null;
  const nm = petName || "je dier";
  const sb = sugBag(productName, dosis);
  const days = sb && dosis > 0 ? Math.round(sb / dosis) : null;
  const shopUrl = `https://petsrefillwestland.nl${p.url}`;
  const waMsg = `Hoi Marc! Ik wil graag bestellen voor aankomende zaterdag.\n\nProduct: ${productName}${sb ? ` ${fmtBag(sb, p.unit || "")}` : ""}\nVoor: ${nm}\nAdres: [vul in]\n\nAdvies via Snuf op petsrefillwestland.nl 🐾`;
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;
  const rowS = { display: "flex", justifyContent: "space-between", fontSize: 13, color: GD, marginBottom: 5, fontFamily: "Georgia,serif" };
  const btnS = (bg, col, border) => ({ display: "block", textAlign: "center", padding: "9px 12px", borderRadius: 9, background: bg, color: col, border: border || "none", fontFamily: "Georgia,serif", fontSize: 13, fontWeight: 600, textDecoration: "none" });
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: `2px solid ${isPrimary ? G : GL}`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, background: isPrimary ? G : GL, color: isPrimary ? "#fff" : GD, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: "0 10px 0 8px", fontFamily: "Georgia,serif", letterSpacing: .3 }}>
        {label || (isPrimary ? "Primaire keuze" : "Alternatief")}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: GD, marginBottom: 8, marginTop: 4, fontFamily: "Georgia,serif", paddingRight: 80 }}>{productName}</div>
      {p.unit === "L" ? (
        <div style={rowS}><span>Gebruik</span><span>{p.usage}</span></div>
      ) : (
        <>
          <div style={rowS}><span>Dagelijkse portie</span><strong>{dosis}g/dag</strong></div>
          {sb && <div style={rowS}><span>Aanbevolen zak</span><strong>{fmtBag(sb, "")}</strong></div>}
          {days && <div style={rowS}><span>Gaat mee</span><strong>±{days} dagen</strong></div>}
          {p.bags.length > 1 && sb && <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Ook: {p.bags.filter(b => b !== sb).map(b => fmtBag(b, "")).join(" · ")}</div>}
        </>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 11 }}>
        <a href={waUrl} target="_blank" rel="noopener noreferrer" style={btnS("#25D366", "#fff")}>📲 Bestel via WhatsApp bij Marc</a>
        <a href={shopUrl} target="_blank" rel="noopener noreferrer" style={btnS("transparent", G, `2px solid ${G}`)}>🛒 Bekijk in de webshop</a>
      </div>
    </div>
  );
}

function ResultCards({ data }) {
  if (!data) return null;
  const has2 = data.product2 && data.product2 !== "GEEN" && PRODUCTS[data.product2];
  return (
    <div style={{ marginLeft: 35, width: "calc(100% - 35px)", display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
      <div style={{ fontSize: 12, color: "#999", fontFamily: "Georgia,serif", marginBottom: 2 }}>🧮 Berekening voor {data.name || "je dier"}</div>
      <ProductCard productName={data.product1} dosis={data.dosis1} label={data.label1} petName={data.name} isPrimary={true} />
      {has2 && <ProductCard productName={data.product2} dosis={data.dosis2} label={data.label2} petName={data.name} isPrimary={false} />}
    </div>
  );
}

function Bubble({ msg, isNew, calcData }) {
  const isBot = msg.role === "assistant";
  const txt = isBot ? clean(msg.content) : msg.content;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isBot ? "flex-start" : "flex-end", marginBottom: 9, animation: isNew ? "fu .3s ease forwards" : "none" }}>
      <div style={{ display: "flex", justifyContent: isBot ? "flex-start" : "flex-end", width: "100%" }}>
        {isBot && <div style={{ width: 28, height: 28, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 7, flexShrink: 0, marginTop: 2 }}>🐾</div>}
        <div style={{ maxWidth: "78%", padding: "9px 12px", borderRadius: isBot ? "4px 13px 13px 13px" : "13px 4px 13px 13px", background: isBot ? "#fff" : G, color: isBot ? GD : "#fff", fontSize: 14, lineHeight: 1.65, boxShadow: "0 1px 3px rgba(0,0,0,.07)", whiteSpace: "pre-wrap", fontFamily: "Georgia,serif" }}>
          {msg.image && <img src={msg.image} alt="dier" style={{ width: "100%", borderRadius: 8, marginBottom: 6, display: "block" }} />}
          {txt}
        </div>
      </div>
      {isBot && calcData && <ResultCards data={calcData} />}
    </div>
  );
}

function Disclaimer() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 10, padding: "0 4px" }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 11, textDecoration: "underline", fontFamily: "Georgia,serif", padding: 0, display: "block", margin: "0 auto" }}>
        ⚠️ AI-gegenereerd advies door Snuf — lees disclaimer
      </button>
      {open && <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, background: "#f0ede7", border: "1px solid #ddd", fontSize: 11, color: "#777", lineHeight: 1.6, fontFamily: "Georgia,serif" }}>
        <strong style={{ color: "#555" }}>Disclaimer</strong><br /><br />
        De adviezen van Snuf worden gegenereerd door kunstmatige intelligentie en zijn uitsluitend bedoeld als algemene oriëntatie. Aan de verstrekte informatie kunnen geen rechten worden ontleend. PetsRefill Westland is niet aansprakelijk voor onjuistheden. Bij gezondheidsklachten altijd een dierenarts raadplegen — dit advies vervangt nooit professionele veterinaire zorg.
      </div>}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
const INIT = [{ role: "assistant", content: "Hoi! 👋 Ik ben Snuf, de AI voedingsadviseur van PetsRefill Westland.\n\nIk help je in een paar vragen het perfecte voer vinden. Wat voor dier heb je?", id: 0 }];

export default function App() {
  const [phase, setPhase] = useState("animal");
  const [api, setApi] = useState([]);
  const [display, setDisplay] = useState(INIT);
  const [calc, setCalc] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingFinal, setGeneratingFinal] = useState(false); // ← loading state for final advice
  const [done, setDone] = useState(false);
  const [lastId, setLastId] = useState(null);
  const [animal, setAnimal] = useState("");
  const [petNameGuess, setPetNameGuess] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [display, loading, calc, generatingFinal]);
  useEffect(() => { if (!loading && phase === "chat" && !done) inputRef.current?.focus(); }, [loading, phase, done]);

  const push = (role, content, image) => {
    const id = Date.now() + Math.random();
    setLastId(id);
    setDisplay(d => [...d, { role, content, id, image }]);
  };

  // Detect if this looks like the final question (enough exchanges happened)
  const isFinalCall = (msgs) => msgs.filter(m => m.role === "user").length >= 4;

  const callClaude = async (msgs) => {
    const final = isFinalCall(msgs);
    setLoading(true);
    if (final) setGeneratingFinal(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1400, system: SYSTEM, messages: msgs }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "Er ging iets mis. Probeer het opnieuw.";
      const newMsgs = [...msgs, { role: "assistant", content: text }];
      setApi(newMsgs);
      setLoading(false);
      setGeneratingFinal(false);
      setTimeout(() => {
        push("assistant", text);
        if (isFinal(text)) { const p = parseData(text); if (p) { setCalc(p); if (p.name) setPetNameGuess(p.name); } setDone(true); }
      }, 150);
    } catch {
      setLoading(false);
      setGeneratingFinal(false);
      push("assistant", "Er ging iets mis. Probeer het opnieuw.");
    }
  };

  const handleAnimal = a => {
    setAnimal(a);
    push("user", `${a} 🐾`);
    const msgs = [{ role: "user", content: `Ik heb een ${a}.` }];
    setApi(msgs); setPhase("chat");
    setTimeout(() => { const q = `Leuk! En hoe heet je ${a.toLowerCase()}?`; push("assistant", q); setApi(m => [...m, { role: "assistant", content: q }]); }, 350);
  };

  const handleSend = async () => {
    const val = input.trim(); if (!val || loading) return;
    setInput(""); push("user", val);
    const msgs = [...api, { role: "user", content: val }]; setApi(msgs);
    await callClaude(msgs);
  };

  const handlePhoto = async e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const b64 = ev.target.result.split(",")[1];
      push("user", "📷 Foto geüpload — Snuf analyseert het ras...", ev.target.result);
      const imageMsg = { role: "user", content: [{ type: "image", source: { type: "base64", media_type: file.type || "image/jpeg", data: b64 } }, { type: "text", text: `Dit is een foto van mijn ${animal || "dier"}. Kun je het ras herkennen of een goede schatting geven?` }] };
      const msgs = [...api, imageMsg]; setApi(msgs);
      await callClaude(msgs);
    };
    reader.readAsDataURL(file); e.target.value = "";
  };

  const reset = () => { setPhase("animal"); setApi([]); setDisplay(INIT); setInput(""); setLoading(false); setGeneratingFinal(false); setDone(false); setCalc(null); setAnimal(""); setPetNameGuess(""); };

  return (
    <div style={{ minHeight: "100vh", background: GC, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif", padding: 12 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Header */}
        <div style={{ background: G, borderRadius: "14px 14px 0 0", padding: "13px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 24 }}>🐾</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Snuf</div>
            <div style={{ color: GL, fontSize: 11, marginTop: 1 }}>AI Voedingsadviseur · PetsRefill Westland</div>
          </div>
          <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 0 3px rgba(74,222,128,.25)" }} />
        </div>

        {/* Chat window */}
        <div style={{ background: "#EDE9E2", padding: "13px 10px", minHeight: 320, maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {display.map((msg, i) => (
            <Bubble key={msg.id} msg={msg} isNew={msg.id === lastId}
              calcData={done && i === display.length - 1 && msg.role === "assistant" ? calc : null} />
          ))}

          {/* Show elaborate loading card only for final advice generation */}
          {loading && generatingFinal && <AdviceLoadingCard petName={petNameGuess} />}

          {/* Simple dots for intermediate questions */}
          {loading && !generatingFinal && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🐾</div>
              <div style={{ background: "#fff", padding: "9px 12px", borderRadius: "4px 13px 13px 13px", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}><Dots /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ background: "#fff", borderRadius: "0 0 14px 14px", padding: 10, borderTop: "1px solid rgba(0,0,0,.05)", boxShadow: "0 4px 16px rgba(0,0,0,.07)" }}>
          {phase === "animal" && (
            <div style={{ display: "flex", gap: 8 }}>
              {["Hond 🐕", "Kat 🐈"].map(opt => (
                <button key={opt} onClick={() => handleAnimal(opt.split(" ")[0])}
                  style={{ flex: 1, padding: "10px 6px", borderRadius: 10, border: `2px solid ${G}`, background: "transparent", color: G, fontFamily: "Georgia,serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                  onMouseOver={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = "#fff"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = G; }}
                >{opt}</button>
              ))}
            </div>
          )}

          {phase === "chat" && !done && (
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <button onClick={() => fileRef.current?.click()} title="Stuur een foto van je dier"
                style={{ width: 38, height: 38, borderRadius: 10, border: `1.5px solid ${GL}`, background: GC, color: G, fontSize: 18, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                📷
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder={loading ? "Snuf is bezig..." : "Typ je antwoord..."} disabled={loading}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${GL}`, fontFamily: "Georgia,serif", fontSize: 14, color: GD, outline: "none", background: loading ? "#f5f5f5" : GC, minWidth: 0 }}
                onFocus={e => e.target.style.borderColor = G} onBlur={e => e.target.style.borderColor = GL} />
              <button onClick={handleSend} disabled={loading || !input.trim()}
                style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: loading || !input.trim() ? "#ccc" : G, color: "#fff", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>→</button>
            </div>
          )}

          {done && <button onClick={reset} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `2px solid ${G}`, background: "transparent", color: G, fontFamily: "Georgia,serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>🔄 Nieuw dier adviseren</button>}
        </div>

        <Disclaimer />
      </div>
    </div>
  );
}
