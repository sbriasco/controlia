import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FileText, CheckCircle, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/ui/Logo';
import './LoginPage.css';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-card">
          <div className="login-logo">
            <Logo variant="full" size={36} />
          </div>

          <h1 className="login-heading">Bienvenido</h1>
          <p className="login-subheading">
            Iniciá sesión para ingresar al sistema
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div style={{ backgroundColor: 'var(--rojo-light)', color: 'var(--rojo)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@controlia.com"
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Contraseña</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresá tu contraseña"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '24px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
              {!isLoading && <LogIn size={18} />}
            </button>
            
            <div style={{ marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              <p>Usuarios de prueba:</p>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>admin@controlia.com / admin123</li>
                <li>maria.gomez@controlia.com / empleado123</li>
                <li>contador@controlia.com / contador123</li>
              </ul>
            </div>
          </form>
        </div>
      </div>

      <div className="login-right">
        <div className="login-right-content">
          <h2 className="login-right-title">
            Control horario y novedades laborales, simplificado
          </h2>
          <p className="login-right-text">
            Centralizá la gestión de asistencia, fichadas y novedades de tu equipo.
            Prepará la información para tu contador en minutos, no en días.
          </p>

          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature-icon">
                <Clock size={22} />
              </div>
              <span className="login-feature-label">Fichadas</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">
                <FileText size={22} />
              </div>
              <span className="login-feature-label">Novedades</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">
                <CheckCircle size={22} />
              </div>
              <span className="login-feature-label">Reportes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
