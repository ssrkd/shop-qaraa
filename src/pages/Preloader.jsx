import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Preloader() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard'); // переход через 2.5 секунды
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      height:'100vh',
      background:'#f0f2f5'
    }}>
      <div className="loading-spinner" style={{
        width:'50px',
        height:'50px',
        border:'6px solid rgba(0,0,0,0.1)',
        borderTopColor:'#0b3d91',
        borderRadius:'50%',
        animation:'spin 1s linear infinite'
      }}></div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}