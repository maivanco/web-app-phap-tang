import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';

interface BranchItem {
    id: number;
    code: string;
    name: string;
}

interface InitialBalanceItem {
    id: number;
    effective_date: string;
    initial_amount: number;
    note: string | null;
}

interface FinancialAccountItem {
    id: number;
    code: string;
    letter_code: string | null;
    name: string;
    type: 'cash' | 'bank' | 'card_gateway';
    branch_id: number | null;
    status: 'active' | 'inactive';
    created_at: string;
    branch?: BranchItem | null;
    latest_initial_balance?: InitialBalanceItem | null;
    total_transactions: number;
    payments_count: number;
    expenses_count: number;
    transfers_in_count: number;
    transfers_out_count: number;
    users_count: number;
    daily_balances_count: number;
}

interface FinancialAccountsIndexProps extends PageProps {
    accounts: {
        data: FinancialAccountItem[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
        total: number;
    };
    branches: BranchItem[];
    stats: {
        total: number;
        cash: number;
        bank: number;
        card_gateway: number;
        active: number;
    };
    filters: {
        search?: string;
        type?: string;
        status?: string;
        branch_id?: string;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function FinancialAccountsIndex({
    auth,
    accounts,
    branches,
    stats,
    filters,
    flash,
}: FinancialAccountsIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [branchFilter, setBranchFilter] = useState(filters.branch_id || '');

    // Form Modal state (Create / Edit)
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<FinancialAccountItem | null>(null);

    // Delete Modal state
    const [deletingAccount, setDeletingAccount] = useState<FinancialAccountItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form data
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        code: '',
        letter_code: '',
        name: '',
        type: 'cash' as 'cash' | 'bank' | 'card_gateway',
        branch_id: '' as string | number,
        status: 'active' as 'active' | 'inactive',
        initial_amount: '' as string | number,
        initial_date: new Date().getFullYear() + '-01-01',
        initial_note: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.cashflow.financial-accounts.index'),
            {
                search: search || undefined,
                type: typeFilter || undefined,
                status: statusFilter || undefined,
                branch_id: branchFilter || undefined,
            },
            { preserveState: true }
        );
    };

    const handleResetFilters = () => {
        setSearch('');
        setTypeFilter('');
        setStatusFilter('');
        setBranchFilter('');
        router.get(route('admin.cashflow.financial-accounts.index'), {}, { preserveState: true });
    };

    const openCreateModal = () => {
        setEditingAccount(null);
        clearErrors();
        reset();
        setData({
            code: '',
            letter_code: '',
            name: '',
            type: 'cash',
            branch_id: branches.length > 0 ? branches[0].id : '',
            status: 'active',
            initial_amount: '0',
            initial_date: new Date().getFullYear() + '-01-01',
            initial_note: '',
        });
        setIsFormModalOpen(true);
    };

    const openEditModal = (account: FinancialAccountItem) => {
        setEditingAccount(account);
        clearErrors();
        setData({
            code: account.code,
            letter_code: account.letter_code || '',
            name: account.name,
            type: account.type,
            branch_id: account.branch_id || '',
            status: account.status,
            initial_amount: account.latest_initial_balance
                ? String(account.latest_initial_balance.initial_amount)
                : '0',
            initial_date: account.latest_initial_balance
                ? account.latest_initial_balance.effective_date
                : new Date().getFullYear() + '-01-01',
            initial_note: account.latest_initial_balance?.note || '',
        });
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingAccount) {
            put(route('admin.cashflow.financial-accounts.update', editingAccount.id), {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    reset();
                },
            });
        } else {
            post(route('admin.cashflow.financial-accounts.store'), {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleConfirmDelete = () => {
        if (!deletingAccount) return;
        setIsDeleting(true);
        router.delete(route('admin.cashflow.financial-accounts.destroy', deletingAccount.id), {
            onSuccess: () => {
                setDeletingAccount(null);
                setIsDeleting(false);
            },
            onError: () => setIsDeleting(false),
        });
    };

    const formatCurrency = (val: number | string | undefined | null) => {
        if (val === undefined || val === null || val === '') return '0 đ';
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) return '0 đ';
        return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' đ';
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'cash':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        <span>💵</span> Tiền mặt (Quỹ)
                    </span>
                );
            case 'bank':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                        <span>🏦</span> Tài khoản Ngân hàng
                    </span>
                );
            case 'card_gateway':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200">
                        <span>💳</span> Cổng quẹt thẻ POS
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                        {type}
                    </span>
                );
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'active') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Hoạt động
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                Ngưng hoạt động
            </span>
        );
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="font-bold text-2xl text-slate-800 leading-tight flex items-center gap-2">
                            💰 Quản Lý Quỹ Tiền & Tài Khoản
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Quản lý các tài khoản ngân hàng, quỹ tiền mặt chi nhánh và cổng thanh toán thẻ.
                        </p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition duration-150 ease-in-out cursor-pointer"
                    >
                        <span>➕</span>
                        <span>Thêm Quỹ / Tài Khoản</span>
                    </button>
                </div>
            }
        >
            <Head title="Quản Lý Quỹ Tiền - Pháp Tạng" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Flash Messages */}
                {flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl flex items-center gap-2 shadow-xs">
                        <span>✅</span>
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl flex items-center gap-2 shadow-xs">
                        <span>⚠️</span>
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Stats Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng tài khoản/quỹ</div>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs">
                        <div className="text-xs font-medium text-amber-600 uppercase tracking-wider">Quỹ tiền mặt</div>
                        <div className="text-2xl font-bold text-amber-900 mt-1">{stats.cash}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs">
                        <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Tài khoản Ngân hàng</div>
                        <div className="text-2xl font-bold text-blue-900 mt-1">{stats.bank}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs">
                        <div className="text-xs font-medium text-purple-600 uppercase tracking-wider">Cổng quẹt thẻ POS</div>
                        <div className="text-2xl font-bold text-purple-900 mt-1">{stats.card_gateway}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs col-span-2 sm:col-span-1">
                        <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Đang hoạt động</div>
                        <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.active}</div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <form onSubmit={handleSearch} className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Tìm theo tên quỹ, mã code (vd: CASH_A), mã chữ (vd: A)..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full text-sm border-slate-300 rounded-lg pl-3 pr-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div className="w-full lg:w-44">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full text-sm border-slate-300 rounded-lg py-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Tất cả loại quỹ</option>
                                <option value="cash">Tiền mặt (Quỹ)</option>
                                <option value="bank">Ngân hàng</option>
                                <option value="card_gateway">Cổng quẹt thẻ POS</option>
                            </select>
                        </div>
                        <div className="w-full lg:w-44">
                            <select
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                                className="w-full text-sm border-slate-300 rounded-lg py-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Tất cả chi nhánh</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="w-full lg:w-40">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full text-sm border-slate-300 rounded-lg py-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="active">Đang hoạt động</option>
                                <option value="inactive">Ngưng hoạt động</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition shrink-0 cursor-pointer"
                            >
                                Lọc
                            </button>
                            {(search || typeFilter || statusFilter || branchFilter) && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition shrink-0 cursor-pointer"
                                >
                                    Đặt lại
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                                <tr>
                                    <th scope="col" className="px-6 py-3.5 font-semibold">Mã & Ký hiệu</th>
                                    <th scope="col" className="px-6 py-3.5 font-semibold">Tên Quỹ / Tài Khoản</th>
                                    <th scope="col" className="px-6 py-3.5 font-semibold">Phân loại</th>
                                    <th scope="col" className="px-6 py-3.5 font-semibold">Chi nhánh</th>
                                    <th scope="col" className="px-6 py-3.5 font-semibold">Số dư ban đầu</th>
                                    <th scope="col" className="px-6 py-3.5 font-semibold">Giao dịch</th>
                                    <th scope="col" className="px-6 py-3.5 font-semibold">Trạng thái</th>
                                    <th scope="col" className="px-6 py-3.5 font-semibold text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {accounts.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                            Không tìm thấy tài khoản / quỹ tiền nào phù hợp với bộ lọc.
                                        </td>
                                    </tr>
                                ) : (
                                    accounts.data.map((account) => {
                                        const hasTransactions = account.total_transactions > 0;
                                        return (
                                            <tr key={account.id} className="hover:bg-slate-50/70 transition">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-semibold text-slate-800 text-sm">
                                                            {account.code}
                                                        </span>
                                                        {account.letter_code && (
                                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                                                {account.letter_code}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">
                                                        {account.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getTypeBadge(account.type)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                    {account.branch ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            <span>📍</span>
                                                            <span className="font-medium">{account.branch.name}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs italic">
                                                            Toàn hệ thống
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {account.latest_initial_balance ? (
                                                        <div>
                                                            <div className="font-semibold text-slate-800">
                                                                {formatCurrency(account.latest_initial_balance.initial_amount)}
                                                            </div>
                                                            <div className="text-xs text-slate-400">
                                                                Từ {account.latest_initial_balance.effective_date}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">0 đ</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                            hasTransactions
                                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                                : 'bg-slate-100 text-slate-500'
                                                        }`}
                                                        title={`Thu: ${account.payments_count}, Chi: ${account.expenses_count}, Chuyển: ${account.transfers_in_count + account.transfers_out_count}, NV liên kết: ${account.users_count}`}
                                                    >
                                                        {account.total_transactions} GD / LK
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(account.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(account)}
                                                            className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition cursor-pointer"
                                                        >
                                                            Sửa
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingAccount(account)}
                                                            className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition cursor-pointer"
                                                        >
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {accounts.links && accounts.links.length > 3 && (
                        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                                Hiển thị trang {accounts.current_page} / {accounts.last_page} (Tổng số {accounts.total} bản ghi)
                            </div>
                            <div className="flex gap-1">
                                {accounts.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        disabled={!link.url || link.active}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 text-xs rounded-md ${
                                            link.active
                                                ? 'bg-indigo-600 text-white font-semibold'
                                                : link.url
                                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                : 'text-slate-300 cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create / Edit Modal */}
            <Modal show={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} maxWidth="2xl">
                <form onSubmit={handleFormSubmit} className="p-6">
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            {editingAccount ? '✏️ Chỉnh Sửa Quỹ / Tài Khoản' : '➕ Thêm Quỹ / Tài Khoản Mới'}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsFormModalOpen(false)}
                            className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                        >
                            &times;
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Code */}
                        <div>
                            <InputLabel htmlFor="acc_code" value="Mã tài khoản (Code) *" />
                            <TextInput
                                id="acc_code"
                                type="text"
                                className="mt-1 block w-full uppercase font-mono"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                placeholder="VD: CASH_DN, BANK_VCB, GATEWAY_F"
                                required
                            />
                            <p className="text-[11px] text-slate-500 mt-1">Mã duy nhất viết hoa không dấu</p>
                            <InputError message={errors.code} className="mt-1" />
                        </div>

                        {/* Letter Code */}
                        <div>
                            <InputLabel htmlFor="acc_letter_code" value="Mã chữ cái đối soát (Letter code)" />
                            <TextInput
                                id="acc_letter_code"
                                type="text"
                                className="mt-1 block w-full uppercase font-mono"
                                value={data.letter_code}
                                onChange={(e) => setData('letter_code', e.target.value.toUpperCase())}
                                placeholder="VD: A, B, C... (dùng cho bot Telegram & sheet)"
                                maxLength={10}
                            />
                            <p className="text-[11px] text-slate-500 mt-1">Ký tự viết tắt trên Google Sheet & Bot</p>
                            <InputError message={errors.letter_code} className="mt-1" />
                        </div>

                        {/* Name */}
                        <div className="md:col-span-2">
                            <InputLabel htmlFor="acc_name" value="Tên quỹ / tài khoản *" />
                            <TextInput
                                id="acc_name"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="VD: Quỹ Tiền Mặt - Xã Đàn, Ngân hàng ACB (Mai Văn Cờ)"
                                required
                            />
                            <InputError message={errors.name} className="mt-1" />
                        </div>

                        {/* Type */}
                        <div>
                            <InputLabel htmlFor="acc_type" value="Loại tài khoản *" />
                            <select
                                id="acc_type"
                                value={data.type}
                                onChange={(e) => {
                                    const newType = e.target.value as 'cash' | 'bank' | 'card_gateway';
                                    setData((prev) => ({
                                        ...prev,
                                        type: newType,
                                        branch_id: newType !== 'cash' ? '' : prev.branch_id || (branches[0]?.id ?? ''),
                                    }));
                                }}
                                className="mt-1 block w-full border-slate-300 rounded-lg shadow-xs text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            >
                                <option value="cash">💵 Tiền mặt (Quỹ chi nhánh)</option>
                                <option value="bank">🏦 Tài khoản Ngân hàng</option>
                                <option value="card_gateway">💳 Cổng quẹt thẻ POS</option>
                            </select>
                            <InputError message={errors.type} className="mt-1" />
                        </div>

                        {/* Branch */}
                        <div>
                            <InputLabel
                                htmlFor="acc_branch_id"
                                value={data.type === 'cash' ? 'Chi nhánh áp dụng *' : 'Chi nhánh áp dụng (Tùy chọn)'}
                            />
                            <select
                                id="acc_branch_id"
                                value={data.branch_id}
                                onChange={(e) => setData('branch_id', e.target.value)}
                                className="mt-1 block w-full border-slate-300 rounded-lg shadow-xs text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                required={data.type === 'cash'}
                            >
                                <option value="">-- Toàn hệ thống / Không chọn --</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} ({b.code})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-slate-500 mt-1">
                                {data.type === 'cash' ? 'Quỹ tiền mặt cần gắn với một chi nhánh cụ thể' : 'Để trống nếu dùng chung cho toàn hệ thống'}
                            </p>
                            <InputError message={errors.branch_id} className="mt-1" />
                        </div>

                        {/* Status */}
                        <div>
                            <InputLabel htmlFor="acc_status" value="Trạng thái hoạt động *" />
                            <select
                                id="acc_status"
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value as 'active' | 'inactive')}
                                className="mt-1 block w-full border-slate-300 rounded-lg shadow-xs text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            >
                                <option value="active">Hoạt động (Active)</option>
                                <option value="inactive">Ngưng hoạt động (Inactive)</option>
                            </select>
                            <InputError message={errors.status} className="mt-1" />
                        </div>

                        {/* Initial Balance Header Section */}
                        <div className="md:col-span-2 pt-2 border-t border-slate-100 mt-2">
                            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <span>⚖️</span> Thiết lập số dư ban đầu
                            </h4>
                        </div>

                        {/* Initial Amount */}
                        <div>
                            <InputLabel htmlFor="acc_initial_amount" value="Số dư ban đầu (VNĐ)" />
                            <TextInput
                                id="acc_initial_amount"
                                type="number"
                                min="0"
                                step="1000"
                                className="mt-1 block w-full"
                                value={data.initial_amount}
                                onChange={(e) => setData('initial_amount', e.target.value)}
                                placeholder="0"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                                {formatCurrency(data.initial_amount)}
                            </p>
                            <InputError message={errors.initial_amount} className="mt-1" />
                        </div>

                        {/* Effective Date */}
                        <div>
                            <InputLabel htmlFor="acc_initial_date" value="Ngày bắt đầu tính số dư" />
                            <TextInput
                                id="acc_initial_date"
                                type="date"
                                className="mt-1 block w-full"
                                value={data.initial_date}
                                onChange={(e) => setData('initial_date', e.target.value)}
                            />
                            <InputError message={errors.initial_date} className="mt-1" />
                        </div>

                        {/* Note */}
                        <div className="md:col-span-2">
                            <InputLabel htmlFor="acc_initial_note" value="Ghi chú số dư" />
                            <TextInput
                                id="acc_initial_note"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.initial_note}
                                onChange={(e) => setData('initial_note', e.target.value)}
                                placeholder="VD: Số dư đầu kỳ chốt sổ ngày 01/01"
                            />
                            <InputError message={errors.initial_note} className="mt-1" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <SecondaryButton type="button" onClick={() => setIsFormModalOpen(false)}>
                            Hủy bỏ
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>
                            {processing ? 'Đang lưu...' : editingAccount ? 'Cập nhật' : 'Thêm mới'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={!!deletingAccount} onClose={() => setDeletingAccount(null)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center gap-3 text-rose-600 mb-4">
                        <div className="p-2.5 bg-rose-100 rounded-full">
                            <span className="text-xl">⚠️</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa Quỹ / Tài Khoản</h3>
                    </div>

                    {deletingAccount && (
                        <div>
                            <p className="text-sm text-slate-600 mb-3">
                                Bạn có chắc chắn muốn xóa quỹ / tài khoản:
                            </p>
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-sm">
                                <div className="font-bold text-slate-900">{deletingAccount.name}</div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                    Mã: {deletingAccount.code} {deletingAccount.letter_code ? `(${deletingAccount.letter_code})` : ''}
                                </div>
                            </div>

                            {deletingAccount.total_transactions > 0 ? (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs mb-4">
                                    <strong>Lưu ý:</strong> Tài khoản này hiện có{' '}
                                    <strong>{deletingAccount.total_transactions}</strong> giao dịch hoặc nhân viên liên kết.
                                    Hệ thống không cho phép xóa để bảo toàn dữ liệu sổ sách tài chính.
                                    <br />
                                    👉 Hãy chuyển trạng thái sang <strong>Ngưng hoạt động (Inactive)</strong> thay vì xóa.
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 mb-4">
                                    Hành động này sẽ xóa hoàn toàn quỹ khỏi hệ thống và không thể hoàn tác nếu chưa có giao dịch nào liên quan.
                                </p>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <SecondaryButton onClick={() => setDeletingAccount(null)}>
                                    Hủy bỏ
                                </SecondaryButton>
                                {deletingAccount.total_transactions === 0 ? (
                                    <DangerButton onClick={handleConfirmDelete} disabled={isDeleting}>
                                        {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                                    </DangerButton>
                                ) : (
                                    <PrimaryButton
                                        onClick={() => {
                                            const target = deletingAccount;
                                            setDeletingAccount(null);
                                            openEditModal(target);
                                        }}
                                    >
                                        Chỉnh sửa trạng thái
                                    </PrimaryButton>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
