import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { PageProps } from '@/types';

interface MembershipTypeSummary {
    id: number;
    name: string;
    price: number | string;
}

interface CardItem {
    id: number;
    card_code: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    customer_dob?: string | null;
    issued_at: string;
    expires_at: string;
    status: 'active' | 'expired' | 'suspended' | 'cancelled';
    is_email_sent: boolean;
    membership_type?: MembershipTypeSummary | null;
    created_at: string;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface CardsIndexProps extends PageProps {
    cards: PaginatedData<CardItem>;
    types: MembershipTypeSummary[];
    filters: {
        search?: string;
        membership_type_id?: string;
        status?: string;
    };
}

export default function Index({ auth, flash, cards, types, filters }: CardsIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [typeId, setTypeId] = useState(filters.membership_type_id || '');
    const [status, setStatus] = useState(filters.status || '');

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.membership.cards.index'),
            { search, membership_type_id: typeId, status },
            { preserveState: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setTypeId('');
        setStatus('');
        router.get(route('admin.membership.cards.index'));
    };

    const handleDelete = (id: number, code: string) => {
        if (confirm(`Bạn có chắc muốn xoá thẻ hội viên [${code}]?`)) {
            router.delete(route('admin.membership.cards.destroy', id));
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

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                            Quản lý Thẻ Hội Viên
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Danh sách hội viên đã cấp thẻ, trạng thái và thời hạn sử dụng
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={route('admin.membership.scanner.index')}
                            className="inline-flex items-center px-4 py-2 bg-slate-800 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-slate-700 shadow-sm"
                        >
                            📷 Quét QR Check-in
                        </Link>
                        <Link
                            href={route('admin.membership.cards.create')}
                            className="inline-flex items-center px-4 py-2 bg-amber-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-amber-700 shadow-sm"
                        >
                            ➕ Cấp Thẻ Mới
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Thẻ Hội Viên" />

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

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <form onSubmit={handleFilter} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="sm:col-span-2">
                            <input
                                type="text"
                                placeholder="Tìm theo tên khách hàng, số điện thoại, email hoặc mã thẻ..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full text-sm rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                            />
                        </div>

                        <div>
                            <select
                                value={typeId}
                                onChange={(e) => setTypeId(e.target.value)}
                                className="w-full text-sm rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                            >
                                <option value="">Tất cả gói hội viên</option>
                                {types.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700"
                            >
                                Lọc
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                            >
                                Đặt lại
                            </button>
                        </div>
                    </form>
                </div>

                {/* Cards Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 text-left">Mã thẻ</th>
                                    <th className="px-6 py-3 text-left">Khách hàng</th>
                                    <th className="px-6 py-3 text-left">Gói hội viên</th>
                                    <th className="px-6 py-3 text-left">Thời hạn</th>
                                    <th className="px-6 py-3 text-center">Email QR</th>
                                    <th className="px-6 py-3 text-center">Trạng thái</th>
                                    <th className="px-6 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {cards.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                            Không tìm thấy thẻ hội viên nào phù hợp.
                                        </td>
                                    </tr>
                                ) : (
                                    cards.data.map((card) => {
                                        const isExpired = new Date(card.expires_at) < new Date();
                                        return (
                                            <tr key={card.id} className="hover:bg-amber-50/40 transition">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Link
                                                        href={route('admin.membership.cards.show', card.id)}
                                                        className="font-mono font-bold text-amber-700 hover:underline"
                                                    >
                                                        {card.card_code}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900">
                                                        {card.customer_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        📞 {card.customer_phone} • {card.customer_email}
                                                    </div>
                                                    {card.customer_dob && (
                                                        <div className="text-[11px] text-gray-400">
                                                            🎂 {formatDate(card.customer_dob)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-semibold text-gray-800">
                                                        {card.membership_type?.name ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                                                    <div>Từ: {formatDate(card.issued_at)}</div>
                                                    <div className={isExpired ? 'text-red-600 font-bold' : 'text-gray-900 font-medium'}>
                                                        Đến: {formatDate(card.expires_at)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {card.is_email_sent ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                            ✓ Đã gửi
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                                            Chưa gửi
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {isExpired ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                                            Hết hạn
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                            Hoạt động
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                                    <Link
                                                        href={route('admin.membership.cards.show', card.id)}
                                                        className="text-amber-600 hover:text-amber-800 font-medium text-xs"
                                                    >
                                                        Chi tiết
                                                    </Link>
                                                    <a
                                                        href={route('admin.membership.cards.download_qr', card.id)}
                                                        className="text-gray-500 hover:text-gray-700 font-medium text-xs"
                                                    >
                                                        Tải QR
                                                    </a>
                                                    <button
                                                        onClick={() => handleDelete(card.id, card.card_code)}
                                                        className="text-red-500 hover:text-red-700 font-medium text-xs"
                                                    >
                                                        Xoá
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {cards.total > cards.per_page && (
                        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                                Hiển thị <strong>{cards.data.length}</strong> / <strong>{cards.total}</strong> thẻ
                            </span>
                            <div className="flex gap-1">
                                {cards.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 text-xs rounded border ${
                                            link.active
                                                ? 'bg-amber-600 text-white border-amber-600 font-bold'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

