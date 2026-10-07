import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import { PageProps } from '@/types';

interface BrevoSenderItem {
    id: number;
    name: string;
    email: string;
    active: boolean;
}

interface BrevoStatsData {
    email: string;
    company_name: string | null;
    name: string | null;
    plan_type: string;
    credits: number | null;
    daily_limit: number | null;
    sent_today: number;
    remaining_today: number | null;
    plans: Array<{ type?: string; credits?: number }>;
    senders?: BrevoSenderItem[];
}

interface TestConnectionResponse {
    success: boolean;
    message: string;
    data?: BrevoStatsData;
}

interface EmailSettingsProps extends PageProps {
    settings: {
        brevo_api_key: string;
        has_api_key: boolean;
        mail_from_name: string;
        mail_from_address: string;
    };
    liveStats: TestConnectionResponse | null;
}

export default function EmailSettings({ auth, settings, liveStats }: EmailSettingsProps) {
    const { data, setData, post, processing, errors } = useForm({
        brevo_api_key: settings.brevo_api_key || '',
        mail_from_name: settings.mail_from_name || '',
        mail_from_address: settings.mail_from_address || '',
    });

    const [showApiKey, setShowApiKey] = useState(false);
    const [testState, setTestState] = useState<{
        loading: boolean;
        result: TestConnectionResponse | null;
    }>({
        loading: false,
        result: liveStats,
    });

    const [testEmail, setTestEmail] = useState('');
    const [sendTestState, setSendTestState] = useState<{
        loading: boolean;
        result: { success: boolean; message: string } | null;
    }>({
        loading: false,
        result: null,
    });

    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.general_settings.email.update'), {
            onSuccess: () => {
                setSaveSuccessMessage('Đã lưu cấu hình email thành công!');
                setTimeout(() => setSaveSuccessMessage(null), 5000);
            },
        });
    };

    const handleTestConnection = async () => {
        setTestState((prev) => ({ ...prev, loading: true }));
        try {
            const response = await axios.post<TestConnectionResponse>(
                route('admin.general_settings.email.test_connection'),
                {
                    brevo_api_key: data.brevo_api_key,
                }
            );
            setTestState({
                loading: false,
                result: response.data,
            });
        } catch (error: any) {
            setTestState({
                loading: false,
                result: {
                    success: false,
                    message: error.response?.data?.message || error.message || 'Không thể gửi yêu cầu kiểm tra kết nối.',
                },
            });
        }
    };

    const handleSendTestEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testEmail) return;

        setSendTestState({ loading: true, result: null });
        try {
            const response = await axios.post<{ success: boolean; message: string }>(
                route('admin.general_settings.email.send_test'),
                {
                    recipient_email: testEmail,
                    brevo_api_key: data.brevo_api_key,
                }
            );
            setSendTestState({
                loading: false,
                result: response.data,
            });
        } catch (error: any) {
            setSendTestState({
                loading: false,
                result: {
                    success: false,
                    message: error.response?.data?.message || error.message || 'Lỗi khi gửi email thử nghiệm.',
                },
            });
        }
    };

    const currentStats = testState.result?.data;
    const isConnected = testState.result?.success;

    // Calculate percentage used if daily limit is defined
    let usagePercentage = 0;
    if (currentStats && currentStats.daily_limit && currentStats.daily_limit > 0) {
        usagePercentage = Math.min(100, Math.round((currentStats.sent_today / currentStats.daily_limit) * 100));
    }

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
                            <span>Cài đặt chung</span>
                            <span>/</span>
                            <span className="text-amber-600 font-medium">Cài đặt Email</span>
                        </div>
                        <h2 className="text-2xl font-bold leading-tight text-slate-800">
                            Cấu hình Email (Brevo API)
                        </h2>
                    </div>
                </div>
            }
        >
            <Head title="Cài đặt Email - Brevo API" />

            <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Save Feedback Banner */}
                {saveSuccessMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
                        <div className="flex items-center space-x-3">
                            <span className="text-xl">✅</span>
                            <p className="font-medium text-sm">{saveSuccessMessage}</p>
                        </div>
                        <button
                            onClick={() => setSaveSuccessMessage(null)}
                            className="text-emerald-500 hover:text-emerald-700 text-sm font-semibold"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Brevo Live Status & Daily Quota Dashboard */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl shadow-inner">
                                📬
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    Trạng thái Brevo & Hạn mức gửi
                                    {testState.result !== null && (
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                isConnected
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-rose-100 text-rose-800'
                                            }`}
                                        >
                                            {isConnected ? '● Đã kết nối' : '✕ Kết nối thất bại'}
                                        </span>
                                    )}
                                </h3>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    Kiểm tra hạn mức gửi email trong ngày và kết nối tới dịch vụ Brevo
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={testState.loading || !data.brevo_api_key}
                            className={`inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                                testState.loading
                                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                    : !data.brevo_api_key
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow active:scale-95'
                            }`}
                        >
                            {testState.loading ? (
                                <>
                                    <svg
                                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-600"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v8H4z"
                                        ></path>
                                    </svg>
                                    Đang kiểm tra kết nối...
                                </>
                            ) : (
                                <>
                                    <span className="mr-1.5">⚡</span> Kiểm tra kết nối
                                </>
                            )}
                        </button>
                    </div>

                    {/* Result message if exists */}
                    {testState.result && (
                        <div
                            className={`px-6 py-3 text-sm border-b ${
                                isConnected
                                    ? 'bg-emerald-50/70 border-emerald-100 text-emerald-800'
                                    : 'bg-rose-50/70 border-rose-100 text-rose-800'
                            }`}
                        >
                            <span className="font-semibold">{isConnected ? 'Thành công: ' : 'Thông báo: '}</span>
                            {testState.result.message}
                        </div>
                    )}

                    {/* Statistics Cards */}
                    {currentStats ? (
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Daily Max Limit */}
                                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 relative overflow-hidden">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                Hạn mức tối đa / ngày
                                            </p>
                                            <div className="mt-2 flex items-baseline gap-2">
                                                <span className="text-3xl font-extrabold text-slate-900">
                                                    {currentStats.daily_limit !== null
                                                        ? currentStats.daily_limit.toLocaleString('vi-VN')
                                                        : 'Không giới hạn'}
                                                </span>
                                                {currentStats.daily_limit !== null && (
                                                    <span className="text-xs text-slate-500 font-medium">emails</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg">
                                            🎯
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs text-slate-600">
                                        Gói tài khoản:{' '}
                                        <span className="font-semibold text-slate-800">{currentStats.plan_type}</span>
                                    </div>
                                </div>

                                {/* Sent Today */}
                                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 relative overflow-hidden">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                Đã gửi hôm nay
                                            </p>
                                            <div className="mt-2 flex items-baseline gap-2">
                                                <span className="text-3xl font-extrabold text-amber-600">
                                                    {currentStats.sent_today.toLocaleString('vi-VN')}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium">emails</span>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-lg">
                                            🚀
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs text-slate-600">
                                        {currentStats.daily_limit
                                            ? `Đã sử dụng ${usagePercentage}% hạn mức trong ngày`
                                            : 'Hoạt động gửi trong ngày hôm nay'}
                                    </div>
                                </div>

                                {/* Remaining Today */}
                                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 relative overflow-hidden">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                Còn lại hôm nay
                                            </p>
                                            <div className="mt-2 flex items-baseline gap-2">
                                                <span className="text-3xl font-extrabold text-emerald-600">
                                                    {currentStats.remaining_today !== null
                                                        ? currentStats.remaining_today.toLocaleString('vi-VN')
                                                        : (currentStats.credits !== null
                                                            ? currentStats.credits.toLocaleString('vi-VN')
                                                            : '∞')}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium">emails</span>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg">
                                            📊
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs text-slate-600">
                                        {currentStats.remaining_today !== null
                                            ? 'Có thể gửi thêm trong ngày'
                                            : 'Dựa trên số dư credit hiện có'}
                                    </div>
                                </div>
                            </div>

                            {/* Quota Progress Bar */}
                            {currentStats.daily_limit && currentStats.daily_limit > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60">
                                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
                                        <span>Tiến độ gửi hôm nay</span>
                                        <span>
                                            {currentStats.sent_today} / {currentStats.daily_limit} ({usagePercentage}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className={`h-2.5 rounded-full transition-all duration-500 ${
                                                usagePercentage > 90
                                                    ? 'bg-rose-500'
                                                    : usagePercentage > 75
                                                    ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${usagePercentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {/* Account metadata footer */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-500">
                                <div>
                                    <span className="text-slate-400">Email tài khoản Brevo: </span>
                                    <strong className="text-slate-700">{currentStats.email}</strong>
                                </div>
                                {currentStats.company_name && (
                                    <div>
                                        <span className="text-slate-400">Tổ chức/Doanh nghiệp: </span>
                                        <strong className="text-slate-700">{currentStats.company_name}</strong>
                                    </div>
                                )}
                                {currentStats.name && (
                                    <div>
                                        <span className="text-slate-400">Chủ tài khoản: </span>
                                        <strong className="text-slate-700">{currentStats.name}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-500">
                            <span className="text-3xl block mb-2">💡</span>
                            <p className="text-sm">
                                {data.brevo_api_key
                                    ? 'Nhấn nút "Kiểm tra kết nối" phía trên để tải thống kê hạn mức gửi trong ngày từ Brevo.'
                                    : 'Vui lòng nhập API Key từ Brevo bên dưới và nhấn "Kiểm tra kết nối" để xem hạn mức.'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Settings Form Card (2 Columns) */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                        <div className="border-b border-slate-100 pb-5 mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Cấu hình kết nối Brevo API</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Điền API Key được cung cấp từ tài khoản Brevo (Sendinblue) để kích hoạt hệ thống gửi email.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Brevo API Key */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">
                                    Brevo API Key (v3) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative rounded-xl shadow-sm">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={data.brevo_api_key}
                                        onChange={(e) => setData('brevo_api_key', e.target.value)}
                                        placeholder="xkeysib-..."
                                        className="w-full font-mono text-sm rounded-xl border-slate-300 pr-12 focus:border-amber-500 focus:ring-amber-500 placeholder-slate-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm font-medium text-slate-500 hover:text-slate-700"
                                        title={showApiKey ? 'Ẩn API Key' : 'Hiện API Key'}
                                    >
                                        {showApiKey ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {errors.brevo_api_key && (
                                    <p className="mt-1.5 text-xs text-rose-600">{errors.brevo_api_key}</p>
                                )}
                                <p className="mt-1.5 text-xs text-slate-500">
                                    Lấy API Key tại:{' '}
                                    <a
                                        href="https://app.brevo.com/settings/keys/api"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-amber-600 hover:text-amber-700 underline font-medium"
                                    >
                                        Brevo Dashboard &gt; SMTP &amp; API &gt; API Keys
                                    </a>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                                {/* Sender Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Tên người gửi (Sender Name)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.mail_from_name}
                                        onChange={(e) => setData('mail_from_name', e.target.value)}
                                        placeholder="Ví dụ: Pháp Tạng"
                                        className="w-full text-sm rounded-xl border-slate-300 focus:border-amber-500 focus:ring-amber-500 placeholder-slate-400"
                                    />
                                    {errors.mail_from_name && (
                                        <p className="mt-1.5 text-xs text-rose-600">{errors.mail_from_name}</p>
                                    )}
                                    <p className="mt-1 text-xs text-slate-500">Tên hiển thị trong hộp thư người nhận.</p>
                                </div>

                                {/* Sender Email */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Địa chỉ Email người gửi (Sender Email)
                                    </label>
                                    <input
                                        type="email"
                                        value={data.mail_from_address}
                                        onChange={(e) => setData('mail_from_address', e.target.value)}
                                        placeholder="Ví dụ: sorry.iloveyou990@gmail.com"
                                        className="w-full text-sm rounded-xl border-slate-300 focus:border-amber-500 focus:ring-amber-500 placeholder-slate-400"
                                    />
                                    {errors.mail_from_address && (
                                        <p className="mt-1.5 text-xs text-rose-600">{errors.mail_from_address}</p>
                                    )}
                                    <p className="mt-1 text-xs text-slate-500">
                                        Phải là sender/domain đã được xác minh (verified) trên Brevo.
                                    </p>

                                    {/* Quick selector for Brevo verified senders */}
                                    {currentStats?.senders && currentStats.senders.length > 0 && (
                                        <div className="mt-2.5 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs">
                                            <span className="font-semibold text-amber-900 block mb-1">
                                                Email người gửi hợp lệ từ tài khoản Brevo:
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {currentStats.senders.map((s) => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setData((prev) => ({
                                                                ...prev,
                                                                mail_from_address: s.email,
                                                                mail_from_name: prev.mail_from_name || s.name || 'Pháp Tạng',
                                                            }));
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-mono text-xs transition shadow-2xs"
                                                        title="Nhấp để điền email này"
                                                    >
                                                        <span>✓ {s.email}</span>
                                                        {s.name && <span className="text-slate-500 text-[11px]">({s.name})</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition active:scale-95 disabled:opacity-50"
                                >
                                    {processing ? 'Đang lưu...' : '💾 Lưu cài đặt'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Send Test Email Card (1 Column) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col justify-between">
                        <div>
                            <div className="border-b border-slate-100 pb-4 mb-5">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <span>✉️</span> Gửi thử nghiệm
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Gửi email thử đến một địa chỉ cụ thể để kiểm tra luồng gửi thực tế.
                                </p>
                            </div>

                            <form onSubmit={handleSendTestEmail} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Email người nhận thử nghiệm
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                        placeholder="nhap-email-cua-ban@gmail.com"
                                        className="w-full text-sm rounded-xl border-slate-300 focus:border-amber-500 focus:ring-amber-500 placeholder-slate-400"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={sendTestState.loading || !testEmail || !data.brevo_api_key}
                                    className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sendTestState.loading ? (
                                        <>
                                            <svg
                                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-600"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v8H4z"
                                                ></path>
                                            </svg>
                                            Đang gửi email...
                                        </>
                                    ) : (
                                        '📨 Gửi thư thử nghiệm'
                                    )}
                                </button>
                            </form>

                            {sendTestState.result && (
                                <div
                                    className={`mt-4 p-3.5 rounded-xl text-xs ${
                                        sendTestState.result.success
                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                                    }`}
                                >
                                    <p className="font-semibold mb-1">
                                        {sendTestState.result.success ? 'Gửi thành công!' : 'Gửi thất bại:'}
                                    </p>
                                    <p>{sendTestState.result.message}</p>
                                </div>
                            )}
                        </div>

                        {/* Tips */}
                        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                            <p className="font-semibold text-slate-700">📌 Lưu ý cấu hình Brevo:</p>
                            <p>• Gói Free của Brevo cho phép gửi tối đa 300 emails/ngày.</p>
                            <p>• Địa chỉ gửi (Sender Email) phải khớp với sender đã tạo trên Brevo để tránh bị chặn.</p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
