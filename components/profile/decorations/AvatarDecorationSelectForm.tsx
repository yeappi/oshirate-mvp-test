'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/profile/Avatar'
import type { AvatarEffectKey } from '@/lib/level'
import {
  AUTO_DECORATION_VALUE,
  AVATAR_DECORATION_ASSETS,
  NONE_DECORATION_VALUE,
  getAvatarDecorationAsset,
  getAvatarDecorationAssetsBySlot,
  getDefaultAvatarDecorationAsset,
  isAvatarDecorationUnlocked,
  resolveAvatarDecorationAsset,
  type AvatarDecorationAsset,
  type AvatarDecorationSlot,
} from '@/lib/avatarDecorations'

type Props = {
  lv: number
  avatarEffectKey: AvatarEffectKey
  photoUrl: string | null
  name: string
  initialWing: string | null
  initialCrown: string | null
  initialFrontFx: string | null
}

type SlotConfig = {
  slot: AvatarDecorationSlot
  title: string
  description: string
  stateKey: 'wing' | 'crown' | 'frontFx'
}

const SLOT_CONFIGS: SlotConfig[] = [
  {
    slot: 'wing',
    title: '羽・背面装飾',
    description: 'アイコンの後ろに出る羽や宝石演出。',
    stateKey: 'wing',
  },
  {
    slot: 'crown',
    title: '王冠・上部装飾',
    description: 'アイコンの上に乗る王冠系パーツ。',
    stateKey: 'crown',
  },
  {
    slot: 'front_fx',
    title: '前景エフェクト',
    description: 'アイコンの前に足す最終キラキラ。',
    stateKey: 'frontFx',
  },
]

function normalizeInitial(value: string | null | undefined) {
  return value ?? AUTO_DECORATION_VALUE
}

function toPayloadValue(value: string) {
  return value === AUTO_DECORATION_VALUE ? null : value
}

function OptionCard({
  asset,
  lv,
  selected,
  onSelect,
  disabled,
}: {
  asset: AvatarDecorationAsset
  lv: number
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}) {
  const unlocked = isAvatarDecorationUnlocked(asset, lv)

  return (
    <button
      type="button"
      className={`avatar-decoration-option${selected ? ' selected' : ''}${unlocked ? '' : ' locked'}`}
      onClick={onSelect}
      disabled={!unlocked || disabled}
    >
      <span className="avatar-decoration-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.src} alt="" aria-hidden="true" />
      </span>
      <span className="avatar-decoration-option-body">
        <span className="avatar-decoration-option-title">{asset.label}</span>
        <span className="avatar-decoration-option-desc">{asset.description}</span>
        <span className="avatar-decoration-option-meta">
          {unlocked ? `Lv${asset.requiredLv} 解放済み` : `Lv${asset.requiredLv}で解放`}
        </span>
      </span>
    </button>
  )
}

export default function AvatarDecorationSelectForm({
  lv,
  avatarEffectKey,
  photoUrl,
  name,
  initialWing,
  initialCrown,
  initialFrontFx,
}: Props) {
  const router = useRouter()
  const [wing, setWing] = useState(normalizeInitial(initialWing))
  const [crown, setCrown] = useState(normalizeInitial(initialCrown))
  const [frontFx, setFrontFx] = useState(normalizeInitial(initialFrontFx))
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedAssets = useMemo(() => {
    const selectedWing = wing === AUTO_DECORATION_VALUE
      ? getDefaultAvatarDecorationAsset('wing', lv)
      : resolveAvatarDecorationAsset('wing', wing, lv)
    const selectedCrown = crown === AUTO_DECORATION_VALUE
      ? getDefaultAvatarDecorationAsset('crown', lv)
      : resolveAvatarDecorationAsset('crown', crown, lv)
    const selectedFrontFx = frontFx === AUTO_DECORATION_VALUE
      ? getDefaultAvatarDecorationAsset('front_fx', lv)
      : resolveAvatarDecorationAsset('front_fx', frontFx, lv)

    return { selectedWing, selectedCrown, selectedFrontFx }
  }, [crown, frontFx, lv, wing])

  const states = { wing, crown, frontFx }
  const setters = { wing: setWing, crown: setCrown, frontFx: setFrontFx }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setMessage('保存中...')

    try {
      const res = await fetch('/api/profile/avatar-decoration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wing: toPayloadValue(wing),
          crown: toPayloadValue(crown),
          frontFx: toPayloadValue(frontFx),
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? '保存に失敗しました')

      setMessage('✓ 装飾を保存しました')
      router.refresh()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="avatar-decoration-page-shell">
      <div className="avatar-decoration-preview-card">
        <div className="avatar-decoration-preview-label">現在の組み合わせ</div>
        <div className="avatar-decoration-preview-stage">
          <Avatar
            photoUrl={photoUrl}
            name={name}
            avatarEffectKey={avatarEffectKey}
            wingAsset={selectedAssets.selectedWing}
            crownAsset={selectedAssets.selectedCrown}
            frontFxAsset={selectedAssets.selectedFrontFx}
          />
        </div>
        <div className="avatar-decoration-current-list">
          <span>羽: {selectedAssets.selectedWing?.label ?? 'なし'}</span>
          <span>王冠: {selectedAssets.selectedCrown?.label ?? 'なし'}</span>
          <span>前景: {selectedAssets.selectedFrontFx?.label ?? 'なし'}</span>
        </div>
      </div>

      {SLOT_CONFIGS.map((config) => {
        const options = getAvatarDecorationAssetsBySlot(config.slot)
        const value = states[config.stateKey]
        const setValue = setters[config.stateKey]
        const autoAsset = getDefaultAvatarDecorationAsset(config.slot, lv)
        const currentAsset = getAvatarDecorationAsset(value)

        return (
          <section key={config.slot} className="avatar-decoration-section">
            <div className="avatar-decoration-section-head">
              <h2>{config.title}</h2>
              <p>{config.description}</p>
            </div>

            <div className="avatar-decoration-option-grid">
              <button
                type="button"
                className={`avatar-decoration-option special${value === AUTO_DECORATION_VALUE ? ' selected' : ''}`}
                onClick={() => { if (!saving) setValue(AUTO_DECORATION_VALUE) }}
                disabled={saving}
              >
                <span className="avatar-decoration-thumb auto">AUTO</span>
                <span className="avatar-decoration-option-body">
                  <span className="avatar-decoration-option-title">おすすめ自動</span>
                  <span className="avatar-decoration-option-desc">
                    Lvに応じて一番上位の装飾を自動表示
                  </span>
                  <span className="avatar-decoration-option-meta">
                    現在: {autoAsset?.label ?? 'なし'}
                  </span>
                </span>
              </button>

              <button
                type="button"
                className={`avatar-decoration-option special${value === NONE_DECORATION_VALUE ? ' selected' : ''}`}
                onClick={() => { if (!saving) setValue(NONE_DECORATION_VALUE) }}
                disabled={saving}
              >
                <span className="avatar-decoration-thumb none">OFF</span>
                <span className="avatar-decoration-option-body">
                  <span className="avatar-decoration-option-title">装飾なし</span>
                  <span className="avatar-decoration-option-desc">このカテゴリだけ外す</span>
                  <span className="avatar-decoration-option-meta">手動設定</span>
                </span>
              </button>

              {options.map((asset) => (
                <OptionCard
                  key={asset.id}
                  asset={asset}
                  lv={lv}
                  selected={currentAsset?.id === asset.id}
                  onSelect={() => setValue(asset.id)}
                  disabled={saving}
                />
              ))}
            </div>
          </section>
        )
      })}

      <div className="avatar-decoration-actions">
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : 'この組み合わせで保存'}
        </button>
        <Link href="/profile/edit">プロフィール編集へ戻る</Link>
      </div>

      {message && (
        <div className={`avatar-decoration-message${message.startsWith('✓') ? ' ok' : ''}`}>
          {message}
        </div>
      )}
    </div>
  )
}
