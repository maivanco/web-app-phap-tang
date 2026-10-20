import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';

interface FinancialAccount {
    id: number;
    code: string;
    letter_code: string;
    name: string;
    type: string;
}

interface AccountPayable {
    id: number;
    supplier_name: string;
    description: string;
    amount: number;
    due_date: string | null;
    status: 'unpaid' | 'paid';
    paid_at: string | null;
    paid_notes: string | null;
    paid_account_id: number | null;
    paid_account?: FinancialAccount | null;
    created_by: number | null;
    creator?: { id: number; name: string } | null;
    created_at: string;
}

interface PayablesIndexProps extends PageProps {
    payables: {
        data: AccountPayable[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
        total: number;
    };
    summary: {
        total_amount: number;
        unpaid_amount: number;
        paid_amount: number;
        unpaid_count: number;
        paid_count: number;
    };
    filters: {
        search?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
    };
    financial_accounts: FinancialAccount[];
}

export default function PayablesIndex({
    auth,
    payables,
    summary,
    filters,
    financial_accounts,
    flash,
}: PayablesIndexProps) {
    const isManagerOrAdmin = (auth.user as any)?.role === 'admin' || (auth.user as any)?.role === 'manager';

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPayable, setEditingPayable] = useState<AccountPayable | null>(null);
    const [markingPaidPayable, setMarkingPaidPayable] = useState<AccountPayable | null>(null);
    const [deletingPayable, setDeletingPayable] = useState<AccountPayable | null>(null);

    // Create Form state
    const [formData, setFormData] = useState({
        supplier_name: '',
        description: '',
        amount: '',
        due_date: '',
        status: 'unpaid' as 'unpaid' | 'paid',
        paid_account_id: '' as number | '',
        paid_at: '',
        paid_notes: '',
    });

    // Mark Paid Form state
    const [markPaidData, setMarkPaidData] = useState({
        paid_account_id: '' as number | '',
        paid_at: new Date().toISOString().split('T')[0],
        paid_notes: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatCurrency = (val: number | string) => {
        return new Intl.NumberFormat('vi-VN').format(Math.round(Number(val) || 0)) + ' đ';
    };

    const isOverdue = (payable: AccountPayable) => {
        if (payable.status === 'paid' || !payable.due_date) return false;
        const today = new Date().toISOString().split('T')[0];
        return payable.due_date < today;
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.payables-receivables.payables.index'),
            {
                search,
                status,
                start_date: startDate,
                end_date: endDate,
            },
            { preserveState: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setStatus('');
        setStartDate('');
        setEndDate('');
        router.get(route('admin.payables-receivables.payables.index'));
    };

    const openCreateModal = () => {
        setFormData({
            supplier_name: '',
            description: '',
            amount: '',
            due_date: '',
            status: 'unpaid',
            paid_account_id: '',
            paid_at: '',
            paid_notes: '',
        });
        setIsCreateOpen(true);
    };

    const openEditModal = (payable: AccountPayable) => {
        setEditingPayable(payable);
        setFormData({
            supplier_name: payable.supplier_name,
            description: payable.description,
            amount: String(payable.amount),
            due_date: payable.due_date ? payable.due_date.split('T')[0] : '',
            status: payable.status,
            paid_account_id: payable.paid_account_id || '',
            paid_at: payable.paid_at ? payable.paid_at.split('T')[0] : '',
            paid_notes: payable.paid_notes || '',
        });
    };

    const openMarkPaidModal = (payable: AccountPayable) => {
        setMarkingPaidPayable(payable);
        setMarkPaidData({
            paid_account_id: financial_accounts[0]?.id || '',
            paid_at: new Date().toISOString().split('T')[0],
            paid_notes: '',
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        router.post(
            route('admin.payables-receivables.payables.store'),
            {
                ...formData,
                amount: Number(formData.amount),
                paid_account_id: formData.paid_account_id || null,
            },
            {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            }
        );
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPayable) return;

        setIsSubmitting(true);
        router.put(
            route('admin.payables-receivables.payables.update', editingPayable.id),
            {
                ...formData,
                amount: Number(formData.amount),
                paid_account_id: formData.paid_account_id || null,
            },
            {
                onSuccess: () => {
                    setEditingPayable(null);
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            }
        );
    };

    const handleMarkPaidSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!markingPaidPayable) return;

        setIsSubmitting(true);
        router.post(
            route('admin.payables-receivables.payables.mark-paid', markingPaidPayable.id),
            {
                paid_account_id: markPaidData.paid_account_id || null,
                paid_at: markPaidData.paid_at,
                paid_notes: markPaidData.paid_notes,
            },
            {
                onSuccess: () => {
                    setMarkingPaidPayable(null);
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            }
        );
    };

    const handleDeleteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!deletingPayable) return;

        setIsSubmitting(true);
        router.delete(route('admin.payables-receivables.payables.destroy', deletingPayable.id), {
            onSuccess: () => {
                setDeletingPayable(null);
                setIsSubmitting(false);
            },
            onError: () => setIsSubmitting(false),
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📤</span>
                            <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                                Công nợ phải trả (Accounts Payable)
                            </h2>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Ghi chép và theo dõi các khoản nợ cần thanh toán cho nhà cung cấp, đối tác trong tương lai
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('admin.payables-receivables.receivables.index')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-lg shadow-sm transition"
                        >
                            <span>📥</span>
                            <span>Công nợ phải thu</span>
                        </Link>
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition"
                        >
                            <span>➕</span>
                            <span>Ghi nợ mới</span>
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Công nợ phải trả" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Flash Notifications */}
                {flash?.success && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 shadow-sm animate-fade-in">
                        <span>✅</span>
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2 shadow-sm animate-fade-in">
                        <span>❌</span>
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Metrics Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Remaining Unpaid Debt */}
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute right-3 -bottom-3 text-white/10 text-8xl font-black select-none pointer-events-none">
                            ₫
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-wider text-amber-100 font-semibold">
                                    Còn phải trả (Chưa thanh toán)
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-sm">
                                    {summary.unpaid_count} khoản nợ
                                </span>
                            </div>
                            <div className="text-3xl font-extrabold tracking-tight mt-2">
                                {formatCurrency(summary.unpaid_amount)}
                            </div>
                            <p className="text-xs text-amber-100/90 mt-2">
                                Tổng số tiền công nợ đang chờ thanh toán
                            </p>
                        </div>
                    </div>

                    {/* Total Settled / Paid */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                <span>Đã thanh toán</span>
                                <span className="text-lg">✅</span>
                            </div>
                            <div className="text-3xl font-bold text-emerald-600 mt-2">
                                {formatCurrency(summary.paid_amount)}
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span>Đã hoàn tất</span>
                            <span className="font-semibold text-emerald-700">
                                {summary.paid_count} khoản
                            </span>
                        </div>
                    </div>

                    {/* Total All Payables */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                <span>Tổng công nợ phát sinh</span>
                                <span className="text-lg">📊</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mt-2">
                                {formatCurrency(summary.total_amount)}
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span>Tổng số bản ghi</span>
                            <span className="font-semibold text-gray-700">
                                {summary.unpaid_count + summary.paid_count} bản ghi
                            </span>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <form
                    onSubmit={handleSearch}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs"
                >
                    <div className="lg:col-span-2">
                        <input
                            type="text"
                            placeholder="🔍 Tìm theo nhà cung cấp, nội dung nợ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="unpaid">Chưa thanh toán</option>
                            <option value="paid">Đã thanh toán</option>
                        </select>
                    </div>

                    <div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="Hạn từ ngày"
                            className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            placeholder="Hạn đến ngày"
                            className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 rounded-lg shadow-sm transition text-xs"
                        >
                            Lọc
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 px-3 rounded-lg text-xs font-medium transition"
                        >
                            Xóa
                        </button>
                    </div>
                </form>

                {/* Payables Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[11px] font-semibold border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Nhà cung cấp / Đối tác</th>
                                    <th className="px-4 py-3">Mô tả nội dung</th>
                                    <th className="px-4 py-3 text-right">Số tiền nợ</th>
                                    <th className="px-4 py-3">Hạn thanh toán</th>
                                    <th className="px-4 py-3 text-center">Trạng thái</th>
                                    <th className="px-4 py-3">Chi tiết thanh toán</th>
                                    <th className="px-4 py-3">Người tạo</th>
                                    <th className="px-4 py-3 text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                {payables.data.map((item) => {
                                    const overdue = isOverdue(item);
                                    return (
                                        <tr
                                            key={item.id}
                                            className={`transition ${
                                                overdue ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <td className="px-4 py-3 font-mono text-gray-500 font-semibold">
                                                #{item.id}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-gray-900">
                                                {item.supplier_name}
                                            </td>
                                            <td className="px-4 py-3 max-w-[280px] truncate" title={item.description}>
                                                {item.description}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-amber-600">
                                                {formatCurrency(item.amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.due_date ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span>
                                                            {new Date(item.due_date).toLocaleDateString('vi-VN')}
                                                        </span>
                                                        {overdue && (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                                                Quá hạn
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">Không có hạn</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {item.status === 'paid' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                                        ✅ Đã thanh toán
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                                                        ⏳ Chưa thanh toán
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {item.status === 'paid' ? (
                                                    <div>
                                                        <div className="font-medium text-gray-700">
                                                            {item.paid_at
                                                                ? new Date(item.paid_at).toLocaleDateString('vi-VN')
                                                                : 'Đã trả'}
                                                            {item.paid_account && ` (${item.paid_account.letter_code || item.paid_account.name})`}
                                                        </div>
                                                        {item.paid_notes && (
                                                            <div className="text-[11px] text-gray-400 italic truncate max-w-[150px]">
                                                                {item.paid_notes}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                <div>{item.creator?.name || 'Hệ thống'}</div>
                                                <div className="text-[10px] text-gray-400">
                                                    {new Date(item.created_at).toLocaleDateString('vi-VN')}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center space-x-1.5">
                                                {item.status === 'unpaid' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openMarkPaidModal(item)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-medium shadow-sm transition"
                                                    >
                                                        <span>💳</span>
                                                        <span>Thanh toán</span>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(item)}
                                                    className="inline-flex items-center px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-[11px] font-medium transition"
                                                >
                                                    Sửa
                                                </button>
                                                {isManagerOrAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeletingPayable(item)}
                                                        className="inline-flex items-center px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[11px] font-medium transition"
                                                    >
                                                        Xóa
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {payables.data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-4xl mb-2">📋</span>
                                                <p className="text-sm font-medium text-gray-600">
                                                    Chưa có bản ghi công nợ phải trả nào!
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Bấm "Ghi nợ mới" để ghi nhận các khoản nợ cần thanh toán.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {payables.last_page > 1 && (
                        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
                            <span className="text-gray-500">
                                Hiển thị trang {payables.current_page} / {payables.last_page} ({payables.total} bản ghi)
                            </span>
                            <div className="flex gap-1 flex-wrap">
                                {payables.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-2.5 py-1 rounded border text-xs ${
                                            link.active
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                                        } ${!link.url ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Payable Modal */}
            <Modal show={isCreateOpen} onClose={() => !isSubmitting && setIsCreateOpen(false)}>
                <form onSubmit={handleCreateSubmit} className="p-6 text-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <span>➕</span>
                            <span>Ghi nhận công nợ phải trả mới</span>
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(false)}
                            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                        >
                            &times;
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Nhà cung cấp / Đối tác / Người nhận tiền <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="VD: Công ty TNHH Bao Bì Ánh Dương, Nhà xe, ..."
                                value={formData.supplier_name}
                                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                                className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Nội dung / Mô tả công nợ <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                required
                                rows={2}
                                placeholder="VD: Tiền in ấn hộp quà tặng đợt 1, Nợ tiền nhập hàng..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Số tiền nợ (VNĐ) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    required
                                    placeholder="VD: 5000000"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Hạn thanh toán
                                </label>
                                <input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Trạng thái ban đầu
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <label
                                    className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition ${
                                        formData.status === 'unpaid'
                                            ? 'border-amber-500 bg-amber-50 text-amber-900 font-semibold'
                                            : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="status"
                                        value="unpaid"
                                        checked={formData.status === 'unpaid'}
                                        onChange={() => setFormData({ ...formData, status: 'unpaid' })}
                                        className="text-amber-600 focus:ring-amber-500"
                                    />
                                    <span>⏳ Chưa thanh toán</span>
                                </label>
                                <label
                                    className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition ${
                                        formData.status === 'paid'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                                            : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="status"
                                        value="paid"
                                        checked={formData.status === 'paid'}
                                        onChange={() => setFormData({ ...formData, status: 'paid' })}
                                        className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>✅ Đã thanh toán</span>
                                </label>
                            </div>
                        </div>

                        {formData.status === 'paid' && (
                            <div className="p-3 bg-gray-50 rounded-xl space-y-3 border border-gray-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Ngày thanh toán
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.paid_at || new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setFormData({ ...formData, paid_at: e.target.value })}
                                            className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Tài khoản chi trả
                                        </label>
                                        <select
                                            value={formData.paid_account_id}
                                            onChange={(e) => setFormData({ ...formData, paid_account_id: Number(e.target.value) || '' })}
                                            className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        >
                                            <option value="">-- Chọn tài khoản chi --</option>
                                            {financial_accounts.map((acc) => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.type === 'cash' ? '💵' : '🏦'} {acc.letter_code || acc.code} - {acc.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Ghi chú thanh toán
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="VD: Chuyển khoản số UNC 123..."
                                        value={formData.paid_notes}
                                        onChange={(e) => setFormData({ ...formData, paid_notes: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => setIsCreateOpen(false)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm transition disabled:opacity-50"
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu công nợ'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Payable Modal */}
            <Modal show={!!editingPayable} onClose={() => !isSubmitting && setEditingPayable(null)}>
                {editingPayable && (
                    <form onSubmit={handleEditSubmit} className="p-6 text-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <span>✏️</span>
                                <span>Chỉnh sửa công nợ #{editingPayable.id}</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingPayable(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Nhà cung cấp / Đối tác / Người nhận tiền <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.supplier_name}
                                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Nội dung / Mô tả công nợ <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={2}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Số tiền nợ (VNĐ) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="any"
                                        required
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-semibold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Hạn thanh toán
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Trạng thái
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label
                                        className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition ${
                                            formData.status === 'unpaid'
                                                ? 'border-amber-500 bg-amber-50 text-amber-900 font-semibold'
                                                : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="edit_status"
                                            value="unpaid"
                                            checked={formData.status === 'unpaid'}
                                            onChange={() => setFormData({ ...formData, status: 'unpaid' })}
                                            className="text-amber-600 focus:ring-amber-500"
                                        />
                                        <span>⏳ Chưa thanh toán</span>
                                    </label>
                                    <label
                                        className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition ${
                                            formData.status === 'paid'
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                                                : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="edit_status"
                                            value="paid"
                                            checked={formData.status === 'paid'}
                                            onChange={() => setFormData({ ...formData, status: 'paid' })}
                                            className="text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>✅ Đã thanh toán</span>
                                    </label>
                                </div>
                            </div>

                            {formData.status === 'paid' && (
                                <div className="p-3 bg-gray-50 rounded-xl space-y-3 border border-gray-200">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                Ngày thanh toán
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.paid_at || new Date().toISOString().split('T')[0]}
                                                onChange={(e) => setFormData({ ...formData, paid_at: e.target.value })}
                                                className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                Tài khoản chi trả
                                            </label>
                                            <select
                                                value={formData.paid_account_id}
                                                onChange={(e) => setFormData({ ...formData, paid_account_id: Number(e.target.value) || '' })}
                                                className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            >
                                                <option value="">-- Chọn tài khoản chi --</option>
                                                {financial_accounts.map((acc) => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.type === 'cash' ? '💵' : '🏦'} {acc.letter_code || acc.code} - {acc.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Ghi chú thanh toán
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.paid_notes}
                                            onChange={(e) => setFormData({ ...formData, paid_notes: e.target.value })}
                                            className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setEditingPayable(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật thay đổi'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Quick Mark Paid Modal */}
            <Modal show={!!markingPaidPayable} onClose={() => !isSubmitting && setMarkingPaidPayable(null)}>
                {markingPaidPayable && (
                    <form onSubmit={handleMarkPaidSubmit} className="p-6 text-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <span>💳</span>
                                <span>Xác nhận thanh toán công nợ #{markingPaidPayable.id}</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setMarkingPaidPayable(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Nhà cung cấp:</span>
                                <span className="font-semibold text-gray-900">{markingPaidPayable.supplier_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Nội dung:</span>
                                <span className="text-gray-800">{markingPaidPayable.description}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-1 border-t border-amber-200">
                                <span className="font-bold text-gray-800">Số tiền cần trả:</span>
                                <span className="font-extrabold text-amber-600">
                                    {formatCurrency(markingPaidPayable.amount)}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Ngày chi trả tiền <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={markPaidData.paid_at}
                                    onChange={(e) => setMarkPaidData({ ...markPaidData, paid_at: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Tài khoản thực hiện chi tiền
                                </label>
                                <select
                                    value={markPaidData.paid_account_id}
                                    onChange={(e) => setMarkPaidData({ ...markPaidData, paid_account_id: Number(e.target.value) || '' })}
                                    className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="">-- Chọn tài khoản chi --</option>
                                    {financial_accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.type === 'cash' ? '💵' : '🏦'} {acc.letter_code || acc.code} - {acc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Ghi chú thanh toán
                                </label>
                                <input
                                    type="text"
                                    placeholder="VD: Đã chuyển khoản qua App MBBank..."
                                    value={markPaidData.paid_notes}
                                    onChange={(e) => setMarkPaidData({ ...markPaidData, paid_notes: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setMarkingPaidPayable(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-sm transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đã thanh toán'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={!!deletingPayable} onClose={() => !isSubmitting && setDeletingPayable(null)}>
                {deletingPayable && (
                    <form onSubmit={handleDeleteSubmit} className="p-6 text-sm">
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-2">
                            <span>⚠️</span>
                            <span>Xác nhận xóa công nợ #{deletingPayable.id}</span>
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Bạn có chắc chắn muốn xóa bản ghi nợ của nhà cung cấp{' '}
                            <strong className="text-gray-900">"{deletingPayable.supplier_name}"</strong> số tiền{' '}
                            <strong className="text-rose-600">{formatCurrency(deletingPayable.amount)}</strong>?
                        </p>

                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setDeletingPayable(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium shadow-sm transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Đang xóa...' : 'Xác nhận xóa'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
