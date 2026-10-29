export interface GarmentListRow {
  id: string;
  human_id: string;
  style_number: string | null;
  title: string;
  description: string | null;
  short_badge: string | null;
  season_label: string | null;
  gender_label: string | null;
  wear_system_label: string | null;
  garment_type_label: string | null;
  silhouette_label: string | null;
  fabric_label: string | null;
  season_code?: string | null;
  gender_code?: string | null;
  wear_system_code?: string | null;
  garment_type_code?: string | null;
  silhouette_code?: string | null;
  fabric_code?: string | null;
  ornamentation_codes: string[] | null;
  hero_image_url: string | null;
  has_video: boolean;
  created_at: string;
  barcode?: string | null;
  needs_review?: boolean;
  /** Others notes keyed by parameter key. */
  other_notes?: Record<string, string> | null;
}

export interface HomeDashboard {
  stats: {
    total_garments: number;
    unique_seasons: number;
    unique_genders: number;
    unique_garment_types: number;
  };
  recent: GarmentListRow[];
  studio_label: string;
  date_label: string;
}

export interface GarmentComponent {
  id: string;
  human_id: string;
  type_code: string | null;
  type_label: string | null;
  description: string | null;
  other_notes?: Record<string, string> | null;
  media_urls: string[] | null;
}

export interface ParameterMedia {
  parameter_key: string;
  parameter_label: string;
  image_url: string;
  caption: string | null;
  sort_order: number | null;
}

export interface CustomSelection {
  parameter_key: string;
  parameter_label: string;
  coding_slot: CodingSlot | null;
  codes: string[];
  labels: string[];
  other_note?: string | null;
}

export interface GarmentDetail extends GarmentListRow {
  gallery_urls: string[];
  video_urls: string[];
  components: GarmentComponent[];
  parameter_media: ParameterMedia[];
  custom_selections: CustomSelection[];
}

export interface GarmentDetailResponse {
  garment: GarmentDetail;
}

export interface StudioProfile {
  display_name: string | null;
  role: string | null;
  email: string | null;
  studio_name: string | null;
  location: string | null;
  avatar_url: string | null;
  garments_logged: number | null;
  seasons_active: number | null;
}

export const CODING_SLOTS = ["style", "class", "look", "element", "build", "finish"] as const;
export type CodingSlot = (typeof CODING_SLOTS)[number];

export const CORE_KEYS = [
  "season",
  "gender",
  "wearSystem",
  "garmentType",
  "silhouette",
  "fabric",
  "ornamentation",
] as const;

export type Selection = "single" | "multi";

export interface ParameterOption {
  id: string;
  code: string;
  label: string;
  description: string | null;
  colour: string | null;
  image_url: string | null;
  public_id: string | null;
  sort_order: number | null;
}

export interface ParameterCatalogRow {
  id: string;
  key: string;
  label: string;
  description: string | null;
  selection: Selection;
  required: boolean;
  sort_order: number;
  coding_slot: CodingSlot | null;
  options: ParameterOption[] | null;
}

export interface CreateParameterPayload {
  key: string;
  label: string;
  description: string;
  selection: Selection;
  required: boolean;
  coding_slot: CodingSlot;
}

export interface CreateParameterResponse {
  parameter: ParameterCatalogRow;
  reactivated: boolean;
}

export interface UpsertOptionPayload {
  parameter_id: string;
  code: string;
  label: string;
  description: string;
  colour: string | null;
}

export interface UpsertOptionResponse {
  parameter: ParameterCatalogRow;
  reactivated: boolean;
  previous_public_id: string | null;
}

/** Stock kind on `fabrics.kind` (Amendment K). */
export type FabricStockKind = "fabric" | "stole";

/** One row of view `fabric_list`. */
export interface FabricListRow {
  id: string;
  human_id: string;
  /** Defaults to fabric when the column is missing (pre–kind deploy). */
  kind?: FabricStockKind | string | null;
  studio_number: string | null;
  title: string;
  description: string | null;
  fabric_code: string | null;
  fabric_label: string | null;
  colour_story_code: string | null;
  colour_story_label: string | null;
  embellishment_density_code: string | null;
  embellishment_density_label: string | null;
  ornamentation_codes: string[] | null;
  ornamentation_labels: string[] | null;
  hero_image_url: string | null;
  created_at: string;
  /** Meters available; null for stole / older fabric rows. PostgREST may send a string. */
  quantity_meters?: number | string | null;
  other_notes?: Record<string, string> | null;
}

export interface FabricParameterMedia {
  parameter_key: string;
  parameter_label: string;
  image_url: string;
  public_id?: string | null;
  caption: string | null;
  sort_order: number | null;
}

export interface FabricDetail extends FabricListRow {
  gallery_urls: string[];
  parameter_media: FabricParameterMedia[];
}

export interface FabricDetailResponse {
  fabric: FabricDetail;
}
