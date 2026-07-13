import { Link } from 'react-router-dom'

function Layout({ username, onLogout, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header - fuori dalla shell come da design originale */}
      <header style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--line)',
        padding: '0 32px',
        height: '64px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow)',
      }}>
        <div />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Link to="/dashboard" style={{ display: 'flex' }}>
            <img src="/logo_obt.png" style={{ height: '40px', width: 'auto' }} alt="OBT Home" />
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
          {username && (
            <div className="obt-user-chip">
              <span className="obt-avatar">{username.slice(0, 2).toUpperCase()}</span>
              {username}
            </div>
          )}
          {onLogout && (
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={onLogout}>Esci</button>
          )}
        </div>
      </header>

      {/* Contenuto - usa la classe obt-shell del theme.css per tutti gli stili grafici */}
      <div className="obt-shell" style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* flex:1 qui dentro spinge il footer in basso quando il contenuto è corto */}
        <div style={{ flex: 1 }}>
          {children}
        </div>

        {/* Footer DENTRO la shell così prende border-radius e ombra della shell,
            ma con marginTop auto resta in fondo */}
        <footer style={{
          borderTop: '1px solid var(--line)',
          background: 'var(--card)',
          padding: '16px 32px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--muted)',
          marginTop: 'auto',
          borderBottomLeftRadius: 'var(--radius-lg)',
          borderBottomRightRadius: 'var(--radius-lg)',
        }}>
          OBT - Tool per Ovipets by BambooKat ·{' '}
          <a 
            href="mailto:makie.kojima+obt@gmail.com?subject=OBT%20Tool" 
            style={{ color: 'var(--primary)', textDecoration: 'none' }}
          >
            Contact
          </a>
          {' '}·{' '}
          <a 
            href="https://ovipets.com" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'var(--muted)', textDecoration: 'none' }}
          >
            Ovipets.com
          </a>
        </footer>
      </div>
    </div>
  )
}

export default Layout
