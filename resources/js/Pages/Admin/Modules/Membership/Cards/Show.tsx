import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { PageProps } from '@/types';

interface CardBenefit {
    id: string;
    name: string;
    usage_count: number;
    used_count: number;
    remaining_count: number;
}

interface CheckinRecord {
    id: number;
    benefit_name: string;
    notes?: string | null;
    checked_in_at: string;
    checked_in_by_user?: {
        id: number;
        name: string;
    } | null;
}

interface MembershipCardDetails {
    id: number;
    card_code: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    customer_dob?: string | null;
    issued_at: string;
    expires_at: string;
    status: 'active' | 'expired' | 'suspended' | 'cancelled';
    card_benefits?: CardBenefit[] | null;
    is_email_sent: boolean;
    email_sent_at?: string | null;
    notes?: string | null;
    membership_type?: {
        id: number;
        name: string;
        price: number | string;
        validity_duration: number;
        validity_unit: string;
    } | null;
    checkins: CheckinRecord[];
    created_by_user?: {
        id: number;
        name: string;
    } | null;
}

interface ShowProps extends PageProps {
    card: MembershipCardDetails;
    qrImageUrl: string;
    verificationUrl: string;
}

export default function Show({ auth, flash, card, qrImageUrl, verificationUrl }: ShowProps) {
    const isExpired = new Date(card.expires_at) < new Date();

    const handleResendEmail = () => {
        if (confirm(`Gửi lại email thông báo thẻ đến ${card.customer_email}?`)) {
            router.post(route('admin.membership.cards.resend_email', card.id));
        }
    };

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('vi-VN');
        } catch {
            return dateStr;
        }
    };

    const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleString('vi-VN');
        } catch {
            return dateStr;
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                                Chi tiết Thẻ Hội Viên: {card.customer_name}
                            </h2>
                            {isExpired ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                    Đã hết hạn
                                </span>
                            ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    Đang hoạt động
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-mono text-amber-700 mt-1">
                            Mã thẻ: <strong>{card.card_code}</strong> • Hạng: {card.membership_type?.name}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={route('admin.membership.scanner.index', { code: card.card_code })}
                            className="inline-flex items-center px-4 py-2 bg-slate-800 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-slate-700 shadow-sm"
                        >
                            📷 Quét / Trừ Ưu Đãi
                        </Link>
                        <button
                            onClick={handleResendEmail}
                            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-medium text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-50 shadow-sm"
                        >
                            📧 Gửi Lại Email
                        </button>
                        <a
                            href={route('admin.membership.cards.download_qr', card.id)}
                            className="inline-flex items-center px-4 py-2 bg-amber-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-amber-700 shadow-sm"
                        >
                            ⬇️ Tải Ảnh QR
                        </a>
                    </div>
                </div>
            }
        >
            <Head title={`Thẻ Hội Viên - ${card.card_code}`} />

            <div className="py-6 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                {flash?.success && (
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
                        {flash.error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: QR Code & Customer Profile */}
                    <div className="space-y-6">
                        {/* QR Pass Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                Mã QR Nhận Diện Hội Viên
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl inline-block border border-gray-100 shadow-inner">
                                <img
                                    src={qrImageUrl}
                                    alt={`QR ${card.card_code}`}
                                    className="w-48 h-48 mx-auto object-contain rounded-lg"
                                />
                            </div>
                            <div className="mt-3 font-mono font-black text-lg text-gray-900 tracking-wider">
                                {card.card_code}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Quét mã để xác thực hoặc trừ lượt ưu đãi trực tiếp
                            </div>
                        </div>

                        {/* Customer Information */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                Thông tin khách hàng
                            </h3>
                            <dl className="space-y-3 text-sm">
                                <div>
                                    <dt className="text-xs text-gray-500">Họ và tên</dt>
                                    <dd className="font-bold text-gray-900">{card.customer_name}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500">Số điện thoại</dt>
                                    <dd className="font-semibold text-gray-900">📞 {card.customer_phone}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500">Email</dt>
                                    <dd className="font-medium text-gray-900">✉️ {card.customer_email}</dd>
                                </div>
                                {card.customer_dob && (
                                    <div>
                                        <dt className="text-xs text-gray-500">Ngày sinh</dt>
                                        <dd className="font-medium text-gray-900">🎂 {formatDate(card.customer_dob)}</dd>
                                    </div>
                                )}
                                <div>
                                    <dt className="text-xs text-gray-500">Ngày kích hoạt</dt>
                                    <dd className="font-medium text-gray-900">{formatDate(card.issued_at)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500">Hạn sử dụng</dt>
                                    <dd className={`font-bold ${isExpired ? 'text-red-600' : 'text-emerald-700'}`}>
                                        {formatDate(card.expires_at)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500">Trạng thái gửi email</dt>
                                    <dd className="text-xs mt-0.5">
                                        {card.is_email_sent ? (
                                            <span className="text-emerald-700 font-semibold">
                                                ✓ Đã gửi lúc {formatDateTime(card.email_sent_at)}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">Chưa gửi email</span>
                                        )}
                                    </dd>
                                </div>
                                {card.notes && (
                                    <div className="pt-2 border-t border-gray-100">
                                        <dt className="text-xs text-gray-500">Ghi chú</dt>
                                        <dd className="text-xs text-gray-600 mt-1 italic">{card.notes}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </div>

                    {/* Right Column: Benefits Status & Check-in History */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Benefits Status */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base">
                                        Tình trạng ưu đãi & Quyền lợi
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Hạng thẻ: <strong>{card.membership_type?.name}</strong>
                                    </p>
                                </div>
                                <Link
                                    href={route('admin.membership.scanner.index', { code: card.card_code })}
                                    className="inline-flex items-center px-3 py-1.5 bg-amber-600 text-white rounded-md text-xs font-semibold hover:bg-amber-700 shadow-2xs"
                                >
                                    Trừ lượt ngay
                                </Link>
                            </div>

                            <div className="space-y-4">
                                {(!card.card_benefits || card.card_benefits.length === 0) ? (
                                    <p className="text-sm text-gray-400 italic">Thẻ chưa có danh mục quyền lợi.</p>
                                ) : (
                                    card.card_benefits.map((benefit, bIdx) => {
                                        const isLimited = benefit.usage_count > 0;
                                        const remaining = benefit.remaining_count;
                                        const isDepleted = isLimited && remaining <= 0;

                                        return (
                                            <div
                                                key={benefit.id || bIdx}
                                                className={`p-4 rounded-xl border ${
                                                    isDepleted
                                                        ? 'bg-gray-50 border-gray-200 opacity-60'
                                                        : 'bg-amber-50/40 border-amber-200'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-gray-900 text-sm">
                                                        {benefit.name}
                                                    </span>
                                                    <div>
                                                        {isLimited ? (
                                                            <span
                                                                className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                                                                    isDepleted
                                                                        ? 'bg-red-100 text-red-800'
                                                                        : 'bg-amber-100 text-amber-900'
                                                                }`}
                                                            >
                                                                Còn lại: {remaining} / {benefit.usage_count} lượt
                                                            </span>
                                                        ) : (
                                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                Không giới hạn lượt
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Usage progress bar if limited */}
                                                {isLimited && (
                                                    <div className="mt-3">
                                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className={`h-2 rounded-full ${
                                                                    isDepleted ? 'bg-red-400' : 'bg-amber-500'
                                                                }`}
                                                                style={{
                                                                    width: `${Math.min(
                                                                        100,
                                                                        Math.round((benefit.used_count / benefit.usage_count) * 100)
                                                                    )}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                                                            <span>Đã dùng: {benefit.used_count} lượt</span>
                                                            <span>Tổng cấp: {benefit.usage_count} lượt</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Recent Check-ins History */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-900 text-base mb-3 border-b border-gray-100 pb-2">
                                Lịch sử sử dụng đặc quyền ({card.checkins?.length || 0})
                            </h3>
                            {(!card.checkins || card.checkins.length === 0) ? (
                                <p className="text-sm text-gray-400 italic py-4 text-center">
                                    Chưa có lượt sử dụng nào được ghi nhận cho thẻ này.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left">Đặc quyền đã dùng</th>
                                                <th className="px-4 py-2.5 text-left">Thời gian</th>
                                                <th className="px-4 py-2.5 text-left">Nhân viên tiếp nhận</th>
                                                <th className="px-4 py-2.5 text-left">Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {card.checkins.map((checkin) => (
                                                <tr key={checkin.id} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3 font-semibold text-gray-800">
                                                        {checkin.benefit_name}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-600">
                                                        {formatDateTime(checkin.checked_in_at)}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700">
                                                        {checkin.checked_in_by_user?.name ?? 'Hệ thống'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500 italic">
                                                        {checkin.notes || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

