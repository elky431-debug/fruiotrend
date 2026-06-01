"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function DashboardPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const TEMPLATE_LABELS: Record<string, string> = {
    living_product: "🧸 Produit Vivant",
    influencer: "🧑 Influenceur",
    product_demo: "🔬 Démo Produit",
    before_after: "🎭 Avant/Après",
    lifestyle: "🌍 Lifestyle",
    absurd_problem: "😂 Absurde",
    unboxing: "👑 Unboxing",
    testimonial: "📱 Témoignages",
  };

  useEffect(() => {
    fetch("/api/ads")
      .then((r) => r.json())
      .then((data) => setAds(data.ads || []))
      .finally(() => setLoading(false));
  }, []);

  const deleteAd = async (id: string) => {
    if (!window.confirm("Supprimer cette pub et tous ses fichiers ?")) return;

    setDeleting(id);
    try {
      await fetch(`/api/ads/${id}`, { method: "DELETE" });
      setAds((prev) => prev.filter((ad) => ad.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.03em",
            }}
          >
            Mes pubs
          </h1>
          <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>
            {ads.length} pub{ads.length !== 1 ? "s" : ""} générée
            {ads.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/create" style={{ textDecoration: "none" }}>
          <div
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              background: "var(--accent)",
              color: "#000",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Créer une pub
          </div>
        </Link>
      </div>

      {loading ? (
        <div
          style={{ textAlign: "center", color: "var(--text2)", padding: "3rem" }}
        >
          Chargement...
        </div>
      ) : ads.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📢</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 8,
            }}
          >
            Aucune pub générée
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text2)",
              marginBottom: 24,
            }}
          >
            Crée ta première pub vidéo IA
          </div>
          <Link href="/create" style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "inline-block",
                padding: "11px 24px",
                borderRadius: 12,
                background: "var(--accent)",
                color: "#000",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              + Créer maintenant
            </div>
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
            gap: 16,
          }}
        >
          {ads.map((ad) => {
            const preview = ad.final_video_url || ad.scenes.find((scene) => scene.videoUrl)?.videoUrl;
            const firstImage = ad.scenes.find((scene) => scene.imageUrl)?.imageUrl;
            const sceneCount = ad.scenes?.length || 0;
            const videosCount = ad.scenes?.filter((scene) => scene.videoUrl).length || 0;

            return (
              <div
                key={ad.id}
                style={{
                  background: "var(--bg1)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    height: 200,
                    background: "var(--bg3)",
                    overflow: "hidden",
                  }}
                >
                  {preview ? (
                    <video
                      src={preview}
                      autoPlay
                      loop
                      muted
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
                      alt={ad.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text3)",
                        fontSize: 32,
                      }}
                    >
                      📢
                    </div>
                  )}

                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      display: "flex",
                      gap: 5,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        background: "rgba(0,0,0,0.75)",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 99,
                      }}
                    >
                      {TEMPLATE_LABELS[ad.template] || ad.template}
                    </span>
                    {ad.final_video_url && (
                      <span
                        style={{
                          background: "rgba(34,197,94,0.9)",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 99,
                        }}
                      >
                        ✓ Vidéo finale
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteAd(ad.id)}
                    disabled={deleting === ad.id}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.6)",
                      border: "none",
                      color: "#F87171",
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {deleting === ad.id ? "..." : "✕"}
                  </button>
                </div>

                <div style={{ padding: "14px 16px" }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text)",
                      marginBottom: 4,
                    }}
                  >
                    {ad.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text2)",
                      fontStyle: "italic",
                      marginBottom: 10,
                    }}
                  >
                    &quot;{ad.hook}&quot;
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "var(--bg3)",
                        color: "var(--text2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {ad.product_name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "var(--bg3)",
                        color: "var(--text2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {sceneCount} scènes
                    </span>
                    {videosCount > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: "rgba(200,255,0,0.08)",
                          color: "var(--accent)",
                          border: "1px solid rgba(200,255,0,0.2)",
                        }}
                      >
                        {videosCount} vidéo{videosCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 12 }}>
                    {new Date(ad.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {ad.final_video_url && (
                      <a
                        href={ad.final_video_url}
                        download={`${ad.title}.mp4`}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: 9,
                          textAlign: "center",
                          background: "var(--accent)",
                          color: "#000",
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        ↓ Télécharger
                      </a>
                    )}
                    <Link href={`/create?reload=${ad.id}`} style={{ flex: 1, textDecoration: "none" }}>
                      <div
                        style={{
                          padding: "8px",
                          borderRadius: 9,
                          textAlign: "center",
                          background: "var(--bg3)",
                          border: "1px solid var(--border)",
                          color: "var(--text2)",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        🔄 Modifier
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
