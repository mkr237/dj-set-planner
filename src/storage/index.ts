export type { StorageService } from './types'
export { LocalStorageService } from './localStorage'

import { LocalStorageService } from './localStorage'

export const storage = new LocalStorageService()
