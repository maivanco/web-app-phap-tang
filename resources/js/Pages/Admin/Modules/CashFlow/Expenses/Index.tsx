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

interface Expense {
    id: number;
    expense_code: string;
    expense_date: string;
    branch?: { name: string; code: string };
    spender_name: string;
    content: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    method: string;
    account?: { name: string };
    note?: string | null;
    status: string;
    version: number;
    creator?: { name: string };
}

interface ExpensesIndexProps extends PageProps {
    expenses: {
        data: Expense[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        search?: string;
        branch_id?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
    };
    branches: Branch[];
}

export default function ExpensesIndex({ auth, expenses, filters, branches }: ExpensesIndexProps) {
    const isManager = (auth.user as any).role === 'manager' || (auth.user as any).role === 'admin';

    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [status, setStatus] = useState(filters.status || '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const [cancellingExpense, setCancellingExpense] = useState<Expense | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.cashflow.expenses.index'),
            {
                search: search || undefined,
                branch_id: branchId || undefined,
                status: status || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            },
            { preserveState: true }
        );
    };

    const handleConfirmCancel = () => {
        if (!cancellingExpense || !cancelReason.trim()) return;
        setIsCancelling(true);
        router.post(
            route('admin.cashflow.expenses.cancel', cancellingExpense.id),
            { reason: cancelReason },
            {
                onSuccess: () => {
                    setCancellingExpense(null);
                    setCancelReason('');
                    setIsCancelling(false);
                },
                onError: () => setIsCancelling(false),
            }
        );
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                            📑 Sổ Quản Lý Chi Tiêu
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Theo dõi và kiểm soát các chi phí vận hành theo chi nhánh và tài khoản
                        </p>
                    </div>
                    <Link
                        href={route('admin.cashflow.expenses.create')}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                    >
                        <span>➕</span> Nhập chi mới
                    </Link>
                </div>
            }
        >
            <Head title="Sổ chi tiêu - Pháp Tạng" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
                {/* Search & Filters */}
                <form
                    onSubmit={handleSearch}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs"
                >
                    <div className="lg:col-span-2">
                        <input
                            type="text"
                            placeholder="🔍 Tìm mã chi, người chi, nội dung..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border-gray-300 text-xs px-3 py-2 shadow-sm"
                        />
                    </div>

                    <div>
                        <select
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                            className="w-full rounded-md border-gray-300 text-xs px-2.5 py-2 shadow-sm"
                        >
                            <option value="">Tất cả chi nhánh</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.code}. {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full rounded-md border-gray-300 text-xs px-2.5 py-2 shadow-sm"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="completed">Đã hoàn tất</option>
                            <option value="cancelled">Đã hủy</option>
                        </select>
                    </div>

                    <div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full rounded-md border-gray-300 text-xs px-2.5 py-2 shadow-sm"
                        />
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full rounded-md border-gray-300 text-xs px-2.5 py-2 shadow-sm"
                        />
                        <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md font-medium transition"
                        >
                            Lọc
                        </button>
                    </div>
                </form>

                {/* Expenses Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                                <tr>
                                    <th className="px-4 py-3 text-left">Mã Chi / Ngày</th>
                                    <th className="px-4 py-3 text-left">Chi Nhánh</th>
                                    <th className="px-4 py-3 text-left">Người Chi</th>
                                    <th className="px-4 py-3 text-left">Nội Dung</th>
                                    <th className="px-4 py-3 text-center">SL</th>
                                    <th className="px-4 py-3 text-right">Đơn Giá</th>
                                    <th className="px-4 py-3 text-right">Tổng Chi</th>
                                    <th className="px-4 py-3 text-left">Nguồn Tiền</th>
                                    <th className="px-4 py-3 text-center">Trạng Thái</th>
                                    <th className="px-4 py-3 text-right">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {expenses.data.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-gray-50/60">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-900">{expense.expense_code}</div>
                                            <div className="text-[11px] text-gray-400">
                                                {new Date(expense.expense_date).toLocaleDateString('vi-VN')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {expense.branch?.code}. {expense.branch?.name}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {expense.spender_name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                                            {expense.content}
                                            {expense.note && (
                                                <span className="block text-[10px] text-gray-400 italic">
                                                    {expense.note}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium">{expense.quantity}</td>
                                        <td className="px-4 py-3 text-right text-gray-600">
                                            {formatCurrency(expense.unit_price)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-rose-600">
                                            {formatCurrency(expense.total_amount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {expense.method === 'cash' ? (
                                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-medium">
                                                    💵 Quỹ chi nhánh
                                                </span>
                                            ) : (
                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-medium">
                                                    🏦 {expense.account?.name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {expense.status === 'completed' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-800">
                                                    Hoàn tất
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-800">
                                                    Đã hủy
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            {isManager && expense.status === 'completed' && (
                                                <button
                                                    onClick={() => setCancellingExpense(expense)}
                                                    className="text-red-600 hover:text-red-900 font-medium px-2 py-1"
                                                >
                                                    Hủy
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {expenses.data.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">
                                            Chưa có khoản chi tiêu nào phù hợp.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {expenses.last_page > 1 && (
                        <div className="p-4 border-t border-gray-100 flex justify-between items-center text-xs">
                            <span className="text-gray-500">
                                Hiển thị trang {expenses.current_page} / {expenses.last_page} ({expenses.total} khoản chi)
                            </span>
                            <div className="flex gap-1">
                                {expenses.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-2.5 py-1 rounded border text-xs ${
                                            link.active
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                                        } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Cancel Expense Modal */}
            <Modal show={!!cancellingExpense} onClose={() => setCancellingExpense(null)}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        ⚠️ Xác nhận hủy khoản chi {cancellingExpense?.expense_code}
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Chỉ Quản lý mới có quyền hủy giao dịch. Giao dịch sẽ được lưu vết kèm lý do hủy bỏ.
                    </p>

                    <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Lý do hủy bỏ khoản chi <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Nhập lý do chi tiết..."
                            rows={3}
                            className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setCancellingExpense(null)}
                            className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                            Quay lại
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmCancel}
                            disabled={!cancelReason.trim() || isCancelling}
                            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50"
                        >
                            {isCancelling ? 'Đang xử lý...' : 'Xác nhận hủy khoản chi'}
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
