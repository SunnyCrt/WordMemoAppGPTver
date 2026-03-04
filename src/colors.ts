import type { ColorKey } from './types'

export const COLOR_LABEL: Record<ColorKey, string> = {
  GRAY: '회색',
  PINK: '분홍',
  YELLOW: '노랑',
  GREEN: '연두',
  BLUE: '파랑',
  PURPLE: '보라',
}

export const COLOR_HEX: Record<ColorKey, string> = {
  GRAY: '#d9d9d9',
  PINK: '#f7b2c4',
  YELLOW: '#f3df8a',
  GREEN: '#bfe6b6',
  BLUE: '#b8d5ff',
  PURPLE: '#d1c0ff',
}

export const COLOR_KEYS: ColorKey[] = ['GRAY','PINK','YELLOW','GREEN','BLUE','PURPLE']
