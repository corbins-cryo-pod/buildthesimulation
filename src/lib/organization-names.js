// Verified Chinese-language names for organizations in the Atlas.
// Keep original slugs and identity records stable. Display English first,
// with the native name alongside it, rather than overwriting evidence records.
const names = {
  '10-neuroxess-company-brief': ['NeuroXess', '脑虎科技'],
  '11-neucyber-beinao-1-company-brief': ['NeuCyber NeuroTech / Beinao-1', '芯智达神经技术 / 北脑一号'],
  '12-stairmed-company-brief': ['StairMed', '阶梯医疗'],
  '31-neuracle-company-brief': ['Neuracle', '博睿康'],
  '70-shenfu-jianxing-company-brief': ['Shenfu Jianxing', '神复健行'],
  '71-mindtrix-company-brief': ['Mindtrix', '明视脑机'],
  '72-zhiran-medical-company-brief': ['Zhiran Medical', '智冉医疗'],
  '73-tianjin-rongyuan-company-brief': ['Tianjin Rongyuan Intelligent Technology', '天津嵘元智能'],
  '74-zhejiang-norkang-company-brief': ['Zhejiang Nurotron', '诺尔康'],
};
// Some older catalog records already have Chinese characters and Latin text;
// these mappings make the display order consistent without guessing names.
export function organizationDisplayName(slug, title) {
  if (names[slug]) return names[slug].join(' · ');
  return String(title ?? '').replace(/^\d+\s*[-—]\s*/, '')
    .replace(/\s*\((?:company|lab) brief\)$/i, '')
    .replace(/^Abbott Medical \(Abbott\)$/i, 'Abbott');
}
export function organizationSearchNames(slug) {
  return names[slug] ?? [];
}
