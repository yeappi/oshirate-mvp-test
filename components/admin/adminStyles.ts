// 管理画面専用のインラインスタイル定数
// globals.css のデザイントークンを引き継ぎつつ、管理画面らしいシンプルさに

export const adminStyles = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '0 0 40px',
    fontFamily: "'Noto Sans JP', sans-serif",
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid var(--hair-strong)',
    marginBottom: 20,
  } as React.CSSProperties,

  title: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.22em',
    color: 'var(--ink)',
  } as React.CSSProperties,

  section: {
    background: 'rgba(255,255,255,0.5)',
    outline: '1px solid var(--hair)',
    outlineOffset: -1,
    borderRadius: 2,
    padding: '16px 18px',
    marginBottom: 12,
  } as React.CSSProperties,

  sectionTitle: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: 'var(--ink-soft)',
    marginBottom: 12,
  } as React.CSSProperties,

  label: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--ink-soft)',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: 5,
  } as React.CSSProperties,

  input: {
    width: '100%',
    height: 36,
    border: '1px solid var(--hair-strong)',
    borderRadius: 2,
    padding: '0 10px',
    fontSize: 12,
    fontFamily: "'Noto Sans JP', sans-serif",
    color: 'var(--ink)',
    background: 'rgba(255,255,255,0.7)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    border: '1px solid var(--hair-strong)',
    borderRadius: 2,
    padding: '8px 10px',
    fontSize: 12,
    fontFamily: "'Noto Sans JP', sans-serif",
    color: 'var(--ink)',
    background: 'rgba(255,255,255,0.7)',
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    minHeight: 80,
  } as React.CSSProperties,

  primaryBtn: {
    display: 'block',
    width: '100%',
    height: 38,
    border: '1px solid var(--mint)',
    borderRadius: 2,
    background: 'var(--ink)',
    color: 'var(--mint)',
    fontFamily: "Orbitron, 'Noto Sans JP', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.2em',
    cursor: 'pointer',
  } as React.CSSProperties,

  dangerBtn: {
    display: 'block',
    width: '100%',
    height: 38,
    border: '1px solid rgba(180,10,10,0.4)',
    borderRadius: 2,
    background: 'rgba(180,10,10,0.06)',
    color: '#b40a0a',
    fontFamily: "Orbitron, 'Noto Sans JP', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.2em',
    cursor: 'pointer',
  } as React.CSSProperties,

  ghostBtn: {
    display: 'block',
    height: 38,
    border: '1px solid var(--hair-strong)',
    borderRadius: 2,
    background: 'transparent',
    color: 'var(--ink-soft)',
    fontFamily: "Orbitron, 'Noto Sans JP', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    padding: '0 14px',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 11,
  } as React.CSSProperties,

  th: {
    textAlign: 'left' as const,
    padding: '6px 8px',
    fontSize: 9,
    fontWeight: 700,
    color: 'var(--ink-faint)',
    letterSpacing: '0.08em',
    borderBottom: '1px solid var(--hair)',
  } as React.CSSProperties,

  td: {
    padding: '10px 8px',
    borderBottom: '1px solid var(--hair)',
    verticalAlign: 'top' as const,
  } as React.CSSProperties,

  badge: (variant: 'admin' | 'normal') => ({
    display: 'inline-block',
    fontSize: 8,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 1,
    ...(variant === 'admin'
      ? { background: 'rgba(111,255,224,0.15)', color: '#007a5e', border: '1px solid rgba(111,255,224,0.5)' }
      : { background: 'rgba(7,17,14,0.04)', color: 'var(--ink-faint)', border: '1px solid var(--hair)' }),
  }) as React.CSSProperties,
}
