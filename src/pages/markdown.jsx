// src/pages/markdown.jsx
// Markdown minimale, reso come elementi React.
//
// SICUREZZA: qui non si usa MAI dangerouslySetInnerHTML. Il testo dell'utente
// non diventa mai HTML: viene spezzato e reso come nodi React, quindi anche se
// qualcuno scrive <script> resta testo visibile e inerte. È il motivo per cui
// il diario usa markdown e non un editor visuale.

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`)/g

// grassetto, corsivo, barrato, codice
function inline(text, keyPrefix = '') {
  const parts = String(text).split(INLINE).filter(s => s !== '')
  return parts.map((p, i) => {
    const k = `${keyPrefix}-${i}`
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={k}>{p.slice(2, -2)}</strong>
    if (p.startsWith('~~') && p.endsWith('~~')) return <s key={k}>{p.slice(2, -2)}</s>
    if (p.startsWith('`') && p.endsWith('`')) {
      return <code key={k} style={{
        background: 'var(--line)', borderRadius: 4, padding: '1px 5px',
        fontFamily: 'monospace', fontSize: '0.92em',
      }}>{p.slice(1, -1)}</code>
    }
    if (p.startsWith('*') && p.endsWith('*')) return <em key={k}>{p.slice(1, -1)}</em>
    return p
  })
}

export function Markdown({ text, style }) {
  const lines = String(text || '').split('\n')
  const out = []
  let list = null

  const flushList = () => {
    if (list) {
      out.push(<ul key={'ul' + out.length} style={{ margin: '6px 0 10px', paddingLeft: 20 }}>{list}</ul>)
      list = null
    }
  }

  lines.forEach((raw, i) => {
    const line = raw.trimEnd()

    if (/^\s*[-*]\s+/.test(line)) {
      const content = line.replace(/^\s*[-*]\s+/, '')
      ;(list = list || []).push(<li key={i} style={{ marginBottom: 3 }}>{inline(content, i)}</li>)
      return
    }
    flushList()

    if (/^###\s+/.test(line)) {
      out.push(<h4 key={i} style={{ margin: '14px 0 4px', fontSize: 14 }}>{inline(line.slice(4), i)}</h4>)
    } else if (/^##\s+/.test(line)) {
      out.push(<h3 key={i} style={{ margin: '16px 0 6px', fontSize: 16 }}>{inline(line.slice(3), i)}</h3>)
    } else if (/^#\s+/.test(line)) {
      out.push(<h2 key={i} style={{ margin: '18px 0 8px', fontSize: 19 }}>{inline(line.slice(2), i)}</h2>)
    } else if (/^>\s?/.test(line)) {
      out.push(
        <blockquote key={i} style={{
          margin: '8px 0', paddingLeft: 12, borderLeft: '3px solid var(--line)',
          color: 'var(--ink-soft)', fontStyle: 'italic',
        }}>{inline(line.replace(/^>\s?/, ''), i)}</blockquote>
      )
    } else if (line === '') {
      out.push(<div key={i} style={{ height: 8 }} />)
    } else {
      out.push(<p key={i} style={{ margin: '0 0 6px', lineHeight: 1.6 }}>{inline(line, i)}</p>)
    }
  })
  flushList()

  return <div style={{ fontSize: 14, ...style }}>{out}</div>
}

// testo senza sintassi, per le anteprime
export const stripMarkdown = (text) =>
  String(text || '')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^>\s?/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')

// barra dei pulsanti: inserisce la sintassi, non applica stili al testo
export function MarkdownToolbar({ value, onChange, textareaRef }) {
  const wrap = (before, after = before, placeholder = '') => {
    const el = textareaRef?.current
    const start = el ? el.selectionStart : value.length
    const end = el ? el.selectionEnd : value.length
    const sel = value.slice(start, end) || placeholder
    const next = value.slice(0, start) + before + sel + after + value.slice(end)
    onChange(next)
    setTimeout(() => {
      if (!el) return
      el.focus({ preventScroll: true })
      el.setSelectionRange(start + before.length, start + before.length + sel.length)
    }, 0)
  }
  const prefix = (mark) => {
    const el = textareaRef?.current
    const start = el ? el.selectionStart : value.length
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    onChange(value.slice(0, lineStart) + mark + value.slice(lineStart))
    setTimeout(() => el?.focus({ preventScroll: true }), 0)
  }

  const Btn = ({ onClick, title, children, mono }) => (
    <button type="button" onClick={onClick} title={title}
      style={{
        background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 6,
        padding: '3px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
        fontFamily: mono ? 'monospace' : 'inherit', color: 'var(--ink-soft)', lineHeight: 1.6,
      }}>{children}</button>
  )

  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
      <Btn onClick={() => wrap('**')} title="Bold"><strong>B</strong></Btn>
      <Btn onClick={() => wrap('*')} title="Italic"><em>I</em></Btn>
      <Btn onClick={() => wrap('~~')} title="Strikethrough"><s>S</s></Btn>
      <Btn onClick={() => wrap('`')} title="Code" mono>{'</>'}</Btn>
      <Btn onClick={() => prefix('# ')} title="Heading">H1</Btn>
      <Btn onClick={() => prefix('## ')} title="Subheading">H2</Btn>
      <Btn onClick={() => prefix('- ')} title="List">• —</Btn>
      <Btn onClick={() => prefix('> ')} title="Quote">❝</Btn>
    </div>
  )
}
