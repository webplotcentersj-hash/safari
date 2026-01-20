import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <div className="container">
          <img src="/logo.png" alt="Safari Tras las Sierras" className="header-logo" />
          <h1>SAFARI TRAS LAS SIERRAS</h1>
          <p className="subtitle">Rally en Valle Fértil - San Juan</p>
        </div>
      </header>

      <main className="home-main">
        <div className="container">
          <div className="home-content">
            <div className="home-card">
              <h2>Inscripción de Pilotos</h2>
              <p>Completa el formulario para inscribirte como piloto en la competencia.</p>
              <Link to="/inscripcion" className="btn btn-primary">
                Inscribirse
              </Link>
            </div>

            <div className="home-card">
              <h2>Pilotos Inscritos</h2>
              <p>Consulta la lista de todos los pilotos inscritos en la competencia.</p>
              <Link to="/pilotos" className="btn btn-primary">
                Ver Pilotos
              </Link>
            </div>

            <div className="home-card">
              <h2>Tickets de Entrada</h2>
              <p>Genera y descarga tu ticket de entrada al evento.</p>
              <Link to="/tickets" className="btn btn-primary">
                Generar Ticket
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

      <footer className="home-footer">
        <div className="container">
          <p>Desarrollado con ❤️ por <strong>Plot Center</strong> 2026</p>
        </div>
      </footer>
    </div>
  );
}



