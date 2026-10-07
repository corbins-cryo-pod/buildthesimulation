// Editorial discovery order, shared by the catalog and primary navigation.
// This is a presentation preference, not a clinical effectiveness score.
const featuredOrders = [1, 2, 4, 3, 9, 42, 7];
const featuredIndex = new Map(featuredOrders.map((order, index) => [order, index]));

export function compareDeviceEntries(a, b) {
  const ai = featuredIndex.get(a.data.order) ?? Number.POSITIVE_INFINITY;
  const bi = featuredIndex.get(b.data.order) ?? Number.POSITIVE_INFINITY;
  if (ai !== bi) return ai - bi;
  const ar = a.data.successRank ?? Number.POSITIVE_INFINITY;
  const br = b.data.successRank ?? Number.POSITIVE_INFINITY;
  if (ar !== br) return ar - br;
  const title = entry => entry.data.title.replace(/^\d+\s*[-—]\s*/, "");
  return title(a).localeCompare(title(b));
}
