'use client'

import { useState } from 'react'
import { adminStyles as s } from './adminStyles'

type User = {
  id: string
  name: string | null
  email: string
  points: number
}

type Log = {
  id: string
  amount: number
  reason: string
  created_at: string
}

type Props = { users: User[] }

export default function PointAdjustForm({ users }: Props) {
  const [targetId, setTargetId]   = useState('')
  const [amount, setAmount]       = useState('')
  const [reason, setReason]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<string | null>(null)
  const [logs, setLogs]           = useState<Log[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const selectedUser = users.find((u) => u.id === targetId)

  const fetchLogs = async (id: string) => {
    setLogsLoading(true)
    const res = await fetch(`/api/admin/points?targetUserId=${id}`)
    const json = await res.json()
    setLogs(json.logs ?? [])
    setLogsLoading(false)
  }

  const handleSelectUser = (id: string) => {
    setTargetId(id)
    setResult(null)
    if (id) fetchLogs(id)
    else setLogs([])
  }

  const handleSubmit = async (sign: 1 | -1) => {
    const n = parseInt(amount)
    if (!targetId || isNaN(n) || n <= 0 || !reason.trim()) return
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/admin/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: targetId, amount: n * sign, reason }),
    })
    const json = await res.json()
    setLoading(false)

    if (json.ok) {
      setResult(`✓ ${sign > 0 ? '+' : '-'}${n}pt 完了（新残高: ${Number(json.newPoints).toLocaleString()}pt）`)
      setAmount('')
      setReason('')
      fetchLogs(targetId)
    } else {
      setResult(`✗ エラー: ${json.error}`)
    }
  }

  const blocked = loading || !targetId || !amount || !reason.trim()

  return (
    <div>
      {/* ユーザー選択 */}
      <div style={{ marginBottom: 14 }}>
        <label style={s.label}>対象ユーザー</label>
        <select value={targetId} onChange={(e) => handleSelectUser(e.target.value)}
          style={{ ...s.input, height: 36 }}>
          <option value="">選択してください</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? '(名前なし)'} — {u.email} — {Number(u.points).toLocaleString()}pt
            </option>
          ))}
        </select>
        {selectedUser && (
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--ink-soft)' }}>
            現在残高: <strong>{Number(selectedUser.points).toLocaleString()}pt</strong>
          </div>
        )}
      </div>

      {/* pt数 */}
      <div style={{ marginBottom: 10 }}>
        <label style={s.label}>pt数</label>
        <input type="number" min="1" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="例: 1000" style={s.input} />
      </div>

      {/* 理由 */}
      <div style={{ marginBottom: 14 }}>
        <label style={s.label}>理由メモ</label>
        <input type="text" value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="例: 手動テスト配布 / 誤付与修正" style={s.input} />
      </div>

      {/* ボタン */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={() => handleSubmit(1)} disabled={blocked}
          style={{ ...s.primaryBtn, opacity: blocked ? 0.45 : 1 }}>
          {loading ? '...' : '+ 付与'}
        </button>
        <button onClick={() => handleSubmit(-1)} disabled={blocked}
          style={{ ...s.dangerBtn, opacity: blocked ? 0.45 : 1 }}>
          {loading ? '...' : '- 減算'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700,
          color: result.startsWith('✓') ? '#007a5e' : '#b40a0a' }}>
          {result}
        </div>
      )}

      {/* 操作履歴 */}
      {targetId && (
        <div style={{ marginTop: 18 }}>
          <div style={s.sectionTitle}>操作履歴</div>
          {logsLoading
            ? <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>読込中...</div>
            : logs.length === 0
              ? <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>履歴なし</div>
              : (
                <table style={s.table}>
                  <thead><tr>
                    <th style={s.th}>金額</th>
                    <th style={s.th}>理由</th>
                    <th style={s.th}>日時</th>
                  </tr></thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ ...s.td, fontFamily: 'Orbitron, sans-serif', fontSize: 12,
                          color: log.amount > 0 ? '#007a5e' : '#b40a0a' }}>
                          {log.amount > 0 ? '+' : ''}{Number(log.amount).toLocaleString()}
                        </td>
                        <td style={{ ...s.td, color: 'var(--ink-soft)' }}>{log.reason}</td>
                        <td style={{ ...s.td, fontSize: 9, color: 'var(--ink-faint)',
                          fontFamily: 'Orbitron, sans-serif', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleDateString('ja-JP')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          }
        </div>
      )}
    </div>
  )
}
