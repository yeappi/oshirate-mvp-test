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
      eyebrow: 'OSHIRATE',
      title: '自分だけのシール帳を育てる',
      body: '推されーとは、自分のプロフィールにイラストを集めたり、推しを応援してプロフィールを飾れるサービスです。',
      bullets: [
        'あなたのプロフィールが、あなただけのシール帳になる',
        '推しにイラストを贈ると、相手のシール帳も埋まる',
        '応援されるほど魅力値が上がり、プロフィールが育つ',
      ],
    },
    {
      eyebrow: 'STEP 1',
      title: 'まずはプロフィールを編集しよう',
      body: '名前・ひとこと・アイコンを設定すると、あなたのプロフィールらしさが出ます。',
      bullets: [
        'ひとことはプロフィール上部に表示される本人の声',
        'タグは最大6つまでプロフィールに表示できる',
        'お気に入りイラストはプロフィール上部に3枚まで飾れる',
      ],
    },
    {
      eyebrow: 'STEP 2',
      title: '探すから「やぴ」をフォロー',
      body: '次に「探す」から開発者のやぴを見つけて、フォローしてみてください。',
      bullets: [
        'フォローすると、あとからプロフィールを見つけやすい',
        'もちものから限定券を使う相手にも選びやすくなる',
        'まずは開発者プロフィールを見て、動きを試せる',
      ],
    },
    {
      eyebrow: 'STEP 3',
      title: '30分プレゼントでptをためる',
      body: '30分プレゼントでポイントをためて、まずは自分のシールを1枚購入してみましょう。',
      bullets: [
        '30分ごとにプレゼントからptを受け取れる',
        'たまったptでイラストを購入できる',
        '自分にも、フォローした相手にもイラストを贈れる',
      ],
    },
    {
      eyebrow: 'GROW UP',
      title: 'Lv・報酬・もちものを使おう',
      body: '魅力値が上がるとLvアップ。アイコン周りのオーラが育ちます。背景やタグは応援した累計ptで増えていきます。',
      bullets: [
        '魅力値でLvが上がり、アイコン周りの格が上がる',
        'もちものでは限定イラスト券・背景券・タグ券などを使える',
        '限定券を使うと、特別なイラストを自分やフォロー中の人に贈れる',
      ],
    },
  ],
  profile: [
    {
      eyebrow: 'PROFILE GUIDE',
      title: 'プロフィールを自分らしく整える',
      body: 'プロフィール編集では、名前・ひとこと・アイコンを変更できます。解放済みの背景やタグ、アイコン枠もここから選べます。',
      bullets: [
        '名前・ひとこと・アイコンを変更できる',
        'タグは最大6つまでプロフィールに表示できる',
        'お気に入りイラストは最大3枚までプロフィール上部に飾れる',
        '背景やタグは累計使用ptやアイテムで増える',
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
      eyebrow: 'OSHIRATE',
      title: '自分だけのシール帳を育てる',
      body: '推されーとは、自分のプロフィールにイラストを集めたり、推しを応援してプロフィールを飾れるサービスです。',
      bullets: [
        'あなたのプロフィールが、あなただけのシール帳になる',
        '推しにイラストを贈ると、相手のシール帳も埋まる',
        '応援されるほど魅力値が上がり、プロフィールが育つ',
      ],
    },
    {
      eyebrow: 'STEP 1',
      title: 'まずはプロフィールを編集しよう',
      body: '名前・ひとこと・アイコンを設定すると、あなたのプロフィールらしさが出ます。',
      bullets: [
        'ひとことはプロフィール上部に表示される本人の声',
        'タグは最大6つまでプロフィールに表示できる',
        'お気に入りイラストはプロフィール上部に3枚まで飾れる',
      ],
    },
    {
      eyebrow: 'STEP 2',
      title: '探すから「やぴ」をフォロー',
      body: '次に「探す」から開発者のやぴを見つけて、フォローしてみてください。',
      bullets: [
        'フォローすると、あとからプロフィールを見つけやすい',
        'もちものから限定券を使う相手にも選びやすくなる',
        'まずは開発者プロフィールを見て、動きを試せる',
      ],
    },
    {
      eyebrow: 'STEP 3',
      title: '30分プレゼントでptをためる',
      body: '30分プレゼントでポイントをためて、まずは自分のシールを1枚購入してみましょう。',
      bullets: [
        '30分ごとにプレゼントからptを受け取れる',
        'たまったptでイラストを購入できる',
        '自分にも、フォローした相手にもイラストを贈れる',
      ],
    },
    {
      eyebrow: 'GROW UP',
      title: 'Lv・報酬・もちものを使おう',
      body: '魅力値が上がるとLvアップ。アイコン周りのオーラが育ちます。背景やタグは応援した累計ptで増えていきます。',
      bullets: [
        '魅力値でLvが上がり、アイコン周りの格が上がる',
        'もちものでは限定イラスト券・背景券・タグ券などを使える',
        '限定券を使うと、特別なイラストを自分やフォロー中の人に贈れる',
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
