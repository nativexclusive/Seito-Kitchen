import type { ImageSource } from 'expo-image';

// Placeholder photos bundled with the app (low-res crops from the concept image).
// Dishes store "asset:<key>"; uploaded photos are plain https URLs.
const bundled: Record<string, number> = {
  hero: require('../../assets/images/hero.jpg'),
  thanks: require('../../assets/images/thanks.jpg'),
  cassava: require('../../assets/images/cassava.jpg'),
  cassavaThumb: require('../../assets/images/cassavaT.jpg'),
  jollof: require('../../assets/images/jollof.jpg'),
  pepper: require('../../assets/images/pepper.jpg'),
  fufu: require('../../assets/images/fufu.jpg'),
};

export function imageSource(url: string | null | undefined, variant: 'thumb' | 'large' = 'thumb'): ImageSource | number | null {
  if (!url) return null;
  if (url.startsWith('asset:')) {
    let key = url.slice('asset:'.length);
    if (key === 'cassava' && variant === 'thumb') key = 'cassavaThumb';
    return bundled[key] ?? null;
  }
  return { uri: url };
}

export const heroImage = bundled.hero;
export const holidayImage = bundled.thanks;
