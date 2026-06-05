import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, strokeWidth, ...props }: IconProps) {
  const sw =
    typeof strokeWidth === "number"
      ? strokeWidth
      : typeof strokeWidth === "string"
        ? parseFloat(strokeWidth) || 1.75
        : 1.75;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function IconBolt(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
    </svg>
  );
}

export function IconFilm(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5L16 9" />
    </svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5M3 16.5l9 5 9-5" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function IconMegaphone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M15 8a4 4 0 0 1 0 8" />
    </svg>
  );
}

export function IconClapperboard(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z" />
      <path d="m3.5 9 2-4 4 1-2 4M9.5 6l4 1-2 4M15.5 7l4 1-2 4" />
    </svg>
  );
}

export function IconGem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3h12l3 5-9 13L3 8l3-5Z" />
      <path d="M3 8h18M9 3 7.5 8 12 21l4.5-13L15 3" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v11m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="m14 6 4 4" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 4.5v15l13-7.5L7 4.5Z" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l1.8-1.4-1.8-3.1-2.2.9a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.4a7.6 7.6 0 0 0-2.6 1.5l-2.2-.9-1.8 3.1L4.6 10.5a7.8 7.8 0 0 0 0 3l-1.8 1.4 1.8 3.1 2.2-.9a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.4-2.4a7.6 7.6 0 0 0 2.6-1.5l2.2.9 1.8-3.1-1.8-1.4Z" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function IconSliders(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="14" cy="18" r="2" />
    </svg>
  );
}

export function IconTrendingUp(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconArrowUpRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export function IconBox(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="m4 7 8 4 8-4M12 11v10" />
    </svg>
  );
}

export function IconSmartphone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="3" width="12" height="18" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function IconAlertTriangle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 21 19H3l9-15.5Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5v5h5M20 19v-5h-5" />
      <path d="M19 9a7.5 7.5 0 0 0-13-2.5L4 10M5 15a7.5 7.5 0 0 0 13 2.5l2-3.5" />
    </svg>
  );
}

export function IconImage(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </svg>
  );
}

export function IconCamera(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20h4L18 10l-4-4L4 16v4Z" />
      <path d="m13 7 4 4" />
    </svg>
  );
}

export function IconBot(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="8" width="14" height="11" rx="2.5" />
      <path d="M12 4v4M9 13h.01M15 13h.01M9 16h6" />
    </svg>
  );
}

export function IconMic(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function IconSparkles(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
    </svg>
  );
}
