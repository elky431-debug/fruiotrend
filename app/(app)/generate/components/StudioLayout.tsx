"use client";

import { useState } from "react";
import type { DramaScript, StudioState } from "@/types/studio";
import ScriptTab from "./ScriptTab";
import ImagesTab from "./ImagesTab";
import AnimationTab from "./AnimationTab";

const TABS = [
  {
    num: 1 as const,
    label: "Script",
    api: "GPT-4o",
    apiColor: "#10A37F",
    apiBg: "rgba(16,163,127,0.12)",
  },
  {
    num: 2 as const,
    label: "Images",
    api: "Gemini",
    apiColor: "#4285F4",
    apiBg: "rgba(66,133,244,0.12)",
  },
  {
    num: 3 as const,
    label: "Animation",
    api: "Grok",
    apiColor: "#888",
    apiBg: "rgba(255,255,255,0.06)",
  },
];

export default function StudioLayout() {
  const [state, setState] = useState<StudioState>({
    script: null,
    images: {},
    videos: {},
    currentTab: 1,
  });

  const goTab = (tab: 1 | 2 | 3) => {
    if (tab === 2 && !state.script) return;
    if (tab === 3 && Object.keys(state.images).length === 0) return;
    setState((prev) => ({ ...prev, currentTab: tab }));
  };

  return (
    <div className="animate-fadeup">
      <div style={{ marginBottom: 40 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.03em",
            marginBottom: 6,
          }}
        >
          Nouvelle vidéo
        </h1>
        <p style={{ color: "#555", fontSize: 14 }}>
          Script · Images · Animation — tout en un seul endroit
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          background: "#0D0D0D",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
          padding: 6,
          marginBottom: 32,
        }}
      >
        {TABS.map((tab) => {
          const active = state.currentTab === tab.num;
          const done =
            (tab.num === 1 && !!state.script) ||
            (tab.num === 2 && Object.keys(state.images).length > 0);
          const locked =
            (tab.num === 2 && !state.script) ||
            (tab.num === 3 && Object.keys(state.images).length === 0);

          return (
            <button
              key={tab.num}
              type="button"
              onClick={() => goTab(tab.num)}
              disabled={locked}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "12px 16px",
                borderRadius: 11,
                border: "none",
                cursor: locked ? "not-allowed" : "pointer",
                transition: "all 0.18s",
                background: active ? "#1A1A1A" : "transparent",
                outline: active ? "1px solid rgba(255,255,255,0.08)" : "none",
                opacity: locked ? 0.35 : 1,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  background: active ? "#C8FF00" : done ? "#22C55E" : "rgba(255,255,255,0.06)",
                  color: active || done ? "#000" : "#555",
                }}
              >
                {done && !active ? "✓" : tab.num}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: active ? "#fff" : "#555",
                  letterSpacing: "-0.01em",
                }}
              >
                {tab.label}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  padding: "3px 8px",
                  borderRadius: 100,
                  background: active ? tab.apiBg : "transparent",
                  color: active ? tab.apiColor : "#333",
                  border: active ? `1px solid ${tab.apiColor}33` : "1px solid transparent",
                  transition: "all 0.18s",
                }}
              >
                {tab.api}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        {state.currentTab === 1 && (
          <ScriptTab
            script={state.script}
            onScriptGenerated={(s) => setState((p) => ({ ...p, script: s }))}
            onContinue={state.script ? () => goTab(2) : undefined}
          />
        )}
        {state.currentTab === 2 && state.script && (
          <ImagesTab
            script={state.script}
            images={state.images}
            onImageGenerated={(id, url) =>
              setState((p) => ({ ...p, images: { ...p.images, [id]: url } }))
            }
            onNext={() => goTab(3)}
          />
        )}
        {state.currentTab === 3 && state.script && (
          <AnimationTab
            script={state.script}
            images={state.images}
            videos={state.videos}
            onVideoGenerated={(n, url) =>
              setState((p) => ({ ...p, videos: { ...p.videos, [n]: url } }))
            }
          />
        )}
      </div>
    </div>
  );
}
