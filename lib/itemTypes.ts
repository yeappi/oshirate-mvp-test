export type ItemType = 'ILLUST_TICKET' | 'BACKGROUND_TICKET' | 'FRAME_TICKET' | 'TAG_TICKET'

export function getItemTypeLabel(itemType: ItemType): string {
  if (itemType === 'ILLUST_TICKET') return '限定イラスト券'
  if (itemType === 'BACKGROUND_TICKET') return '背景引換券'
  if (itemType === 'FRAME_TICKET') return '枠引換券'
  return 'タグ引換券'
}
