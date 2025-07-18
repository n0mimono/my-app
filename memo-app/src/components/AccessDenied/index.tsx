import React from 'react';
import './AccessDenied.css';

interface AccessDeniedProps {
  userEmail?: string;
  onRetry?: () => void;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ userEmail, onRetry }) => {
  return (
    <div className="access-denied">
      <div className="access-denied-container">
        <div className="access-denied-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
            <path d="m15 9-6 6" stroke="#ef4444" strokeWidth="2"/>
            <path d="m9 9 6 6" stroke="#ef4444" strokeWidth="2"/>
          </svg>
        </div>
        
        <h1 className="access-denied-title">アクセスが拒否されました</h1>
        
        <div className="access-denied-message">
          <p>申し訳ございませんが、このアプリケーションへのアクセス権限がありません。</p>
          {userEmail && (
            <p className="user-email">
              ログインしたアカウント: <strong>{userEmail}</strong>
            </p>
          )}
        </div>

        <div className="access-denied-explanation">
          <h2>なぜアクセスできないのですか？</h2>
          <ul>
            <li>このアプリケーションは承認されたユーザーのみがアクセスできます</li>
            <li>あなたのメールアドレスが許可リストに登録されていません</li>
            <li>アクセス権限が必要な場合は、管理者にお問い合わせください</li>
          </ul>
        </div>

        <div className="access-denied-actions">
          {onRetry && (
            <button 
              className="retry-button"
              onClick={onRetry}
              type="button"
            >
              別のアカウントでログイン
            </button>
          )}
          <p className="contact-info">
            アクセス権限が必要な場合は、システム管理者にお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;