// MCC-MNC to carrier name mapping (US carriers)
// Format: "MCC-MNC" -> Carrier Name
export const CARRIER_NAMES: Record<string, string> = {
  // Verizon
  "311-480": "Verizon Wireless",
  "310-004": "Verizon Wireless",
  "310-010": "Verizon Wireless",
  "310-012": "Verizon Wireless",
  "310-013": "Verizon Wireless",
  "311-270": "Verizon Wireless",
  "311-271": "Verizon Wireless",
  "311-272": "Verizon Wireless",
  "311-273": "Verizon Wireless",
  "311-274": "Verizon Wireless",
  "311-275": "Verizon Wireless",
  "311-276": "Verizon Wireless",
  "311-277": "Verizon Wireless",
  "311-278": "Verizon Wireless",
  "311-279": "Verizon Wireless",
  "311-280": "Verizon Wireless",
  "311-281": "Verizon Wireless",
  "311-282": "Verizon Wireless",
  "311-283": "Verizon Wireless",
  "311-284": "Verizon Wireless",
  "311-285": "Verizon Wireless",
  "311-286": "Verizon Wireless",
  "311-287": "Verizon Wireless",
  "311-288": "Verizon Wireless",
  "311-289": "Verizon Wireless",
  "311-390": "Verizon Wireless",
  "311-481": "Verizon Wireless",
  "311-482": "Verizon Wireless",
  "311-483": "Verizon Wireless",
  "311-484": "Verizon Wireless",
  "311-485": "Verizon Wireless",
  "311-486": "Verizon Wireless",
  "311-487": "Verizon Wireless",
  "311-488": "Verizon Wireless",
  "311-489": "Verizon Wireless",

  // AT&T
  "310-410": "AT&T",
  "310-070": "AT&T",
  "310-150": "AT&T",
  "310-170": "AT&T",
  "310-380": "AT&T",
  "310-560": "AT&T",
  "310-680": "AT&T",
  "310-980": "AT&T",
  "311-180": "AT&T",
  "312-670": "AT&T",
  "313-100": "AT&T FirstNet",

  // T-Mobile
  "310-260": "T-Mobile",
  "310-200": "T-Mobile",
  "310-210": "T-Mobile",
  "310-220": "T-Mobile",
  "310-230": "T-Mobile",
  "310-240": "T-Mobile",
  "310-250": "T-Mobile",
  "310-270": "T-Mobile",
  "310-310": "T-Mobile",
  "310-490": "T-Mobile",
  "310-580": "T-Mobile",
  "310-660": "T-Mobile",
  "310-800": "T-Mobile",
  "311-490": "T-Mobile",
  "311-882": "T-Mobile",
  "311-660": "T-Mobile",
  "312-250": "T-Mobile",

  // Sprint (now T-Mobile)
  "310-120": "Sprint (T-Mobile)",
  "311-870": "Sprint (T-Mobile)",
  "311-880": "Sprint (T-Mobile)",
  "312-530": "Sprint (T-Mobile)",

  // US Cellular
  "311-220": "US Cellular",
  "311-221": "US Cellular",
  "311-222": "US Cellular",
  "311-223": "US Cellular",
  "311-224": "US Cellular",
  "311-225": "US Cellular",
  "311-226": "US Cellular",
  "311-227": "US Cellular",
  "311-228": "US Cellular",
  "311-229": "US Cellular",

  // Dish Network
  "311-012": "Dish Network",
  "312-680": "Dish Network",

  // Regional carriers
  "310-016": "Cricket Wireless",
  "310-450": "Commnet",
  "310-540": "Commnet",
  "311-040": "Commnet",
  "310-760": "PTCI",
  "311-000": "Mid-Tex Cellular",
  "311-050": "Wikes Cellular",
  "311-060": "Farmers Cellular",
  "311-070": "Easterbrooke",
  "311-090": "Stelera Wireless",
  "311-100": "Nex-Tech",
  "311-190": "Cellcom",
  "310-030": "Indigo Wireless",
  "310-034": "Airpeak",
  "310-090": "Edge Wireless",
  "310-100": "Plateau Wireless",
};

export function getCarrierName(countryId: number, providerId: number): string {
  const key = `${countryId}-${providerId}`;
  return CARRIER_NAMES[key] || `${countryId}-${providerId}`;
}

export function getCarrierColor(countryId: number, providerId: number): string {
  const key = `${countryId}-${providerId}`;
  const name = CARRIER_NAMES[key] || "";

  if (name.includes("Verizon")) return "#cd040b";
  if (name.includes("AT&T")) return "#00a8e0";
  if (name.includes("T-Mobile")) return "#e20074";
  if (name.includes("Sprint")) return "#ffe100";
  if (name.includes("US Cellular")) return "#0057b8";
  if (name.includes("Dish")) return "#ec1c24";
  if (name.includes("FirstNet")) return "#003366";

  return "#6b7280";
}

export function getCarrierColorByName(name: string): string {
  if (name.includes("Verizon")) return "#cd040b";
  if (name.includes("AT&T")) return "#00a8e0";
  if (name.includes("T-Mobile")) return "#e20074";
  if (name.includes("Sprint")) return "#ffe100";
  if (name.includes("US Cellular")) return "#0057b8";
  if (name.includes("Dish")) return "#ec1c24";
  if (name.includes("FirstNet")) return "#003366";
  if (name.includes("American Tower") || name === "AMT") return "#000000";
  if (name.includes("Crown Castle")) return "#5EB1F7";
  if (name.includes("Ghost Lead") || name === "Lead") return "#0a1628";
  if (name === "Portfolio") return "#8b5cf6";

  return "#6b7280";
}

// Access state colors for company tower access levels
export function getAccessStateColor(state: string): string {
  switch (state) {
    case 'FULL':
      return '#22c55e'; // Green
    case 'LICENSED':
      return '#3b82f6'; // Blue
    case 'TRIAL':
      return '#f59e0b'; // Amber
    case 'SAMPLE':
      return '#71717a'; // Gray
    case 'Portfolio':
      return '#8b5cf6'; // Purple
    case 'Lead':
      return '#f97316'; // Orange for leads
    default:
      return '#71717a'; // Gray
  }
}

/**
 * Aggregate carrier data by display name (combines multiple MCC-MNC codes).
 * Pass in an array of items with country_id/provider_id, and numeric fields to sum.
 * Returns aggregated data keyed by carrier display name.
 */
interface CarrierAggregate {
  name: string;
  color: string;
  [key: string]: string | number;
}

export function aggregateByCarrier<T extends { country_id: number; provider_id: number }>(
  items: T[],
  numericFields: (keyof T)[]
): CarrierAggregate[] {
  const carrierMap = new Map<string, CarrierAggregate>();

  items.forEach((item) => {
    const name = getCarrierName(item.country_id, item.provider_id);
    const color = getCarrierColorByName(name);

    if (carrierMap.has(name)) {
      const existing = carrierMap.get(name)!;
      numericFields.forEach((field) => {
        const val = (item[field] as number) || 0;
        existing[field as string] = ((existing[field as string] as number) || 0) + val;
      });
    } else {
      const entry: CarrierAggregate = { name, color };
      numericFields.forEach((field) => {
        entry[field as string] = (item[field] as number) || 0;
      });
      carrierMap.set(name, entry);
    }
  });

  return Array.from(carrierMap.values());
}
