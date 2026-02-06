import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <div className="container">
          <img src="/logo.png" alt="Safari Tras las Sierras" className="header-logo" />
          <h1>SAFARI TRAS LAS SIERRAS</h1>
          <p className="subtitle">Safari en Valle Fértil - San Juan</p>
        </div>
      </header>

      <section className="counter-section">
        {/* Sección del contador */}
      </section>

      <section className="background-overlay-section">
        <main className="home-main">
          <div className="container">
            <div className="home-content">
            <div className="home-card">
              <h2>Inscripción Autos</h2>
              <p>Formulario de inscripción para pilotos de auto en la competencia.</p>
              <Link to="/inscripcion/auto" className="btn btn-primary">
                Inscribir Auto
              </Link>
            </div>

            <div className="home-card">
              <h2>Inscripción Motos (y cuatriciclos)</h2>
              <p>Formulario de inscripción para pilotos de moto o cuatriciclo.</p>
              <Link to="/inscripcion/moto" className="btn btn-primary">
                Inscribir Moto / Cuatri
              </Link>
            </div>

            <div className="home-card">
              <h2>Tiempos en vivo</h2>
              <p>Mirá los tiempos de carrera y el estado (semáforo en vivo).</p>
              <Link to="/tiempos" className="btn btn-primary">
                Ver tiempos
              </Link>
            </div>

            <div className="home-card">
              <h2>Pilotos Inscritos</h2>
              <p>Consulta la lista de todos los pilotos inscritos en la competencia.</p>
              <Link to="/pilotos" className="btn btn-primary">
                Ver Pilotos
              </Link>
            </div>

            <div className="home-card home-card-ticket">
              <h2>Ticket de entrada</h2>
              <p>Pedí tu ticket y subí el comprobante de pago. Cuando lo aprobemos podrás descargarlo.</p>
              <Link to="/solicitar-ticket" className="btn btn-primary">
                Pedir ticket
              </Link>
            </div>

            <div className="home-card">
              <h2>Panel de Administración</h2>
              <p>Acceso exclusivo para administradores del evento.</p>
              <Link to="/admin/login" className="btn btn-secondary">
                Acceder
              </Link>
            </div>
          </div>
        </div>
        </main>
      </section>

      <footer className="home-footer">
        <div className="container">
          <div className="home-footer-logos">
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-04-scaled.png" alt="" />
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-05-2-scaled.png" alt="" />
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/02/insumos-para-figma-12.png" alt="" />
          </div>
          <nav className="home-social" aria-label="Redes sociales">
            <a href="https://www.facebook.com/apivavallefertil2017?locale=es_LA" target="_blank" rel="noopener noreferrer" className="home-social-link" title="Facebook">
              <svg className="home-social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </a>
            <a href="https://www.instagram.com/safaritraslassierras2026/" target="_blank" rel="noopener noreferrer" className="home-social-link" title="Instagram">
              <svg className="home-social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              Instagram
            </a>
          </nav>
          <p>Desarrollado con ❤️ por <strong>Plot Center</strong> 2026</p>
        </div>
      </footer>
    </div>
  );
}



