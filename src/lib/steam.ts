const STEAM_CDN = 'https://community.akamai.steamstatic.com/economy/image/'

export function steamIcon(iconUrl: string | null | undefined): string | null {
  if (!iconUrl) return null
  if (iconUrl.startsWith('http')) return iconUrl
  return STEAM_CDN + iconUrl
}
