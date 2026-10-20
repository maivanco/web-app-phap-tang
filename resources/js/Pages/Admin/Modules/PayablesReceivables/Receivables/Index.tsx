import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';

interface Branch {
    id: number;
    code: string;
    name: string;
}

interface FinancialAccount {
    id: number;
    code: string;
    letter_code: string;
    name: string;
    type: string;
}

interface OrderItem {
    id: number;
    product_name: string;
    quantity: number;
    brand?: { name: string; code: string };
}

interface Order {
    id: number;
    order_code: string;
    sale_date: string;
    customer_name: string;
    customer_phone: string;
    gross_amount: number;
    discount_amount: number;
    net_revenue: number;
    status: string;
    branch?: Branch;
    consultant?: { id: number; name: string };
    creator?: { id: number; name: string };
    payment?: {
        id: number;
        method: string;
        amount: number;
        status: string;
        account?: FinancialAccount;
    };
    items?: OrderItem[];
}

interface BranchSummaryItem {
    branch_name: string;
    branch_code: string;
    count: number;
    total_amount: number;
}

interface ReceivablesIndexProps extends PageProps {
    orders: {
        data: Order[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
        total: number;
    };
    summary: {
        total_unpaid_amount: number;
        total_unpaid_count: number;
        branch_summary: BranchSummaryItem[];
    };
    filters: {
        search?: string;
        branch_id?: string;
        start_date?: string;
        end_date?: string;
    };
    branches: Branch[];
    financial_accounts: FinancialAccount[];
}

export default function ReceivablesIndex({
    auth,
    orders,
    summary,
    filters,
    branches,
    financial_accounts,
    flash,
}: ReceivablesIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    // Settle Modal state
    const [settlingOrder, setSettlingOrder] = useState<Order | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
    const [paymentAccountId, setPaymentAccountId] = useState<number | ''>(
        financial_accounts.find((a) => a.type === 'bank')?.id || ''
    );
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatCurrency = (val: number | string) => {
        return new Intl.NumberFormat('vi-VN').format(Math.round(Number(val) || 0)) + ' đ';
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.payables-receivables.receivables.index'),
            {
                search,
                branch_id: branchId,
                start_date: startDate,
                end_date: endDate,
            },
            { preserveState: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setBranchId('');
        setStartDate('');
        setEndDate('');
        router.get(route('admin.payables-receivables.receivables.index'));
    };

    const openSettleModal = (order: Order) => {
        setSettlingOrder(order);
        setPaymentMethod('cash');
        setPaymentAccountId(financial_accounts.find((a) => a.type === 'bank')?.id || '');
        setPaymentDate(new Date().toISOString().split('T')[0]);
    };

    const handleConfirmSettle = (e: React.FormEvent) => {
        e.preventDefault();
        if (!settlingOrder) return;

        setIsSubmitting(true);
        router.post(
            route('admin.payables-receivables.receivables.settle', settlingOrder.id),
            {
                payment_method: paymentMethod,
                payment_account_id: paymentMethod === 'bank_transfer' ? paymentAccountId : null,
                payment_date: paymentDate,
            },
            {
                onSuccess: () => {
                    setSettlingOrder(null);
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            }
        );
    };

    const bankAccounts = financial_accounts.filter((a) => a.type === 'bank');

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📥</span>
                            <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                                Công nợ phải thu (Accounts Receivable)
                            </h2>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Tổng hợp và đối soát toàn bộ các đơn hàng chưa thanh toán của khách hàng
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('admin.payables-receivables.payables.index')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-lg shadow-sm transition"
                        >
                            <span>📤</span>
                            <span>Công nợ phải trả</span>
                        </Link>
                        <Link
                            href={route('admin.cashflow.orders.index')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition"
                        >
                            <span>📋</span>
                            <span>Tất cả đơn hàng</span>
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Công nợ phải thu" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Flash Messages */}
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

                {/* Summary Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total Unpaid Amount Card */}
                    <div className="bg-gradient-to-br from-rose-500 to-amber-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute right-3 -bottom-3 text-white/10 text-8xl font-black select-none pointer-events-none">
                            ₫
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-wider text-rose-100 font-semibold">
                                    Tổng công nợ phải thu
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-sm">
                                    {summary.total_unpaid_count} đơn chưa thu
                                </span>
                            </div>
                            <div className="text-3xl font-extrabold tracking-tight mt-2">
                                {formatCurrency(summary.total_unpaid_amount)}
                            </div>
                            <p className="text-xs text-rose-100/90 mt-2">
                                Số tiền khách hàng chưa thanh toán cần thu hồi
                            </p>
                        </div>
                    </div>

                    {/* Total Count Metric */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                <span>Đơn hàng chờ thu tiền</span>
                                <span className="text-lg">⏳</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mt-2">
                                {summary.total_unpaid_count}{' '}
                                <span className="text-sm font-normal text-gray-500">đơn</span>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span>Chiếm tỷ trọng công nợ</span>
                            <span className="font-semibold text-amber-600">
                                {summary.total_unpaid_count > 0 ? 'Cần xử lý' : 'Đã tất toán'}
                            </span>
                        </div>
                    </div>

                    {/* Branch Breakdown */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Phân bổ theo Chi nhánh</span>
                            <span className="text-lg">🏢</span>
                        </div>
                        <div className="space-y-2 overflow-y-auto max-h-24 pr-1 text-xs">
                            {summary.branch_summary && summary.branch_summary.length > 0 ? (
                                summary.branch_summary.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0"
                                    >
                                        <span className="font-medium text-gray-700">
                                            {item.branch_name} ({item.count})
                                        </span>
                                        <span className="font-semibold text-rose-600">
                                            {formatCurrency(item.total_amount)}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-center py-2">Không có công nợ theo chi nhánh</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <form
                    onSubmit={handleSearch}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs"
                >
                    <div className="lg:col-span-2">
                        <input
                            type="text"
                            placeholder="🔍 Tìm mã đơn, khách hàng, SĐT..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <select
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                            className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">Tất cả chi nhánh</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.code} - {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="Từ ngày bán"
                            className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            placeholder="Đến ngày bán"
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

                {/* Orders Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[11px] font-semibold border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3">Mã đơn hàng</th>
                                    <th className="px-4 py-3">Ngày bán</th>
                                    <th className="px-4 py-3">Chi nhánh</th>
                                    <th className="px-4 py-3">Khách hàng</th>
                                    <th className="px-4 py-3">Tư vấn viên</th>
                                    <th className="px-4 py-3">Sản phẩm</th>
                                    <th className="px-4 py-3 text-right">Số tiền phải thu</th>
                                    <th className="px-4 py-3 text-center">Trạng thái</th>
                                    <th className="px-4 py-3 text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                {orders.data.map((order) => (
                                    <tr key={order.id} className="hover:bg-amber-50/40 transition">
                                        <td className="px-4 py-3 font-semibold text-indigo-600">
                                            <Link
                                                href={route('admin.cashflow.orders.show', order.id)}
                                                className="hover:underline flex items-center gap-1"
                                            >
                                                <span>{order.order_code}</span>
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {order.sale_date ? new Date(order.sale_date).toLocaleDateString('vi-VN') : '-'}
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            {order.branch?.name || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-gray-900">{order.customer_name}</div>
                                            <div className="text-[11px] text-gray-500">{order.customer_phone}</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {order.consultant?.name || '-'}
                                        </td>
                                        <td className="px-4 py-3 max-w-[220px] truncate" title={order.items?.map((i) => `${i.product_name} (x${i.quantity})`).join(', ')}>
                                            {order.items && order.items.length > 0 ? (
                                                <span>
                                                    {order.items[0].product_name}
                                                    {order.items.length > 1 && (
                                                        <span className="text-gray-400 font-normal">
                                                            {' '}+{order.items.length - 1} khác
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-rose-600">
                                            {formatCurrency(order.net_revenue)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                                                ⏳ Chưa thanh toán
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center space-x-1.5">
                                            <button
                                                type="button"
                                                onClick={() => openSettleModal(order)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-medium shadow-sm transition"
                                            >
                                                <span>💵</span>
                                                <span>Thu tiền</span>
                                            </button>
                                            <Link
                                                href={route('admin.cashflow.orders.show', order.id)}
                                                className="inline-flex items-center px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-[11px] font-medium transition"
                                            >
                                                Chi tiết
                                            </Link>
                                        </td>
                                    </tr>
                                ))}

                                {orders.data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-4xl mb-2">🎉</span>
                                                <p className="text-sm font-medium text-gray-600">
                                                    Không có khoản công nợ phải thu nào!
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Tất cả các đơn hàng đều đã hoàn tất thanh toán hoặc không khớp bộ lọc.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {orders.last_page > 1 && (
                        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
                            <span className="text-gray-500">
                                Hiển thị trang {orders.current_page} / {orders.last_page} ({orders.total} đơn)
                            </span>
                            <div className="flex gap-1 flex-wrap">
                                {orders.links.map((link, idx) => (
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

            {/* Settle / Collect Payment Modal */}
            <Modal show={!!settlingOrder} onClose={() => !isSubmitting && setSettlingOrder(null)}>
                {settlingOrder && (
                    <form onSubmit={handleConfirmSettle} className="p-6 text-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <span>💵</span>
                                <span>Thu tiền đơn hàng {settlingOrder.order_code}</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSettlingOrder(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Khách hàng:</span>
                                <span className="font-semibold text-gray-900">{settlingOrder.customer_name} ({settlingOrder.customer_phone})</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Chi nhánh:</span>
                                <span className="font-semibold text-gray-900">{settlingOrder.branch?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-1 border-t border-amber-200">
                                <span className="font-bold text-gray-800">Số tiền cần thu:</span>
                                <span className="font-extrabold text-rose-600">
                                    {formatCurrency(settlingOrder.net_revenue)}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Hình thức thu tiền <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label
                                        className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition ${
                                            paymentMethod === 'cash'
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                                                : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="payment_method"
                                            value="cash"
                                            checked={paymentMethod === 'cash'}
                                            onChange={() => setPaymentMethod('cash')}
                                            className="text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>💵 Tiền mặt</span>
                                    </label>
                                    <label
                                        className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition ${
                                            paymentMethod === 'bank_transfer'
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-semibold'
                                                : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="payment_method"
                                            value="bank_transfer"
                                            checked={paymentMethod === 'bank_transfer'}
                                            onChange={() => setPaymentMethod('bank_transfer')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span>🏦 Chuyển khoản</span>
                                    </label>
                                </div>
                            </div>

                            {paymentMethod === 'bank_transfer' && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Tài khoản ngân hàng nhận tiền <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={paymentAccountId}
                                        onChange={(e) => setPaymentAccountId(Number(e.target.value))}
                                        required
                                        className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    >
                                        <option value="">-- Chọn tài khoản ngân hàng --</option>
                                        {bankAccounts.map((acc) => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.letter_code} - {acc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Ngày thu tiền <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    required
                                    className="w-full rounded-lg border-gray-300 text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setSettlingOrder(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-sm transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đã thu tiền'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
