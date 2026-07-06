'use client'

import { useEffect, useMemo, useState } from 'react'

type GuideKind = 'login' | 'main' | 'profile' | 'loginIntro'

type GuideCard = {
  eyebrow: string
  title: string
  body: string
  bullets: string[]
}

const guides: Record<GuideKind, GuideCard[]> = {
  login: [
    {
      eyebrow: 'LOGIN GUIDE',
      title: 'Safariで開くのがおすすめ',
      body: 'LINEやInstagramなどのアプリ内ブラウザだと、Googleログインが不安定になることがあります。',
      bullets: [
        'うまくログインできない時はSafariで開き直す',
        'Safariの共有ボタンから「ホーム画面に追加」するとアプリっぽく使える',
        'ホーム画面から開くと、次回以降も迷いにくい',
      ],
    },
  ],
  main: [
    {
      eyebrow: 'HOW TO PLAY',
      title: '応援でプロフィールを育てる',
      body: '推されーとは、イラストや限定券を使って、相手のプロフィール帳を埋めていくサービスです。',
      bullets: [
        '30分プレゼントでポイントをためる',
        'たまったポイントでイラストを贈る',
        'イラストを贈ると相手の魅力値が上がる',
        '魅力値が上がるとLvや報酬が解放される',
        'もちものでは限定券・背景券・タグ券などを使える',
      ],
    },
  ],
  profile: [
    {
      eyebrow: 'PROFILE GUIDE',
      title: 'プロフィールを自分らしく整える',
      body: 'プロフィール編集では、名前・ひとこと・アイコンを変更できます。解放済みの背景やタグ、アイコン枠もここから選べます。',
      bullets: [
        'ひとことは他の人にも見える短いメッセージ',
        '背景・タグ・枠はLv報酬やアイテムで増える',
        'アイコン画像はアップロードするとプロフィールに反映される',
        '公開プロフィールでは、あなたの応援され具合が見える',
      ],
    },
  ],
  loginIntro: [
    {
      eyebrow: 'LOGIN GUIDE',
      title: 'まずはSafariで開こう',
      body: 'アプリ内ブラウザだとGoogleログインが不安定になることがあります。Safariで開いて、ホーム画面に追加するのがおすすめです。',
      bullets: [
        'Safariで開くとログインが安定しやすい',
        '共有ボタンから「ホーム画面に追加」',
        '次回からアプリのように起動できる',
      ],
    },
    {
      eyebrow: 'HOW TO PLAY',
      title: '30分プレゼントでptをためよう',
      body: '推されーとは、応援でプロフィールを育てるサービスです。まずは30分プレゼントでポイントをためて、イラストを贈ってみてください。',
      bullets: [
        '30分プレゼントでポイントをためる',
        'ポイントでイラストを贈る',
        '贈られた相手のプロフィール帳が埋まる',
        '魅力値が上がるとLvや報酬が解放される',
        'もちものの限定券は、自分やフォロー中の人に使える',
      ],
    },
  ],
}

function GuideModal({ kind, open, onClose }: { kind: GuideKind; open: boolean; onClose: () => void }) {
  const cards = guides[kind]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (open) setIndex(0)
  }, [open, kind])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const card = cards[index]
  const isLast = index === cards.length - 1

  if (!open) return null

  return (
    <div className="guide-overlay" role="dialog" aria-modal="true" aria-label="推されーとガイド">
      <div className="guide-modal">
        <button type="button" className="guide-close" onClick={onClose} aria-label="ガイドを閉じる">
          ×
        </button>

        <div className="guide-card-face">
          <div className="guide-eyebrow">{card.eyebrow}</div>
          <h2>{card.title}</h2>
          <p>{card.body}</p>
          <ul>
            {card.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>

        <div className="guide-dots" aria-hidden="true">
          {cards.map((_, dotIndex) => (
            <span key={dotIndex} className={dotIndex === index ? 'active' : ''} />
          ))}
        </div>

        <div className="guide-actions">
          {cards.length > 1 ? (
            <button
              type="button"
              className="guide-secondary"
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              disabled={index === 0}
            >
              戻る
            </button>
          ) : <span />}

          {isLast ? (
            <button type="button" className="guide-primary" onClick={onClose}>
              はじめる
            </button>
          ) : (
            <button type="button" className="guide-primary" onClick={() => setIndex((current) => Math.min(cards.length - 1, current + 1))}>
              次へ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function GuideButton({ kind, className = '' }: { kind: GuideKind; className?: string }) {
  const [open, setOpen] = useState(false)
  const buttonClassName = useMemo(() => ['guide-help-button', className].filter(Boolean).join(' '), [className])

  return (
    <>
      <button type="button" className={buttonClassName} onClick={() => setOpen(true)} aria-label="ガイドを開く">
        ?
      </button>
      <GuideModal kind={kind} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function LoginGuideAutoOpen() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem('oshirate_login_guide_seen') !== 'true') {
        setOpen(true)
      }
    } catch {
      setOpen(true)
    }
  }, [])

  const close = () => {
    try {
      window.localStorage.setItem('oshirate_login_guide_seen', 'true')
    } catch {
      // localStorageが使えない環境でも、表示自体は閉じられればOK。
    }
    setOpen(false)
  }

  return (
    <>
      <GuideButton kind="login" className="page-guide-button" />
      <GuideModal kind="loginIntro" open={open} onClose={close} />
    </>
  )
}
