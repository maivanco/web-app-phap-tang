import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { PageProps } from '@/types';

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
}

interface CreateExpenseProps extends PageProps {
    branches: Branch[];
    bank_accounts: FinancialAccount[];
    selected_branch_id?: number | null;
}

export default function CreateExpense({ auth, branches, bank_accounts, selected_branch_id }: CreateExpenseProps) {
    const defaultBranchId = selected_branch_id || branches[0]?.id || 1;

    const { data, setData, post, processing, errors } = useForm({
        branch_id: defaultBranchId,
        expense_date: new Date().toISOString().split('T')[0],
        spender_name: auth.user.name || '',
        content: '',
        quantity: 1,
        unit_price: 0,
        payment_method: 'cash',
        account_id: bank_accounts[0]?.id || null,
        note: '',
    });

    const totalAmount = (data.quantity || 0) * (data.unit_price || 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.cashflow.expenses.store'));
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
                            💸 Nhập Khoản Chi Tiêu Mới
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Ghi nhận chi phí vận hành gắn với quỹ chi nhánh hoặc tài khoản ngân hàng
                        </p>
                    </div>
                    <Link
                        href={route('admin.cashflow.expenses.index')}
                        className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg transition"
                    >
                        ← Sổ chi tiêu
                    </Link>
                </div>
            }
        >
            <Head title="Nhập chi tiêu - Pháp Tạng" />

            <div className="py-6 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                    {/* Branch & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Chi nhánh chi tiền <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={data.branch_id}
                                onChange={(e) => setData('branch_id', Number(e.target.value))}
                                className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                            >
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.code}. {b.name}
                                    </option>
                                ))}
                            </select>
                            {errors.branch_id && <p className="text-xs text-red-600 mt-1">{errors.branch_id}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Ngày chi tiêu
                            </label>
                            <input
                                type="date"
                                value={data.expense_date}
                                onChange={(e) => setData('expense_date', e.target.value)}
                                className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Spender & Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Người chi <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.spender_name}
                                onChange={(e) => setData('spender_name', e.target.value)}
                                placeholder="Nhập tên người chi tiền"
                                className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                                required
                            />
                            {errors.spender_name && <p className="text-xs text-red-600 mt-1">{errors.spender_name}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Nội dung chi <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.content}
                                onChange={(e) => setData('content', e.target.value)}
                                placeholder="Ví dụ: Mua văn phòng phẩm, tiền điện thoại..."
                                className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                                required
                            />
                            {errors.content && <p className="text-xs text-red-600 mt-1">{errors.content}</p>}
                        </div>
                    </div>

                    {/* Quantity & Unit Price & Total Calculation */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 items-center">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Số lượng (1 nếu là hóa đơn) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={data.quantity}
                                onChange={(e) => setData('quantity', parseInt(e.target.value) || 1)}
                                className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Đơn giá / Giá tiền (đ) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={data.unit_price}
                                onChange={(e) => setData('unit_price', parseFloat(e.target.value) || 0)}
                                className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                                required
                            />
                        </div>

                        <div className="text-right">
                            <span className="text-xs text-gray-500 font-medium block">Tổng tiền chi:</span>
                            <span className="text-lg font-bold text-rose-600">
                                {formatCurrency(totalAmount)}
                            </span>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                            Hình thức thanh toán <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label
                                className={`border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition ${
                                    data.payment_method === 'cash'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-medium ring-2 ring-emerald-500/20'
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="cash"
                                    checked={data.payment_method === 'cash'}
                                    onChange={(e) => setData('payment_method', e.target.value)}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                    <div className="text-sm">💵 Tiền mặt</div>
                                    <div className="text-[11px] text-gray-500">Tự động gắn vào Quỹ tiền mặt chi nhánh</div>
                                </div>
                            </label>

                            <label
                                className={`border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition ${
                                    data.payment_method === 'bank_transfer'
                                        ? 'border-blue-500 bg-blue-50 text-blue-950 font-medium ring-2 ring-blue-500/20'
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="bank_transfer"
                                    checked={data.payment_method === 'bank_transfer'}
                                    onChange={(e) => setData('payment_method', e.target.value)}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <div className="text-sm">🏦 Chuyển khoản ngân hàng</div>
                                    <div className="text-[11px] text-gray-500">Chi từ tài khoản ngân hàng A-G (trừ F)</div>
                                </div>
                            </label>
                        </div>

                        {data.payment_method === 'bank_transfer' && (
                            <div className="mt-3 bg-blue-50/60 rounded-lg p-3.5 border border-blue-200">
                                <label className="block text-xs font-semibold text-blue-900 mb-1">
                                    Chi từ tài khoản nào (A-G, F không dùng cho chi) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.account_id || ''}
                                    onChange={(e) => setData('account_id', Number(e.target.value))}
                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                                    required
                                >
                                    {bank_accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.letter_code}. {acc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Ghi chú (nhập `-` nếu không có)
                        </label>
                        <textarea
                            value={data.note}
                            onChange={(e) => setData('note', e.target.value)}
                            placeholder="Ghi chú thêm về khoản chi..."
                            rows={2}
                            className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                        />
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <Link
                            href={route('admin.cashflow.expenses.index')}
                            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                        >
                            Hủy bỏ
                        </Link>

                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md transition disabled:opacity-50"
                        >
                            {processing ? 'Đang lưu...' : '💾 Lưu Đơn Chi Tiêu'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
