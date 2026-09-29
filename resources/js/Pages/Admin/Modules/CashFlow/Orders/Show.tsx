import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';

interface OrderItem {
    id: number;
    line_number: number;
    product_name: string;
    brand?: { name: string; code: string };
    quantity: number;
    unit_price: number;
    gross_amount: number;
    allocated_discount: number;
    net_amount: number;
}

interface OrderAudit {
    id: number;
    action: string;
    version: number;
    reason: string;
    created_at: string;
    user?: { name: string };
    before_payload: any;
    after_payload: any;
}

interface OrderDetailProps extends PageProps {
    order: {
        id: number;
        order_code: string;
        sale_date: string;
        branch?: { name: string; code: string };
        consultant_name: string;
        customer_name: string;
        customer_phone: string;
        customer_gender: string;
        customer_source?: { name: string; code: string };
        discount_code: string;
        discount_rate: number;
        gross_amount: number;
        discount_amount: number;
        net_revenue: number;
        note?: string | null;
        status: string;
        version: number;
        created_at: string;
        creator?: { name: string };
        items: OrderItem[];
        payment?: {
            method: string;
            amount: number;
            payment_date: string;
            card_swipe_date?: string | null;
            card_settlement_date?: string | null;
            actual_received_amount?: number | null;
            fee_amount?: number | null;
            status: string;
            account?: { name: string };
            settlement_account?: { name: string };
            settled_by_user?: { name: string };
        };
        audits: OrderAudit[];
    };
}

export default function OrderShow({ auth, order }: OrderDetailProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                                📄 Chi Tiết Đơn Hàng: {order.order_code}
                            </h2>
                            {order.status === 'completed' ? (
                                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                                    Hoàn tất (v{order.version})
                                </span>
                            ) : (
                                <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                                    Đã hủy (v{order.version})
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Ngày bán: {new Date(order.sale_date).toLocaleDateString('vi-VN')} • Chi nhánh: {order.branch?.name}
                        </p>
                    </div>

                    <Link
                        href={route('admin.cashflow.orders.index')}
                        className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3.5 py-1.5 rounded-lg transition"
                    >
                        ← Quay lại danh sách
                    </Link>
                </div>
            }
        >
            <Head title={`Đơn hàng ${order.order_code}`} />

            <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* 1. Header Information Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    <div>
                        <span className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">
                            Thông tin bán hàng
                        </span>
                        <div className="mt-2 space-y-1">
                            <div>
                                <span className="text-gray-500">Tư vấn viên:</span>{' '}
                                <strong className="text-gray-900">{order.consultant_name}</strong>
                            </div>
                            <div>
                                <span className="text-gray-500">Người tạo bản ghi:</span>{' '}
                                <span className="text-gray-700">{order.creator?.name || 'Hệ thống'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Thời gian tạo:</span>{' '}
                                <span className="text-gray-700">
                                    {new Date(order.created_at).toLocaleString('vi-VN')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <span className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">
                            Khách hàng
                        </span>
                        <div className="mt-2 space-y-1">
                            <div>
                                <span className="text-gray-500">Tên khách:</span>{' '}
                                <strong className="text-gray-900">{order.customer_name}</strong>
                            </div>
                            <div>
                                <span className="text-gray-500">Số điện thoại:</span>{' '}
                                <span className="text-gray-700 font-mono">{order.customer_phone}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Giới tính:</span>{' '}
                                <span className="text-gray-700">{order.customer_gender}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <span className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">
                            Nguồn & Chiết khấu
                        </span>
                        <div className="mt-2 space-y-1">
                            <div>
                                <span className="text-gray-500">Nguồn khách:</span>{' '}
                                <strong className="text-gray-900">{order.customer_source?.name}</strong>
                            </div>
                            <div>
                                <span className="text-gray-500">Mức chiết khấu:</span>{' '}
                                <span className="text-amber-700 font-bold">
                                    {order.discount_code} (Giảm {order.discount_rate * 100}%)
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Ghi chú:</span>{' '}
                                <span className="text-gray-700 italic">{order.note || 'Không có'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Items Table with Allocated Discount */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-gray-900">
                            📦 Chi Tiết Sản Phẩm ({order.items.length} mặt hàng)
                        </h3>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3 text-left">#</th>
                                <th className="px-4 py-3 text-left">Tên Sản Phẩm</th>
                                <th className="px-4 py-3 text-left">Thương Hiệu</th>
                                <th className="px-4 py-3 text-center">SL</th>
                                <th className="px-4 py-3 text-right">Đơn Giá</th>
                                <th className="px-4 py-3 text-right">Thành Tiền Trước Giảm</th>
                                <th className="px-4 py-3 text-right">Giảm Phân Bổ</th>
                                <th className="px-4 py-3 text-right">Sau Giảm (Doanh Thu Dòng)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {order.items.map((it, idx) => (
                                <tr key={it.id}>
                                    <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{it.product_name}</td>
                                    <td className="px-4 py-3 text-gray-700">
                                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                                            {it.brand?.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-medium">{it.quantity}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(it.unit_price)}</td>
                                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(it.gross_amount)}</td>
                                    <td className="px-4 py-3 text-right text-amber-600">
                                        -{formatCurrency(it.allocated_discount)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                                        {formatCurrency(it.net_amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 text-xs font-semibold">
                            <tr>
                                <td colSpan={5} className="px-4 py-3 text-right uppercase text-gray-600">
                                    Tổng cộng đơn hàng:
                                </td>
                                <td className="px-4 py-3 text-right text-gray-900">
                                    {formatCurrency(order.gross_amount)}
                                </td>
                                <td className="px-4 py-3 text-right text-amber-600">
                                    -{formatCurrency(order.discount_amount)}
                                </td>
                                <td className="px-4 py-3 text-right text-emerald-700 text-sm font-bold">
                                    {formatCurrency(order.net_revenue)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* 3. Payment Status Block */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-sm text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                        <span>💳</span> Thông Tin Thanh Toán
                    </h3>

                    {order.payment && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-500">Phương thức:</span>
                                <div className="text-sm font-bold text-gray-900 mt-0.5">
                                    {order.payment.method === 'cash'
                                        ? '💵 Tiền mặt'
                                        : order.payment.method === 'card_swipe'
                                        ? '💳 Quẹt thẻ (Cổng F)'
                                        : '🏦 Chuyển khoản ngân hàng'}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">
                                    Tài khoản / Quỹ: <strong>{order.payment.account?.name}</strong>
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-500">Số tiền khách trả:</span>
                                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                                    {formatCurrency(order.payment.amount)}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">
                                    Ngày ghi nhận: {order.payment.payment_date}
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-500">Trạng thái dòng tiền:</span>
                                <div className="mt-1">
                                    {order.payment.status === 'completed' ? (
                                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">
                                            Đã vào quỹ / ngân hàng
                                        </span>
                                    ) : order.payment.status === 'pending_settlement' ? (
                                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                                            ⏳ Chờ tiền thẻ về
                                        </span>
                                    ) : (
                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                                            ✅ Đã đối soát tất toán
                                        </span>
                                    )}
                                </div>
                                {order.payment.status === 'reconciled' && (
                                    <div className="text-[11px] text-gray-600 mt-1.5 space-y-0.5">
                                        <div>TK nhận: {order.payment.settlement_account?.name}</div>
                                        <div>Thực về: {formatCurrency(order.payment.actual_received_amount || 0)}</div>
                                        <div>Phí thẻ: {formatCurrency(order.payment.fee_amount || 0)}</div>
                                        <div>Ngày về: {order.payment.card_settlement_date}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Audit Trail Timeline */}
                {order.audits && order.audits.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-semibold text-sm text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                            <span>📜</span> Lịch Sử Điều Chỉnh & Nhật Ký Kiểm Soát (Audit Logs)
                        </h3>

                        <div className="space-y-4">
                            {order.audits.map((audit) => (
                                <div key={audit.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                    <div className="flex justify-between items-center text-slate-600 mb-1">
                                        <span className="font-semibold text-slate-800">
                                            Thao tác: {audit.action === 'update' ? 'Chỉnh sửa' : 'Hủy bỏ'} (Phiên bản v
                                            {audit.version})
                                        </span>
                                        <span>
                                            Bởi: <strong>{audit.user?.name || 'Quản lý'}</strong> •{' '}
                                            {new Date(audit.created_at).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    <div className="text-rose-700 bg-rose-50 p-2 rounded border border-rose-100 mt-1">
                                        <strong>Lý do ghi nhận:</strong> {audit.reason}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
