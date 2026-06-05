"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/authFetch";
import { getPlan } from "@/lib/plans";
import { useCredits } from "@/hooks/useCredits";
import {
  IconPlus,
  IconBolt,
  IconArrowUpRight,
  IconArrowRight,
  IconDownload,
  IconEdit,
  IconTrash,
} from "@/components/icons";

interface AdScene {
  number: number;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
}

interface Ad {
  id: string;
  title: string;
  hook: string;
  product_name: string;
  template: string;
  scenes: AdScene[];
  final_video_url?: string | null;
  status: string;
  created_at: string;
}

const TEMPLATE_LABELS: Record<string, string> = {
  living_product: "Produit Vivant",
  influencer: "Influenceur",
  product_demo: "Démo Produit",
  before_after: "Avant / Après",
  lifestyle: "Lifestyle",
  absurd_problem: "Absurde",
  unboxing: "Unboxing",
  testimonial: "Témoignages",
};

const GOLD = "#ff5c9d";
const PHASE_SHADES = ["#ff8fbf", "#ff5c9d", "#e32b45", "#8f2436"];

const MONTHS_FR = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 18,
  padding: 24,
};

const eyebrow: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(255,248,242,0.4)",
};

type Metric = "pubs" | "videos" | "scenes";

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function greeting(h: number): string {
  if (h < 6) return "Belle nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bel après-midi";
  return "Bonne soirée";
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return `il y a ${Math.floor(d / 30)} mois`;
}

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y} ${cx} ${p1.y} ${p1.x} ${p1.y}`;
  }
  return d;
}

export default function DashboardPage() {
  const { credits: creditBalance, plan, hasPlan } = useCredits();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("pubs");
  const [now] = useState(() => new Date());

  useEffect(() => {
    authFetch("/api/ads")
      .then((r) => r.json())
      .then((data) => setAds(data.ads || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const planConfig = plan ? getPlan(plan) : null;
  const credits =
    creditBalance !== null
      ? { credits: creditBalance, plan, hasPlan }
      : null;

  // Derived stats
  const stats = useMemo(() => {
    const totalPubs = ads.length;
    const finalVideos = ads.filter((a) => a.final_video_url).length;
    const totalScenes = ads.reduce((s, a) => s + (a.scenes?.length || 0), 0);
    const products = new Set(ads.map((a) => a.product_name).filter(Boolean));
    const weekStart = startOfWeek(now).getTime();
    const thisWeek = ads.filter(
      (a) => new Date(a.created_at).getTime() >= weekStart
    ).length;
    const avgScenes = totalPubs ? totalScenes / totalPubs : 0;
    return {
      totalPubs,
      finalVideos,
      totalScenes,
      products: products.size,
      thisWeek,
      avgScenes,
    };
  }, [ads, now]);

  // Répartition par format de pub
  const phases = useMemo(() => {
    const buckets = [
      {
        key: "living_product",
        name: "Produit Vivant",
        sub: "Pub classique",
      },
      {
        key: "influencer",
        name: "Influenceur",
        sub: "Face caméra",
      },
      {
        key: "product_demo",
        name: "Démo Produit",
        sub: "Style Apple",
      },
      {
        key: "other",
        name: "Autres formats",
        sub: "History Ads & plus",
      },
    ] as const;

    const counts: Record<string, number> = {
      living_product: 0,
      influencer: 0,
      product_demo: 0,
      other: 0,
    };

    for (const ad of ads) {
      const t = ad.template || "";
      if (t === "living_product") counts.living_product++;
      else if (t === "influencer") counts.influencer++;
      else if (t === "product_demo") counts.product_demo++;
      else counts.other++;
    }

    return buckets.map((b, i) => ({
      name: b.name,
      value: counts[b.key],
      sub: b.sub,
      color: PHASE_SHADES[i],
    }));
  }, [ads]);

  // Weekly activity (12 weeks)
  const weekly = useMemo(() => {
    const cur = startOfWeek(now);
    const weeks = Array.from({ length: 12 }, (_, i) => {
      const ws = new Date(cur);
      ws.setDate(ws.getDate() - (11 - i) * 7);
      return { start: ws, pubs: 0, videos: 0, scenes: 0 };
    });
    for (const ad of ads) {
      const ws = startOfWeek(new Date(ad.created_at)).getTime();
      const w = weeks.find((x) => x.start.getTime() === ws);
      if (w) {
        w.pubs++;
        w.scenes += ad.scenes?.length || 0;
        if (ad.final_video_url) w.videos++;
      }
    }
    return weeks;
  }, [ads, now]);

  const metricTotal = useMemo(
    () => weekly.reduce((s, w) => s + w[metric], 0),
    [weekly, metric]
  );

  // Heatmap (14 weeks x 7 days)
  const heatmap = useMemo(() => {
    const WEEKS = 14;
    const cur = startOfWeek(now);
    const grid: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: WEEKS }, () => 0)
    );
    const firstStart = new Date(cur);
    firstStart.setDate(firstStart.getDate() - (WEEKS - 1) * 7);
    for (const ad of ads) {
      const t = new Date(ad.created_at);
      const ws = startOfWeek(t).getTime();
      const col = Math.round(
        (ws - firstStart.getTime()) / (7 * 24 * 3600 * 1000)
      );
      if (col >= 0 && col < WEEKS) {
        const row = (t.getDay() + 6) % 7;
        grid[row][col]++;
      }
    }
    const max = Math.max(1, ...grid.flat());
    return { grid, max, weeks: WEEKS };
  }, [ads, now]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ad of ads) {
      const k = ad.product_name || "Sans nom";
      map[k] = (map[k] || 0) + 1;
    }
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = entries.length ? entries[0][1] : 1;
    return { entries, max };
  }, [ads]);

  // Top formats
  const topFormats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ad of ads) {
      const k = ad.template || "autre";
      map[k] = (map[k] || 0) + 1;
    }
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = entries.length ? entries[0][1] : 1;
    return { entries, max };
  }, [ads]);

  const drafts = useMemo(
    () =>
      ads
        .filter((a) => !a.final_video_url)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [ads]
  );

  const recent = useMemo(
    () =>
      [...ads]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5),
    [ads]
  );

  const deleteAd = async (id: string) => {
    if (!window.confirm("Supprimer cette pub et tous ses fichiers ?")) return;
    setDeleting(id);
    try {
      await authFetch(`/api/ads/${id}`, { method: "DELETE" });
      setAds((prev) => prev.filter((ad) => ad.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const dateLabel = `${["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][now.getDay()]} ${now.getDate()} ${MONTHS_FR[now.getMonth()]}`;

  // Chart geometry
  const CW = 640;
  const CH = 210;
  const padX = 8;
  const padTop = 24;
  const padBottom = 28;
  const vals = weekly.map((w) => w[metric]);
  const maxVal = Math.max(1, ...vals);
  const pts = vals.map((v, i) => ({
    x: padX + (i / (vals.length - 1)) * (CW - padX * 2),
    y: padTop + (1 - v / maxVal) * (CH - padTop - padBottom),
  }));
  const linePath = buildSmoothPath(pts);
  const areaPath = pts.length
    ? `${linePath} L ${pts[pts.length - 1].x} ${CH - padBottom} L ${pts[0].x} ${CH - padBottom} Z`
    : "";

  const fmtWeek = (d: Date) => `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;

  return (
    <div
      style={{
        background:
          "radial-gradient(120% 80% at 50% -10%, rgba(255,92,157,0.12) 0%, rgba(10,7,5,0) 45%), #0a0705",
        minHeight: "100%",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap');
        .dash-serif{font-family:'Playfair Display',Georgia,'Times New Roman',serif;}
        .dash-card{transition:border-color .2s ease, transform .2s ease;}
        .dash-card:hover{border-color:rgba(255,92,157,0.28);}
        .dash-row{transition:background .15s ease;}
        .dash-row:hover{background:rgba(255,255,255,0.03);}
        .dash-row .dash-del{opacity:0;transition:opacity .15s ease;}
        .dash-row:hover .dash-del{opacity:1;}
        .dash-underline{position:relative;}
        .dash-underline::after{content:"";position:absolute;left:0;bottom:-3px;height:1px;width:0;background:${GOLD};transition:width .25s ease;}
        .dash-link:hover .dash-underline::after{width:100%;}
        @keyframes dash-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media (max-width:860px){.dash-grid-2{grid-template-columns:1fr !important;}}
      `}</style>

      <div
        style={{
          width: "100%",
          padding: "28px clamp(16px, 2.5vw, 40px) 72px",
        }}
      >
        {/* HERO */}
        <div
          style={{
            ...card,
            padding: "34px 36px",
            marginBottom: 22,
            background:
              "radial-gradient(130% 160% at 100% 0%, rgba(255,92,157,0.10) 0%, rgba(255,255,255,0.02) 45%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ ...eyebrow, marginBottom: 14 }}>{dateLabel}</div>
              <h1
                className="dash-serif"
                style={{
                  fontSize: 40,
                  fontWeight: 600,
                  lineHeight: 1.05,
                  color: "#fff8f2",
                  letterSpacing: "-0.01em",
                  marginBottom: 12,
                }}
              >
                {greeting(now.getHours())}
                <span style={{ color: GOLD }}>.</span>
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: "rgba(255,248,242,0.5)",
                  maxWidth: 460,
                  marginBottom: 18,
                }}
              >
                Voici la photographie de ton studio —{" "}
                {drafts.length > 0
                  ? `${drafts.length} pub${drafts.length > 1 ? "s" : ""} attend${drafts.length > 1 ? "ent" : ""} une suite.`
                  : "tout est à jour."}
              </p>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: GOLD,
                    }}
                  />
                  <span style={{ fontSize: 12.5, color: "rgba(255,248,242,0.7)" }}>
                    <b style={{ color: "#fff8f2" }}>
                      {credits ? credits.credits.toLocaleString("fr-FR") : "—"}
                    </b>{" "}
                    crédits
                  </span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "rgba(255,248,242,0.4)",
                    }}
                  />
                  <span style={{ fontSize: 12.5, color: "rgba(255,248,242,0.7)" }}>
                    <b style={{ color: "#fff8f2" }}>{drafts.length}</b> en cours
                  </span>
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/create" style={{ textDecoration: "none" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 22px",
                    borderRadius: 12,
                    background:
                      "linear-gradient(135deg, #ff6fae 0%, #ff3d6e 45%, #e32b45 100%)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 10px 26px -12px rgba(227,43,69,0.7)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <IconPlus size={16} /> Nouvelle pub
                </div>
              </Link>
              <Link href="/plans" style={{ textDecoration: "none" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 14px 8px 8px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,248,242,0.8)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        "linear-gradient(135deg, #ff6fae 0%, #ff3d6e 50%, #e32b45 100%)",
                      color: "#fff",
                    }}
                  >
                    <IconBolt size={14} />
                  </div>
                  <div style={{ lineHeight: 1.2 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff8f2" }}>
                      {credits
                        ? credits.credits.toLocaleString("fr-FR")
                        : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,248,242,0.45)" }}>
                      {planConfig
                        ? `${planConfig.name} · crédits`
                        : "Voir les plans"}
                    </div>
                  </div>
                  <IconArrowUpRight size={14} style={{ opacity: 0.5 }} />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* KPI STRIP */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <Kpi
            label="Productions"
            value={String(stats.totalPubs)}
            sub={`${stats.products} produit${stats.products > 1 ? "s" : ""} au carnet`}
            trend={weekly.map((w) => w.pubs)}
          />
          <Kpi
            label="Vidéos finalisées"
            value={String(stats.finalVideos)}
            sub={`${stats.totalPubs ? Math.round((stats.finalVideos / stats.totalPubs) * 100) : 0}% du total`}
            trend={weekly.map((w) => w.videos)}
          />
          <Kpi
            label="Scènes générées"
            value={String(stats.totalScenes)}
            sub={`${stats.avgScenes.toFixed(1)} / pub en moyenne`}
            trend={weekly.map((w) => w.scenes)}
          />
          <Kpi
            label="Plan actif"
            value={planConfig ? planConfig.name : "—"}
            sub={
              planConfig
                ? `${credits?.credits ?? 0} / ${planConfig.credits} crédits`
                : "Aucun abonnement"
            }
            highlight
          />
        </div>

        {/* ACTIVITY + PHASES */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)",
            gap: 16,
            marginBottom: 22,
          }}
          className="dash-grid-2"
        >
          {/* Activity chart */}
          <div className="dash-card" style={card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <div style={eyebrow}>Tendance</div>
              <div style={{ color: "rgba(255,248,242,0.3)" }}>
                <IconArrowUpRight size={15} />
              </div>
            </div>
            <h2
              className="dash-serif"
              style={{ fontSize: 21, color: "#fff8f2", fontWeight: 600 }}
            >
              Activité du studio
            </h2>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginTop: 18,
                marginBottom: 8,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div style={{ ...eyebrow, marginBottom: 6 }}>
                  12 dernières semaines
                </div>
                <div
                  className="dash-serif"
                  style={{ fontSize: 30, color: GOLD, fontWeight: 600 }}
                >
                  {metricTotal.toLocaleString("fr-FR")}
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(255,248,242,0.35)",
                      marginLeft: 10,
                      fontFamily: "inherit",
                    }}
                  >
                    Total cumulé
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 99,
                  padding: 3,
                }}
              >
                {(
                  [
                    ["pubs", "Pubs"],
                    ["videos", "Vidéos"],
                    ["scenes", "Scènes"],
                  ] as [Metric, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetric(key)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 99,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 11.5,
                      fontWeight: 600,
                      background: metric === key ? GOLD : "transparent",
                      color: metric === key ? "#fff" : "rgba(255,248,242,0.55)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <svg
              viewBox={`0 0 ${CW} ${CH}`}
              style={{ width: "100%", height: "auto", display: "block" }}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity="0.32" />
                  <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((g) => (
                <line
                  key={g}
                  x1={padX}
                  x2={CW - padX}
                  y1={padTop + g * (CH - padTop - padBottom)}
                  y2={padTop + g * (CH - padTop - padBottom)}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              ))}
              {areaPath && <path d={areaPath} fill="url(#goldArea)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={GOLD}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
              {pts.length > 0 && (
                <circle
                  cx={pts[pts.length - 1].x}
                  cy={pts[pts.length - 1].y}
                  r="3.5"
                  fill="#fff8f2"
                  stroke={GOLD}
                  strokeWidth="2"
                />
              )}
            </svg>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10.5,
                color: "rgba(255,248,242,0.35)",
                marginTop: 4,
              }}
            >
              <span>{fmtWeek(weekly[0].start)}</span>
              <span>{fmtWeek(weekly[6].start)}</span>
              <span>{fmtWeek(weekly[11].start)}</span>
            </div>
          </div>

          {/* Phases donut */}
          <div className="dash-card" style={card}>
            <div style={{ ...eyebrow, marginBottom: 4 }}>Répartition</div>
            <h2
              className="dash-serif"
              style={{
                fontSize: 21,
                color: "#fff8f2",
                fontWeight: 600,
                marginBottom: 18,
              }}
            >
              Formats de pub
            </h2>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                flexWrap: "wrap",
              }}
            >
              <Donut phases={phases} total={stats.totalPubs} />
              <div style={{ flex: 1, minWidth: 150, display: "grid", gap: 12 }}>
                {phases.map((p) => (
                  <div
                    key={p.name}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: p.color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "#fff8f2",
                          fontWeight: 600,
                        }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: "rgba(255,248,242,0.4)",
                        }}
                      >
                        {p.sub}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "rgba(255,248,242,0.85)",
                      }}
                    >
                      {p.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* À TRAITER + DRAFTS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <div className="dash-card" style={card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ ...eyebrow, marginBottom: 4 }}>Aujourd&apos;hui</div>
                <h2
                  className="dash-serif"
                  style={{ fontSize: 19, color: "#fff8f2", fontWeight: 600 }}
                >
                  À traiter
                </h2>
              </div>
            </div>

            {loading ? (
              <Shimmer height={56} />
            ) : drafts.length === 0 ? (
              <Empty text="Aucune pub en attente." />
            ) : (
              <div style={{ display: "grid", gap: 4 }}>
                {drafts.slice(0, 4).map((ad) => (
                  <Link
                    key={ad.id}
                    href={`/create?reload=${ad.id}`}
                    className="dash-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 8px",
                      borderRadius: 10,
                      textDecoration: "none",
                    }}
                  >
                    <Avatar label={ad.product_name || ad.title} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#fff8f2",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {ad.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,248,242,0.4)",
                        }}
                      >
                        {TEMPLATE_LABELS[ad.template] || ad.template} ·{" "}
                        {relativeTime(ad.created_at)}
                      </div>
                    </div>
                    <IconArrowRight size={15} color="rgba(255,248,242,0.3)" />
                  </Link>
                ))}
                <Link
                  href="/create"
                  className="dash-link"
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: GOLD,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span className="dash-underline">Tout voir</span>
                  <IconArrowUpRight size={13} />
                </Link>
              </div>
            )}
          </div>

          <div className="dash-card" style={card}>
            <div style={{ ...eyebrow, marginBottom: 4 }}>Pipeline</div>
            <h2
              className="dash-serif"
              style={{
                fontSize: 19,
                color: "#fff8f2",
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              Brouillons ouverts
            </h2>
            {drafts.length === 0 ? (
              <Empty text="Aucun brouillon. Tout est finalisé." />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                }}
              >
                <span
                  className="dash-serif"
                  style={{ fontSize: 44, color: GOLD, fontWeight: 600 }}
                >
                  {drafts.length}
                </span>
                <span style={{ fontSize: 13, color: "rgba(255,248,242,0.5)" }}>
                  pub{drafts.length > 1 ? "s" : ""} à finaliser pour libérer ton
                  pipeline.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* TOP PRODUCTS + FORMATS + HEATMAP */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <RankCard
            eyebrowText="Carnet"
            title="Top produits"
            hint="par volume"
            entries={topProducts.entries.map(([name, n]) => ({
              name,
              value: `${n} pub${n > 1 ? "s" : ""}`,
              ratio: n / topProducts.max,
            }))}
            loading={loading}
          />
          <RankCard
            eyebrowText="Formats"
            title="Formats phares"
            hint="par fréquence"
            entries={topFormats.entries.map(([k, n]) => ({
              name: TEMPLATE_LABELS[k] || k,
              value: `${n}`,
              ratio: n / topFormats.max,
            }))}
            loading={loading}
          />

          {/* Heatmap */}
          <div className="dash-card" style={card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <div style={eyebrow}>Pulsations</div>
              <span style={{ fontSize: 11, color: "rgba(255,248,242,0.4)" }}>
                {stats.totalPubs} mouvements
              </span>
            </div>
            <h2
              className="dash-serif"
              style={{
                fontSize: 19,
                color: "#fff8f2",
                fontWeight: 600,
                marginBottom: 18,
              }}
            >
              Rythme du studio
            </h2>

            <div style={{ display: "flex", gap: 6 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: "repeat(7, 1fr)",
                  gap: 4,
                  marginRight: 2,
                }}
              >
                {DAY_LABELS.map((d, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 9,
                      color: "rgba(255,248,242,0.3)",
                      height: 13,
                      lineHeight: "13px",
                    }}
                  >
                    {i % 2 === 0 ? d : ""}
                  </span>
                ))}
              </div>
              <div style={{ flex: 1, overflowX: "auto" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: "repeat(7, 13px)",
                    gridAutoColumns: "13px",
                    gridAutoFlow: "column",
                    gap: 4,
                  }}
                >
                  {Array.from({ length: 7 }).map((_, row) =>
                    Array.from({ length: heatmap.weeks }).map((__, col) => {
                      const v = heatmap.grid[row][col];
                      const intensity = v / heatmap.max;
                      const bg =
                        v === 0
                          ? "rgba(255,255,255,0.04)"
                          : `rgba(255,92,157,${0.22 + intensity * 0.78})`;
                      return (
                        <span
                          key={`${row}-${col}`}
                          title={v ? `${v} pub${v > 1 ? "s" : ""}` : "0"}
                          style={{
                            width: 13,
                            height: 13,
                            borderRadius: 3,
                            background: bg,
                          }}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 14,
                fontSize: 10,
                color: "rgba(255,248,242,0.35)",
              }}
            >
              Moins
              {[0.04, 0.3, 0.55, 0.8, 1].map((o, i) => (
                <span
                  key={i}
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 3,
                    background:
                      i === 0
                        ? "rgba(255,255,255,0.04)"
                        : `rgba(255,92,157,${o})`,
                  }}
                />
              ))}
              Plus
            </div>
          </div>
        </div>

        {/* MINI STATS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: 16,
            marginBottom: 22,
            ...card,
            padding: "8px 0",
            background: "transparent",
            border: "none",
          }}
        >
          <MiniStat label="Cette semaine" value={`${stats.thisWeek}`} unit="nouvelle(s) pub(s)" />
          <MiniStat
            label="Vidéos exportées"
            value={`${stats.finalVideos}`}
            unit="prêtes à publier"
          />
          <MiniStat
            label="Scènes / pub"
            value={stats.avgScenes ? stats.avgScenes.toFixed(1) : "—"}
            unit="en moyenne"
          />
          <MiniStat label="Cycle moyen" value="—" unit="à mesurer" />
        </div>

        {/* RECENT PRODUCTIONS */}
        <div className="dash-card" style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ ...eyebrow, marginBottom: 4 }}>Atelier</div>
              <h2
                className="dash-serif"
                style={{ fontSize: 19, color: "#fff8f2", fontWeight: 600 }}
              >
                Productions récentes
              </h2>
            </div>
            <Link
              href="/create"
              className="dash-link"
              style={{
                fontSize: 12,
                color: GOLD,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span className="dash-underline">Créer une pub</span>
              <IconArrowUpRight size={13} />
            </Link>
          </div>

          {loading ? (
            <Shimmer height={64} />
          ) : recent.length === 0 ? (
            <Empty text="Aucune production pour l'instant." />
          ) : (
            <div style={{ display: "grid", gap: 2 }}>
              {recent.map((ad) => {
                const preview =
                  ad.final_video_url ||
                  ad.scenes.find((s) => s.videoUrl)?.videoUrl;
                const firstImage = ad.scenes.find((s) => s.imageUrl)?.imageUrl;
                const isFinal = Boolean(ad.final_video_url);
                return (
                  <div
                    key={ad.id}
                    className="dash-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "10px 8px",
                      borderRadius: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 56,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.05)",
                        flexShrink: 0,
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {preview ? (
                        <video
                          src={preview}
                          muted
                          loop
                          autoPlay
                          playsInline
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : firstImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={firstImage}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : null}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          color: "#fff8f2",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {ad.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,248,242,0.4)",
                          marginTop: 2,
                        }}
                      >
                        {ad.product_name} ·{" "}
                        {TEMPLATE_LABELS[ad.template] || ad.template} ·{" "}
                        {relativeTime(ad.created_at)}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 9px",
                        borderRadius: 99,
                        whiteSpace: "nowrap",
                        background: isFinal
                          ? "rgba(255,92,157,0.14)"
                          : "rgba(255,255,255,0.05)",
                        color: isFinal ? GOLD : "rgba(255,248,242,0.5)",
                        border: `1px solid ${isFinal ? "rgba(255,92,157,0.3)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {isFinal ? "Finalisée" : "Brouillon"}
                    </span>

                    <div style={{ display: "flex", gap: 6 }}>
                      {isFinal && (
                        <a
                          href={ad.final_video_url!}
                          download={`${ad.title}.mp4`}
                          title="Télécharger"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,248,242,0.7)",
                          }}
                        >
                          <IconDownload size={15} />
                        </a>
                      )}
                      <Link
                        href={`/create?reload=${ad.id}`}
                        title="Modifier"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,248,242,0.7)",
                        }}
                      >
                        <IconEdit size={15} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteAd(ad.id)}
                        disabled={deleting === ad.id}
                        title="Supprimer"
                        className="dash-del"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#d98a8a",
                          cursor: "pointer",
                        }}
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Kpi({
  label,
  value,
  sub,
  trend,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  trend?: number[];
  highlight?: boolean;
}) {
  const spark = useMemo(() => {
    if (!trend || trend.length < 2) return "";
    const max = Math.max(1, ...trend);
    const w = 120;
    const h = 28;
    const pts = trend.map((v, i) => ({
      x: (i / (trend.length - 1)) * w,
      y: h - (v / max) * h,
    }));
    return buildSmoothPath(pts);
  }, [trend]);

  return (
    <div
      className="dash-card"
      style={{
        ...card,
        padding: "20px 22px",
        background: highlight
          ? "linear-gradient(135deg, rgba(255,92,157,0.14), rgba(255,255,255,0.02))"
          : card.background,
        borderColor: highlight ? "rgba(255,92,157,0.3)" : undefined,
      }}
    >
      <div style={{ ...eyebrow, marginBottom: 14 }}>{label}</div>
      <div
        className="dash-serif"
        style={{
          fontSize: 30,
          fontWeight: 600,
          color: highlight ? GOLD : "#fff8f2",
          lineHeight: 1,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "rgba(255,248,242,0.42)",
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sub}
        </span>
        {spark && (
          <svg
            viewBox="0 0 120 28"
            style={{ width: 70, height: 20, flexShrink: 0, opacity: 0.7 }}
            preserveAspectRatio="none"
          >
            <path d={spark} fill="none" stroke={GOLD} strokeWidth="1.6" />
          </svg>
        )}
      </div>
    </div>
  );
}

function Donut({
  phases,
  total,
}: {
  phases: { name: string; value: number; color: string }[];
  total: number;
}) {
  const size = 150;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = phases.reduce((s, p) => s + p.value, 0) || 1;
  let offset = 0;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
        />
        {phases.map((p) => {
          if (p.value === 0) return null;
          const frac = p.value / sum;
          const dash = frac * c;
          const seg = (
            <circle
              key={p.name}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          className="dash-serif"
          style={{ fontSize: 32, fontWeight: 600, color: "#fff8f2" }}
        >
          {total}
        </span>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(255,248,242,0.4)",
          }}
        >
          Pubs
        </span>
      </div>
    </div>
  );
}

function RankCard({
  eyebrowText,
  title,
  hint,
  entries,
  loading,
}: {
  eyebrowText: string;
  title: string;
  hint: string;
  entries: { name: string; value: string; ratio: number }[];
  loading: boolean;
}) {
  return (
    <div className="dash-card" style={card}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div style={eyebrow}>{eyebrowText}</div>
        <span style={{ fontSize: 11, color: "rgba(255,248,242,0.35)" }}>
          {hint}
        </span>
      </div>
      <h2
        className="dash-serif"
        style={{
          fontSize: 19,
          color: "#fff8f2",
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        {title}
      </h2>
      {loading ? (
        <Shimmer height={40} />
      ) : entries.length === 0 ? (
        <Empty text="Pas encore de données." />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {entries.map((e, i) => (
            <div key={e.name + i}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 12.5,
                    color: "rgba(255,248,242,0.8)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "rgba(255,248,242,0.3)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {e.name}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(255,248,242,0.55)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.value}
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.05)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(6, e.ratio * 100)}%`,
                    height: "100%",
                    borderRadius: 99,
                    background: `linear-gradient(90deg, ${GOLD}, #ff8fbf)`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div style={{ padding: "4px 8px" }}>
      <div style={{ ...eyebrow, marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
        <span
          className="dash-serif"
          style={{ fontSize: 24, fontWeight: 600, color: "#fff8f2" }}
        >
          {value}
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,248,242,0.4)" }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

function Avatar({ label }: { label: string }) {
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return (
    <span
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        background: "rgba(255,92,157,0.14)",
        color: GOLD,
        border: "1px solid rgba(255,92,157,0.25)",
      }}
    >
      {initials || "P"}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 12.5,
        color: "rgba(255,248,242,0.35)",
        fontStyle: "italic",
        padding: "10px 0",
      }}
    >
      {text}
    </div>
  );
}

function Shimmer({ height }: { height: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: 10,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 100%)",
        backgroundSize: "200% 100%",
        animation: "dash-shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}
