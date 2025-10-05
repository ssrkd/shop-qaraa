import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../images/qara.png';

export default function Preloader() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .preloader-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 24px;
        }

        .preloader-content {
          text-align: center;
          animation: fadeInUp 0.6s ease;
        }

        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translateY(30px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }

        .logo-container {
          position: relative;
          display: inline-block;
          margin-bottom: 32px;
        }

        .logo-img {
          width: 100px;
          height: 100px;
          object-fit: contain;
          border-radius: 50%;
          background: #fff;
          padding: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { 
            transform: translateY(0px);
          }
          50% { 
            transform: translateY(-10px);
          }
        }

        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, rgba(26, 26, 26, 0.1) 0%, transparent 70%);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        .brand-title {
          font-size: 48px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -2px;
          margin-bottom: 12px;
          animation: fadeIn 0.8s ease 0.2s both;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .brand-subtitle {
          font-size: 16px;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 48px;
          animation: fadeIn 0.8s ease 0.4s both;
        }

        .spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 24px;
          animation: fadeIn 0.8s ease 0.6s both;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(26, 26, 26, 0.1);
          border-top-color: #1a1a1a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-dots {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .dot {
          width: 8px;
          height: 8px;
          background: #1a1a1a;
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite;
        }

        .dot:nth-child(1) {
          animation-delay: 0s;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        .loading-text {
          font-size: 15px;
          color: #6b7280;
          font-weight: 500;
          animation: fadeIn 0.8s ease 0.8s both;
        }

        .progress-bar-container {
          width: 200px;
          height: 4px;
          background: rgba(26, 26, 26, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin: 32px auto 0;
          animation: fadeIn 0.8s ease 1s both;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #1a1a1a 0%, #2d2d2d 100%);
          border-radius: 2px;
          animation: progress 2.5s ease-in-out;
        }

        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        .feature-badges {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 48px;
          flex-wrap: wrap;
          animation: fadeIn 0.8s ease 1.2s both;
        }

        .badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 20px;
          font-size: 13px;
          color: #374151;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .badge svg {
          width: 16px;
          height: 16px;
          color: #10b981;
        }

        @media (max-width: 480px) {
          .brand-title {
            font-size: 36px;
          }

          .brand-subtitle {
            font-size: 14px;
          }

          .logo-img {
            width: 80px;
            height: 80px;
          }

          .logo-glow {
            width: 100px;
            height: 100px;
          }

          .feature-badges {
            gap: 12px;
          }

          .badge {
            font-size: 12px;
            padding: 6px 12px;
          }
        }
      `}</style>

      <div className="preloader-wrapper">
        <div className="preloader-content">
          <div className="logo-container">
            <div className="logo-glow"></div>
            <img src={logo} alt="qaraa" className="logo-img" />
          </div>

          <h1 className="brand-title">qaraa</h1>
          <p className="brand-subtitle">Безопасная система управления</p>

          <div className="spinner-container">
            <div className="loading-spinner"></div>
            <div className="loading-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>

          <p className="loading-text">Загрузка системы...</p>

          <div className="progress-bar-container">
            <div className="progress-bar"></div>
          </div>

          <div className="feature-badges">
            <div className="badge">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Защищено
            </div>
            <div className="badge">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Быстро
            </div>
            <div className="badge">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Шифрование
            </div>
          </div>
        </div>
      </div>
    </>
  );
}