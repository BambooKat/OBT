import { Link } from 'react-router-dom' // assicurati di avere questo import se usi il logo cliccabile

function Layout({ username, onLogout, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
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
          <Link to="/" style={{ display: 'flex' }}>
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

      {/* Contenuto principale - nota il flex: 1 */}
      <div className="obt-shell" style={{ 
        margin: '24px auto 40px', 
        maxWidth: '1200px', 
        width: 'calc(100% - 48px)',
        flex: 1 // <-- importantissimo: spinge il footer in basso
      }}>
        {children}
      </div>

      {/* Footer */}
      <footer style={{
  borderTop: '1px solid var(--line)',
  background: 'var(--card)',
  padding: '16px 32px',
  textAlign: 'center',
  fontSize: '14px',
  color: 'var(--muted)',
  marginTop: 'auto'
}}>
  OBT - Tool per Ovipets by BambooKat Â·{' '}
  <a 
    href="mailto:makie.kojima+obt@gmail.com?subject=OBT%20Tool" 
    style={{ color: 'var(--primary)', textDecoration: 'none' }}
  >
    Contact
  </a>
  {' '}Â·{' '}
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
  )
}

export default Layout