import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

interface BalanceItem {
    id: number;
    date: string;
    user: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    account: {
        id: number;
        code: string;
        letter_code?: string;
        name: string;
    };
    opening_balance: number;
    opened_at: string | null;
    closing_balance: number | null;
    closed_at: string | null;
    total_in: number;
    total_out: number;
    expected_balance: number;
    discrepancy: number | null;
    status: 'open' | 'closed';
    note: string | null;
}

interface StaffMember {
    id: number;
    name: string;
    email: string;
    role: string;
    financial_account_id?: number | null;
    financial_account?: {
        id: number;
        name: string;
        code: string;
        letter_code?: string;
    } | null;
}

interface BankAccount {
    id: number;
    code: string;
    letter_code?: string;
    name: string;
}

interface BalancesIndexProps extends PageProps {
    balances: BalanceItem[];
    stats: {
        total_opening: number;
        total_closing: number;
        open_count: number;
        closed_count: number;
        total_discrepancy: number;
    };
    filters: {
        date: string;
        user_id?: number | string;
        account_id?: number | string;
        status?: string;
    };
    staff_members: StaffMember[];
    accounts: BankAccount[];
}

export default function BalancesIndex({
    auth,
    balances,
    stats,
    filters,
    staff_members,
    accounts,
}: BalancesIndexProps) {
    const isManagerOrAdmin = (auth.user as any).role === 'admin' || (auth.user as any).role === 'manager';

    const [filterDate, setFilterDate] = useState(filters.date || new Date().toISOString().split('T')[0]);
    const [filterUserId, setFilterUserId] = useState(filters.user_id || '');
    const [filterAccountId, setFilterAccountId] = useState(filters.account_id || '');
    const [filterStatus, setFilterStatus] = useState(filters.status || '');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingBalance, setEditingBalance] = useState<BalanceItem | null>(null);

    // Create form
    const createForm = useForm({
        date: filterDate,
        user_id: '' as number | string,
        account_id: '' as number | string,
        opening_balance: 0,
        closing_balance: '' as number | string,
        note: '',
    });

    // Edit form
    const editForm = useForm({
        opening_balance: 0,
        closing_balance: '' as number | string,
        status: 'open' as 'open' | 'closed',
        note: '',
    });

    const formatCurrency = (val: number | null | undefined) => {
        if (val === null || val === undefined) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.cashflow.balances.index'),
            {
                date: filterDate,
                user_id: filterUserId || undefined,
                account_id: filterAccountId || undefined,
                status: filterStatus || undefined,
            },
            { preserveState: true }
        );
    };

    const handleResetFilters = () => {
        const today = new Date().toISOString().split('T')[0];
        setFilterDate(today);
        setFilterUserId('');
        setFilterAccountId('');
        setFilterStatus('');
        router.get(route('admin.cashflow.balances.index'), { date: today }, { preserveState: true });
    };

    const openEditModal = (item: BalanceItem) => {
        setEditingBalance(item);
        editForm.setData({
            opening_balance: item.opening_balance,
            closing_balance: item.closing_balance !== null ? item.closing_balance : '',
            status: item.status,
            note: item.note || '',
        });
        editForm.clearErrors();
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('admin.cashflow.balances.store'), {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBalance) return;
        editForm.put(route('admin.cashflow.balances.update', editingBalance.id), {
            onSuccess: () => {
                setEditingBalance(null);
                editForm.reset();
            },
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <span>⚖️</span>
                            <span>Quản lý Số Dư Tài Khoản</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Kiểm soát số dư đầu ngày và đối soát chốt ca cuối ngày của các nhân viên qua tài khoản ngân hàng
                        </p>
                    </div>
                    {isManagerOrAdmin && (
                        <button
                            type="button"
                            onClick={() => {
                                createForm.reset();
                                createForm.setData('date', filterDate);
                                setIsCreateModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                        >
                            <span>➕</span>
                            <span>Thêm / Khởi tạo ca số dư</span>
                        </button>
                    )}
                </div>
            }
        >
            <Head title="Quản lý Số Dư - Pháp Tạng" />

            <div className="space-y-6">
                {/* KPI Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Tổng Số Dư Đầu Ngày
                            </div>
                            <div className="text-xl font-bold text-slate-800 mt-1">
                                {formatCurrency(stats.total_opening)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                                Ngày {new Date(filterDate).toLocaleDateString('vi-VN')}
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">
                            🌅
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Tổng Số Dư Chốt Cuối Ngày
                            </div>
                            <div className="text-xl font-bold text-emerald-700 mt-1">
                                {formatCurrency(stats.total_closing)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                                Đã chốt {stats.closed_count} tài khoản
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
                            🏁
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Trạng Thái Ca Làm Việc
                            </div>
                            <div className="text-xl font-bold text-slate-800 mt-1">
                                <span className="text-emerald-600">{stats.closed_count} Đã chốt</span>
                                <span className="text-slate-300 mx-1.5">/</span>
                                <span className="text-amber-600">{stats.open_count} Đang mở</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                                Tổng {balances.length} ca trong ngày
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
                            📊
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Tổng Chênh Lệch
                            </div>
                            <div
                                className={`text-xl font-bold mt-1 ${
                                    stats.total_discrepancy === 0
                                        ? 'text-emerald-600'
                                        : stats.total_discrepancy > 0
                                        ? 'text-sky-600'
                                        : 'text-rose-600'
                                }`}
                            >
                                {stats.total_discrepancy > 0 ? '+' : ''}
                                {formatCurrency(stats.total_discrepancy)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                                {stats.total_discrepancy === 0
                                    ? 'Khớp tuyệt đối'
                                    : stats.total_discrepancy > 0
                                    ? 'Thừa tiền so với hệ thống'
                                    : 'Thiếu tiền so với hệ thống'}
                            </div>
                        </div>
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
                                stats.total_discrepancy === 0
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : stats.total_discrepancy > 0
                                    ? 'bg-sky-50 text-sky-600'
                                    : 'bg-rose-50 text-rose-600'
                            }`}
                        >
                            {stats.total_discrepancy === 0 ? '✓' : '⚠️'}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày xem</label>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Nhân viên</label>
                            <select
                                value={filterUserId}
                                onChange={(e) => setFilterUserId(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Tất cả nhân viên</option>
                                {staff_members.map((staff) => (
                                    <option key={staff.id} value={staff.id}>
                                        {staff.name} {staff.financial_account ? `(${staff.financial_account.name})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Tài khoản NH</label>
                            <select
                                value={filterAccountId}
                                onChange={(e) => setFilterAccountId(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Tất cả tài khoản</option>
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.letter_code ? `${acc.letter_code}. ` : ''}{acc.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Trạng thái</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="open">⏳ Đang mở (Chưa chốt)</option>
                                <option value="closed">✅ Đã chốt ca</option>
                            </select>
                        </div>

                        <div className="flex items-end gap-2">
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition"
                            >
                                Lọc
                            </button>
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition"
                            >
                                Đặt lại
                            </button>
                        </div>
                    </form>
                </div>

                {/* Balances Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                                <tr>
                                    <th scope="col" className="px-5 py-3.5 font-semibold">Nhân viên</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold">Tài khoản NH</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold text-right">Số dư đầu ngày</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold text-right">Tiền thu đơn</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold text-right">Số dư dự tính</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold text-right">Số dư thực chốt</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold text-right">Chênh lệch</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold text-center">Trạng thái</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {balances.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                                            Chưa có dữ liệu số dư nào cho ngày đã chọn ({new Date(filterDate).toLocaleDateString('vi-VN')}).
                                        </td>
                                    </tr>
                                ) : (
                                    balances.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                                            {/* Staff info */}
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="font-semibold text-slate-800">{item.user.name}</div>
                                                <div className="text-xs text-slate-400">{item.user.email}</div>
                                            </td>

                                            {/* Bank Account */}
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                                    <span>🏦</span>
                                                    <span>{item.account.name}</span>
                                                    {item.account.letter_code && (
                                                        <span className="font-bold text-amber-600">({item.account.letter_code})</span>
                                                    )}
                                                </span>
                                            </td>

                                            {/* Opening Balance */}
                                            <td className="px-5 py-4 whitespace-nowrap text-right">
                                                <div className="font-bold text-slate-800">
                                                    {formatCurrency(item.opening_balance)}
                                                </div>
                                                {item.opened_at && (
                                                    <div className="text-[11px] text-slate-400">
                                                        {new Date(item.opened_at).toLocaleTimeString('vi-VN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Total In */}
                                            <td className="px-5 py-4 whitespace-nowrap text-right text-emerald-700 font-semibold">
                                                +{formatCurrency(item.total_in)}
                                            </td>

                                            {/* Expected Balance */}
                                            <td className="px-5 py-4 whitespace-nowrap text-right font-medium text-slate-600">
                                                {formatCurrency(item.expected_balance)}
                                            </td>

                                            {/* Closing Balance */}
                                            <td className="px-5 py-4 whitespace-nowrap text-right">
                                                {item.closing_balance !== null ? (
                                                    <div>
                                                        <div className="font-bold text-slate-900">
                                                            {formatCurrency(item.closing_balance)}
                                                        </div>
                                                        {item.closed_at && (
                                                            <div className="text-[11px] text-slate-400">
                                                                {new Date(item.closed_at).toLocaleTimeString('vi-VN', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">Chưa chốt</span>
                                                )}
                                            </td>

                                            {/* Discrepancy */}
                                            <td className="px-5 py-4 whitespace-nowrap text-right">
                                                {item.discrepancy !== null ? (
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                                            item.discrepancy === 0
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : item.discrepancy > 0
                                                                ? 'bg-sky-100 text-sky-800'
                                                                : 'bg-rose-100 text-rose-800'
                                                        }`}
                                                    >
                                                        {item.discrepancy > 0 ? '+' : ''}
                                                        {formatCurrency(item.discrepancy)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-4 whitespace-nowrap text-center">
                                                {item.status === 'closed' ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                        ✅ Đã chốt
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                        ⏳ Đang mở
                                                    </span>
                                                )}
                                            </td>

                                            {/* Action */}
                                            <td className="px-5 py-4 whitespace-nowrap text-right">
                                                {isManagerOrAdmin && (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                router.post(
                                                                    route('admin.cashflow.balances.sync-sheets', item.id),
                                                                    {},
                                                                    { preserveScroll: true }
                                                                )
                                                            }
                                                            title="Đồng bộ số dư này lên Google Sheets"
                                                            className="px-2 py-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition flex items-center gap-1 border border-emerald-200"
                                                        >
                                                            <span>📊</span>
                                                            <span>Sheets</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(item)}
                                                            className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                                                        >
                                                            Sửa
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create Balance Modal */}
            <Modal show={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="md">
                <form onSubmit={handleCreateSubmit} className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">
                        Khởi Tạo Phiên Số Dư Cho Nhân Viên
                    </h3>

                    <div className="mt-4 space-y-4">
                        <div>
                            <InputLabel htmlFor="create_date" value="Ngày *" />
                            <TextInput
                                id="create_date"
                                type="date"
                                className="mt-1 block w-full"
                                value={createForm.data.date}
                                onChange={(e) => createForm.setData('date', e.target.value)}
                                required
                            />
                            <InputError message={createForm.errors.date} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="create_user" value="Nhân viên phụ trách *" />
                            <select
                                id="create_user"
                                value={createForm.data.user_id}
                                onChange={(e) => {
                                    const uid = e.target.value ? Number(e.target.value) : '';
                                    const staff = staff_members.find((s) => s.id === uid);
                                    createForm.setData((data) => ({
                                        ...data,
                                        user_id: uid,
                                        account_id: staff?.financial_account_id ? String(staff.financial_account_id) : data.account_id,
                                    }));
                                }}
                                className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-xs text-sm"
                                required
                            >
                                <option value="">-- Chọn nhân viên --</option>
                                {staff_members.map((staff) => (
                                    <option key={staff.id} value={staff.id}>
                                        {staff.name} ({staff.email}) {staff.financial_account ? `— ${staff.financial_account.name}` : '— (Chưa gán TK)'}
                                    </option>
                                ))}
                            </select>
                            <InputError message={createForm.errors.user_id} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="create_account" value="Tài khoản ngân hàng phụ trách *" />
                            <select
                                id="create_account"
                                value={createForm.data.account_id}
                                onChange={(e) => createForm.setData('account_id', e.target.value)}
                                className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-xs text-sm"
                                required
                            >
                                <option value="">-- Chọn tài khoản ngân hàng --</option>
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        [{acc.letter_code}] {acc.name} ({acc.code})
                                    </option>
                                ))}
                            </select>
                            <InputError message={createForm.errors.account_id} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="create_opening" value="Số dư đầu ngày (VNĐ) *" />
                            <TextInput
                                id="create_opening"
                                type="number"
                                className="mt-1 block w-full font-mono"
                                value={createForm.data.opening_balance}
                                onChange={(e) => createForm.setData('opening_balance', Number(e.target.value))}
                                min="0"
                                required
                            />
                            <InputError message={createForm.errors.opening_balance} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="create_closing" value="Số dư chốt cuối ngày (Nếu có)" />
                            <TextInput
                                id="create_closing"
                                type="number"
                                className="mt-1 block w-full font-mono"
                                value={createForm.data.closing_balance}
                                onChange={(e) => createForm.setData('closing_balance', e.target.value)}
                                placeholder="Để trống nếu ca đang mở"
                                min="0"
                            />
                            <InputError message={createForm.errors.closing_balance} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="create_note" value="Ghi chú" />
                            <textarea
                                id="create_note"
                                value={createForm.data.note}
                                onChange={(e) => createForm.setData('note', e.target.value)}
                                className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-xs text-sm"
                                rows={2}
                                placeholder="Ghi chú thêm nếu có..."
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                        <SecondaryButton type="button" onClick={() => setIsCreateModalOpen(false)}>
                            Hủy
                        </SecondaryButton>
                        <PrimaryButton disabled={createForm.processing}>
                            {createForm.processing ? 'Đang lưu...' : 'Tạo mới'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Edit Balance Modal */}
            <Modal show={!!editingBalance} onClose={() => setEditingBalance(null)} maxWidth="md">
                {editingBalance && (
                    <form onSubmit={handleEditSubmit} className="p-6">
                        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">
                            Điều Chỉnh Số Dư: {editingBalance.user.name} ({editingBalance.account.name})
                        </h3>

                        <div className="mt-4 space-y-4">
                            <div>
                                <InputLabel htmlFor="edit_opening" value="Số dư đầu ngày (VNĐ) *" />
                                <TextInput
                                    id="edit_opening"
                                    type="number"
                                    className="mt-1 block w-full font-mono"
                                    value={editForm.data.opening_balance}
                                    onChange={(e) => editForm.setData('opening_balance', Number(e.target.value))}
                                    min="0"
                                    required
                                />
                                <InputError message={editForm.errors.opening_balance} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="edit_closing" value="Số dư chốt cuối ngày (VNĐ)" />
                                <TextInput
                                    id="edit_closing"
                                    type="number"
                                    className="mt-1 block w-full font-mono"
                                    value={editForm.data.closing_balance}
                                    onChange={(e) => editForm.setData('closing_balance', e.target.value)}
                                    placeholder="Để trống nếu ca đang mở"
                                    min="0"
                                />
                                <InputError message={editForm.errors.closing_balance} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="edit_status" value="Trạng thái ca *" />
                                <select
                                    id="edit_status"
                                    value={editForm.data.status}
                                    onChange={(e) => editForm.setData('status', e.target.value as any)}
                                    className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-xs text-sm"
                                >
                                    <option value="open">⏳ Đang mở (Chưa chốt)</option>
                                    <option value="closed">✅ Đã chốt ca</option>
                                </select>
                                <InputError message={editForm.errors.status} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="edit_note" value="Ghi chú điều chỉnh" />
                                <textarea
                                    id="edit_note"
                                    value={editForm.data.note}
                                    onChange={(e) => editForm.setData('note', e.target.value)}
                                    className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-xs text-sm"
                                    rows={2}
                                    placeholder="Lý do điều chỉnh hoặc giải trình chênh lệch..."
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                            <SecondaryButton type="button" onClick={() => setEditingBalance(null)}>
                                Hủy
                            </SecondaryButton>
                            <PrimaryButton disabled={editForm.processing}>
                                {editForm.processing ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </PrimaryButton>
                        </div>
                    </form>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
