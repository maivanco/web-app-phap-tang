import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { PageProps } from '@/types';

interface Branch {
    id: number;
    code: string;
    name: string;
}

interface Brand {
    id: number;
    code: string;
    name: string;
}

interface CustomerSource {
    id: number;
    code: string;
    name: string;
}

interface DashboardProps extends PageProps {
    filters: {
        start_date: string;
        end_date: string;
        branch_id?: number | null;
        brand_id?: number | null;
    };
    kpis: {
        gross_amount: number;
        discount_amount: number;
        net_revenue: number;
        order_count: number;
        total_expenses: number;
        net_operating: number;
    };
    revenue_by_branch: Array<{
        branch_id: number;
        branch_name: string;
        revenue: number;
        count: number;
        percentage: number;
    }>;
    revenue_by_brand: Array<{
        brand_id: number;
        brand_name: string;
        revenue: number;
        total_qty: number;
        percentage: number;
    }>;
    revenue_by_source: Array<{
        source_id: number;
        source_name: string;
        revenue: number;
        count: number;
        percentage: number;
    }>;
    card_stats: {
        pending_count: number;
        pending_amount: number;
        reconciled_count: number;
        reconciled_amount: number;
        reconciled_fees: number;
    };
    accounts_balances: Array<{
        account: {
            id: number;
            code: string;
            letter_code: string;
            name: string;
            type: string;
            branch?: { name: string };
        };
        initial_amount: number;
        total_in: number;
        total_out: number;
        current_balance: number;
        pending_card_amount?: number;
    }>;
    branches: Branch[];
    brands: Brand[];
    customer_sources: CustomerSource[];
}

export default function Dashboard({
    auth,
    filters,
    kpis,
    revenue_by_branch,
    revenue_by_brand,
    revenue_by_source,
    card_stats,
    accounts_balances,
    branches,
    brands,
}: DashboardProps) {
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const [branchId, setBranchId] = useState<string>(filters.branch_id ? String(filters.branch_id) : '');
    const [brandId, setBrandId] = useState<string>(filters.brand_id ? String(filters.brand_id) : '');

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.cashflow.dashboard'),
            {
                start_date: startDate,
                end_date: endDate,
                branch_id: branchId || undefined,
                brand_id: brandId || undefined,
            },
            { preserveState: true }
        );
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                            📊 Tổng Quan & Báo Cáo Doanh Thu Thu/Chi
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Hệ thống Pháp Tạng - Quản lý dòng tiền, thương hiệu và đối soát
                        </p>
                    </div>

                    <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2 text-sm">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="rounded-md border-gray-300 text-xs px-2.5 py-1.5 shadow-sm"
                        />
                        <span className="text-gray-400">→</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="rounded-md border-gray-300 text-xs px-2.5 py-1.5 shadow-sm"
                        />
                        <select
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                            className="rounded-md border-gray-300 text-xs px-2.5 py-1.5 shadow-sm"
                        >
                            <option value="">Tất cả chi nhánh</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.code}. {b.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={brandId}
                            onChange={(e) => setBrandId(e.target.value)}
                            className="rounded-md border-gray-300 text-xs px-2.5 py-1.5 shadow-sm"
                        >
                            <option value="">Tất cả thương hiệu</option>
                            {brands.map((br) => (
                                <option key={br.id} value={br.id}>
                                    {br.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm transition"
                        >
                            Lọc báo cáo
                        </button>
                    </form>
                </div>
            }
        >
            <Head title="Dashboard - Pháp Tạng CashFlow" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* 1. Core KPIs Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                                Doanh Thu Sau Giảm
                            </span>
                            <span className="text-emerald-500 bg-emerald-50 p-2 rounded-lg text-lg">💰</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">
                            {formatCurrency(kpis.net_revenue)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                            <span>{kpis.order_count} đơn hàng hoàn tất</span>
                            <span>Trước giảm: {formatCurrency(kpis.gross_amount)}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                                Tổng Chiết Khấu Đã Giảm
                            </span>
                            <span className="text-amber-500 bg-amber-50 p-2 rounded-lg text-lg">🏷️</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">
                            {formatCurrency(kpis.discount_amount)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Tỷ lệ giảm trung bình:{' '}
                            {kpis.gross_amount > 0
                                ? ((kpis.discount_amount / kpis.gross_amount) * 100).toFixed(1)
                                : 0}
                            %
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-rose-100 p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                                Tổng Chi Tiêu Đã Xuất
                            </span>
                            <span className="text-rose-500 bg-rose-50 p-2 rounded-lg text-lg">💸</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">
                            {formatCurrency(kpis.total_expenses)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Các khoản chi tiêu hợp lệ theo kỳ
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                                Chênh Lệch Thu - Chi
                            </span>
                            <span className="text-blue-500 bg-blue-50 p-2 rounded-lg text-lg">📈</span>
                        </div>
                        <div className={`text-2xl font-bold mt-2 ${kpis.net_operating >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {formatCurrency(kpis.net_operating)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Dòng tiền vận hành phát sinh trong kỳ
                        </div>
                    </div>
                </div>

                {/* 2. Card Swipes Status Section (T06 Tracking) */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
                        <div>
                            <h3 className="font-semibold text-base flex items-center gap-2">
                                <span>💳</span> Theo Dõi Tiền Quẹt Thẻ Về Tài Khoản (Cổng F)
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Giao dịch quẹt thẻ ghi nhận doanh thu ngày bán nhưng chờ tiền về tài khoản ngân hàng thực nhận
                            </p>
                        </div>
                        <a
                            href={route('admin.cashflow.card-settlements.index')}
                            className="inline-flex items-center text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg font-semibold transition self-start"
                        >
                            Đi đến Đối Soát Thẻ →
                        </a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="bg-slate-800/80 rounded-lg p-3.5 border border-slate-700">
                            <div className="text-xs text-amber-400 font-medium">⏳ Đang Chờ Tiền Về</div>
                            <div className="text-xl font-bold mt-1 text-white">
                                {formatCurrency(card_stats.pending_amount)}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {card_stats.pending_count} đơn hàng chờ đối soát
                            </div>
                        </div>

                        <div className="bg-slate-800/80 rounded-lg p-3.5 border border-slate-700">
                            <div className="text-xs text-emerald-400 font-medium">✅ Đã Về Ngân Hàng Thực Tế</div>
                            <div className="text-xl font-bold mt-1 text-white">
                                {formatCurrency(card_stats.reconciled_amount)}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {card_stats.reconciled_count} giao dịch đã tất toán
                            </div>
                        </div>

                        <div className="bg-slate-800/80 rounded-lg p-3.5 border border-slate-700">
                            <div className="text-xs text-rose-400 font-medium">📉 Phí Dịch Vụ Thẻ</div>
                            <div className="text-xl font-bold mt-1 text-white">
                                {formatCurrency(card_stats.reconciled_fees)}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                Báo cáo chi phí thẻ riêng biệt
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Breakdowns Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue by Brand */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center justify-between">
                            <span>🏷️ Doanh Thu Theo Thương Hiệu</span>
                            <span className="text-xs text-gray-400 font-normal">Tỷ trọng</span>
                        </h3>
                        <div className="space-y-3">
                            {revenue_by_brand.map((item) => (
                                <div key={item.brand_id}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium text-gray-700">{item.brand_name}</span>
                                        <span className="text-gray-900 font-semibold">
                                            {formatCurrency(item.revenue)} ({item.percentage}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full"
                                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {revenue_by_brand.length === 0 && (
                                <div className="text-xs text-gray-400 text-center py-4">Chưa có số liệu</div>
                            )}
                        </div>
                    </div>

                    {/* Revenue by Branch */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center justify-between">
                            <span>🏢 Doanh Thu Theo Chi Nhánh</span>
                            <span className="text-xs text-gray-400 font-normal">Tỷ trọng</span>
                        </h3>
                        <div className="space-y-3">
                            {revenue_by_branch.map((item) => (
                                <div key={item.branch_id}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium text-gray-700 truncate max-w-[200px]">
                                            {item.branch_name}
                                        </span>
                                        <span className="text-gray-900 font-semibold">
                                            {formatCurrency(item.revenue)} ({item.percentage}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-emerald-600 h-2 rounded-full"
                                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {revenue_by_branch.length === 0 && (
                                <div className="text-xs text-gray-400 text-center py-4">Chưa có số liệu</div>
                            )}
                        </div>
                    </div>

                    {/* Revenue by Customer Source */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center justify-between">
                            <span>🌐 Doanh Thu Theo Nguồn Khách</span>
                            <span className="text-xs text-gray-400 font-normal">Đơn / Tỷ trọng</span>
                        </h3>
                        <div className="space-y-3">
                            {revenue_by_source.map((item) => (
                                <div key={item.source_id}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium text-gray-700">
                                            {item.source_name} ({item.count} đơn)
                                        </span>
                                        <span className="text-gray-900 font-semibold">
                                            {formatCurrency(item.revenue)} ({item.percentage}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-amber-500 h-2 rounded-full"
                                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {revenue_by_source.length === 0 && (
                                <div className="text-xs text-gray-400 text-center py-4">Chưa có số liệu</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Funds & Bank Balances Table (Section 7) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-sm text-gray-900">
                                💼 Số Dư Các Quỹ Tiền Mặt & Tài Khoản Ngân Hàng
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Số dư cuối kỳ = Số dư đầu kỳ + Tiền thực vào - Tiền thực ra (tính theo ngày hiệu lực)
                            </p>
                        </div>
                        <a
                            href={route('admin.cashflow.transfers.index')}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            Chuyển tiền nội bộ →
                        </a>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Tài khoản / Quỹ</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Phân loại</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase">Số dư đầu kỳ</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase">Tiền thực vào</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase">Tiền thực ra</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase">Số dư hiện tại</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {accounts_balances.map((item) => (
                                    <tr key={item.account.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {item.account.letter_code ? `${item.account.letter_code}. ` : ''}
                                            {item.account.name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {item.account.type === 'cash' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                                    Quỹ Tiền Mặt
                                                </span>
                                            ) : item.account.type === 'bank' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                    Ngân Hàng
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                    Cổng Thẻ
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600">
                                            {formatCurrency(item.initial_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                                            +{formatCurrency(item.total_in)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-rose-600 font-medium">
                                            -{formatCurrency(item.total_out)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                                            {item.account.type === 'card_gateway'
                                                ? `Chờ về: ${formatCurrency(item.pending_card_amount ?? 0)}`
                                                : formatCurrency(item.current_balance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
