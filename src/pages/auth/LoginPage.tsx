import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FileText, CheckCircle, LogIn, Mail, Lock, Eye, EyeOff, Info } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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

  const handleTestUserClick = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
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
              <label className="form-label-custom">Email</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  className="form-input-custom"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@controlia.com"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label-custom">Contraseña</label>
              <div className="input-with-icon">
                <Lock className="input-icon" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input-custom"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresá tu contraseña"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
              {!isLoading && <LogIn size={18} />}
            </button>
            
            <div className="test-users-box">
              <div className="test-users-title">
                <Info size={16} />
                <span>Usuarios de prueba (Clic para rellenar)</span>
              </div>
              <ul className="test-users-list">
                <li 
                  className="test-users-item" 
                  onClick={() => handleTestUserClick('admin@controlia.com', 'admin123')}
                >
                  <span>Administrador</span>
                  <span className="test-user-credentials">admin@controlia.com</span>
                </li>
                <li 
                  className="test-users-item" 
                  onClick={() => handleTestUserClick('maria.gomez@controlia.com', 'empleado123')}
                >
                  <span>Empleado</span>
                  <span className="test-user-credentials">maria.gomez@controlia.com</span>
                </li>
                <li 
                  className="test-users-item" 
                  onClick={() => handleTestUserClick('contador@controlia.com', 'contador123')}
                >
                  <span>Contador</span>
                  <span className="test-user-credentials">contador@controlia.com</span>
                </li>
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
