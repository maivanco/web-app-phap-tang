import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';

interface FinancialAccount {
    id: number;
    code: string;
    letter_code: string;
    name: string;
    type: string;
    branch?: { name: string; code: string };
}

interface Transfer {
    id: number;
    transfer_code: string;
    transfer_date: string;
    from_account?: { name: string };
    to_account?: { name: string };
    amount: number;
    transfer_type: string;
    related_order_id?: number | null;
    reason?: string | null;
    note?: string | null;
    creator?: { name: string };
}

interface TransfersProps extends PageProps {
    transfers: {
        data: Transfer[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
    accounts: FinancialAccount[];
}

export default function Transfers({ auth, transfers, accounts }: TransfersProps) {
    const isManager = (auth.user as any).role === 'manager' || (auth.user as any).role === 'admin';

    const { data, setData, post, processing, reset, errors } = useForm({
        transfer_date: new Date().toISOString().split('T')[0],
        from_account_id: accounts[0]?.id || 1,
        to_account_id: accounts[1]?.id || 2,
        amount: 0,
        transfer_type: 'internal_transfer',
        reason: '',
        note: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.cashflow.transfers.store'), {
            onSuccess: () => reset('amount', 'reason', 'note'),
        });
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div>
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        🔄 Chuyển Tiền Nội Bộ & Điều Chỉnh Quỹ
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Chuyển tiền giữa các quỹ chi nhánh và tài khoản ngân hàng (Ghi giảm nguồn, tăng đích - Không tính doanh thu/chi phí)
                    </p>
                </div>
            }
        >
            <Head title="Chuyển tiền nội bộ - Pháp Tạng" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* 1. New Transfer Form (Manager only) */}
                {isManager && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-bold text-sm text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                            <span>➕</span> Khởi Tạo Lệnh Chuyển Tiền / Điều Chỉnh
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Ngày chuyển <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={data.transfer_date}
                                        onChange={(e) => setData('transfer_date', e.target.value)}
                                        className="w-full rounded-md border-gray-300 text-xs shadow-sm"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Từ Quỹ / Tài khoản nguồn <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.from_account_id}
                                        onChange={(e) => setData('from_account_id', Number(e.target.value))}
                                        className="w-full rounded-md border-gray-300 text-xs shadow-sm"
                                        required
                                    >
                                        {accounts.map((acc) => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.letter_code ? `${acc.letter_code}. ` : ''}
                                                {acc.name} ({acc.type === 'cash' ? 'Quỹ TM' : 'NH'})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.from_account_id && <p className="text-red-600 mt-1">{errors.from_account_id}</p>}
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Đến Quỹ / Tài khoản đích <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.to_account_id}
                                        onChange={(e) => setData('to_account_id', Number(e.target.value))}
                                        className="w-full rounded-md border-gray-300 text-xs shadow-sm"
                                        required
                                    >
                                        {accounts.map((acc) => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.letter_code ? `${acc.letter_code}. ` : ''}
                                                {acc.name} ({acc.type === 'cash' ? 'Quỹ TM' : 'NH'})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.to_account_id && <p className="text-red-600 mt-1">{errors.to_account_id}</p>}
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Số tiền chuyển (đ) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={data.amount}
                                        onChange={(e) => setData('amount', parseFloat(e.target.value) || 0)}
                                        className="w-full rounded-md border-gray-300 text-xs shadow-sm"
                                        required
                                    />
                                    {errors.amount && <p className="text-red-600 mt-1">{errors.amount}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Loại nghiệp vụ
                                    </label>
                                    <select
                                        value={data.transfer_type}
                                        onChange={(e) => setData('transfer_type', e.target.value)}
                                        className="w-full rounded-md border-gray-300 text-xs shadow-sm"
                                    >
                                        <option value="internal_transfer">Chuyển tiền nội bộ (Quỹ ↔ Ngân hàng)</option>
                                        <option value="adjustment">Điều chỉnh số dư</option>
                                        <option value="refund">Hoàn tiền khách hàng</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Lý do thực hiện
                                    </label>
                                    <input
                                        type="text"
                                        value={data.reason}
                                        onChange={(e) => setData('reason', e.target.value)}
                                        placeholder="Ví dụ: Nộp tiền mặt bán hàng vào ngân hàng..."
                                        className="w-full rounded-md border-gray-300 text-xs shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Ghi chú thêm
                                    </label>
                                    <input
                                        type="text"
                                        value={data.note}
                                        onChange={(e) => setData('note', e.target.value)}
                                        placeholder="Ghi chú chi tiết..."
                                        className="w-full rounded-md border-gray-300 text-xs shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition disabled:opacity-50"
                                >
                                    {processing ? 'Đang thực hiện...' : 'Thực Hiện Chuyển Tiền'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 2. Transfer History Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-sm text-gray-900">
                            📋 Lịch Sử Giao Dịch Chuyển Tiền Nội Bộ
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                                <tr>
                                    <th className="px-4 py-3 text-left">Mã Giao Dịch</th>
                                    <th className="px-4 py-3 text-left">Ngày</th>
                                    <th className="px-4 py-3 text-left">Nguồn (Giảm)</th>
                                    <th className="px-4 py-3 text-left">Đích (Tăng)</th>
                                    <th className="px-4 py-3 text-right">Số Tiền</th>
                                    <th className="px-4 py-3 text-left">Loại Nghiệp Vụ</th>
                                    <th className="px-4 py-3 text-left">Lý Do / Ghi Chú</th>
                                    <th className="px-4 py-3 text-left">Người Thực Hiện</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {transfers.data.map((tr) => (
                                    <tr key={tr.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 font-semibold text-gray-900">
                                            {tr.transfer_code}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {new Date(tr.transfer_date).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3 text-rose-700 font-medium">
                                            {tr.from_account?.name}
                                        </td>
                                        <td className="px-4 py-3 text-emerald-700 font-medium">
                                            {tr.to_account?.name}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                                            {formatCurrency(tr.amount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                                                {tr.transfer_type === 'internal_transfer'
                                                    ? 'Chuyển nội bộ'
                                                    : tr.transfer_type === 'adjustment'
                                                    ? 'Điều chỉnh'
                                                    : 'Hoàn tiền'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                                            {tr.reason || tr.note || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {tr.creator?.name || 'Hệ thống'}
                                        </td>
                                    </tr>
                                ))}

                                {transfers.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-6 text-center text-gray-400 text-xs">
                                            Chưa có giao dịch chuyển tiền nội bộ nào.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
