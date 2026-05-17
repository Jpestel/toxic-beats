// Icônes SVG des réseaux sociaux — utilisées dans l'admin ET sur le site public

export type PredefinedNetwork = "youtube" | "facebook" | "instagram" | "tiktok" | "x";

export const PREDEFINED_NETWORKS: { id: PredefinedNetwork; label: string }[] = [
  { id: "youtube",   label: "YouTube"   },
  { id: "facebook",  label: "Facebook"  },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok",    label: "TikTok"    },
  { id: "x",         label: "X"         },
];

export function SocialIcon({ id, size = 20 }: { id: PredefinedNetwork; size?: number }) {
  const s = size;
  switch (id) {
    case "youtube":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.5 6.2s-.2-1.6-1-2.3c-.9-1-1.9-1-2.4-1C17.3 2.8 12 2.8 12 2.8s-5.3 0-8.1.1c-.5.1-1.5.1-2.4 1-.7.7-1 2.3-1 2.3S.3 8 .3 9.8v1.7c0 1.8.2 3.6.2 3.6s.2 1.6 1 2.3c.9 1 2.1.9 2.6 1C5.8 18.7 12 18.7 12 18.7s5.3 0 8.1-.2c.5-.1 1.5-.1 2.4-1 .7-.7 1-2.3 1-2.3s.2-1.8.2-3.6V9.8C23.7 8 23.5 6.2 23.5 6.2zM9.7 14.4V8.1l6.5 3.2-6.5 3.1z" />
        </svg>
      );
    case "facebook":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.254h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
      );
    case "instagram":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.17 8.17 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z" />
        </svg>
      );
    case "x":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
  }
}

// Types partagés
export type SocialNetwork = {
  id: PredefinedNetwork;
  url: string;
  active: boolean;
};

export type CustomSocialNetwork = {
  id: string;
  name: string;
  icon_url: string;
  url: string;
  active: boolean;
};

export type SocialsConfig = {
  predefined: SocialNetwork[];
  custom: CustomSocialNetwork[];
};

export const DEFAULT_SOCIALS_CONFIG: SocialsConfig = {
  predefined: PREDEFINED_NETWORKS.map((n) => ({ id: n.id, url: "", active: false })),
  custom: [],
};
