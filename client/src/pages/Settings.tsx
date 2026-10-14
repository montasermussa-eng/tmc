import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Users,
  History,
  Plus,
  RefreshCw,
  Lock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  details: string;
  userName?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export const Settings: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'audit' | 'ranks' | 'relationships' | 'users'>('audit');

  // Audit State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('');

  // Ranks & Relationships
  const [ranks, setRanks] = useState<{ id: number; name: string; order: number }[]>([]);
  const [relationships, setRelationships] = useState<{ id: number; name: string; order: number }[]>([]);
  const [newRankName, setNewRankName] = useState('');
  const [newRelName, setNewRelName] = useState('');

  // Users State (Admin)
  const [users, setUsers] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('GATE_OPERATOR');
  const [userMsg, setUserMsg] = useState('');

  useEffect(() => {
    loadSettings();
    if (activeTab === 'audit') loadAuditLogs();
    if (activeTab === 'users' && isAdmin) loadUsers();
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      const res = await apiRequest<{
        ranks: { id: number; name: string; order: number }[];
        relationships: { id: number; name: string; order: number }[];
      }>('/settings');
      setRanks(res.ranks);
      setRelationships(res.relationships);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const queryParams = new URLSearchParams({ limit: '50' });
      if (actionFilter) queryParams.append('action', actionFilter);

      const res = await apiRequest<{ logs: AuditLogEntry[] }>(`/audit?${queryParams.toString()}`);
      setAuditLogs(res.logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await apiRequest<{ users: any[] }>('/auth/users');
      setUsers(res.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleAddRank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRankName.trim()) return;
    try {
      await apiRequest('/settings/ranks', {
        method: 'POST',
        body: JSON.stringify({ name: newRankName.trim(), order: ranks.length + 1 }),
      });
      setNewRankName('');
      loadSettings();
    } catch (err: any) {
      alert(err.message || 'فشل إضافة الرتبة');
    }
  };

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRelName.trim()) return;
    try {
      await apiRequest('/settings/relationships', {
        method: 'POST',
        body: JSON.stringify({ name: newRelName.trim(), order: relationships.length + 1 }),
      });
      setNewRelName('');
      loadSettings();
    } catch (err: any) {
      alert(err.message || 'فشل إضافة درجة القرابة');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg('');
    try {
      await apiRequest('/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          fullName: newFullName.trim(),
          role: newRole,
        }),
      });
      setUserMsg('تم إنشاء حساب المستخدم بنجاح');
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      loadUsers();
    } catch (err: any) {
      setUserMsg(err.message || 'فشل إنشاء المستخدم');
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CHECK_IN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">تسجيل دخول</span>;
      case 'BUS_LEADER_ASSIGNED':
      case 'BUS_LEADER_UPDATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">قائد أتوبيس</span>;
      case 'EXCEL_IMPORT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">استيراد إكسيل</span>;
      case 'GUEST_CREATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">إضافة مدعو</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-black text-tmc-navy flex items-center gap-2">
          <span>الإعدادات وسجل العمليات والرقابة</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          سجل التتبع الأمني للعمليات، إعدادات الرتب العسكرية، وإدارة صلاحيات المستخدمين
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
            activeTab === 'audit'
              ? 'bg-tmc-navy text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل العمليات الميدانية (Audit Trail)</span>
        </button>

        <button
          onClick={() => setActiveTab('ranks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
            activeTab === 'ranks'
              ? 'bg-tmc-navy text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>الرتب العسكرية المعتمدة</span>
        </button>

        <button
          onClick={() => setActiveTab('relationships')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
            activeTab === 'relationships'
              ? 'bg-tmc-navy text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>درجات القرابة</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeTab === 'users'
                ? 'bg-tmc-navy text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>حسابات المستخدمين</span>
          </button>
        )}
      </div>

      {/* Tab 1: Audit Log */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setTimeout(loadAuditLogs, 50);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="">جميع أنواع العمليات</option>
                <option value="CHECK_IN">تسجيل دخول المدعوين</option>
                <option value="BUS_LEADER_ASSIGNED">تعيين قادة الأتوبيسات</option>
                <option value="EXCEL_IMPORT">استيراد كشوف الإكسيل</option>
                <option value="GUEST_CREATED">إضافة مدعو جديد</option>
                <option value="LOGIN">تسجيل الدخول</option>
              </select>
            </div>

            <button
              onClick={loadAuditLogs}
              disabled={auditLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
              <span>تحديث السجل</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-32">نوع الإجراء</th>
                    <th className="py-3 px-4">تفاصيل العملية</th>
                    <th className="py-3 px-4 w-36">المستخدم المنفذ</th>
                    <th className="py-3 px-4 w-28 text-center">عنوان IP</th>
                    <th className="py-3 px-4 w-40 text-center">التوقيت والتاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        جاري تحميل سجل العمليات...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        لا توجد عمليات مسجلة تطابق التصفية
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {log.details}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-xs">
                            {log.userName || 'النظام'}
                          </div>
                          {log.userRole && (
                            <div className="text-[10px] text-slate-400">{log.userRole}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs text-slate-500">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="py-3 px-4 text-center text-xs text-slate-500 font-mono">
                          {new Date(log.createdAt).toLocaleString('ar-EG', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Military Ranks */}
      {activeTab === 'ranks' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              قائمة الرتب العسكرية المعتمدة لقادة الأتوبيسات
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {ranks.map((r) => (
              <span
                key={r.id}
                className="bg-slate-100 border border-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs"
              >
                {r.name}
              </span>
            ))}
          </div>

          {isAdmin && (
            <form onSubmit={handleAddRank} className="pt-4 border-t border-slate-200 flex gap-3 max-w-md">
              <input
                type="text"
                value={newRankName}
                onChange={(e) => setNewRankName(e.target.value)}
                placeholder="إضافة رتبة عسكرية جديدة..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-tmc-navy hover:bg-tmc-navy-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab 3: Relationships */}
      {activeTab === 'relationships' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900">
            درجات القرابة المعتمدة في المنظومة
          </h3>

          <div className="flex flex-wrap gap-2">
            {relationships.map((rel) => (
              <span
                key={rel.id}
                className="bg-slate-100 border border-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs"
              >
                {rel.name}
              </span>
            ))}
          </div>

          {isAdmin && (
            <form onSubmit={handleAddRelationship} className="pt-4 border-t border-slate-200 flex gap-3 max-w-md">
              <input
                type="text"
                value={newRelName}
                onChange={(e) => setNewRelName(e.target.value)}
                placeholder="إضافة درجة قرابة جديدة..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-tmc-navy hover:bg-tmc-navy-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab 4: Users Management (Admin only) */}
      {activeTab === 'users' && isAdmin && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              حسابات المستخدمين النشطة في المنظومة
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">اسم المستخدم</th>
                    <th className="py-2.5 px-3">الاسم الكامل</th>
                    <th className="py-2.5 px-3">الدور / الصلاحية</th>
                    <th className="py-2.5 px-3">الرقم العسكري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-tmc-navy">{u.username}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{u.fullName}</td>
                      <td className="py-2.5 px-3 font-bold text-xs">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">{u.role}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{u.militaryNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              إنشاء مستخدم جديد
            </h3>

            {userMsg && (
              <div className="mb-4 p-3 bg-slate-100 border border-slate-300 rounded text-xs font-semibold text-slate-800">
                {userMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الصلاحية / الدور</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-bold"
                >
                  <option value="GATE_OPERATOR">موظف بوابة الدخول (GATE_OPERATOR)</option>
                  <option value="SUPERVISOR">مشرف عمليات الأتوبيسات (SUPERVISOR)</option>
                  <option value="ADMIN">مسؤول النظام (ADMIN)</option>
                </select>
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-tmc-navy hover:bg-tmc-navy-700 text-white font-bold text-xs rounded-lg shadow transition"
                >
                  إنشاء حساب المستخدم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
