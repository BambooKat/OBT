import { Link } from 'react-router-dom'

function Layout({ username, onLogout, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header - SEMPRE fuori, full width */}
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
        flexShrink: 0,
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

      {/* Wrapper centrale che spinge il footer in basso */}
      <div style={{ flex: 1, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        {/* Card centrale - SOLO questa ha larghezza fissa, non balla più */}
        <div className="obt-shell" style={{ 
          width: 'calc(100% - 48px)',
          maxWidth: '1200px',
          margin: '24px auto 40px',
          // IMPORTANTE: niente display:flex qui, lascia il CSS di theme.css fare il suo lavoro
          // così hero e tabelle non allargano la shell
        }}>
          {children}
        </div>
      </div>

      {/* Footer - FUORI dalla shell, come l'header, full width */}
      <footer style={{
        background: 'var(--card)',
        borderTop: '1px solid var(--line)',
        padding: '18px 32px',
        textAlign: 'center',
        fontSize: '14px',
        color: 'var(--muted)',
        flexShrink: 0,
        marginTop: 'auto',
      }}>
        OBT - Tool per Ovipets by BambooKat ·{' '}
        <a href="mailto:makie.kojima+obt@gmail.com?subject=OBT%20Tool" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Contact</a>
        {' '}·{' '}
        <a href="https://ovipets.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Ovipets.com</a>
      </footer>

    </div>
  )
}

export default Layout
