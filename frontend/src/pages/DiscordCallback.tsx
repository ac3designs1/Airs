import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function DiscordCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { setToken } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      setToken(token);
      nav('/dashboard', { replace: true });
    } else {
      nav('/login?discord_error=server_error', { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07090f' }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse"
          style={{ background: 'linear-gradient(135deg,#5865F2,#4752C4)' }}>
          <Shield className="w-8 h-8 text-white" />
        </div>
        <p className="text-slate-400 text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
