import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
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

interface Consultant {
    id: number;
    name: string;
    email?: string;
    role?: string;
}

interface OrderItemInput {
    id?: number;
    product_name: string;
    brand_id: number;
    quantity: number;
    unit_price: number;
}

interface EditOrderProps extends PageProps {
    order: {
        id: number;
        order_code: string;
        sale_date: string;
        branch_id: number;
        branch?: { id: number; name: string; code: string };
        consultant_id?: number | null;
        consultant?: { id: number; name: string; role?: string };
        consultant_name?: string | null;
        customer_name: string;
        customer_phone: string;
        customer_gender: string;
        customer_source_id: number;
        customer_source?: { id: number; name: string; code: string };
        discount_code: string;
        discount_rate: number;
        gross_amount: number;
        discount_amount: number;
        net_revenue: number;
        note?: string | null;
        status: string;
        version: number;
        created_at: string;
        creator?: { id: number; name: string };
        items: Array<{
            id: number;
            line_number: number;
            product_name: string;
            brand_id: number;
            brand?: { id: number; name: string; code: string };
            quantity: number;
            unit_price: number;
            gross_amount: number;
            allocated_discount: number;
            net_amount: number;
        }>;
        payment?: {
            method: string;
            amount: number;
            status: string;
            account?: { name: string };
            card_swipe_date?: string | null;
            card_settlement_date?: string | null;
        };
    };
    branches: Branch[];
    brands: Brand[];
    customer_sources: CustomerSource[];
    consultants?: Consultant[];
}

export default function EditOrder({
    auth,
    order,
    branches,
    brands,
    customer_sources,
    consultants = [],
}: EditOrderProps) {
    const defaultBrandId = brands[0]?.id || 1;

    // Check restriction flags
    const isReconciled = order.payment?.status === 'reconciled';
    const isCancelled = order.status === 'cancelled';
    const isEditable = !isReconciled && !isCancelled;

    // Initial items state from existing order line items
    const [items, setItems] = useState<OrderItemInput[]>(
        order.items && order.items.length > 0
            ? order.items.map((it) => ({
                  id: it.id,
                  product_name: it.product_name,
                  brand_id: it.brand_id || it.brand?.id || defaultBrandId,
                  quantity: it.quantity,
                  unit_price: it.unit_price,
              }))
            : [{ product_name: '', brand_id: defaultBrandId, quantity: 1, unit_price: 0 }]
    );

    const { data, setData, put, processing, errors } = useForm({
        reason: '',
        consultant_id: order.consultant_id || (order.consultant?.id ?? ''),
        consultant_name: order.consultant_name || order.consultant?.name || '',
        customer_name: order.customer_name || '',
        customer_phone: order.customer_phone || '',
        customer_gender: order.customer_gender || 'Nam',
        customer_source_id: order.customer_source_id || customer_sources[0]?.id || 1,
        discount_code: order.discount_code || 'E',
        note: order.note || '',
        items: items,
    });

    const discountRates: Record<string, number> = {
        A: 0.03,
        B: 0.05,
        C: 0.10,
        D: 0.15,
        E: 0.00,
    };

    // Live mathematical calculations with discrepancy adjustment on the last item
    const calculation = useMemo(() => {
        const rate = discountRates[data.discount_code] ?? 0;
        let totalGross = 0;

        const calculatedItems = items.map((it, idx) => {
            const lineGross = (it.quantity || 0) * (it.unit_price || 0);
            totalGross += lineGross;
            return {
                ...it,
                line_number: idx + 1,
                gross_amount: lineGross,
                allocated_discount: 0,
                net_amount: lineGross,
            };
        });

        const orderDiscount = Math.round(totalGross * rate);
        const netRevenue = totalGross - orderDiscount;

        let allocatedSoFar = 0;
        const totalItems = calculatedItems.length;

        calculatedItems.forEach((it, idx) => {
            if (orderDiscount <= 0 || totalGross <= 0) {
                it.allocated_discount = 0;
                it.net_amount = it.gross_amount;
                return;
            }

            let itemDiscount = 0;
            if (idx === totalItems - 1) {
                itemDiscount = orderDiscount - allocatedSoFar;
            } else {
                itemDiscount = Math.round(it.gross_amount * (orderDiscount / totalGross));
                allocatedSoFar += itemDiscount;
            }
            it.allocated_discount = itemDiscount;
            it.net_amount = it.gross_amount - itemDiscount;
        });

        return {
            totalGross,
            orderDiscount,
            netRevenue,
            rate,
            items: calculatedItems,
        };
    }, [items, data.discount_code]);

    const handleAddItem = () => {
        setItems([
            ...items,
            { product_name: '', brand_id: defaultBrandId, quantity: 1, unit_price: 0 },
        ]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length <= 1) return;
        const updated = items.filter((_, i) => i !== index);
        setItems(updated);
        setData('items', updated);
    };

    const handleItemChange = (index: number, field: keyof OrderItemInput, value: any) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
        setData('items', updated);
    };

    const [itemError, setItemError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setItemError(null);

        if (!data.reason || data.reason.trim().length < 5) {
            setItemError('Lý do điều chỉnh đơn hàng bắt buộc phải có tối thiểu 5 ký tự để ghi nhận lịch sử kiểm toán.');
            return;
        }

        const emptyNameIndex = items.findIndex((it) => !it.product_name || !it.product_name.trim());
        if (emptyNameIndex !== -1) {
            setItemError(`Tên của sản phẩm dòng #${emptyNameIndex + 1} không được để trống.`);
            return;
        }

        const invalidItemIndex = items.findIndex((it) => !it.unit_price || it.unit_price <= 0);
        if (invalidItemIndex !== -1) {
            setItemError(`Đơn giá của sản phẩm dòng #${invalidItemIndex + 1} phải lớn hơn 0.`);
            return;
        }

        data.items = items;
        put(route('admin.cashflow.orders.update', order.id));
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
    };

    const revenueDifference = calculation.netRevenue - order.net_revenue;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                                ✏️ Chỉnh Sửa Đơn Hàng: {order.order_code}
                            </h2>
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                                Phiên bản hiện tại: v{order.version}
                            </span>
                            {order.status === 'completed' ? (
                                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                    Hoàn tất
                                </span>
                            ) : (
                                <span className="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                    Đã hủy
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Mọi thay đổi sẽ tạo một phiên bản kiểm toán mới (v{order.version + 1}) và đồng bộ lại Google Sheets
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('admin.cashflow.orders.show', order.id)}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-1.5 rounded-lg transition font-medium"
                        >
                            ← Xem chi tiết
                        </Link>
                        <Link
                            href={route('admin.cashflow.orders.index')}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-1.5 rounded-lg transition"
                        >
                            Danh sách đơn
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title={`Sửa đơn hàng ${order.order_code}`} />

            <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* 1. Alerts & Restriction Banners */}
                {isReconciled && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl text-xs text-rose-800 shadow-sm flex items-start gap-3">
                        <span className="text-lg">⛔</span>
                        <div>
                            <h4 className="font-bold text-sm text-rose-900">Không thể chỉnh sửa đơn hàng này</h4>
                            <p className="mt-1">
                                Giao dịch thanh toán qua quẹt thẻ của đơn hàng này đã được Quản lý đối soát và tất toán thành công (`reconciled`). Theo quy chuẩn tài chính, dữ liệu đối soát đã chốt sổ và không được phép sửa đổi trực tiếp.
                            </p>
                        </div>
                    </div>
                )}

                {isCancelled && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl text-xs text-rose-800 shadow-sm flex items-start gap-3">
                        <span className="text-lg">⛔</span>
                        <div>
                            <h4 className="font-bold text-sm text-rose-900">Đơn hàng đã bị hủy</h4>
                            <p className="mt-1">
                                Đơn hàng này đang ở trạng thái đã hủy bỏ (`cancelled`). Không thể thực hiện cập nhật nội dung cho đơn hàng đã hủy.
                            </p>
                        </div>
                    </div>
                )}

                {!isEditable && (
                    <div className="flex justify-end">
                        <Link
                            href={route('admin.cashflow.orders.show', order.id)}
                            className="bg-gray-700 hover:bg-gray-800 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                            Quay lại trang chi tiết đơn
                        </Link>
                    </div>
                )}

                {isEditable && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Audit Requirement Warning Card */}
                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-sm">
                            <span className="text-base">🛡️</span>
                            <div className="space-y-1">
                                <span className="font-semibold text-amber-950">Quy tắc điều chỉnh đơn hàng quản lý:</span>
                                <p className="text-amber-800">
                                    Thao tác sửa đơn hàng sẽ ghi nhận một bản ghi kiểm toán mới với phiên bản <strong>v{order.version + 1}</strong>. Bạn cần cung cấp lý do điều chỉnh cụ thể. Số tiền thanh toán và doanh thu dòng sẽ được tính toán lại tự động.
                                </p>
                            </div>
                        </div>

                        {/* Step 1: Reason for Audit (MANDATORY) */}
                        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-5 ring-1 ring-amber-400/20">
                            <h3 className="font-semibold text-sm text-gray-900 border-b pb-2 mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span>📝</span>
                                    <span>Lý do điều chỉnh (Bắt buộc cho nhật ký kiểm toán) <span className="text-red-500">*</span></span>
                                </div>
                                <span className="text-[11px] text-gray-400 font-normal">Tối thiểu 5 ký tự</span>
                            </h3>

                            <div>
                                <textarea
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    rows={2}
                                    placeholder="Ví dụ: Khách đổi sang kích cỡ vòng lớn hơn, sửa nhầm thông tin số điện thoại khách hàng, cập nhật lại thương hiệu..."
                                    className={`w-full rounded-md text-sm shadow-sm ${
                                        errors.reason
                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'
                                    }`}
                                    required
                                />
                                {errors.reason && (
                                    <p className="text-xs text-red-600 mt-1 font-medium">{errors.reason}</p>
                                )}
                            </div>
                        </div>

                        {/* Order Fixed Metadata (Read-Only) */}
                        <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5">
                            <h3 className="font-semibold text-xs text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span>🔒</span> Thông tin định danh đơn hàng (Cố định theo sổ tiền)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <span className="text-gray-400">Mã đơn hàng:</span>
                                    <div className="font-bold text-gray-900 text-sm mt-0.5">{order.order_code}</div>
                                </div>
                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <span className="text-gray-400">Chi nhánh bán:</span>
                                    <div className="font-semibold text-gray-900 mt-0.5">
                                        {order.branch?.name || `CN #${order.branch_id}`} ({order.branch?.code})
                                    </div>
                                </div>
                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <span className="text-gray-400">Ngày bán:</span>
                                    <div className="font-semibold text-gray-900 mt-0.5">
                                        {new Date(order.sale_date).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <span className="text-gray-400">Phương thức thanh toán:</span>
                                    <div className="font-semibold text-gray-900 mt-0.5">
                                        {order.payment?.method === 'cash'
                                            ? '💵 Tiền mặt'
                                            : order.payment?.method === 'card_swipe'
                                            ? '💳 Quẹt thẻ (Cổng F)'
                                            : order.payment?.method === 'unpaid'
                                            ? '⏳ Chưa thanh toán'
                                            : `🏦 Chuyển khoản (${order.payment?.account?.name || 'Ngân hàng'})`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Consultant & Customer Information */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-semibold text-sm text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                                <span>👤</span> Thông tin tư vấn viên & Khách hàng
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1">
                                        Tư vấn viên <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.consultant_id}
                                        onChange={(e) => {
                                            const selectedId = e.target.value ? Number(e.target.value) : '';
                                            const consultantObj = consultants.find((c) => c.id === selectedId);
                                            setData((prev) => ({
                                                ...prev,
                                                consultant_id: selectedId,
                                                consultant_name: consultantObj ? consultantObj.name : prev.consultant_name,
                                            }));
                                        }}
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                    >
                                        <option value="">-- Chọn tư vấn viên --</option>
                                        {consultants.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} {u.role ? `(${u.role})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.consultant_id && (
                                        <p className="text-xs text-red-600 mt-1">{errors.consultant_id}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-medium text-gray-700 mb-1">
                                        Tên khách hàng <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.customer_name}
                                        onChange={(e) => setData('customer_name', e.target.value)}
                                        placeholder="Nhập tên khách hàng"
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                        required
                                    />
                                    {errors.customer_name && (
                                        <p className="text-xs text-red-600 mt-1">{errors.customer_name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-medium text-gray-700 mb-1">
                                        SĐT khách (dạng text, giữ số 0 đầu) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.customer_phone}
                                        onChange={(e) => setData('customer_phone', e.target.value)}
                                        placeholder="Ví dụ: 0912345678"
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500 font-mono"
                                        required
                                    />
                                    {errors.customer_phone && (
                                        <p className="text-xs text-red-600 mt-1">{errors.customer_phone}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-medium text-gray-700 mb-1">
                                        Giới tính khách hàng <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.customer_gender}
                                        onChange={(e) => setData('customer_gender', e.target.value)}
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                    >
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block font-medium text-gray-700 mb-1">
                                        Nguồn khách hàng (A-F) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.customer_source_id}
                                        onChange={(e) => setData('customer_source_id', Number(e.target.value))}
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                    >
                                        {customer_sources.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.code}. {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Product Items (Multi-line) */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-center justify-between border-b pb-2 mb-4">
                                <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                    <span>📦</span> Danh sách sản phẩm chi tiết
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 cursor-pointer"
                                >
                                    <span>➕</span> Thêm dòng sản phẩm
                                </button>
                            </div>

                            {itemError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                                    <span>⚠️</span> {itemError}
                                </div>
                            )}

                            {(errors as Record<string, string>)['items'] && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                                    <span>⚠️</span> {(errors as Record<string, string>)['items']}
                                </div>
                            )}

                            <div className="space-y-3">
                                {items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                                    >
                                        <div className="md:col-span-4">
                                            <label className="block text-xs text-gray-600 mb-1">
                                                Dòng #{idx + 1} - Tên sản phẩm <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={item.product_name}
                                                onChange={(e) => handleItemChange(idx, 'product_name', e.target.value)}
                                                placeholder="Ví dụ: Nhang Nag, Vòng Trầm..."
                                                className="w-full rounded-md border-gray-300 text-xs px-2.5 py-1.5 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-3">
                                            <label className="block text-xs text-gray-600 mb-1">Thương hiệu</label>
                                            <select
                                                value={item.brand_id}
                                                onChange={(e) => handleItemChange(idx, 'brand_id', Number(e.target.value))}
                                                className="w-full rounded-md border-gray-300 text-xs px-2.5 py-1.5 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                            >
                                                {brands.map((br) => (
                                                    <option key={br.id} value={br.id}>
                                                        {br.code}. {br.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-xs text-gray-600 mb-1">Số lượng</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                                                className="w-full rounded-md border-gray-300 text-xs px-2.5 py-1.5 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-xs text-gray-600 mb-1">
                                                Đơn giá (đ) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.unit_price === 0 ? '' : item.unit_price}
                                                onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                                placeholder="> 0"
                                                className={`w-full rounded-md text-xs px-2.5 py-1.5 shadow-sm ${
                                                    (errors as Record<string, string>)[`items.${idx}.unit_price`]
                                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                                        : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'
                                                }`}
                                                required
                                            />
                                            {(errors as Record<string, string>)[`items.${idx}.unit_price`] && (
                                                <p className="text-xs text-red-600 mt-1">
                                                    {(errors as Record<string, string>)[`items.${idx}.unit_price`]}
                                                </p>
                                            )}
                                        </div>

                                        <div className="md:col-span-1 flex justify-end">
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="text-red-500 hover:text-red-700 text-sm p-1.5 rounded hover:bg-red-50 transition cursor-pointer"
                                                    title="Xóa dòng"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Step 4: Discount & Financial Comparison */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-semibold text-sm text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                                <span>🏷️</span> Chiết khấu & Tính toán doanh thu
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1">
                                        Mức chiết khấu toàn đơn (A-E)
                                    </label>
                                    <select
                                        value={data.discount_code}
                                        onChange={(e) => setData('discount_code', e.target.value)}
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                    >
                                        <option value="A">A. Giảm 3%</option>
                                        <option value="B">B. Giảm 5%</option>
                                        <option value="C">C. Giảm 10%</option>
                                        <option value="D">D. Giảm 15%</option>
                                        <option value="E">E. Không giảm (0%)</option>
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Chiết khấu toàn đơn được phân bổ đều theo tỷ trọng thành tiền từng dòng hàng
                                    </p>

                                    <div className="mt-4">
                                        <label className="block font-medium text-gray-700 mb-1">
                                            Ghi chú đơn hàng (tùy chọn)
                                        </label>
                                        <textarea
                                            value={data.note}
                                            onChange={(e) => setData('note', e.target.value)}
                                            rows={2}
                                            placeholder="Ghi chú thêm..."
                                            className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>

                                {/* Calculation Comparison Card */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                                    <div className="font-semibold text-gray-800 text-sm mb-2 border-b pb-1 flex items-center justify-between">
                                        <span>📊 Tóm Tắt & So Sánh Giá Trị</span>
                                        <span className="text-[11px] text-gray-500 font-normal">
                                            Cập nhật tức thì
                                        </span>
                                    </div>

                                    <div className="flex justify-between py-1 text-gray-600">
                                        <span>Tổng trước giảm mới:</span>
                                        <span className="font-medium text-gray-900">{formatCurrency(calculation.totalGross)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 text-amber-700">
                                        <span>Chiết khấu ({calculation.rate * 100}%):</span>
                                        <span className="font-semibold">-{formatCurrency(calculation.orderDiscount)}</span>
                                    </div>

                                    <div className="flex justify-between py-1.5 border-t border-slate-200 text-gray-700">
                                        <span>Doanh thu cũ:</span>
                                        <span className="font-mono">{formatCurrency(order.net_revenue)}</span>
                                    </div>

                                    <div className="flex justify-between py-2 border-t border-slate-200 text-sm font-bold text-emerald-700">
                                        <span>Doanh thu dòng mới:</span>
                                        <span>{formatCurrency(calculation.netRevenue)}</span>
                                    </div>

                                    <div className="flex justify-between py-1 text-[11px] font-medium">
                                        <span className="text-gray-500">Chênh lệch doanh thu:</span>
                                        <span className={revenueDifference >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                                            {revenueDifference > 0 ? `+${formatCurrency(revenueDifference)}` : formatCurrency(revenueDifference)}
                                        </span>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-slate-200">
                                        <span className="text-[11px] text-gray-500 font-medium">Phân bổ chiết khấu từng dòng:</span>
                                        <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
                                            {calculation.items.map((it, i) => (
                                                <div key={i} className="flex justify-between text-[11px] text-gray-600">
                                                    <span>{it.product_name || `Dòng ${i + 1}`} (x{it.quantity}):</span>
                                                    <span>
                                                        {formatCurrency(it.gross_amount)} - {formatCurrency(it.allocated_discount)} ={' '}
                                                        <strong className="text-gray-900">{formatCurrency(it.net_amount)}</strong>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4">
                            <Link
                                href={route('admin.cashflow.orders.show', order.id)}
                                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                            >
                                ← Hủy bỏ chỉnh sửa
                            </Link>

                            <button
                                type="submit"
                                disabled={processing}
                                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                            >
                                <span>{processing ? '⏳' : '💾'}</span>
                                <span>
                                    {processing ? 'Đang lưu cập nhật...' : `Lưu Thay Đổi (Cập nhật phiên bản v${order.version + 1})`}
                                </span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
