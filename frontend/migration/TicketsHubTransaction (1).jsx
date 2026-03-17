import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Shield, CheckCircle, Clock, Lock, Upload,
  MessageCircle, AlertTriangle, Copy, X, Check, CreditCard,
  Zap, AlertCircle, RefreshCw, Send, Ban, DollarSign,
  ExternalLink, ChevronRight, Eye
} from "lucide-react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const V       = "#6d28d9";
const VLIGHT  = "#f0ebff";
const BLUE    = "#1e3a5f";
const BLIGHT  = "#e4edf7";
const DARK    = "#0f0f1a";
const MUTED   = "#6b7280";
const HINT    = "#9ca3af";
const BG      = "#f3f3f0";
const CARD    = "#ffffff";
const SURFACE = "#f9f9f7";
const BORDER  = "#e5e7eb";
const BORD2   = "#d1d5db";
const GREEN   = "#15803d";
const GLIGHT  = "#f0fdf4";
const GBORD   = "#bbf7d0";
const AMBER   = "#92400e";
const ABG     = "#fffbeb";
const ABORD   = "#fde68a";
const RED     = "#dc2626";
const RLIGHT  = "#fef2f2";
const RBORD   = "#fca5a5";
const S = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const E = { fontFamily: "'DM Serif Display', serif" };
const fmt = (n) => "$" + Number(n).toLocaleString("es-AR");

// ─── ALL TRANSACTION STATUSES ─────────────────────────────────────────────────
const ALL_STATUSES = [
  "PendingPayment", "PaymentPendingVerification", "PaymentReceived",
  "TicketTransferred", "DepositHold", "TransferringFund", "Completed",
  "Disputed", "Refunded",
  "Cancelled_BuyerCancelled", "Cancelled_PaymentTimeout",
  "Cancelled_AdminRejected", "Cancelled_AdminReviewTimeout",
];

const STATUS_LABELS = {
  PendingPayment:              "Pago pendiente",
  PaymentPendingVerification:  "Verificando pago",
  PaymentReceived:             "Pago recibido",
  TicketTransferred:           "Entrada transferida",
  DepositHold:                 "Fondos en escrow",
  TransferringFund:            "Liberando fondos",
  Completed:                   "Completado",
  Disputed:                    "Disputado",
  Refunded:                    "Reembolsado",
  Cancelled_BuyerCancelled:    "Cancelado (comprador)",
  Cancelled_PaymentTimeout:    "Cancelado (expiró)",
  Cancelled_AdminRejected:     "Cancelado (rechazado)",
  Cancelled_AdminReviewTimeout:"Cancelado (admin timeout)",
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_TX = {
  id:             "txn_1773_a9fbb2d8",
  event:          "Bad Bunny",
  subtitle:       "Most Wanted Tour",
  date:           "31 de marzo de 2026",
  venue:          "River Plate",
  sector:         "Digital",
  qty:            1,
  price:          280000,
  buyerFee:       42000,
  sellerCommission: 14000,
  depositReleaseAt: "1 de abril de 2026",
  createdAt:      "17 de marzo de 2026, 18:13",
  img:            "https://picsum.photos/seed/badb3/800/400",
  payloadType:    "ticketera",
  payloadTypeOtherText: null,
  buyer:  { id: "u1", name: "Mica L.",     initials: "ML", email: "mica@linda.com"    },
  seller: { id: "u2", name: "Federico V.", initials: "FV", email: "fede@gmail.com", verified: true },
  disputeId:      "sup_abc123",
  bankTransferConfig: {
    bankName:   "Brubank",
    cbu:        "0720461088000001234567",
    holderName: "Federico V.",
    cuit:       "20-12345678-9",
  },
};

// ─── STEPPER CONFIG ───────────────────────────────────────────────────────────
const STEPS = [
  { id: "payment",  label: "Pago"          },
  { id: "transfer", label: "Transferencia" },
  { id: "received", label: "Recepción"     },
  { id: "released", label: "Liberado"      },
];

const STATUS_TO_STEP = {
  PendingPayment:              0,
  PaymentPendingVerification:  0,
  PaymentReceived:             1,
  TicketTransferred:           2,
  DepositHold:                 2,
  TransferringFund:            3,
  Completed:                   3,
  Disputed:                    2,
  Refunded:                    0,
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function parseStatus(raw) {
  if (raw.startsWith("Cancelled_")) return { status: "Cancelled", reason: raw.replace("Cancelled_", "") };
  return { status: raw, reason: null };
}

function isCancelled(raw) { return raw.startsWith("Cancelled_"); }
function isTerminal(raw)  { return isCancelled(raw) || raw === "Refunded" || raw === "Completed" || raw === "Disputed"; }

// ═══════════════════════════════════════════════════════════════════════════════
export default function TicketsHubTransaction() {
  const [role,         setRole]         = useState("buyer");
  const [rawStatus,    setRawStatus]    = useState("PendingPayment");
  const [hasProof,     setHasProof]     = useState(false);   // simula paymentConfirmation
  const [isManual,     setIsManual]     = useState(true);    // bankTransferConfig presente
  const [modal,        setModal]        = useState(null);
  const [proofFile,    setProofFile]    = useState(null);
  const [chatOpen,     setChatOpen]     = useState(false);
  const [chatMode,     setChatMode]     = useState("enabled"); // null | enabled | only_read
  const [reviewDone,   setReviewDone]   = useState(false);
  const [copied,       setCopied]       = useState(null);
  const [transferMethod, setTransferMethod] = useState("ticketera");
  const [disputeStep,  setDisputeStep]  = useState("form");  // choice | form | report_sent
  const [disputeReason,setDisputeReason]= useState("");
  const [disputeDesc,  setDisputeDesc]  = useState("");
  const [disputeSubject, setDisputeSubject] = useState("Reporte Bad Bunny");
  const [receiptFile,  setReceiptFile]  = useState(null);
  const [rating,       setRating]       = useState(null);

  useEffect(() => {
    const l = document.createElement("link");
    l.rel  = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(l);
    return () => { try { document.head.removeChild(l); } catch(e){} };
  }, []);

  const { status, reason } = parseStatus(rawStatus);
  const currentStep = STATUS_TO_STEP[status] ?? 0;
  const canOpenDispute = !isCancelled(rawStatus) && !["Disputed","Refunded","PendingPayment","PaymentPendingVerification"].includes(status) &&
    ((role === "buyer" && ["PaymentReceived","TicketTransferred","DepositHold"].includes(status)) ||
     (role === "seller" && ["TicketTransferred"].includes(status)));

  const handleCopy = (val, key) => {
    if (navigator.clipboard) navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ ...S, background: BG, color: DARK, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .tx-grid { display:grid; grid-template-columns:1fr 340px; gap:20px; max-width:1000px; margin:0 auto; padding:0 24px 48px; }
        @media(max-width:820px){ .tx-grid{ grid-template-columns:1fr; } }
        .btn-p  { background:${V};    color:white;  border:none;             border-radius:10px; width:100%; padding:13px; font-size:14px;   font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:background 0.15s; }
        .btn-p:hover  { background:#5b21b6; }
        .btn-p:disabled { background:${BORD2}; color:${MUTED}; cursor:not-allowed; }
        .btn-o  { background:white; color:${DARK}; border:1.5px solid ${BORD2}; border-radius:10px; width:100%; padding:12px; font-size:13.5px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.14s; }
        .btn-o:hover { border-color:${V}; color:${V}; }
        .link-btn { background:none; border:none; cursor:pointer; color:${MUTED}; font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; text-decoration:underline; padding:0; }
        .link-btn:hover { color:${DARK}; }
        .link-red { background:none; border:none; cursor:pointer; color:${RED}; font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; text-decoration:underline; padding:0; }
        .radio-opt { display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:10px; border:1.5px solid ${BORD2}; cursor:pointer; transition:all 0.14s; font-size:13.5px; color:${DARK}; font-family:'Plus Jakarta Sans',sans-serif; width:100%; text-align:left; }
        .radio-opt.sel { border-color:${V}; background:${VLIGHT}; }
        .radio-opt:hover:not(.sel) { border-color:${BORD2}; background:${SURFACE}; }
        .sn { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
        .sln { flex:1; height:2px; margin:0 6px; margin-bottom:20px; }
        .dev-btn { padding:5px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; border:1px solid ${BORD2}; background:${SURFACE}; color:${MUTED}; font-family:'Plus Jakarta Sans',sans-serif; white-space:nowrap; }
        .dev-btn.on { background:${VLIGHT}; border-color:${V}; color:${V}; }
        .upload-area { border:2px dashed ${BORD2}; border-radius:12px; padding:20px; text-align:center; cursor:pointer; transition:all 0.14s; }
        .upload-area:hover { border-color:${V}; background:${VLIGHT}; }
        .upload-area.has { border-style:solid; border-color:${GREEN}; background:${GLIGHT}; }
        .chat-msg-self  { background:${V};    color:white; border-radius:14px 14px 4px 14px; padding:10px 14px; max-width:75%; font-size:13.5px; line-height:1.5; align-self:flex-end; }
        .chat-msg-other { background:${SURFACE}; color:${DARK}; border:1px solid ${BORDER}; border-radius:14px 14px 14px 4px; padding:10px 14px; max-width:75%; font-size:13.5px; line-height:1.5; }
        .rating-btn { padding:8px 18px; border-radius:9px; border:1.5px solid ${BORD2}; background:white; color:${MUTED}; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.14s; font-family:'Plus Jakarta Sans',sans-serif; }
        .rating-btn.sel { background:${VLIGHT}; border-color:${V}; color:${V}; }
        input:focus, textarea:focus { border-color:${V}!important; box-shadow:0 0 0 3px rgba(109,40,217,0.1)!important; outline:none; }
        input[type=file] { display:none; }
      `}</style>

      {/* ── DEV SWITCHER ── */}
      <div style={{ background: DARK, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>Vista:</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["buyer","seller"].map(r => (
              <button key={r} className={`dev-btn${role === r ? " on" : ""}`} onClick={() => setRole(r)}>
                {r === "buyer" ? "Comprador" : "Vendedor"}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>Estado:</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {ALL_STATUSES.map(s => (
              <button key={s} className={`dev-btn${rawStatus === s ? " on" : ""}`}
                onClick={() => { setRawStatus(s); setModal(null); setChatOpen(false); }}>
                {STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Opts:</span>
          <button className={`dev-btn${isManual ? " on" : ""}`} onClick={() => setIsManual(!isManual)}>Pago manual</button>
          <button className={`dev-btn${hasProof ? " on" : ""}`} onClick={() => setHasProof(!hasProof)}>Con comprobante</button>
        </div>
      </div>

      {/* ── BACK ── */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
        <button style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 13.5, fontWeight: 500, padding: "18px 0 14px", ...S }}>
          <ArrowLeft size={15} /> Volver a mis {role === "buyer" ? "compras" : "ventas"}
        </button>
      </div>

      <div className="tx-grid">
        {/* ════ LEFT ════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <EventCard tx={MOCK_TX} />
          <TransactionStepper steps={STEPS} current={currentStep} status={status} isCancelled={isCancelled(rawStatus)} />
          <ActionBlock
            role={role} rawStatus={rawStatus} status={status} reason={reason}
            tx={MOCK_TX} isManual={isManual} hasProof={hasProof}
            proofFile={proofFile} setProofFile={setProofFile}
            canOpenDispute={canOpenDispute}
            onOpenModal={setModal}
            reviewDone={reviewDone} setReviewDone={setReviewDone}
            rating={rating} setRating={setRating}
            onNext={(nextRaw) => { if (nextRaw) setRawStatus(nextRaw); }}
          />
          <PaymentInfo tx={MOCK_TX} role={role} />
        </div>

        {/* ════ RIGHT ════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <CounterpartCard tx={MOCK_TX} role={role}
            chatMode={chatMode} onOpenChat={() => setChatOpen(true)} />
          <EscrowCard role={role} rawStatus={rawStatus} tx={MOCK_TX} />
          <HelpCard />
          <TxMeta tx={MOCK_TX} copied={copied} onCopy={handleCopy} />
        </div>
      </div>

      {/* ── CHAT PANEL ── */}
      {chatOpen && (
        <ChatPanel
          tx={MOCK_TX} role={role} chatMode={chatMode}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* ── MODALS ── */}
      {modal === "transfer" && (
        <TransferMethodModal
          tx={MOCK_TX}
          method={transferMethod} setMethod={setTransferMethod}
          onConfirm={() => { setModal(null); setRawStatus("TicketTransferred"); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "confirm_receipt" && (
        <ConfirmReceiptModal
          tx={MOCK_TX}
          receiptFile={receiptFile} setReceiptFile={setReceiptFile}
          onConfirm={() => { setModal(null); setRawStatus("DepositHold"); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "dispute" && (
        <DisputeModal
          tx={MOCK_TX} role={role}
          step={disputeStep} setStep={setDisputeStep}
          reason={disputeReason} setReason={setDisputeReason}
          description={disputeDesc} setDescription={setDisputeDesc}
          subject={disputeSubject} setSubject={setDisputeSubject}
          onClose={() => { setModal(null); setDisputeStep("form"); }}
          onChatInstead={() => { setModal(null); setChatOpen(true); }}
          onSuccess={() => setRawStatus("Disputed")}
        />
      )}
      {modal === "proof_preview" && (
        <ProofPreviewModal onClose={() => setModal(null)} />
      )}
      {modal === "cancel_confirm" && (
        <CancelConfirmModal
          onConfirm={() => { setModal(null); setRawStatus("Cancelled_BuyerCancelled"); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── EVENT CARD ───────────────────────────────────────────────────────────────
function EventCard({ tx }) {
  return (
    <div style={{ background: CARD, borderRadius: 16, overflow: "hidden", border: `1px solid ${BORDER}`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ position: "relative", height: 140, overflow: "hidden" }}>
        <img src={tx.img} alt={tx.event} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,15,26,0.72) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", bottom: 14, left: 16 }}>
          <h2 style={{ ...E, fontSize: 22, fontWeight: 400, color: "white", margin: "0 0 3px", letterSpacing: "-0.3px" }}>{tx.event}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12.5, color: "rgba(255,255,255,0.72)" }}>
            <span>📅 {tx.date}</span>
            <span>📍 {tx.venue}</span>
          </div>
        </div>
        <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", padding: "3px 10px", borderRadius: 100, fontSize: 11.5, fontWeight: 600, color: "white" }}>
          {tx.sector}
        </div>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", gap: 28 }}>
        {[["Cantidad", tx.qty], ["Tipo", tx.sector]].map(([l, v]) => (
          <div key={l}>
            <p style={{ fontSize: 10.5, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{l}</p>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: DARK }}>{v}</p>
          </div>
        ))}
        <div>
          <p style={{ fontSize: 10.5, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>ID transacción</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: HINT }}>{tx.id.slice(0, 18)}…</p>
        </div>
      </div>
    </div>
  );
}

// ─── STEPPER ─────────────────────────────────────────────────────────────────
function TransactionStepper({ steps, current, status, isCancelled }) {
  const isDone = (i) => !isCancelled && i < current;
  const isActive = (i) => !isCancelled && i === current;

  return (
    <div style={{ background: CARD, borderRadius: 16, padding: "18px 22px", border: `1px solid ${BORDER}` }}>
      <p style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 18 }}>
        Estado de la transacción
      </p>
      <div style={{ display: "flex", alignItems: "center" }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div className="sn" style={{
                background: isCancelled ? BORD2 : isDone(i) ? GREEN : isActive(i) ? V : BORDER,
                color: isCancelled ? MUTED : (isDone(i) || isActive(i)) ? "white" : MUTED,
                outline: isActive(i) ? `3px solid ${VLIGHT}` : "none",
                outlineOffset: 2,
              }}>
                {!isCancelled && isDone(i) ? <Check size={13} /> : isCancelled ? <X size={12} /> : <span style={{ fontSize: 11 }}>{i + 1}</span>}
              </div>
              <span style={{ fontSize: 11.5, fontWeight: isActive(i) ? 700 : 500, color: isActive(i) ? DARK : (i > current || isCancelled) ? HINT : MUTED, whiteSpace: "nowrap" }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="sln" style={{ background: (!isCancelled && i < current) ? GREEN : BORDER }} />
            )}
          </div>
        ))}
      </div>
      {isCancelled && (
        <div style={{ marginTop: 14, padding: "8px 12px", background: RLIGHT, borderRadius: 8, border: `1px solid ${RBORD}` }}>
          <p style={{ fontSize: 12.5, color: RED, fontWeight: 600 }}>Esta transacción fue cancelada</p>
        </div>
      )}
    </div>
  );
}

// ─── ACTION BLOCK DISPATCHER ──────────────────────────────────────────────────
function ActionBlock({ role, rawStatus, status, reason, tx, isManual, hasProof,
  proofFile, setProofFile, canOpenDispute, onOpenModal, reviewDone, setReviewDone,
  rating, setRating, onNext }) {

  if (role === "buyer") {
    return <BuyerActionBlock {...{ rawStatus, status, reason, tx, isManual, hasProof,
      proofFile, setProofFile, canOpenDispute, onOpenModal, reviewDone, setReviewDone,
      rating, setRating, onNext }} />;
  }
  return <SellerActionBlock {...{ rawStatus, status, reason, tx, canOpenDispute,
    onOpenModal, reviewDone, setReviewDone, rating, setRating, onNext }} />;
}

// ─── BUYER ACTION BLOCKS ──────────────────────────────────────────────────────
function BuyerActionBlock({ rawStatus, status, reason, tx, isManual, hasProof,
  proofFile, setProofFile, canOpenDispute, onOpenModal, reviewDone, setReviewDone,
  rating, setRating, onNext }) {

  // PendingPayment — bank transfer, no proof yet
  if (status === "PendingPayment" && isManual && !hasProof) return (
    <ActionHero icon={<CreditCard size={22}/>} color={BLUE} bg={BLIGHT}
      title="Realizá la transferencia" badge={null}
      subtitle={`Transferí exactamente ${fmt(tx.price + tx.buyerFee)} ARS a los datos de abajo. Tenés 30 minutos para hacerlo.`}>
      <BankDetailsBlock tx={tx} />
      <CountdownBlock minutes={28} seconds={43} />
      <div style={{ marginTop: 14 }}>
        <label htmlFor="proof-up">
          <div className={`upload-area${proofFile ? " has" : ""}`}>
            <input id="proof-up" type="file" accept="image/*,.pdf"
              onChange={e => setProofFile(e.target.files[0])} />
            {proofFile
              ? <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:9 }}>
                  <CheckCircle size={18} style={{ color: GREEN }} />
                  <span style={{ fontSize:13.5, fontWeight:600, color:GREEN }}>{proofFile.name}</span>
                </div>
              : <>
                  <Upload size={22} style={{ color:MUTED, margin:"0 auto 8px", display:"block" }} />
                  <p style={{ fontSize:14, fontWeight:600, color:DARK, marginBottom:3 }}>Subir comprobante de pago</p>
                  <p style={{ fontSize:12.5, color:MUTED }}>JPG, PNG o PDF · Máx. 10 MB</p>
                </>
            }
          </div>
        </label>
        <button className="btn-p" style={{ marginTop: 12 }}
          disabled={!proofFile}
          onClick={() => onNext("PaymentPendingVerification")}>
          <Upload size={15} /> Enviar comprobante
        </button>
      </div>
      <div style={{ textAlign:"center", marginTop:10 }}>
        <button className="link-red" onClick={() => onOpenModal("cancel_confirm")}>Cancelar transacción</button>
      </div>
    </ActionHero>
  );

  // PendingPayment — bank transfer, proof uploaded (PaymentPendingVerification visual)
  if ((status === "PendingPayment" && isManual && hasProof) || status === "PaymentPendingVerification") return (
    <ActionHero icon={<Clock size={22}/>} color={AMBER} bg={ABG}
      title="Verificando tu pago" badge="Esperando"
      subtitle="Recibimos tu comprobante. Nuestro equipo lo está verificando. Máximo 1 hora hábil.">
      <StatusRow color="#f59e0b" text="Comprobante enviado · Esperando aprobación del equipo" />
      <div style={{ marginTop:14, display:"flex", gap:10 }}>
        <button className="btn-o" onClick={() => onOpenModal("proof_preview")}>
          <Eye size={14} /> Ver comprobante
        </button>
        {status !== "PaymentPendingVerification" && (
          <button className="btn-o" style={{ color:RED, borderColor:RBORD }}
            onClick={() => onOpenModal("cancel_confirm")}>
            Cancelar
          </button>
        )}
      </div>
    </ActionHero>
  );

  // PendingPayment — payment gateway (not manual)
  if (status === "PendingPayment" && !isManual) return (
    <ActionHero icon={<RefreshCw size={22}/>} color={BLUE} bg={BLIGHT}
      title="Procesando tu pago" badge="Esperando"
      subtitle="Tu pago está siendo procesado por el gateway. Esto puede tomar unos minutos.">
      <StatusRow color={V} text="Pago iniciado · Procesando con el gateway" />
      <div style={{ textAlign:"center", marginTop:12 }}>
        <button className="link-red" onClick={() => onOpenModal("cancel_confirm")}>Cancelar transacción</button>
      </div>
    </ActionHero>
  );

  // PaymentReceived — waiting for seller to transfer
  if (status === "PaymentReceived") return (
    <ActionHero icon={<Clock size={22}/>} color={BLUE} bg={BLIGHT}
      title="Pago confirmado — esperando la entrada" badge="Esperando"
      subtitle={`Tu pago fue verificado. ${tx.seller.name} está por transferirte la entrada. Recibirás una notificación cuando lo haga.`}>
      <StatusRow color={GREEN} text="Pago aprobado por el equipo de TicketsHub" />
      <div style={{ marginTop:12, padding:"12px 14px", background:SURFACE, borderRadius:10, border:`1px solid ${BORDER}` }}>
        <p style={{ fontSize:13, color:MUTED, lineHeight:1.55 }}>
          Podés contactar al vendedor si tenés preguntas sobre la transferencia.
          Si no recibís la entrada, podés abrir una disputa.
        </p>
      </div>
      {canOpenDispute && (
        <div style={{ textAlign:"center", marginTop:10 }}>
          <button className="link-red" onClick={() => onOpenModal("dispute")}>Reportar un problema</button>
        </div>
      )}
    </ActionHero>
  );

  // TicketTransferred — confirm receipt
  if (status === "TicketTransferred") return (
    <ActionHero icon={<CheckCircle size={22}/>} color={GREEN} bg={GLIGHT}
      title="¡Tu entrada llegó! Confirmá la recepción"
      subtitle={`${tx.seller.name} transfirió tu entrada. Verificá que la recibiste y confirmá para liberar el proceso de escrow.`}>
      <div style={{ padding:"12px 14px", background:SURFACE, borderRadius:10, border:`1px solid ${BORDER}`, marginBottom:14 }}>
        <p style={{ fontSize:11, fontWeight:700, color:MUTED, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:5 }}>Enviada como</p>
        <p style={{ fontSize:14, fontWeight:600, color:DARK }}>{payloadTypeLabel(tx.payloadType, tx.payloadTypeOtherText)}</p>
      </div>
      <button className="btn-p" onClick={() => onOpenModal("confirm_receipt")}>
        <Check size={15} /> Confirmar que recibí la entrada
      </button>
      {canOpenDispute && (
        <div style={{ textAlign:"center", marginTop:10 }}>
          <button className="link-red" onClick={() => onOpenModal("dispute")}>¿Hay un problema? Reportar</button>
        </div>
      )}
    </ActionHero>
  );

  // DepositHold — funds in escrow
  if (status === "DepositHold") return (
    <ActionHero icon={<Lock size={22}/>} color={V} bg={VLIGHT}
      title="Recepción confirmada · Fondos en escrow"
      subtitle="Confirmaste recibir la entrada. Los fondos están protegidos y se liberarán al vendedor después del evento.">
      <EscrowTimeline role="buyer" tx={tx} />
      {canOpenDispute && (
        <div style={{ textAlign:"center", marginTop:12 }}>
          <button className="link-red" onClick={() => onOpenModal("dispute")}>Reportar un problema</button>
        </div>
      )}
    </ActionHero>
  );

  // TransferringFund
  if (status === "TransferringFund") return (
    <ActionHero icon={<RefreshCw size={22}/>} color={V} bg={VLIGHT}
      title="Fondos en proceso de liberación" badge="Procesando"
      subtitle="Los fondos están siendo transferidos al vendedor. Este proceso puede tomar hasta 24 horas hábiles.">
      <StatusRow color={V} text="Procesando pago al vendedor" />
    </ActionHero>
  );

  // Completed
  if (status === "Completed") return (
    <ActionHero icon={<CheckCircle size={22}/>} color={GREEN} bg={GLIGHT}
      title="Transacción completada"
      subtitle="Todo listo. Esperamos que disfrutes el evento. ¡Que lo pases increíble!">
      <div style={{ padding:"14px 16px", background:GLIGHT, borderRadius:12, border:`1px solid ${GBORD}`, textAlign:"center", marginBottom:16 }}>
        <p style={{ fontSize:14, fontWeight:600, color:GREEN, marginBottom:3 }}>Todo listo</p>
        <p style={{ fontSize:13, color:"#166534" }}>{tx.event} · {tx.date}</p>
      </div>
      {!reviewDone && <ReviewForm role="buyer" onSubmit={() => setReviewDone(true)} rating={rating} setRating={setRating} />}
    </ActionHero>
  );

  // Disputed
  if (status === "Disputed") return (
    <ActionHero icon={<AlertCircle size={22}/>} color={RED} bg={RLIGHT}
      title="Disputa abierta"
      subtitle="Abriste una disputa. Nuestro equipo de soporte está revisando el caso y te contactará pronto.">
      <div style={{ padding:"12px 14px", background:RLIGHT, borderRadius:10, border:`1px solid ${RBORD}` }}>
        <p style={{ fontSize:13.5, color:RED, fontWeight:600, marginBottom:4 }}>Caso abierto: #{tx.disputeId}</p>
        <p style={{ fontSize:13, color:"#991b1b", lineHeight:1.5 }}>Podés seguir el estado de tu disputa en el centro de soporte.</p>
      </div>
      <button className="btn-o" style={{ marginTop:14 }}>
        <ExternalLink size={14} /> Ver disputa en soporte
      </button>
    </ActionHero>
  );

  // Refunded
  if (status === "Refunded") return (
    <ActionHero icon={<RefreshCw size={22}/>} color={GREEN} bg={GLIGHT}
      title="Reembolso procesado"
      subtitle="Tu dinero fue devuelto. El reembolso puede tardar 3-5 días hábiles en aparecer en tu cuenta.">
      <div style={{ padding:"14px 16px", background:GLIGHT, borderRadius:12, border:`1px solid ${GBORD}` }}>
        <PriceLine label="Monto reembolsado" val={fmt(tx.price + tx.buyerFee)} bold />
        <p style={{ fontSize:12.5, color:"#166534", marginTop:8 }}>Se acreditará en el mismo método de pago original.</p>
      </div>
    </ActionHero>
  );

  // Cancelled
  if (rawStatus.startsWith("Cancelled_")) return (
    <ActionHero icon={<Ban size={22}/>} color={MUTED} bg={SURFACE}
      title="Transacción cancelada"
      subtitle={cancelledSubtitle(reason)}>
      {reason === "PaymentTimeout" && (
        <div style={{ padding:"11px 14px", background:ABG, borderRadius:10, border:`1px solid ${ABORD}` }}>
          <p style={{ fontSize:13, color:AMBER }}>El tiempo para completar el pago expiró. Las entradas volvieron a estar disponibles.</p>
        </div>
      )}
      {reason === "AdminRejected" && (
        <div style={{ padding:"11px 14px", background:RLIGHT, borderRadius:10, border:`1px solid ${RBORD}` }}>
          <p style={{ fontSize:13, color:RED }}>Tu comprobante fue rechazado. Si crees que es un error, contactá a soporte.</p>
        </div>
      )}
      <button className="btn-o" style={{ marginTop:14 }}>
        Ver otros eventos disponibles
      </button>
    </ActionHero>
  );

  return null;
}

// ─── SELLER ACTION BLOCKS ─────────────────────────────────────────────────────
function SellerActionBlock({ rawStatus, status, reason, tx, canOpenDispute,
  onOpenModal, reviewDone, setReviewDone, rating, setRating, onNext }) {

  if (status === "PendingPayment" || status === "PaymentPendingVerification") return (
    <ActionHero icon={<Clock size={22}/>} color={MUTED} bg={SURFACE}
      title={status === "PendingPayment" ? "Esperando el pago del comprador" : "Verificando el pago"}
      badge="Esperando"
      subtitle={status === "PendingPayment"
        ? `${tx.buyer.name} tiene 30 minutos para completar la transferencia.`
        : "Nuestro equipo está verificando el comprobante de pago. Recibirás una notificación cuando sea aprobado."}>
      <StatusRow color="#f59e0b" text={status === "PendingPayment" ? "Aguardando transferencia del comprador" : "Comprobante en revisión"} />
    </ActionHero>
  );

  if (status === "PaymentReceived") return (
    <ActionHero icon={<Zap size={22}/>} color={AMBER} bg={ABG}
      title="¡Pago confirmado! Transferí la entrada"
      subtitle={`${tx.buyer.name} pagó. Transferile la entrada lo antes posible.`}>
      <div style={{ padding:"12px 14px", background:SURFACE, borderRadius:10, border:`1px solid ${BORDER}`, marginBottom:14 }}>
        <p style={{ fontSize:11, fontWeight:700, color:MUTED, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Datos del comprador</p>
        <div style={{ display:"flex", gap:24 }}>
          <div>
            <p style={{ fontSize:11.5, color:MUTED, marginBottom:2 }}>Nombre</p>
            <p style={{ fontSize:14, fontWeight:600, color:DARK }}>{tx.buyer.name}</p>
          </div>
          <div>
            <p style={{ fontSize:11.5, color:MUTED, marginBottom:2 }}>Email</p>
            <p style={{ fontSize:14, fontWeight:600, color:DARK }}>{tx.buyer.email}</p>
          </div>
        </div>
      </div>
      <button className="btn-p" onClick={() => onOpenModal("transfer")}>
        <Check size={15} /> Confirmar que transferí la entrada
      </button>
      {canOpenDispute && (
        <div style={{ textAlign:"center", marginTop:10 }}>
          <button className="link-btn" onClick={() => onOpenModal("dispute")}>Reportar un problema</button>
        </div>
      )}
    </ActionHero>
  );

  if (status === "TicketTransferred") return (
    <ActionHero icon={<Lock size={22}/>} color={V} bg={VLIGHT}
      title="Esperando confirmación del comprador" badge="Esperando"
      subtitle={`${tx.buyer.name} necesita confirmar que recibió la entrada. Tus fondos están seguros en escrow.`}>
      <EscrowTimeline role="seller" tx={tx} />
      <div style={{ padding:"12px 14px", background:SURFACE, borderRadius:10, border:`1px solid ${BORDER}`, marginTop:14 }}>
        <p style={{ fontSize:12.5, color:MUTED, lineHeight:1.55 }}>
          Enviaste como <strong style={{ color:DARK }}>{payloadTypeLabel(tx.payloadType, tx.payloadTypeOtherText)}</strong>.
          Si el comprador no confirma antes del evento, los fondos se liberan automáticamente el {tx.depositReleaseAt}.
        </p>
      </div>
      {canOpenDispute && (
        <div style={{ textAlign:"center", marginTop:10 }}>
          <button className="link-red" onClick={() => onOpenModal("dispute")}>Reportar un problema</button>
        </div>
      )}
    </ActionHero>
  );

  if (status === "DepositHold") return (
    <ActionHero icon={<Lock size={22}/>} color={V} bg={VLIGHT}
      title="Fondos en escrow — liberación pendiente" badge="Esperando"
      subtitle={`El comprador confirmó la recepción. Los fondos se liberarán el ${tx.depositReleaseAt}.`}>
      <EscrowTimeline role="seller" tx={tx} showHold />
      {canOpenDispute && (
        <div style={{ textAlign:"center", marginTop:12 }}>
          <button className="link-red" onClick={() => onOpenModal("dispute")}>Reportar un problema</button>
        </div>
      )}
    </ActionHero>
  );

  if (status === "TransferringFund") return (
    <ActionHero icon={<RefreshCw size={22}/>} color={V} bg={VLIGHT}
      title="Fondos en proceso de transferencia" badge="Procesando"
      subtitle="Estamos procesando el pago a tu cuenta. Puede tomar hasta 24 horas hábiles.">
      <StatusRow color={V} text="Procesando transferencia a tu cuenta bancaria" />
    </ActionHero>
  );

  if (status === "Completed") return (
    <ActionHero icon={<CheckCircle size={22}/>} color={GREEN} bg={GLIGHT}
      title="¡Fondos liberados!"
      subtitle={`Recibirás ${fmt(tx.price - tx.sellerCommission)} ARS en tu cuenta en las próximas 24 horas hábiles.`}>
      <div style={{ padding:"16px", background:GLIGHT, borderRadius:12, border:`1px solid ${GBORD}`, marginBottom:16 }}>
        <PriceLine label="Precio de venta" val={fmt(tx.price)} />
        <PriceLine label="Comisión TicketsHub (5%)" val={`−${fmt(tx.sellerCommission)}`} muted />
        <div style={{ borderTop:`1px solid ${GBORD}`, paddingTop:10, marginTop:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:15, fontWeight:700, color:GREEN }}>Recibís</span>
          <span style={{ fontSize:20, fontWeight:800, color:GREEN }}>{fmt(tx.price - tx.sellerCommission)}</span>
        </div>
      </div>
      {!reviewDone && <ReviewForm role="seller" onSubmit={() => setReviewDone(true)} rating={rating} setRating={setRating} />}
    </ActionHero>
  );

  if (status === "Disputed") return (
    <ActionHero icon={<AlertCircle size={22}/>} color={RED} bg={RLIGHT}
      title="Disputa abierta"
      subtitle="El comprador abrió una disputa. Nuestro equipo revisará el caso y te contactará.">
      <div style={{ padding:"12px 14px", background:RLIGHT, borderRadius:10, border:`1px solid ${RBORD}` }}>
        <p style={{ fontSize:13.5, color:RED, fontWeight:600, marginBottom:4 }}>Caso #{tx.disputeId}</p>
        <p style={{ fontSize:13, color:"#991b1b", lineHeight:1.5 }}>Los fondos permanecen retenidos hasta que se resuelva la disputa.</p>
      </div>
      <button className="btn-o" style={{ marginTop:14 }}>
        <ExternalLink size={14} /> Ver disputa en soporte
      </button>
    </ActionHero>
  );

  if (status === "Refunded") return (
    <ActionHero icon={<RefreshCw size={22}/>} color={MUTED} bg={SURFACE}
      title="Reembolso procesado al comprador"
      subtitle="El dinero fue devuelto al comprador. Los fondos no serán liberados al vendedor.">
      <div style={{ padding:"12px 14px", background:SURFACE, borderRadius:10, border:`1px solid ${BORDER}` }}>
        <p style={{ fontSize:13, color:MUTED, lineHeight:1.5 }}>Si creés que esto fue un error, contactá a nuestro equipo de soporte.</p>
      </div>
    </ActionHero>
  );

  if (rawStatus.startsWith("Cancelled_")) return (
    <ActionHero icon={<Ban size={22}/>} color={MUTED} bg={SURFACE}
      title="Transacción cancelada"
      subtitle={cancelledSubtitle(reason)}>
      <div style={{ padding:"11px 14px", background:SURFACE, borderRadius:10, border:`1px solid ${BORDER}` }}>
        <p style={{ fontSize:13, color:MUTED }}>Las entradas volvieron a estar disponibles para publicar.</p>
      </div>
    </ActionHero>
  );

  return null;
}

// ─── ACTION HERO WRAPPER ──────────────────────────────────────────────────────
function ActionHero({ icon, color, bg, title, subtitle, badge, children }) {
  return (
    <div style={{ background: CARD, borderRadius: 16, overflow: "hidden", border: `1px solid ${BORDER}`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ background: bg, padding: "18px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 15.5, fontWeight: 700, color: DARK, margin: 0 }}>{title}</h2>
            {badge && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: ABG, color: AMBER, border: `1px solid ${ABORD}` }}>{badge}</span>}
          </div>
          <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55, margin: 0 }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

// ─── BANK DETAILS BLOCK ───────────────────────────────────────────────────────
function BankDetailsBlock({ tx }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const copy = (val, key) => {
    if (navigator.clipboard) navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };
  const rows = [
    { label: "Banco",    value: tx.bankTransferConfig.bankName,   key: "bank" },
    { label: "CBU",      value: tx.bankTransferConfig.cbu,        key: "cbu", copyable: true },
    { label: "Titular",  value: tx.bankTransferConfig.holderName, key: "holder" },
    { label: "CUIT",     value: tx.bankTransferConfig.cuit,       key: "cuit" },
  ];
  return (
    <div style={{ padding: "14px 16px", background: SURFACE, borderRadius: 12, border: `1px solid ${BORDER}` }}>
      <p style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Datos bancarios</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(r => (
          <div key={r.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: MUTED }}>{r.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK, fontFamily: r.key === "cbu" ? "monospace" : "inherit", fontSize: r.key === "cbu" ? 12 : 13.5 }}>{r.value}</span>
              {r.copyable && (
                <button onClick={() => copy(r.value, r.key)}
                  style={{ background: copiedKey === r.key ? GLIGHT : SURFACE, border: `1px solid ${copiedKey === r.key ? GBORD : BORDER}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: copiedKey === r.key ? GREEN : MUTED, ...S, display: "flex", alignItems: "center", gap: 4 }}>
                  {copiedKey === r.key ? <><Check size={11}/> Copiado</> : <><Copy size={11}/> Copiar</>}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COUNTDOWN BLOCK ─────────────────────────────────────────────────────────
function CountdownBlock({ minutes, seconds }) {
  const [m, setM] = useState(minutes);
  const [s, setS] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => {
      setS(ps => { if (ps > 0) return ps - 1; setM(pm => pm > 0 ? pm - 1 : 0); return 59; });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const isLow = m < 5;
  return (
    <div style={{ marginTop: 12, padding: "11px 14px", background: isLow ? RLIGHT : ABG, borderRadius: 10, border: `1px solid ${isLow ? RBORD : ABORD}`, display: "flex", alignItems: "center", gap: 10 }}>
      <Clock size={15} style={{ color: isLow ? RED : AMBER, flexShrink: 0 }} />
      <p style={{ fontSize: 13, color: isLow ? RED : AMBER, fontWeight: 600 }}>
        Tiempo restante para pagar: <span style={{ fontFamily: "monospace" }}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</span>
      </p>
    </div>
  );
}

// ─── ESCROW TIMELINE ──────────────────────────────────────────────────────────
function EscrowTimeline({ role, tx, showHold }) {
  const steps = role === "buyer"
    ? [
        { label: "Recepción confirmada",         done: true  },
        { label: "Fondos en custodia",           done: true  },
        { label: `Evento: ${tx.event} (${tx.date})`, done: false, active: true },
        { label: "Fondos liberados al vendedor", done: false },
      ]
    : [
        { label: "Pago recibido",                        done: true  },
        { label: "Entrada transferida",                  done: true  },
        { label: showHold ? "Comprador confirmó recepción" : "Comprador confirma recepción",
                                                         done: showHold, active: !showHold },
        { label: `Fondos liberados (${tx.depositReleaseAt})`, done: false, active: showHold },
      ];

  return (
    <div style={{ padding: "14px 16px", background: SURFACE, borderRadius: 12, border: `1px solid ${BORDER}` }}>
      <p style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Ciclo del escrow</p>
      {steps.map((step, i) => (
        <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < steps.length - 1 ? 2 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: step.done ? GREEN : step.active ? V : BORD2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {step.done && <Check size={10} style={{ color: "white" }} />}
            </div>
            {i < steps.length - 1 && <div style={{ width: 1, height: 20, background: BORD2, margin: "2px 0" }} />}
          </div>
          <p style={{ fontSize: 13, color: step.done ? DARK : step.active ? V : MUTED, fontWeight: step.active ? 600 : 400, lineHeight: 1.4, paddingBottom: i < steps.length - 1 ? 10 : 0 }}>
            {step.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── REVIEW FORM ─────────────────────────────────────────────────────────────
function ReviewForm({ role, onSubmit, rating, setRating }) {
  const [comment, setComment] = useState("");
  return (
    <div style={{ padding: "16px", background: SURFACE, borderRadius: 12, border: `1px solid ${BORDER}` }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 4 }}>¿Cómo fue tu experiencia?</p>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Tu reseña ayuda a construir confianza en la comunidad.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[
          { val: "positive", label: "👍 Positiva" },
          { val: "neutral",  label: "🤝 Neutral"  },
          { val: "negative", label: "👎 Negativa"  },
        ].map(r => (
          <button key={r.val} className={`rating-btn${rating === r.val ? " sel" : ""}`}
            onClick={() => setRating(r.val)}>{r.label}</button>
        ))}
      </div>
      <textarea
        value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Comentario opcional…" rows={3}
        style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${BORD2}`, borderRadius:9, fontSize:13.5, color:DARK, background:CARD, resize:"vertical", marginBottom:12, ...S }}
      />
      <button className="btn-p" disabled={!rating} onClick={onSubmit}>
        Enviar reseña
      </button>
    </div>
  );
}

// ─── PAYMENT INFO ─────────────────────────────────────────────────────────────
function PaymentInfo({ tx, role }) {
  const isBuyer = role === "buyer";
  return (
    <div style={{ background: CARD, borderRadius: 16, padding: "20px", border: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <CreditCard size={16} style={{ color: BLUE }} />
        <p style={{ fontSize: 14, fontWeight: 700, color: DARK }}>Información de pago</p>
      </div>
      <PriceLine label="Precio por entrada" sub={`${fmt(tx.price)} × ${tx.qty}`} val={fmt(tx.price * tx.qty)} />
      <div style={{ height: 8 }} />
      {isBuyer
        ? <PriceLine label="Cargo por servicio" sub="15% del subtotal" val={fmt(tx.buyerFee)} />
        : <PriceLine label="Comisión TicketsHub" sub="5% del precio" val={`−${fmt(tx.sellerCommission)}`} muted />
      }
      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{isBuyer ? "Total pagado" : "Recibís"}</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: V }}>
          {isBuyer ? fmt(tx.price + tx.buyerFee) : fmt(tx.price - tx.sellerCommission)}
        </span>
      </div>
      {isBuyer && (
        <div style={{ marginTop: 12, padding: "10px 12px", background: BLIGHT, borderRadius: 9, border: `1px solid #bfd3ea`, display: "flex", gap: 8 }}>
          <Shield size={13} style={{ color: BLUE, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: BLUE, lineHeight: 1.5 }}>
            Tu compra está protegida. Si no recibís las entradas, te devolvemos el 100%.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── COUNTERPART CARD ─────────────────────────────────────────────────────────
function CounterpartCard({ tx, role, chatMode, onOpenChat }) {
  const isBuyer = role === "buyer";
  const person  = isBuyer ? tx.seller : tx.buyer;
  const label   = isBuyer ? "Vendedor" : "Comprador";

  return (
    <div style={{ background: CARD, borderRadius: 16, padding: "18px", border: `1px solid ${BORDER}` }}>
      <p style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
        Información del {label}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: VLIGHT, color: V, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
          {person.initials}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{person.name}</p>
            {person.verified && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: GREEN }}>
                <CheckCircle size={10} /> Verificado
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: MUTED }}>0 {isBuyer ? "entradas vendidas" : "entradas compradas"} · Sin reseñas</p>
        </div>
      </div>

      {chatMode === "enabled" && (
        <button className="btn-o" onClick={onOpenChat}>
          <MessageCircle size={14} /> Mensaje a {isBuyer ? "vendedor" : "comprador"}
        </button>
      )}
      {chatMode === "only_read" && (
        <button className="btn-o" onClick={onOpenChat}>
          <MessageCircle size={14} /> Ver conversación
        </button>
      )}
      {chatMode === null && (
        <button className="btn-o" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>
          <MessageCircle size={14} /> Chat no disponible
        </button>
      )}
    </div>
  );
}

// ─── ESCROW SIDEBAR CARD ──────────────────────────────────────────────────────
function EscrowCard({ role, rawStatus, tx }) {
  const released = rawStatus === "Completed";
  const isRed    = rawStatus.startsWith("Cancelled_") || rawStatus === "Refunded";
  const bg       = released ? GLIGHT : isRed ? SURFACE : VLIGHT;
  const border   = released ? GBORD  : isRed ? BORDER  : "#ddd6fe";
  const color    = released ? GREEN  : isRed ? MUTED   : V;

  const msg = {
    buyer: {
      waiting:  "Tu dinero está seguro. No se libera al vendedor hasta que confirmes recibir la entrada y pase el evento.",
      released: "La transacción se completó. Esperamos que disfrutes el evento.",
      cancelled:"Los fondos no fueron capturados. No se realizó ningún débito.",
      disputed: "Los fondos están retenidos mientras se resuelve la disputa.",
      refunded: "Tu reembolso fue procesado.",
    },
    seller: {
      waiting:  `Tu dinero está en custodia. Se libera automáticamente el ${tx.depositReleaseAt} o cuando el comprador confirme la recepción.`,
      released: `Recibirás ${fmt(tx.price - tx.sellerCommission)} ARS en las próximas 24 horas hábiles.`,
      cancelled:"La transacción fue cancelada. Las entradas volvieron a estar disponibles.",
      disputed: "Los fondos están retenidos hasta que se resuelva la disputa.",
      refunded: "El dinero fue devuelto al comprador.",
    }
  };

  const msgKey = released ? "released" : rawStatus.startsWith("Cancelled_") ? "cancelled"
    : rawStatus === "Disputed" ? "disputed" : rawStatus === "Refunded" ? "refunded" : "waiting";

  return (
    <div style={{ background: bg, borderRadius: 16, padding: "16px 18px", border: `1px solid ${border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {released ? <CheckCircle size={16} style={{ color: "white" }} /> : isRed ? <Ban size={16} style={{ color: "white" }} /> : <Lock size={16} style={{ color: "white" }} />}
        </div>
        <p style={{ fontSize: 13.5, fontWeight: 700, color }}>
          {released ? "Fondos liberados" : isRed ? "Sin fondos retenidos" : "Fondos en escrow"}
        </p>
      </div>
      <p style={{ fontSize: 12.5, color: released ? "#166534" : isRed ? MUTED : "#5b21b6", lineHeight: 1.55 }}>
        {msg[role][msgKey]}
      </p>
    </div>
  );
}

// ─── HELP CARD ───────────────────────────────────────────────────────────────
function HelpCard() {
  return (
    <div style={{ background: CARD, borderRadius: 16, padding: "16px 18px", border: `1px solid ${BORDER}` }}>
      <p style={{ fontSize: 13.5, fontWeight: 700, color: DARK, marginBottom: 6 }}>¿Necesitás ayuda?</p>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 12, lineHeight: 1.5 }}>Nuestro equipo está disponible para ayudarte con tu transacción.</p>
      <button style={{ width: "100%", padding: "9px", borderRadius: 9, border: `1.5px solid ${DARK}`, background: DARK, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", ...S }}>
        Contactar soporte
      </button>
    </div>
  );
}

// ─── TX META ─────────────────────────────────────────────────────────────────
function TxMeta({ tx, copied, onCopy }) {
  return (
    <div style={{ background: CARD, borderRadius: 16, padding: "14px 18px", border: `1px solid ${BORDER}` }}>
      <p style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Transacción</p>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontSize: 12.5, color: MUTED }}>ID</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: DARK, fontWeight: 600, fontFamily: "monospace" }}>{tx.id.slice(0, 16)}…</span>
          <button onClick={() => onCopy(tx.id, "txid")}
            style={{ background: "none", border: "none", cursor: "pointer", color: copied === "txid" ? GREEN : MUTED, padding: 2 }}>
            {copied === "txid" ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12.5, color: MUTED }}>Creada</span>
        <span style={{ fontSize: 12, color: DARK, fontWeight: 600 }}>{tx.createdAt}</span>
      </div>
    </div>
  );
}

// ─── CHAT PANEL ──────────────────────────────────────────────────────────────
function ChatPanel({ tx, role, chatMode, onClose }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, from: "other", text: "Hola, ya transferí la entrada desde Ticketera.", time: "18:14" },
    { id: 2, from: "self",  text: "Perfecto, ya la veo en la app. Muchas gracias!", time: "18:16" },
  ]);
  const canSend = chatMode === "enabled";
  const counterpart = role === "buyer" ? tx.seller.name : tx.buyer.name;

  const send = () => {
    if (!input.trim() || !canSend) return;
    setMessages(m => [...m, { id: Date.now(), from: "self", text: input, time: "ahora" }]);
    setInput("");
  };

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 400,
      width: 340, background: CARD, borderRadius: 18,
      border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", background: DARK, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: V, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white" }}>
            {(role === "buyer" ? tx.seller.initials : tx.buyer.initials)}
          </div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: "white", marginBottom: 1 }}>{counterpart}</p>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>
              {tx.event} · {chatMode === "only_read" ? "Solo lectura" : "En línea"}
            </p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px", display: "flex", flexDirection: "column", gap: 10, maxHeight: 280, minHeight: 180 }}>
        {messages.map(m => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.from === "self" ? "flex-end" : "flex-start" }}>
            <div className={m.from === "self" ? "chat-msg-self" : "chat-msg-other"}>{m.text}</div>
            <span style={{ fontSize: 11, color: HINT, marginTop: 3 }}>{m.time}</span>
          </div>
        ))}
        {chatMode === "only_read" && (
          <div style={{ padding: "8px 12px", background: ABG, borderRadius: 9, border: `1px solid ${ABORD}`, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: AMBER }}>La conversación está en modo solo lectura</p>
          </div>
        )}
      </div>

      {/* Input */}
      {canSend && (
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Escribí tu mensaje…"
            style={{ flex: 1, padding: "9px 12px", border: `1.5px solid ${BORD2}`, borderRadius: 9, fontSize: 13.5, color: DARK, background: SURFACE, ...S }} />
          <button onClick={send} disabled={!input.trim()}
            style={{ width: 38, height: 38, borderRadius: 9, background: input.trim() ? V : BORD2, border: "none", cursor: input.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Send size={15} style={{ color: "white" }} />
          </button>
        </div>
      )}
      <div style={{ padding: "6px 12px 10px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: HINT }}>Los intercambios fuera de la plataforma no están protegidos.</p>
      </div>
    </div>
  );
}

// ─── TRANSFER METHOD MODAL ────────────────────────────────────────────────────
function TransferMethodModal({ tx, method, setMethod, onConfirm, onClose }) {
  const [step, setStep]           = useState(1);
  const [otherText, setOtherText] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const methods = [
    { id: "ticketera",   label: "Ticketera (Quentro, Venti, otra…)" },
    { id: "pdf_or_image",label: "PDF o imagen (enviada por email)" },
    { id: "other",       label: "Otra forma" },
  ];
  return (
    <ModalOverlay onClose={onClose} title="¿Cómo enviaste la entrada?">
      {step === 1 ? <>
        <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 16, lineHeight: 1.55 }}>
          Indicá cómo enviaste la entrada. Esto queda registrado en la transacción.
        </p>
        <div style={{ padding: "10px 14px", background: ABG, borderRadius: 10, border: `1px solid ${ABORD}`, marginBottom: 16 }}>
          <p style={{ fontSize: 12.5, color: AMBER }}>
            <strong>Enviando a:</strong> {tx.buyer.email}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: method === "other" ? 12 : 20 }}>
          {methods.map(m => (
            <button key={m.id} className={`radio-opt${method === m.id ? " sel" : ""}`} onClick={() => setMethod(m.id)}>
              <RadioDot selected={method === m.id} />{m.label}
            </button>
          ))}
        </div>
        {method === "other" && (
          <input value={otherText} onChange={e => setOtherText(e.target.value)}
            placeholder="Describí cómo enviaste la entrada…"
            style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${BORD2}`, borderRadius:10, fontSize:13.5, color:DARK, background:SURFACE, marginBottom:20, ...S }} />
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-o" onClick={onClose}>Cancelar</button>
          <button className="btn-p" onClick={() => setStep(2)} disabled={!method || (method === "other" && !otherText.trim())}>
            Siguiente <ChevronRight size={15} />
          </button>
        </div>
      </> : <>
        <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 16, lineHeight: 1.55 }}>
          Podés subir un comprobante de transferencia (opcional). Ayuda a resolver disputas más rápido.
        </p>
        <label htmlFor="transfer-proof-up">
          <div className={`upload-area${proofFile ? " has" : ""}`}>
            <input id="transfer-proof-up" type="file" accept="image/*,.pdf" onChange={e => setProofFile(e.target.files[0])} />
            {proofFile
              ? <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:9 }}>
                  <CheckCircle size={18} style={{ color: GREEN }} /><span style={{ fontSize:13.5, fontWeight:600, color:GREEN }}>{proofFile.name}</span>
                </div>
              : <><Upload size={20} style={{ color:MUTED, margin:"0 auto 8px", display:"block" }} />
                  <p style={{ fontSize:13.5, fontWeight:600, color:DARK, marginBottom:3 }}>Subir comprobante (opcional)</p>
                  <p style={{ fontSize:12.5, color:MUTED }}>Imagen o PDF · Máx. 5 MB</p></>
            }
          </div>
        </label>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn-o" onClick={() => setStep(1)}>Volver</button>
          <button className="btn-p" onClick={onConfirm}>
            <Check size={15} /> Confirmar transferencia
          </button>
        </div>
      </>}
    </ModalOverlay>
  );
}

// ─── CONFIRM RECEIPT MODAL ────────────────────────────────────────────────────
function ConfirmReceiptModal({ tx, receiptFile, setReceiptFile, onConfirm, onClose }) {
  return (
    <ModalOverlay onClose={onClose} title="Confirmar recepción de entrada">
      <div style={{ padding: "14px 16px", background: ABG, borderRadius: 12, border: `1px solid ${ABORD}`, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <AlertTriangle size={16} style={{ color: AMBER, flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: AMBER, marginBottom: 4 }}>Antes de confirmar</p>
            <p style={{ fontSize: 13, color: "#78350f", lineHeight: 1.55 }}>
              Al confirmar, reconocés que recibiste la entrada de <strong>{tx.seller.name}</strong>.
              <br />Esta acción <strong>no se puede deshacer</strong>.
            </p>
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 14px", background: VLIGHT, borderRadius: 10, border: "1px solid #ddd6fe", marginBottom: 16, display: "flex", gap: 9 }}>
        <Lock size={14} style={{ color: V, flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12.5, color: V, lineHeight: 1.5 }}>
          Los fondos ({fmt(tx.price + tx.buyerFee)} ARS) permanecen en escrow hasta después del evento ({tx.date}).
          Se liberan al vendedor el {tx.depositReleaseAt}. Si hay un problema antes, podés reportarlo.
        </p>
      </div>
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>Comprobante de recepción (opcional)</p>
        <label htmlFor="receipt-up">
          <div className={`upload-area${receiptFile ? " has" : ""}`}>
            <input id="receipt-up" type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files[0])} />
            {receiptFile
              ? <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:9 }}>
                  <CheckCircle size={18} style={{ color:GREEN }}/><span style={{ fontSize:13.5, fontWeight:600, color:GREEN }}>{receiptFile.name}</span>
                </div>
              : <><Upload size={18} style={{ color:MUTED, margin:"0 auto 6px", display:"block" }}/>
                  <p style={{ fontSize:13, color:MUTED }}>Subir imagen de la entrada (opcional)</p></>
            }
          </div>
        </label>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-o" onClick={onClose}>Cancelar</button>
        <button className="btn-p" onClick={onConfirm}>
          <CheckCircle size={15} /> Confirmar — recibí la entrada
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─── DISPUTE MODAL ────────────────────────────────────────────────────────────
const DISPUTE_CATEGORIES = [
  "No recibí la entrada",
  "La entrada es inválida o falsa",
  "Datos incorrectos en la entrada",
  "El vendedor no responde",
  "Otro",
];

const DISPUTE_ERROR_MAP = {
  BAD_REQUEST:                   "Ya existe un reporte para esta transacción.",
  CLAIM_TOO_EARLY:               "Es muy pronto para abrir una disputa. Intentá más tarde.",
  CLAIM_TOO_LATE:                "La ventana de disputa se cerró.",
  CLAIM_TICKET_NOT_TRANSFERRED:  "La entrada no fue transferida todavía.",
  CLAIM_CONFIRM_RECEIPT_FIRST:   "Confirmá la recepción antes de reportar un problema.",
};

function DisputeModal({ tx, role, step, setStep, reason, setReason,
  description, setDescription, subject, setSubject,
  onClose, onChatInstead, onSuccess }) {
  const [apiError, setApiError] = useState(null);
  const [ticketId, setTicketId] = useState("sup_xyz789");
  const counterpartLabel = role === "buyer" ? "vendedor" : "comprador";

  const handleSubmit = () => {
    // Simula errores de API — en producción usar respuesta real
    const simulateError = null; // cambiar a "BAD_REQUEST", "CLAIM_TOO_EARLY", etc. para testear
    if (simulateError) { setApiError(DISPUTE_ERROR_MAP[simulateError] || "Error desconocido."); return; }
    setStep("report_sent");
    onSuccess();
  };

  if (step === "choice") return (
    <ModalOverlay onClose={onClose} title="Reportar un problema">
      <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 20, lineHeight: 1.55 }}>
        Antes de abrir un reporte, ¿intentaste hablar con el {counterpartLabel}?
        Muchos problemas se resuelven rápido por chat.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
        <button className="radio-opt" onClick={onChatInstead}>
          <MessageCircle size={16} style={{ color: V, flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, color: DARK, marginBottom: 2 }}>Hablar con el {counterpartLabel} primero</p>
            <p style={{ fontSize: 12.5, color: MUTED }}>Abrí el chat y resolvé el problema directamente.</p>
          </div>
        </button>
        <button className="radio-opt" onClick={() => setStep("form")}>
          <AlertTriangle size={16} style={{ color: RED, flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, color: DARK, marginBottom: 2 }}>Quiero reportar un problema</p>
            <p style={{ fontSize: 12.5, color: MUTED }}>Abrí una disputa formal con el equipo de TicketsHub.</p>
          </div>
        </button>
      </div>
    </ModalOverlay>
  );

  if (step === "form") return (
    <ModalOverlay onClose={onClose} title="Reportar un problema">
      <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 20, lineHeight: 1.55 }}>
        Describí el problema. Nuestro equipo lo revisará y te contactará en las próximas 2 horas hábiles.
      </p>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Motivo *</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {DISPUTE_CATEGORIES.map(r => (
            <button key={r} className={`radio-opt${reason === r ? " sel" : ""}`} onClick={() => setReason(r)} style={{ justifyContent: "flex-start" }}>
              <RadioDot selected={reason === r} />{r}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Asunto *</p>
        <input value={subject} onChange={e => setSubject(e.target.value)}
          style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${BORD2}`, borderRadius:10, fontSize:13.5, color:DARK, background:SURFACE, ...S }} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Descripción *</p>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Describí qué pasó con todos los detalles relevantes…" rows={4}
          style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${BORD2}`, borderRadius:10, fontSize:13.5, color:DARK, background:SURFACE, resize:"vertical", ...S }} />
      </div>
      {apiError && (
        <div style={{ padding:"10px 12px", background:RLIGHT, borderRadius:9, border:`1px solid ${RBORD}`, marginBottom:14 }}>
          <p style={{ fontSize:13, color:RED }}>{apiError}</p>
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-o" onClick={onClose}>Cancelar</button>
        <button className="btn-p" style={{ background: RED }}
          disabled={!reason || !description.trim()}
          onClick={handleSubmit}>
          Enviar reporte
        </button>
      </div>
    </ModalOverlay>
  );

  if (step === "report_sent") return (
    <ModalOverlay onClose={onClose} title="Reporte enviado">
      <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: GLIGHT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle size={28} style={{ color: GREEN }} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 8 }}>Tu reporte fue enviado</p>
        <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6, marginBottom: 16 }}>
          Nuestro equipo lo revisará y te contactará en las próximas 2 horas hábiles.
        </p>
        <div style={{ padding: "12px 16px", background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>ID del caso</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{ticketId}</p>
        </div>
        <button className="btn-p">
          <ExternalLink size={14} /> Ver en centro de soporte
        </button>
      </div>
    </ModalOverlay>
  );

  return null;
}

// ─── PROOF PREVIEW MODAL ─────────────────────────────────────────────────────
function ProofPreviewModal({ onClose }) {
  return (
    <ModalOverlay onClose={onClose} title="Comprobante de pago">
      <div style={{ background: SURFACE, borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}`, marginBottom: 16 }}>
        <iframe
          src="about:blank"
          title="Comprobante"
          style={{ width: "100%", height: 300, border: "none", display: "block", background: "#f9f9f9" }}
        />
        <div style={{ padding: "12px 14px", borderTop: `1px solid ${BORDER}`, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: MUTED }}>Vista previa del comprobante — en producción se carga desde una signed URL</p>
        </div>
      </div>
      <button className="btn-o" onClick={onClose}>Cerrar</button>
    </ModalOverlay>
  );
}

// ─── CANCEL CONFIRM MODAL ─────────────────────────────────────────────────────
function CancelConfirmModal({ onConfirm, onClose }) {
  return (
    <ModalOverlay onClose={onClose} title="Cancelar transacción">
      <div style={{ padding: "14px 16px", background: RLIGHT, borderRadius: 12, border: `1px solid ${RBORD}`, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <AlertTriangle size={16} style={{ color: RED, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13.5, color: RED, lineHeight: 1.55 }}>
            Si cancelás, la reserva se liberará y las entradas vuelven a estar disponibles para otros compradores.
            Esta acción no se puede deshacer.
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-o" onClick={onClose}>No cancelar</button>
        <button className="btn-p" style={{ background: RED }} onClick={onConfirm}>
          Sí, cancelar
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
function ModalOverlay({ children, title, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(15,15,26,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: CARD, borderRadius: 20, padding: 28, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ ...E, fontSize: 20, fontWeight: 400, color: DARK, letterSpacing: "-0.3px" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── MICRO COMPONENTS ────────────────────────────────────────────────────────
function StatusRow({ color, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}` }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <p style={{ fontSize: 13, color: MUTED }}>{text}</p>
    </div>
  );
}

function RadioDot({ selected }) {
  return (
    <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selected ? V : BORD2}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {selected && <div style={{ width: 7, height: 7, borderRadius: "50%", background: V }} />}
    </div>
  );
}

function PriceLine({ label, sub, val, muted, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
      <div>
        <p style={{ fontSize: 13.5, color: DARK, fontWeight: bold ? 700 : 500 }}>{label}</p>
        {sub && <p style={{ fontSize: 11.5, color: HINT, marginTop: 1 }}>{sub}</p>}
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: muted ? MUTED : DARK, whiteSpace: "nowrap" }}>{val}</span>
    </div>
  );
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function payloadTypeLabel(type, otherText) {
  if (type === "ticketera")    return "Ticketera (Quentro, Venti, etc.)";
  if (type === "pdf_or_image") return "PDF o imagen (por email)";
  if (type === "other")        return otherText || "Otra forma";
  return "—";
}

function cancelledSubtitle(reason) {
  if (reason === "BuyerCancelled")       return "Cancelaste esta transacción. Las entradas están nuevamente disponibles.";
  if (reason === "PaymentTimeout")       return "El tiempo para completar el pago expiró. La reserva fue liberada automáticamente.";
  if (reason === "AdminRejected")        return "Tu comprobante de pago fue rechazado por el equipo de revisión.";
  if (reason === "AdminReviewTimeout")   return "El tiempo de revisión administrativa expiró sin una decisión.";
  return "Esta transacción fue cancelada.";
}
