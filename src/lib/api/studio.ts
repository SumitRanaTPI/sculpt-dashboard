import { ApiError, get, rpc } from "@/lib/api/client";
import type {
  CreateParameterPayload,
  CreateParameterResponse,
  GarmentDetail,
  GarmentDetailResponse,
  GarmentListRow,
  HomeDashboard,
  ParameterCatalogRow,
  StudioProfile,
  UpsertOptionPayload,
  UpsertOptionResponse,
} from "@/lib/api/types";

export class NotFoundError extends ApiError {
  constructor() {
    super("This garment is not in the studio.", 404);
    this.name = "NotFoundError";
  }
}

export function fetchHomeDashboard(): Promise<HomeDashboard> {
  return rpc<HomeDashboard>("home_dashboard", {});
}

export function fetchGarmentList(): Promise<GarmentListRow[]> {
  return get<GarmentListRow[]>("/garment_list?order=created_at.desc");
}

export async function fetchGarmentDetail(id: string): Promise<GarmentDetail> {
  try {
    const res = await rpc<GarmentDetailResponse>("garment_detail", { id });
    if (!res?.garment) throw new NotFoundError();
    return res.garment;
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) throw new NotFoundError();
      if (err.status === 400 && /garment not found/i.test(err.detail)) throw new NotFoundError();
      // PostgREST maps P0002 (no_data_found) to 400 as well; catch it by code.
      if (err.status === 400 && err.code === "P0002") throw new NotFoundError();
    }
    throw err;
  }
}

export async function fetchStudioProfile(): Promise<StudioProfile> {
  const rows = await get<StudioProfile[]>("/studio_profile");
  const first = rows[0];
  if (!first) throw new ApiError("No studio profile was found for this account.", 200);
  return first;
}

export function fetchParameterCatalog(): Promise<ParameterCatalogRow[]> {
  return get<ParameterCatalogRow[]>("/parameter_catalog?order=sort_order.asc");
}

export function createParameter(payload: CreateParameterPayload): Promise<CreateParameterResponse> {
  return rpc<CreateParameterResponse>("create_parameter", { payload });
}

export function upsertParameterOption(payload: UpsertOptionPayload): Promise<UpsertOptionResponse> {
  return rpc<UpsertOptionResponse>("upsert_parameter_option", { payload });
}

/** Map database messages from create_parameter to short copy. */
export function specErrorCopy(err: unknown): string {
  if (!(err instanceof ApiError)) return "Could not add the Spec. Try again.";
  const d = err.detail;
  if (/key already exists/i.test(d)) return "A Spec with this key already exists.";
  if (/protected core parameter key/i.test(d)) return "That key belongs to a core Spec and cannot be recreated.";
  if (/key and label are required/i.test(d)) return "Key and label are required.";
  if (/coding_slot is required/i.test(d)) return "Choose a coding slot.";
  if (/coding_slot must be/i.test(d)) return "Coding slot must be style, class, look, element, build, or finish.";
  if (/key must start/i.test(d)) return "Key must start with a lowercase letter and use only letters, digits, or underscore.";
  if (/selection must be/i.test(d)) return "Selection must be single or multi.";
  return err.message;
}

/** Map database messages from upsert_parameter_option to short copy. */
export function optionErrorCopy(err: unknown): string {
  if (!(err instanceof ApiError)) return "Could not add the option. Try again.";
  const d = err.detail;
  if (/code and label are required/i.test(d)) return "Code and label are required.";
  if (/option code already exists/i.test(d)) return "An option with this code already exists on this Spec.";
  if (/parameter not found or inactive/i.test(d)) return "That Spec was not found or is inactive.";
  if (/parameter_id/i.test(d)) return "Choose a Spec first.";
  return err.message;
}
