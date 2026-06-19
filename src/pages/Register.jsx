import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    
    try {
      await register(email, password, fullName, churchName);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Error al registrar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-on-surface">
      <div className="flex min-h-screen">
        {/* Left Half - Hero Image */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-black">
          <img alt="Atmospheric background" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAN2s4mYM3VWT7O4gsw3aE6iDnNs6EzB287JgzwKT3Yaz9WAek9oBpgbNF3SO7d6jLUkRsV1ION_F-oQVXDMNHjG-DnB3X9s_2BhjJbuVAD8hsufPEmJYpGlNUnh0fbEE_U6gIsYalYhSimsa_eZvquT3h9aSZKhfr5R7quGHpSa2qf9icAdFtDmQur7OoNHoTVoc2-mzJttaJutCvEFqxcsn0Or09D84d-15X-cgEyuQRs51NAZFsCTb8Hzbgp1ccxpY0g4XDFGv0"/>
          <div className="absolute inset-0 bg-black/40 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#09090b]/80"></div>
        </div>

        {/* Right Half - Register Container */}
        <div className="w-full lg:w-1/2 flex items-center justify-center relative z-10 px-6 sm:px-12 lg:px-24 bg-[#09090b] py-8">
          <div className="w-full max-w-sm">
            {/* Header */}
            <div className="mb-8 text-center sm:text-left">
              <div className="mb-4">
                <Link to="/" className="text-xl font-bold text-primary tracking-tight">UJELADEA</Link>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-on-surface mb-2 tracking-tight">Únete</h1>
              <p className="text-sm text-on-surface-variant">Crea tu cuenta para acceder a recursos.</p>
            </div>

            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5 uppercase tracking-wide" htmlFor="fullName">Nombre Completo</label>
                <div className="relative group focus-within:border-secondary focus-within:shadow-[0_0_0_1px_rgba(143,25,55,0.2)] border border-[#27272a] rounded-md bg-glass-bg backdrop-blur-sm overflow-hidden transition-colors duration-300">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">person</span>
                  </div>
                  <input 
                    id="fullName" 
                    type="text" 
                    required 
                    placeholder="Ej. Juan Pérez" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-transparent border-none text-sm text-on-surface placeholder-on-surface-variant/50 focus:ring-0 outline-none" 
                  />
                </div>
              </div>

              {/* Church Name */}
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5 uppercase tracking-wide" htmlFor="churchName">Iglesia</label>
                <div className="relative group focus-within:border-secondary focus-within:shadow-[0_0_0_1px_rgba(143,25,55,0.2)] border border-[#27272a] rounded-md bg-glass-bg backdrop-blur-sm overflow-hidden transition-colors duration-300">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">church</span>
                  </div>
                  <input 
                    id="churchName" 
                    type="text" 
                    required 
                    placeholder="Ej. Iglesia Central" 
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-transparent border-none text-sm text-on-surface placeholder-on-surface-variant/50 focus:ring-0 outline-none" 
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5 uppercase tracking-wide" htmlFor="email">Correo Electrónico</label>
                <div className="relative group focus-within:border-secondary focus-within:shadow-[0_0_0_1px_rgba(143,25,55,0.2)] border border-[#27272a] rounded-md bg-glass-bg backdrop-blur-sm overflow-hidden transition-colors duration-300">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">mail</span>
                  </div>
                  <input 
                    id="email" 
                    type="email" 
                    required 
                    placeholder="ejemplo@correo.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-transparent border-none text-sm text-on-surface placeholder-on-surface-variant/50 focus:ring-0 outline-none" 
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5 uppercase tracking-wide" htmlFor="password">Contraseña</label>
                <div className="relative group focus-within:border-secondary focus-within:shadow-[0_0_0_1px_rgba(143,25,55,0.2)] border border-[#27272a] rounded-md bg-glass-bg backdrop-blur-sm overflow-hidden transition-colors duration-300">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">lock</span>
                  </div>
                  <input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 bg-transparent border-none text-sm text-on-surface placeholder-on-surface-variant/50 focus:ring-0 outline-none" 
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-on-surface-variant hover:text-on-surface focus:outline-none transition-colors duration-200"
                    >
                      <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5 uppercase tracking-wide" htmlFor="confirmPassword">Confirmar Contraseña</label>
                <div className="relative group focus-within:border-secondary focus-within:shadow-[0_0_0_1px_rgba(143,25,55,0.2)] border border-[#27272a] rounded-md bg-glass-bg backdrop-blur-sm overflow-hidden transition-colors duration-300">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">lock_clock</span>
                  </div>
                  <input 
                    id="confirmPassword" 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-transparent border-none text-sm text-on-surface placeholder-on-surface-variant/50 focus:ring-0 outline-none" 
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-[#8f1937] text-xs font-medium mt-1 bg-[#8f1937]/10 border border-[#8f1937]/30 p-2.5 rounded-md flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 mt-2 border border-transparent rounded-md shadow-sm text-sm text-white bg-primary-container hover:bg-[#a81c40] hover:shadow-[0_0_15px_rgba(143,25,55,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-container focus:ring-offset-[#09090b] transition-all duration-300 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : 'Crear cuenta'}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center border-t border-[#27272a] pt-5">
              <p className="text-sm text-on-surface-variant">
                ¿Ya tienes una cuenta? 
                <Link to="/login" className="text-sm text-primary hover:text-white transition-colors duration-200 ml-1 font-medium">Inicia sesión</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
