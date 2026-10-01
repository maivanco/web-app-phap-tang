import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';

interface Branch {
    id: number;
    code: string;
    name: string;
}

interface OrderItem {
    id: number;
    product_name: string;
    brand?: { name: string };
    quantity: number;
    unit_price: number;
    net_amount: number;
}

interface Order {
    id: number;
    order_code: string;
    sale_date: string;
    branch?: { name: string; code: string };
    consultant_id?: number;
    consultant?: { id: number; name: string };
    consultant_name: string;
    customer_name: string;
    customer_phone: string;
    gross_amount: number;
    discount_rate: number;
    discount_amount: number;
    net_revenue: number;
    status: string;
    version: number;
    items?: OrderItem[];
    payment?: {
        method: string;
        amount: number;
        status: string;
        account?: { name: string };
    };
}

interface OrdersIndexProps extends PageProps {
    orders: {
        data: Order[];
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

export default function OrdersIndex({ auth, orders, filters, branches }: OrdersIndexProps) {
    const isManager = (auth.user as any).role === 'manager' || (auth.user as any).role === 'admin';
    const { flash } = usePage<PageProps<{ flash?: { success?: string; error?: string } }>>().props;

    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [status, setStatus] = useState(filters.status || '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    // Modal state for cancellation
    const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [syncingOrderId, setSyncingOrderId] = useState<number | null>(null);

    const handleSyncSheets = (orderId: number) => {
        if (syncingOrderId) return;
        setSyncingOrderId(orderId);
        router.post(
            route('admin.cashflow.orders.sync-sheets', orderId),
            {},
            {
                preserveScroll: true,
                onFinish: () => setSyncingOrderId(null),
            }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.cashflow.orders.index'),
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
        if (!cancellingOrder || !cancelReason.trim()) return;
        setIsCancelling(true);
        router.post(
            route('admin.cashflow.orders.cancel', cancellingOrder.id),
            { reason: cancelReason },
            {
                onSuccess: () => {
                    setCancellingOrder(null);
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
                            📋 Quản Lý Đơn Bán Hàng
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Tra cứu, xem chi tiết và đối soát các đơn hàng đã ghi
                        </p>
                    </div>
                    <Link
                        href={route('admin.cashflow.orders.create')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                    >
                        <span>➕</span> Nhập đơn mới
                    </Link>
                </div>
            }
        >
            <Head title="Danh sách đơn hàng - Pháp Tạng" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
                {/* Flash Messages */}
                {flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
                        <div className="flex items-center gap-2">
                            <span>✅</span>
                            <span>{flash.success}</span>
                        </div>
                    </div>
                )}
                {flash?.error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
                        <div className="flex items-center gap-2">
                            <span>❌</span>
                            <span>{flash.error}</span>
                        </div>
                    </div>
                )}

                {/* Search & Filters */}
                <form
                    onSubmit={handleSearch}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs"
                >
                    <div className="lg:col-span-2">
                        <input
                            type="text"
                            placeholder="🔍 Tìm mã đơn, khách hàng, SĐT, TVV..."
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
                            <option value="completed">Đã hoàn thành</option>
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

                {/* Orders Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                                <tr>
                                    <th className="px-4 py-3 text-left">Mã Đơn / Ngày</th>
                                    <th className="px-4 py-3 text-left">Chi Nhánh</th>
                                    <th className="px-4 py-3 text-left">Khách Hàng</th>
                                    <th className="px-4 py-3 text-left">Tư Vấn Viên</th>
                                    <th className="px-4 py-3 text-right">Tổng Trước Giảm</th>
                                    <th className="px-4 py-3 text-right">Chiết Khấu</th>
                                    <th className="px-4 py-3 text-right">Doanh Thu Sau Giảm</th>
                                    <th className="px-4 py-3 text-left">Thanh Toán</th>
                                    <th className="px-4 py-3 text-center">Trạng Thái</th>
                                    <th className="px-4 py-3 text-right">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {orders.data.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50/60">
                                        <td className="px-4 py-3">
                                            <Link
                                                href={route('admin.cashflow.orders.show', order.id)}
                                                className="font-bold text-indigo-600 hover:underline"
                                            >
                                                {order.order_code}
                                            </Link>
                                            <div className="text-[11px] text-gray-400">
                                                {new Date(order.sale_date).toLocaleDateString('vi-VN')}
                                                {order.version > 1 && (
                                                    <span className="ml-1 text-amber-600 font-medium">
                                                        (v{order.version})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {order.branch?.code}. {order.branch?.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{order.customer_name}</div>
                                            <div className="text-[11px] text-gray-500">{order.customer_phone}</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{order.consultant?.name || order.consultant_name}</td>
                                        <td className="px-4 py-3 text-right text-gray-600">
                                            {formatCurrency(order.gross_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-amber-600">
                                            -{formatCurrency(order.discount_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                                            {formatCurrency(order.net_revenue)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {order.payment?.method === 'cash' ? (
                                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium">
                                                    💵 Tiền mặt
                                                </span>
                                            ) : order.payment?.method === 'card_swipe' ? (
                                                <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] font-medium">
                                                    💳 Quẹt thẻ (Chờ về)
                                                </span>
                                            ) : (
                                                <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-medium">
                                                    🏦 {order.payment?.account?.name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {order.status === 'completed' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-800">
                                                    Hoàn tất
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-800">
                                                    Đã hủy
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => handleSyncSheets(order.id)}
                                                disabled={syncingOrderId === order.id}
                                                className="text-emerald-600 hover:text-emerald-900 font-medium px-1.5 py-1 text-xs disabled:opacity-50 cursor-pointer"
                                                title="Đồng bộ đơn này sang Google Sheets"
                                            >
                                                {syncingOrderId === order.id ? '⏳' : '📊'} Sheets
                                            </button>

                                            <Link
                                                href={route('admin.cashflow.orders.show', order.id)}
                                                className="text-indigo-600 hover:text-indigo-900 font-medium px-1.5 py-1"
                                            >
                                                Xem
                                            </Link>

                                            {isManager && order.status === 'completed' && (
                                                <button
                                                    onClick={() => setCancellingOrder(order)}
                                                    className="text-red-600 hover:text-red-900 font-medium px-1.5 py-1"
                                                >
                                                    Hủy
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {orders.data.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">
                                            Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {orders.last_page > 1 && (
                        <div className="p-4 border-t border-gray-100 flex justify-between items-center text-xs">
                            <span className="text-gray-500">
                                Hiển thị trang {orders.current_page} / {orders.last_page} ({orders.total} đơn)
                            </span>
                            <div className="flex gap-1">
                                {orders.links.map((link, idx) => (
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

            {/* Cancel Order Modal (Manager Only with Required Reason) */}
            <Modal show={!!cancellingOrder} onClose={() => setCancellingOrder(null)}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        ⚠️ Xác nhận hủy đơn hàng {cancellingOrder?.order_code}
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Theo quy định: Hủy đơn không đồng nghĩa với hoàn tiền tự động. Hệ thống không xóa vật lý bản ghi mà
                        chuyển trạng thái sang "Đã hủy" và lưu vết thời gian, người thực hiện cùng lý do hủy.
                    </p>

                    <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Lý do hủy đơn hàng (bắt buộc) <span className="text-red-500">*</span>
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
                            onClick={() => setCancellingOrder(null)}
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
                            {isCancelling ? 'Đang xử lý...' : 'Xác nhận hủy đơn'}
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
