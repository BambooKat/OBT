import { Link } from 'react-router-dom'

function Layout({ username, onLogout, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
            <img 
              src="/logo_obt.png"  
              style={{ height: '40px', width: 'auto', cursor: 'pointer' }} 
              alt="OBT Home"
            />
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

      <div className="obt-shell" style={{ margin: '24px auto 40px', maxWidth: '1200px', width: 'calc(100% - 48px)' }}>
        {children}
      </div>
    </div>
  )
}

export default Layout