export type ColorKey = 'GRAY' | 'PINK' | 'YELLOW' | 'GREEN' | 'BLUE' | 'PURPLE'
export type SortMode = 'CREATED' | 'ASC' | 'DESC'

export type Folder = {
  id: string
  name: string
  createdAt: number
}

export type WordItem = {
  id: string
  text: string
  folderId: string
  color: ColorKey
  createdAt: number
  updatedAt: number
}

export type Settings = {
  sortMode: SortMode
  wordMaxLen: number
  folderMaxLen: number
}

export type AppState = {
  folders: Folder[]
  words: WordItem[]
  settings: Settings
}
