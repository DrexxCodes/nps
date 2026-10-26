import type { ItemStatus, NfcField, RequirementType, VariantOption, VariantSelectionMode } from "@/types";

/** One class's price input. Blank string = this class pays the initial price. */
export interface ClassPriceField { year: number; priceNaira: string }

export interface SubItemField { id: string; name: string; description: string; priceNaira: number; required: boolean; classPrices: ClassPriceField[] }

export interface VariantSetField { id: string; name: string; selection: VariantSelectionMode; required: boolean; options: VariantOption[] }

export interface ItemFormValues {
  name: string; description: string; status: ItemStatus; startAt: string; endAt: string;
  hasSubItems: boolean; priceNaira: number; subItems: SubItemField[];
  /** Advanced configuration */
  classPricingEnabled: boolean; classPrices: ClassPriceField[]; variantSets: VariantSetField[];
  requiredProfileFields: RequirementType[]; batchProcessingEnabled: boolean; batchSize: number; batchLimitEnabled: boolean; maxBatches: number;
  nfcEnabled: boolean; nfcPayloadFields: NfcField[];
}
