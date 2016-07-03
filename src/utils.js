export const error = err => { throw new Error(err) }

export const uri = (strs, ...vals) =>
  strs[0].replace(/\s+/gm, '')
  + strs.slice(1)
    .map((s, i) =>
      encodeURIComponent(vals[i])
      + s.replace(/\s+/gm, ''),
    )
    .join('')


export const fmt = (strs, ...vals) =>
  strs[0]
  + strs.slice(1)
    .map((s, i) => (
      `${vals[i]}`
      ? '`' + vals[i].replace('`', '\\`') + '`'
      : '(empty string)'
    ) + s)
    .join('')
