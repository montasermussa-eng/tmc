import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('gate1');
  const [password, setPassword] = useState('gate123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await login(username, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تسجيل الدخول — تأكد من صحة البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-tmc-navy-900 flex flex-col justify-center items-center p-4 relative selection:bg-tmc-gold selection:text-tmc-navy-900">
      {/* Background Military Crest Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <img src="/logo.jpg" alt="Watermark" className="w-[600px] h-[600px] object-contain" />
      </div>

      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border-t-4 border-tmc-gold overflow-hidden relative z-10 text-right">
        {/* Header with College Emblem */}
        <div className="bg-tmc-navy text-white p-6 text-center border-b border-tmc-navy-700">
          <div className="inline-block p-1 bg-white rounded-full shadow-md mb-3 border-2 border-tmc-gold">
            <img
              src="/logo.jpg"
              alt="شعار الكلية العسكرية التكنولوجية"
              className="h-20 w-20 rounded-full object-contain"
            />
          </div>
          <div className="text-xs text-tmc-gold font-bold tracking-wider">
            جمهورية مصر العربية — وزارة الدفاع
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            الكلية العسكرية التكنولوجية
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            منظومة تسجيل حضور ضيوف حفل التخرج وإدارة وتسكين الأتوبيسات
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم المستخدم
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 pr-10 focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none transition"
                required
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 pr-10 focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none transition"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-tmc-navy hover:bg-tmc-navy-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
          >
            <ShieldCheck className="w-5 h-5 text-tmc-gold" />
            <span>{isLoading ? 'جاري التحقق والاتصال...' : 'تسجيل الدخول إلى المنظومة'}</span>
          </button>

          {/* Quick Role Selectors for testing */}
          <div className="pt-4 border-t border-slate-200">
            <span className="block text-[11px] font-bold text-slate-500 mb-2 text-center">
              حسابات الدخول المعتمدة للاختبار السريع:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('gate1', 'gate123')}
                className={`py-1.5 px-2 text-[11px] font-semibold rounded border transition text-center ${
                  username === 'gate1'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                بوابة الدخول
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('supervisor', 'super123')}
                className={`py-1.5 px-2 text-[11px] font-semibold rounded border transition text-center ${
                  username === 'supervisor'
                    ? 'bg-amber-50 border-amber-500 text-amber-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                مشرف الأتوبيسات
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                className={`py-1.5 px-2 text-[11px] font-semibold rounded border transition text-center ${
                  username === 'admin'
                    ? 'bg-red-50 border-red-500 text-red-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                مسؤول النظام
              </button>
            </div>
          </div>
        </form>

        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 text-center text-[11px] text-slate-500">
          نظام محمي ومشفر — الكلية العسكرية التكنولوجية
        </div>
      </div>
    </div>
  );
};
