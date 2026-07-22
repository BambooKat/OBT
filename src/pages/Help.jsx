// Bollino "?" con bolla esplicativa. Il testo arriva già tradotto dal chiamante.
function Help({ text }) {
  return (
    <span className="obt-help" tabIndex={0} onClick={(e) => e.stopPropagation()}>?
      <span className="obt-help__bubble">{text}</span>
    </span>
  )
}

export default Help
