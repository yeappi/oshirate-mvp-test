import { createSupabaseServerClient } from './supabase-server'

export type CharismaRanking = {
  rank: number
  total: number
}

export async function getCharismaRanking(userId: string): Promise<CharismaRanking> {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase.rpc('get_charisma_ranking', {
    p_user_id: userId,
  })

  if (!error && data) {
    const result = data as { rank?: number; total?: number }
    return {
      rank: Number(result.rank ?? 1),
      total: Number(result.total ?? 1),
    }
  }

  // RPC未適用の環境でも画面を落とさないためのfallback。
  const { data: profile } = await supabase
    .from('profiles')
    .select('charisma')
    .eq('id', userId)
    .maybeSingle()

  const charisma = Number(profile?.charisma ?? 0)

  const { count: higherCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('charisma', charisma)

  const { count: totalCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  return {
    rank: Number(higherCount ?? 0) + 1,
    total: Number(totalCount ?? 1),
  }
}
