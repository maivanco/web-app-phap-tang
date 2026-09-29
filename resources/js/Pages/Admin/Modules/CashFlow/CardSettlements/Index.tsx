import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';

interface FinancialAccount {
    id: number;
    code: string;
    letter_code: string;
    name: string;
}

interface CardPayment {
    id: number;
    order_id: number;
    amount: number;
    payment_date: string;
    card_swipe_date: string;
    card_settlement_date?: string;
    actual_received_amount?: number;
    fee_amount?: number;
    status: string;
    order?: {
        order_code: string;
        customer_name: string;
        customer_phone: string;
        branch?: { name: string; code: string };
    };
    settlement_account?: { name: string };
    settled_by_user?: { name: string };
}

interface CardSettlementsProps extends PageProps {
    pending_payments: CardPayment[];
    settled_payments: {
        data: CardPayment[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
    bank_accounts: FinancialAccount[];
}

export default function CardSettlements({
    auth,
    pending_payments,
    settled_payments,
    bank_accounts,
}: CardSettlementsProps) {
    const isManager = (auth.user as any).role === 'manager' || (auth.user as any).role === 'admin';

    // Settlement Modal state
    const [selectedPayment, setSelectedPayment] = useState<CardPayment | null>(null);
    const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
    const [targetAccountId, setTargetAccountId] = useState<number>(bank_accounts[0]?.id || 1);
    const [actualAmount, setActualAmount] = useState<number>(0);
    const [feeAmount, setFeeAmount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpenModal = (payment: CardPayment) => {
        setSelectedPayment(payment);
        setSettlementDate(payment.card_swipe_date || new Date().toISOString().split('T')[0]);
        setTargetAccountId(bank_accounts[0]?.id || 1);
        setActualAmount(Number(payment.amount));
        setFeeAmount(0);
    };

    const swipeAmount = selectedPayment ? Number(selectedPayment.amount) : 0;
    const totalReconciled = actualAmount + feeAmount;
    const isMatch = Math.round(totalReconciled) === Math.round(swipeAmount);

    const handleConfirmSettle = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPayment || !isMatch) return;

        setIsSubmitting(true);
        router.post(
            route('admin.cashflow.card-settlements.settle', selectedPayment.id),
            {
                settlement_date: settlementDate,
                target_account_id: targetAccountId,
                actual_received_amount: actualAmount,
                fee_amount: feeAmount,
            },
            {
                onSuccess: () => {
                    setSelectedPayment(null);
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
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
                <div>
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        💳 Quẹt Thẻ & Theo Dõi Tiền Về Tài Khoản
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Đối soát dòng tiền thẻ về ngân hàng thực tế: Thực về + Phí = Số quẹt (Section 7)
                    </p>
                </div>
            }
        >
            <Head title="Quẹt thẻ & Chờ tiền về - Pháp Tạng" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* 1. Pending Settlements Table */}
                <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                    <div className="p-4 bg-amber-50/60 border-b border-amber-200 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-amber-900 flex items-center gap-2">
                                <span>⏳</span> Danh Sách Quẹt Thẻ Chờ Tiền Về ({pending_payments.length} đơn)
                            </h3>
                            <p className="text-xs text-amber-700 mt-0.5">
                                Các giao dịch này chưa tăng số dư ngân hàng. Cần đối soát khi ngân hàng báo có tiền.
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                                <tr>
                                    <th className="px-4 py-3 text-left">Mã Đơn Hàng</th>
                                    <th className="px-4 py-3 text-left">Ngày Quẹt Thẻ</th>
                                    <th className="px-4 py-3 text-left">Chi Nhánh</th>
                                    <th className="px-4 py-3 text-left">Khách Hàng</th>
                                    <th className="px-4 py-3 text-right">Số Tiền Quẹt Thẻ</th>
                                    <th className="px-4 py-3 text-center">Trạng Thái</th>
                                    <th className="px-4 py-3 text-right">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {pending_payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-amber-50/30">
                                        <td className="px-4 py-3 font-bold text-indigo-600">
                                            {p.order?.order_code}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-700">
                                            {new Date(p.card_swipe_date).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {p.order?.branch?.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{p.order?.customer_name}</div>
                                            <div className="text-[11px] text-gray-500">{p.order?.customer_phone}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900 text-sm">
                                            {formatCurrency(p.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[11px] font-medium">
                                                Chờ tiền về
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {isManager ? (
                                                <button
                                                    onClick={() => handleOpenModal(p)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition"
                                                >
                                                    Đối Soát & Tất Toán
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Cần quyền quản lý</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {pending_payments.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-xs">
                                            Hiện không có giao dịch quẹt thẻ nào đang chờ tiền về.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Settled History Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                            <span>✅</span> Lịch Sử Giao Dịch Thẻ Đã Tất Toán & Đối Soát
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                                <tr>
                                    <th className="px-4 py-3 text-left">Mã Đơn</th>
                                    <th className="px-4 py-3 text-left">Ngày Quẹt</th>
                                    <th className="px-4 py-3 text-left">Ngày Tiền Về</th>
                                    <th className="px-4 py-3 text-left">Tài Khoản Thực Nhận</th>
                                    <th className="px-4 py-3 text-right">Số Quẹt</th>
                                    <th className="px-4 py-3 text-right">Thực Về (Tăng TK)</th>
                                    <th className="px-4 py-3 text-right">Phí Thẻ</th>
                                    <th className="px-4 py-3 text-left">Người Đối Soát</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {settled_payments.data.map((sp) => (
                                    <tr key={sp.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 font-semibold text-gray-900">
                                            {sp.order?.order_code}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {new Date(sp.card_swipe_date).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-emerald-700">
                                            {sp.card_settlement_date
                                                ? new Date(sp.card_settlement_date).toLocaleDateString('vi-VN')
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {sp.settlement_account?.name}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(sp.amount)}</td>
                                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                            +{formatCurrency(sp.actual_received_amount || 0)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-rose-600">
                                            {formatCurrency(sp.fee_amount || 0)}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {sp.settled_by_user?.name || 'Quản lý'}
                                        </td>
                                    </tr>
                                ))}

                                {settled_payments.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-6 text-center text-gray-400 text-xs">
                                            Chưa có giao dịch thẻ nào được đối soát hoàn tất.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Reconciliation Modal */}
            <Modal show={!!selectedPayment} onClose={() => setSelectedPayment(null)}>
                <form onSubmit={handleConfirmSettle} className="p-6 text-xs">
                    <h3 className="text-base font-bold text-gray-900 mb-1">
                        💳 Đối Soát Tiền Thẻ Về Tài Khoản
                    </h3>
                    <p className="text-gray-500 mb-4">
                        Đơn hàng: <strong>{selectedPayment?.order?.order_code}</strong> • Số tiền quẹt:{' '}
                        <strong className="text-indigo-600">{formatCurrency(swipeAmount)}</strong>
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">
                                Ngày tiền về thực tế (không trước ngày quẹt:{' '}
                                {selectedPayment?.card_swipe_date}) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                min={selectedPayment?.card_swipe_date}
                                value={settlementDate}
                                onChange={(e) => setSettlementDate(e.target.value)}
                                className="w-full rounded-md border-gray-300 text-xs shadow-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">
                                Tài khoản ngân hàng thực nhận (A-G, trừ F) <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={targetAccountId}
                                onChange={(e) => setTargetAccountId(Number(e.target.value))}
                                className="w-full rounded-md border-gray-300 text-xs shadow-sm"
                                required
                            >
                                {bank_accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.letter_code}. {acc.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Số tiền thực về (đ) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={actualAmount}
                                    onChange={(e) => setActualAmount(parseFloat(e.target.value) || 0)}
                                    className="w-full rounded-md border-gray-300 text-xs shadow-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Phí quẹt thẻ nếu có (đ)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={feeAmount}
                                    onChange={(e) => setFeeAmount(parseFloat(e.target.value) || 0)}
                                    className="w-full rounded-md border-gray-300 text-xs shadow-sm"
                                    required
                                />
                            </div>
                        </div>

                        {/* Balance Verification Box */}
                        <div
                            className={`p-3 rounded-lg border ${
                                isMatch ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                            }`}
                        >
                            <div className="flex justify-between font-semibold">
                                <span>Thực về + Phí thẻ:</span>
                                <span>{formatCurrency(totalReconciled)}</span>
                            </div>
                            <div className="flex justify-between text-[11px] mt-1">
                                <span>Số tiền quẹt yêu cầu:</span>
                                <span>{formatCurrency(swipeAmount)}</span>
                            </div>
                            {!isMatch && (
                                <p className="text-[11px] text-rose-600 mt-2 font-medium">
                                    ⚠️ Chênh lệch {formatCurrency(Math.abs(swipeAmount - totalReconciled))}. Quy định: Số thực về + Phí
                                    phải bằng đúng số tiền quẹt.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setSelectedPayment(null)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={!isMatch || isSubmitting}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Xác nhận đối soát tất toán'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
