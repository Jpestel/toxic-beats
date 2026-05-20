export type GenreConfig = {
  name: string;
  color: string;
  cover_url?: string;
};

export type LicenseType = "mp3" | "wav" | "exclusive";

export type Beat = {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  price: number;
  preview_url: string;
  full_file_path: string;
  description?: string;
  tags?: string[];
  image_url?: string;
  status?: "available" | "reserved" | "sold";
  visible?: boolean;
  wav_extra?: number | null;
  exclusive_price?: number | null;
  wav_file_path?: string | null;
  stems_zip_path?: string | null;
  key?: string | null;
  duration?: number | null;
  created_at: string;
  updated_at?: string | null;
};

export type Kit = {
  id: string;
  title: string;
  description: string;
  price: number;
  preview_url: string;
  preview_path: string;
  zip_path: string | null;
  image_url?: string | null;
  status: "available" | "hidden";
  created_at: string;
  updated_at?: string | null;
};

export type BeatCartItem = {
  type: "beat";
  beat: Beat;
  licenseType: LicenseType;
  price: number;
};

export type KitCartItem = {
  type: "kit";
  kit: Kit;
  price: number;
};

export type CartItem = BeatCartItem | KitCartItem;

export type NewsletterSubscriber = {
  id: string;
  email: string;
  status: "pending" | "confirmed" | "unsubscribed";
  subscribed_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
};

export type NewsletterCampaign = {
  id: string;
  subject: string;
  body_html: string;
  recipient_count: number;
  sent_at: string;
};

export type Order = {
  id: string;
  beat_id?: string | null;
  beat_title: string;
  buyer_name: string;
  buyer_email: string;
  amount: number;
  status: "pending" | "paid" | "cancelled" | "deleted";
  license_type?: LicenseType;
  download_token?: string;
  token_expires_at?: string;
  token_used: boolean;
  notes?: string;
  preview_url?: string | null;
  product_type?: "beat" | "kit";
  kit_id?: string | null;
  files_sent_at?: string | null;
  files_sent_history?: string[] | null;
  downloaded_at?: string[] | null;
  archived_at?: string | null;
  created_at: string;
  has_account?: boolean;
};
