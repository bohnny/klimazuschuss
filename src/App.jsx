import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════ DATA ═══════════════════════════════════════════ */
const GEBAEUDE = [
  { value: "efh", label: "Einfamilienhaus", desc: "Freistehend", icon: "🏡" },
  { value: "dhh", label: "Doppelhaushälfte", desc: "Reihen- oder Doppelhaus", icon: "🏘️" },
  { value: "rh", label: "Reihenhaus", desc: "Mittel- oder Eckhaus", icon: "🏠" },
  { value: "mfh", label: "Mehrfamilienhaus", desc: "Bis 6 Wohneinheiten", icon: "🏢" },
];
const BAUJAHR = [
  { value: "vor1960", label: "Vor 1960", desc: "Altbau, oft ungedämmt", factor: 1.3 },
  { value: "1960-1978", label: "1960 – 1978", desc: "Erste Wärmeschutzverordnung", factor: 1.15 },
  { value: "1979-1994", label: "1979 – 1994", desc: "Verbesserte Dämmung", factor: 1.0 },
  { value: "1995-2009", label: "1995 – 2009", desc: "EnEV-Standards", factor: 0.9 },
  { value: "nach2009", label: "Nach 2009", desc: "Moderne Baustandards", factor: 0.8 },
];
const HEIZUNG = [
  { value: "gas", label: "Gasheizung", desc: "Erdgas-Brennwert oder Niedertemperatur", gB: true, k: 2400 },
  { value: "oel", label: "Ölheizung", desc: "Heizöl-Kessel", gB: true, k: 3000 },
  { value: "nachtspeicher", label: "Nachtspeicherheizung", desc: "Elektrische Speicherheizung", gB: true, k: 3200 },
  { value: "kohle", label: "Kohle oder Koks", desc: "Festbrennstoff-Heizung", gB: true, k: 2800 },
  { value: "sonstige", label: "Andere / Weiß nicht", desc: "Fernwärme, Pellets oder unsicher", gB: false, k: 2200 },
];
const EINKOMMEN = [
  { value: "unter40", label: "Unter 40.000 € / Jahr", desc: "Zu versteuerndes Haushaltseinkommen", bonus: true },
  { value: "ueber40", label: "Über 40.000 € / Jahr", desc: "Zu versteuerndes Haushaltseinkommen", bonus: false },
  { value: "unsicher", label: "Bin mir unsicher", desc: "Wird im Antrag geprüft", bonus: false },
];
const WP_LUFT = { label: "Luft-Wasser-Wärmepumpe (R290)", kurz: "Luft-Wasser", grund: "Die wirtschaftlichste und beliebteste Lösung für Ihr Gebäude. Einfache Installation, natürliches Kältemittel R290 für maximale Förderung. Inkl. Gerät, Installation, Entsorgung Altgerät und Förderantrag.", eB: true, kMin: 25000, kMax: 35000, jK: 950 };

function calc(d) {
  const h = HEIZUNG.find(x => x.value === d.heizung);
  const b = BAUJAHR.find(x => x.value === d.baujahr);
  const e = EINKOMMEN.find(x => x.value === d.einkommen);
  if (!h || !b || !e) return null;
  const w = WP_LUFT;
  const ff = d.flaeche > 150 ? 1.15 : d.flaeche > 100 ? 1.0 : 0.9;
  const kosten = Math.round(((w.kMin + w.kMax) / 2) * b.factor * ff);
  const foerdF = Math.min(kosten, 30000);
  const gr = 30, ef = w.eB ? 5 : 0, gs = h.gB ? 20 : 0, ei = e.bonus ? 30 : 0;
  const pct = Math.min(gr + ef + gs + ei, 70);
  const foerd = Math.round(foerdF * pct / 100);
  const eig = kosten - foerd;
  const jE = h.k - w.jK;
  return { w, kosten, foerdF, gr, ef, gs, ei, pct, foerd, eig, jE, amor: Math.round(eig / jE * 10) / 10, altK: h.k, neuK: w.jK, co2: Math.round((h.k / .08) * .2 / 1000 * 10) / 10, e15: jE * 15 };
}

/* ═══════════════════════════════════════════ THEME ═══════════════════════════════════════════ */
const C = {
  bg: "#FAFAF8",
  primary: "#1A8F55",
  primaryDark: "#157A48",
  accent: "#C4922A",
  text: "#1A1D1C",
  muted: "rgba(26,29,28,.65)",
  dim: "rgba(26,29,28,.5)",
  faint: "rgba(26,29,28,.35)",
  card: "rgba(0,0,0,.03)",
  border: "rgba(0,0,0,.1)",
};

/* ═══════════════════════════════════════════ COMPONENTS ═══════════════════════════════════════════ */
const fmt = n => n?.toLocaleString("de-DE");

const Card = ({ o, sel, onClick }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 12, width: "100%",
    padding: "14px 16px", borderRadius: 11, cursor: "pointer", textAlign: "left",
    border: sel ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
    background: sel ? "rgba(26,143,85,.06)" : C.card,
    color: C.text, transition: "all .15s", fontFamily: "inherit",
  }}>
    {o.icon && <span style={{ fontSize: 24, flexShrink: 0 }}>{o.icon}</span>}
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{o.label}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{o.desc}</div>
    </div>
    {sel && <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", flexShrink: 0 }}>✓</div>}
  </button>
);

function ABar({ label, pct, color, delay }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), delay); return () => clearTimeout(t); }, [pct, delay]);
  if (!pct) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
      <div style={{ width: 115, fontSize: 12, color: C.muted, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 24, background: "rgba(0,0,0,.04)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", background: color, borderRadius: 5, width: `${(w / 70) * 100}%`, transition: "width .8s cubic-bezier(.25,.46,.45,.94)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 7 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff" }}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

const LockedVal = () => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.dim }}>
    <span style={{ filter: "blur(6px)", userSelect: "none" }}>12.345</span>
    <span style={{ fontSize: 12 }}>🔒</span>
  </span>
);

const Stat = ({ l, v, s, locked }) => (
  <div style={{ background: C.card, borderRadius: 11, padding: "13px 14px", border: `1px solid ${C.border}` }}>
    <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>{l}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{locked ? <LockedVal /> : v}</div>
    {s && !locked && <div style={{ fontSize: 10.5, color: C.faint, marginTop: 3 }}>{s}</div>}
  </div>
);

const INP = { width: "100%", padding: "12px 14px", borderRadius: 9, background: "#fff", border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none", fontFamily: "'Outfit',sans-serif", boxSizing: "border-box" };

/* ═══════════════════════════════════════════ BACKEND ═══════════════════════════════════════════ */
const SHEETS_URL = "https://script.google.com/macros/s/AKfycby05-qJrZctv41tNQ8eBiG8mZVwycoS6j4RynDBo6OuA-hCjuvlcEIk_PY4_EbqTR8wRw/exec";

async function submitLead(formData, calcData, emailAddr) {
  try {
    const params = new URLSearchParams({
      name: formData.name || '',
      email: emailAddr || '',
      telefon: formData.tel || '',
      plz: formData.plz || '',
      gebaeude: calcData.gebaeude || '',
      baujahr: calcData.baujahr || '',
      flaeche: calcData.flaeche || '',
      heizung: calcData.heizung || '',
      einkommen: calcData.einkommen || '',
      wp_empfehlung: calcData._wpLabel || '',
      foerderung_euro: calcData._foerd || '',
      foerderung_prozent: calcData._pct || '',
      eigenanteil: calcData._eig || '',
      jahresersparnis: calcData._jE || '',
    });
    await fetch(SHEETS_URL + "?" + params.toString(), { mode: "no-cors" });
    return true;
  } catch (err) {
    console.error("Lead submit error:", err);
    return false;
  }
}

/* ═══════════════════════════════════════════ MAIN ═══════════════════════════════════════════ */
export default function App() {
  const [step, setStep] = useState(-1);
  const [d, setD] = useState({ flaeche: 120 });
  const [res, setRes] = useState(null);
  const [email, setEmail] = useState("");
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [view, setView] = useState("result");
  const [form, setForm] = useState({ name: "", tel: "", plz: "" });
  const [sending, setSending] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const ref = useRef(null);

  const goHome = () => { setStep(-1); setD({ flaeche: 120 }); setRes(null); setView("result"); setUnlocked(false); setSending(false); setFormErrors({}); setEmail(""); setEmailCaptured(false); setForm({ name: "", tel: "", plz: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Bitte Name eingeben";
    if (!form.tel.trim()) errs.tel = "Bitte Telefonnummer eingeben";
    if (!form.plz.trim()) errs.plz = "Bitte PLZ eingeben";
    else if (!/^\d{5}$/.test(form.plz.trim())) errs.plz = "Bitte gültige 5-stellige PLZ";
    if (!emailCaptured) {
      if (!email.trim()) errs.email = "Bitte E-Mail eingeben";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Bitte gültige E-Mail eingeben";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const canNext = () => {
    if (step === 0) return !!d.gebaeude;
    if (step === 1) return !!d.baujahr;
    if (step === 2) return true;
    if (step === 2.5) return true;
    if (step === 3) return !!d.heizung;
    if (step === 4) return !!d.einkommen;
    return false;
  };
  const nextStep = () => {
    if (step === 2) { setStep(2.5); return; }
    if (step === 2.5) { if (email?.includes("@")) setEmailCaptured(true); setStep(3); return; }
    if (step === 3) { setStep(4); return; }
    if (step < 3) { setStep(step + 1); return; }
    if (step === 4) { const r = calc(d); setRes(r); if(r) { d._wpLabel = r.w.label; d._foerd = r.foerd; d._pct = r.pct; d._eig = r.eig; d._jE = r.jE; } setStep(5); setView("result"); }
  };
  const prevStep = () => { if (step === 3) setStep(2.5); else if (step === 2.5) setStep(2); else setStep(step - 1); };
  const pIdx = () => { if (step <= 2) return step; if (step === 2.5) return 3; return step + 1; };
  const reset = () => { setStep(0); setD({ flaeche: 120 }); setRes(null); setView("result"); setUnlocked(false); setSending(false); setFormErrors({}); };
  const start = () => { setStep(0); setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth" }), 80); };
  const handleUnlock = () => { if (email?.includes("@")) { setEmailCaptured(true); setUnlocked(true); } };
  const isLocked = !unlocked && !emailCaptured;

  return (
    <div className="kz-root" style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit',-apple-system,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @media(min-width:768px){.kz-root{font-size:17px !important}.kz-hero-title{font-size:40px !important}.kz-step-title{font-size:24px !important}.kz-big-number{font-size:52px !important}.kz-container{max-width:540px !important}}`}</style>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, padding: "12px 20px", background: "rgba(250,250,248,.95)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div onClick={goHome} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg,${C.primary},${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 800 }}>K</div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-.3px" }}><span style={{ color: C.primary }}>Klima</span>Zuschuss</span>
        </div>
        <button onClick={start} style={{ padding: "6px 13px", borderRadius: 7, background: C.primary, border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Jetzt berechnen</button>
      </nav>

      {/* HERO */}
      {step === -1 && (
        <div className="kz-container" style={{ padding: "52px 20px 40px", maxWidth: 460, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: C.primary, textTransform: "uppercase", letterSpacing: 3, fontWeight: 600, marginBottom: 12 }}>Förderrechner 2026</div>
          <h1 className="kz-hero-title" style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.18, fontFamily: "'Playfair Display',serif", margin: "0 0 14px" }}>
            Bis zu <span style={{ color: C.accent }}>21.000 €</span> Zuschuss für Ihre neue Heizung
          </h1>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.6, margin: "0 0 26px" }}>
            In 2 Minuten erfahren Sie, wie viel Förderung Ihnen zusteht. Wir analysieren Ihre Situation und empfehlen die optimale Lösung.
          </p>
          <button onClick={start} style={{ width: "100%", padding: 17, borderRadius: 12, cursor: "pointer", background: `linear-gradient(135deg,${C.primary},${C.primaryDark})`, border: "none", color: "#fff", fontSize: 15.5, fontWeight: 700, boxShadow: "0 6px 24px rgba(30,163,98,.22)", fontFamily: "'Outfit'", marginBottom: 10 }}>
            Zuschuss berechnen →
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: C.dim }}>Kostenlos · Unverbindlich · Keine Anmeldung</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 32 }}>
            {[{ n: "70%", l: "Max. Förderung" }, { n: "2 Min", l: "Berechnung" }, { n: "100%", l: "Kostenlos" }].map((t, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: C.accent }}>{t.n}</div>
                <div style={{ fontSize: 10.5, color: C.dim }}>{t.l}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 9 }}>
            {[
              { i: "📈", t: "CO₂-Preis steigt auf 55–65 €/Tonne", d: "Gas und Öl werden jedes Jahr teurer. 2027 kommt der EU-Emissionshandel dazu." },
              { i: "🏛️", t: "Staat zahlt bis zu 70% der Kosten", d: "KfW-Förderung: Grundförderung + Boni. Je schneller Sie handeln, desto höher der Bonus." },
              { i: "📉", t: "Heizkosten um bis zu 60% senken", d: "Über 15 Jahre sparen Sie typischerweise 15.000 bis 25.000 €." },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 11, padding: 13, background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{c.i}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 1 }}>{c.t}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45 }}>{c.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CALCULATOR STEPS */}
      {step >= 0 && step < 5 && (
        <div ref={ref} className="kz-container" style={{ padding: 20, maxWidth: 460, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 3, marginBottom: 20 }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= pIdx() ? C.primary : "rgba(0,0,0,.04)", transition: "background .25s" }} />
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 3 }}>Schritt {pIdx() + 1} von 6</div>
          <h2 className="kz-step-title" style={{ fontSize: 20, fontWeight: 400, margin: "0 0 16px", fontFamily: "'Playfair Display',serif" }}>
            {step === 0 && "Um welchen Gebäudetyp handelt es sich?"}
            {step === 1 && "Wann wurde Ihr Gebäude gebaut?"}
            {step === 2 && "Wie groß ist Ihre Wohnfläche?"}
            {step === 2.5 && "Berechnung per E-Mail erhalten?"}
            {step === 3 && "Wie heizen Sie aktuell?"}
            {step === 4 && "Wie hoch ist Ihr Haushaltseinkommen?"}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {step === 0 && GEBAEUDE.map(o => <Card key={o.value} o={o} sel={d.gebaeude === o.value} onClick={() => setD({ ...d, gebaeude: o.value })} />)}
            {step === 1 && BAUJAHR.map(o => <Card key={o.value} o={o} sel={d.baujahr === o.value} onClick={() => setD({ ...d, baujahr: o.value })} />)}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "12px 0" }}>
                <div style={{ fontSize: 52, fontWeight: 800, color: C.primary, lineHeight: 1 }}>{d.flaeche || 120} m²</div>
                <input type="range" min={60} max={300} step={10} value={d.flaeche || 120} onChange={e => setD({ ...d, flaeche: +e.target.value })} style={{ width: "100%", accentColor: C.primary, height: 6, cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 11.5, color: C.dim }}><span>60 m²</span><span>300 m²</span></div>
              </div>
            )}
            {step === 2.5 && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>Wir schicken Ihnen Ihre persönliche Förderberechnung per E-Mail, damit Sie sie jederzeit griffbereit haben.</div>
                <input type="email" placeholder="Ihre E-Mail-Adresse" value={email} onChange={e => setEmail(e.target.value)} style={{ ...INP, marginBottom: 10 }} />
                <div style={{ fontSize: 11.5, color: C.faint, lineHeight: 1.5 }}>Optional. Sie können auch ohne E-Mail fortfahren.</div>
              </div>
            )}
            {step === 3 && HEIZUNG.map(o => <Card key={o.value} o={o} sel={d.heizung === o.value} onClick={() => setD({ ...d, heizung: o.value })} />)}
            {step === 4 && (<>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 5, lineHeight: 1.5 }}>Das zu versteuernde Haushaltseinkommen bestimmt den Einkommensbonus (+30%). Sie finden es auf Ihrem letzten Steuerbescheid.</div>
              {EINKOMMEN.map(o => <Card key={o.value} o={o} sel={d.einkommen === o.value} onClick={() => setD({ ...d, einkommen: o.value })} />)}
            </>)}
          </div>

          <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
            {step > 0 && <button onClick={prevStep} style={{ padding: "13px 16px", borderRadius: 10, cursor: "pointer", background: C.card, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13.5, fontWeight: 600 }}>←</button>}
            <button onClick={() => canNext() && nextStep()} style={{
              flex: 1, padding: 14, borderRadius: 10, cursor: canNext() ? "pointer" : "default",
              background: canNext() ? `linear-gradient(135deg,${C.primary},${C.primaryDark})` : "rgba(0,0,0,.04)",
              border: "none", color: canNext() ? "#fff" : "rgba(0,0,0,.2)",
              fontSize: 14, fontWeight: 700, transition: "all .15s", fontFamily: "'Outfit'",
            }}>
              {step === 2.5 ? (email ? "Weiter" : "Überspringen") : step === 4 ? "Ergebnis anzeigen" : "Weiter"}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ RESULT ═══════════════ */}
      {step === 5 && res && (
        <div className="kz-container" style={{ padding: 20, maxWidth: 460, margin: "0 auto", animation: "fadeUp .5s ease both" }}>

          {/* Empfehlung */}
          <div style={{ background: `linear-gradient(135deg,rgba(26,143,85,.08),rgba(26,143,85,.03))`, border: `1px solid rgba(26,143,85,.15)`, borderRadius: 13, padding: 16, marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: C.primary, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, marginBottom: 5 }}>Unsere Empfehlung</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 5 }}>{res.w.label}</div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{res.w.grund}</div>
          </div>

          {/* Big Number */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 4 }}>Ihr geschätzter Zuschuss</div>
            <div className="kz-big-number" style={{ fontSize: 44, fontWeight: 800, color: C.accent, lineHeight: 1.1 }}>{fmt(res.foerd)} €</div>
            <div style={{ fontSize: 14.5, color: C.muted, marginTop: 3 }}>{res.pct}% der förderfähigen Kosten</div>
          </div>

          {/* CTA / FORM / DONE - inline after big number */}
          {view === "result" && (
            <div style={{ marginBottom: 18 }}>
              <button onClick={() => setView("form")} style={{
                width: "100%", padding: 16, borderRadius: 11, cursor: "pointer",
                background: `linear-gradient(135deg,${C.primary},${C.primaryDark})`, border: "none",
                color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 6,
                boxShadow: "0 4px 16px rgba(26,143,85,.15)", fontFamily: "'Outfit'",
              }}>Jetzt kostenlose Beratung sichern</button>
              <div style={{ fontSize: 11, color: C.dim, textAlign: "center", lineHeight: 1.4 }}>
                Wir rufen Sie an und vereinbaren einen persönlichen Beratungstermin bei Ihnen vor Ort.
              </div>
            </div>
          )}

          {view === "form" && (
            <div style={{ animation: "fadeUp .3s ease both", marginBottom: 18, background: `linear-gradient(135deg,rgba(26,143,85,.06),rgba(26,143,85,.02))`, border: `1px solid rgba(26,143,85,.12)`, borderRadius: 13, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Kostenlose Beratung anfragen</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>Ein Fachberater aus Ihrer Region ruft Sie an und vereinbart einen persönlichen Termin bei Ihnen vor Ort.</div>
              <div style={{ marginBottom: 8 }}>
                <input placeholder="Vor- und Nachname *" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setFormErrors(p => ({...p, name: undefined})); }} style={{ ...INP, borderColor: formErrors.name ? "#D94040" : C.border }} />
                {formErrors.name && <div style={{ fontSize: 12, color: "#D94040", marginTop: 3 }}>{formErrors.name}</div>}
              </div>
              <div style={{ marginBottom: 8 }}>
                <input placeholder="Telefonnummer *" type="tel" value={form.tel} onChange={e => { setForm({ ...form, tel: e.target.value }); setFormErrors(p => ({...p, tel: undefined})); }} style={{ ...INP, borderColor: formErrors.tel ? "#D94040" : C.border }} />
                {formErrors.tel && <div style={{ fontSize: 12, color: "#D94040", marginTop: 3 }}>{formErrors.tel}</div>}
              </div>
              {!emailCaptured && (
                <div style={{ marginBottom: 8 }}>
                  <input type="email" placeholder="E-Mail-Adresse *" value={email} onChange={e => { setEmail(e.target.value); setFormErrors(p => ({...p, email: undefined})); }} style={{ ...INP, borderColor: formErrors.email ? "#D94040" : C.border }} />
                  {formErrors.email && <div style={{ fontSize: 12, color: "#D94040", marginTop: 3 }}>{formErrors.email}</div>}
                </div>
              )}
              {emailCaptured && <div style={{ ...INP, marginBottom: 8, color: C.primary, background: "rgba(26,143,85,.05)" }}>{email} ✓</div>}
              <div style={{ marginBottom: 10 }}>
                <input placeholder="Postleitzahl *" value={form.plz} onChange={e => { setForm({ ...form, plz: e.target.value }); setFormErrors(p => ({...p, plz: undefined})); }} style={{ ...INP, borderColor: formErrors.plz ? "#D94040" : C.border }} />
                {formErrors.plz && <div style={{ fontSize: 12, color: "#D94040", marginTop: 3 }}>{formErrors.plz}</div>}
              </div>
              <button onClick={async () => { if (validateForm()) { setSending(true); await submitLead(form, d, email); setSending(false); setView("done"); } }} style={{
                width: "100%", padding: 15, borderRadius: 10, cursor: "pointer",
                background: `linear-gradient(135deg,${C.primary},${C.primaryDark})`,
                border: "none", color: "#fff", fontSize: 14.5, fontWeight: 700, fontFamily: "'Outfit'",
              }}>{sending ? "Wird gesendet..." : "Rückruf anfordern"}</button>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 8, textAlign: "center" }}>Kostenlos und unverbindlich. Kein Spam.</div>
            </div>
          )}

          {view === "done" && (
            <div style={{ textAlign: "center", padding: "24px 0", marginBottom: 18, animation: "fadeUp .4s ease both", background: `linear-gradient(135deg,rgba(26,143,85,.06),rgba(26,143,85,.02))`, border: `1px solid rgba(26,143,85,.12)`, borderRadius: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif", marginBottom: 6 }}>Anfrage gesendet</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, maxWidth: 300, margin: "0 auto", padding: "0 16px" }}>
                Ein Fachberater aus Ihrer Region wird sich in Kürze bei Ihnen melden.
              </div>
            </div>
          )}

          {/* Förder-Aufschlüsselung - ALWAYS VISIBLE */}
          <div style={{ background: C.card, borderRadius: 13, padding: "16px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>Aufschlüsselung</div>
            <ABar label="Grundförderung" pct={res.gr} color={C.primary} delay={150} />
            <ABar label="Effizienzbonus" pct={res.ef} color={C.accent} delay={300} />
            <ABar label="Tempo-Bonus" pct={res.gs} color="#E8720C" delay={450} />
            <ABar label="Einkommensbonus" pct={res.ei} color="#3B82F6" delay={600} />
          </div>

          {/* Stats - Labels visible, amounts locked */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }}>
            <Stat l="Geschätzte Gesamtkosten" v={`${fmt(res.kosten)} €`} s={res.w.kurz} locked={isLocked} />
            <Stat l="Ihr Eigenanteil" v={`${fmt(res.eig)} €`} s="Nach Abzug Förderung" locked={isLocked} />
            <Stat l="Jährl. Ersparnis" v={`${fmt(res.jE)} €`} s={`${fmt(res.altK)}€ → ${fmt(res.neuK)}€`} locked={isLocked} />
            <Stat l="Amortisation" v={`ca. ${res.amor} J.`} s="Bis sich die Investition rechnet" locked={isLocked} />
          </div>

          {/* 15y savings - locked or visible */}
          <div style={{ background: isLocked ? C.card : "rgba(26,143,85,.06)", border: `1px solid ${isLocked ? C.border : "rgba(26,143,85,.1)"}`, borderRadius: 11, padding: 14, marginBottom: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 3 }}>Ersparnis über 15 Jahre</div>
            {isLocked ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: C.dim, filter: "blur(6px)", userSelect: "none" }}>+ 21.750 €</span>
                <span style={{ fontSize: 14 }}>🔒</span>
              </div>
            ) : (
              <div style={{ fontSize: 26, fontWeight: 800, color: C.primary }}>+ {fmt(res.e15)} €</div>
            )}
            {!isLocked && <div style={{ fontSize: 11.5, color: C.dim, marginTop: 3 }}>CO₂-Einsparung: ca. {res.co2} t pro Jahr</div>}
          </div>

          {/* Unlock prompt */}
          {isLocked && (
            <div style={{ background: `linear-gradient(135deg,rgba(196,146,42,.08),rgba(196,146,42,.02))`, border: `1px solid rgba(196,146,42,.15)`, borderRadius: 13, padding: 18, marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Detailanalyse freischalten</div>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>
                Eigenanteil, jährliche Ersparnis, Amortisation und 15-Jahres-Prognose sehen.
              </div>
              <input type="email" placeholder="Ihre E-Mail-Adresse" value={email} onChange={e => setEmail(e.target.value)} style={{ ...INP, marginBottom: 10, textAlign: "center" }} />
              <button onClick={handleUnlock} style={{
                width: "100%", padding: 13, borderRadius: 10, cursor: email?.includes("@") ? "pointer" : "default",
                background: email?.includes("@") ? `linear-gradient(135deg,${C.accent},#C48A2A)` : "rgba(0,0,0,.06)",
                border: "none", color: "#fff", fontSize: 14, fontWeight: 700, opacity: email?.includes("@") ? 1 : .4,
              }}>Analyse freischalten</button>
              <div style={{ fontSize: 10, color: C.faint, marginTop: 7 }}>Kein Spam. Nur Ihre persönliche Berechnung.</div>
            </div>
          )}

          {/* Neu berechnen */}
          {view !== "done" && (
            <button onClick={reset} style={{ width: "100%", padding: 12, borderRadius: 10, cursor: "pointer", background: "transparent", border: `1px solid ${C.border}`, color: C.dim, fontSize: 13, marginBottom: 8 }}>Neu berechnen</button>
          )}
          <div style={{ fontSize: 10, color: C.faint, textAlign: "center", lineHeight: 1.5 }}>* Unverbindliche Schätzung auf Basis der BEG-Richtlinien 2026.</div>
        </div>
      )}

      <div style={{ marginTop: 44, padding: 18, borderTop: `1px solid ${C.border}`, textAlign: "center", fontSize: 12, color: C.dim }}>
        <span style={{ color: C.primary, fontWeight: 600 }}>Klima</span>Zuschuss · Ihr Weg zur klimafreundlichen Heizung<br />
        <a href="/impressum.html" style={{ color: C.dim, textDecoration: "none", marginRight: 12 }}>Impressum</a>
        <a href="/datenschutz.html" style={{ color: C.dim, textDecoration: "none" }}>Datenschutz</a><br />
        © 2026 klimazuschuss.de
      </div>
    </div>
  );
}
