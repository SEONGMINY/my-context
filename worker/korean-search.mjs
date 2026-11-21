// Context Hub 0.1.4 indexes ASCII tokens only. Keep its BM25 ranking for ASCII
// and use a narrowly scoped Korean lexical fallback against published files.
const ENDINGS = ['하려면', '했을까', '하나요', '하는', '할까', '해야', '하면', '하고', '에서', '에게', '으로', '까지', '처럼', '인지', '부터', '하고', '은', '는', '이', '가', '을', '를', '와', '과', '로', '에', '도'];
const STOP = new Set(['어떻게', '좋을까', '할까요', '해줘', '해주세요', '먼저', '그냥', '지금', '우리', '이번', '어떤', '대해서', '여기', '저기', '그렇게', '있을까']);

export function koreanTerms(query) {
  const words = query.normalize('NFC').match(/[가-힣]{2,}/g) || [];
  return [...new Set(words.map((word) => {
    for (const suffix of ENDINGS) {
      if (word.endsWith(suffix) && word.length - suffix.length >= 2) return word.slice(0, -suffix.length);
    }
    return word;
  }).filter((word) => word.length >= 2 && !STOP.has(word)))];
}

export function searchKorean(query, entries) {
  const terms = koreanTerms(query);
  if (terms.length === 0) return [];
  return entries.map(({ id, files }) => {
    // Search only the already-published, authorized asset, not local files or user data.
    const text = (files || []).map(([, body]) => body).join('\n').normalize('NFC');
    const matched = terms.filter((term) => text.includes(term));
    return { id, count: matched.length, score: matched.reduce((sum, term) => sum + term.length, 0) };
  }).filter(({ count }) => count >= Math.min(2, terms.length))
    .sort((a, b) => b.count - a.count || b.score - a.score || a.id.localeCompare(b.id))
    .map(({ id }) => id);
}
