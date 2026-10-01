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

interface FinancialAccount {
    id: number;
    code: string;
    letter_code: string;
    name: string;
}

interface Consultant {
    id: number;
    name: string;
    email?: string;
    role?: string;
}

interface CreateOrderProps extends PageProps {
    branches: Branch[];
    brands: Brand[];
    customer_sources: CustomerSource[];
    bank_accounts: FinancialAccount[];
    consultants?: Consultant[];
    selected_branch_id?: number | null;
}

interface OrderItemInput {
    product_name: string;
    brand_id: number;
    quantity: number;
    unit_price: number;
}

export default function CreateOrder({
    auth,
    branches,
    brands,
    customer_sources,
    bank_accounts,
    consultants = [],
    selected_branch_id,
}: CreateOrderProps) {
    const defaultBranchId = selected_branch_id || branches[0]?.id || 1;
    const defaultBrandId = brands[0]?.id || 1;
    const defaultSourceId = customer_sources[0]?.id || 1;
    const defaultConsultantId = auth.user?.id || (consultants.length > 0 ? consultants[0].id : '');

    const [items, setItems] = useState<OrderItemInput[]>([
        { product_name: '', brand_id: defaultBrandId, quantity: 1, unit_price: 0 },
    ]);

    const { data, setData, post, processing, errors } = useForm({
        branch_id: defaultBranchId,
        sale_date: new Date().toISOString().split('T')[0],
        consultant_id: defaultConsultantId,
        customer_name: '',
        customer_phone: '',
        customer_gender: 'Nam',
        customer_source_id: defaultSourceId,
        discount_code: 'E',
        note: '',
        payment_method: 'cash',
        payment_account_id: bank_accounts[0]?.id || null,
        card_swipe_date: new Date().toISOString().split('T')[0],
        items: items,
    });

    // Discount rate mapping
    const discountRates: Record<string, number> = {
        A: 0.03,
        B: 0.05,
        C: 0.10,
        D: 0.15,
        E: 0.00,
    };

    // Live mathematical calculations with discrepancy adjustment on the last item
    const calculation = useMemo(() => {
        const rate = discountRates[data.discount_code] || 0;
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
        setItems(items.filter((_, i) => i !== index));
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

        const invalidItemIndex = items.findIndex((it) => !it.unit_price || it.unit_price <= 0);
        if (invalidItemIndex !== -1) {
            setItemError(`Đơn giá của sản phẩm #${invalidItemIndex + 1} phải lớn hơn 0.`);
            return;
        }

        data.items = items;
        post(route('admin.cashflow.orders.store'));
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
                            🛍️ Nhập Đơn Bán Hàng Mới
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Quy trình bán hàng từng bước chuẩn Hệ Thống Pháp Tạng
                        </p>
                    </div>
                    <Link
                        href={route('admin.cashflow.orders.index')}
                        className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg transition"
                    >
                        ← Danh sách đơn
                    </Link>
                </div>
            }
        >
            <Head title="Nhập Đơn Hàng Mới - Pháp Tạng" />

            <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1: Branch & Sale Date */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-semibold text-sm text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                            <span>🏢</span> Bước 1: Chi nhánh & Ngày bán
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Chi nhánh làm việc (lưu trong phiên) <span className="text-red-500">*</span>
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
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Ngày bán hàng
                                </label>
                                <input
                                    type="date"
                                    value={data.sale_date}
                                    onChange={(e) => setData('sale_date', e.target.value)}
                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 2 & 3: Consultant & Customer Information */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-semibold text-sm text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                            <span>👤</span> Bước 2 & 3: Thông tin tư vấn viên & Khách hàng
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Tư vấn viên <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.consultant_id}
                                    onChange={(e) => setData('consultant_id', e.target.value ? Number(e.target.value) : '')}
                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                >
                                    <option value="">-- Chọn tư vấn viên --</option>
                                    {consultants.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} {u.role ? `(${u.role})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.consultant_id && <p className="text-xs text-red-600 mt-1">{errors.consultant_id}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Tên khách hàng <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.customer_name}
                                    onChange={(e) => setData('customer_name', e.target.value)}
                                    placeholder="Nhập tên khách hàng"
                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                                />
                                {errors.customer_name && <p className="text-xs text-red-600 mt-1">{errors.customer_name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    SĐT khách (dạng text, giữ số 0 đầu) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.customer_phone}
                                    onChange={(e) => setData('customer_phone', e.target.value)}
                                    placeholder="Ví dụ: 0912345678"
                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                                />
                                {errors.customer_phone && <p className="text-xs text-red-600 mt-1">{errors.customer_phone}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Giới tính khách hàng <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.customer_gender}
                                    onChange={(e) => setData('customer_gender', e.target.value)}
                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                                >
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Nguồn khách hàng (A-F) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.customer_source_id}
                                    onChange={(e) => setData('customer_source_id', Number(e.target.value))}
                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm"
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

                    {/* Step 4: Product Items (Multi-line) */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center justify-between border-b pb-2 mb-4">
                            <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                <span>📦</span> Bước 4: Danh sách sản phẩm (Đơn nhiều sản phẩm, nhiều thương hiệu)
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-medium transition"
                            >
                                ➕ Thêm sản phẩm
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
                                            Sản phẩm #{idx + 1} - Tên sản phẩm
                                        </label>
                                        <input
                                            type="text"
                                            value={item.product_name}
                                            onChange={(e) => handleItemChange(idx, 'product_name', e.target.value)}
                                            placeholder="Ví dụ: Nhang Nag, Vòng Băng Chủng..."
                                            className="w-full rounded-md border-gray-300 text-xs px-2.5 py-1.5 shadow-sm"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-xs text-gray-600 mb-1">Thương hiệu</label>
                                        <select
                                            value={item.brand_id}
                                            onChange={(e) => handleItemChange(idx, 'brand_id', Number(e.target.value))}
                                            className="w-full rounded-md border-gray-300 text-xs px-2.5 py-1.5 shadow-sm"
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
                                            className="w-full rounded-md border-gray-300 text-xs px-2.5 py-1.5 shadow-sm"
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
                                                    : 'border-gray-300'
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
                                                className="text-red-500 hover:text-red-700 text-sm p-1.5"
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

                    {/* Step 5: Discount & Live Calculations */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-semibold text-sm text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                            <span>🏷️</span> Bước 5: Chiết khấu toàn đơn & Tính tiền
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Mức chiết khấu toàn đơn (A-E)
                                </label>
                                <select
                                    value={data.discount_code}
                                    onChange={(e) => setData('discount_code', e.target.value)}
                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm"
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
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Ghi chú đơn hàng (nhập - nếu không có)
                                    </label>
                                    <textarea
                                        value={data.note}
                                        onChange={(e) => setData('note', e.target.value)}
                                        rows={2}
                                        placeholder="Ghi chú thêm..."
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Summary Card */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                                <div className="font-semibold text-gray-800 text-sm mb-2 border-b pb-1">
                                    📊 Tóm Tắt Giá Trị Đơn Hàng
                                </div>
                                <div className="flex justify-between py-1 text-gray-600">
                                    <span>Tổng trước giảm:</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(calculation.totalGross)}</span>
                                </div>
                                <div className="flex justify-between py-1 text-amber-700">
                                    <span>Giảm giá ({calculation.rate * 100}%):</span>
                                    <span className="font-semibold">-{formatCurrency(calculation.orderDiscount)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-t border-slate-200 text-sm font-bold text-emerald-700">
                                    <span>Doanh thu sau giảm:</span>
                                    <span>{formatCurrency(calculation.netRevenue)}</span>
                                </div>

                                <div className="mt-2 pt-2 border-t border-slate-200">
                                    <span className="text-[11px] text-gray-500 font-medium">Chi tiết phân bổ dòng:</span>
                                    <div className="space-y-1 mt-1">
                                        {calculation.items.map((it, i) => (
                                            <div key={i} className="flex justify-between text-[11px] text-gray-600">
                                                <span>{it.product_name || `Dòng ${i + 1}`} (SL: {it.quantity}):</span>
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

                    {/* Step 6: Payment Method */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-semibold text-sm text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                            <span>💳</span> Bước 6: Hình thức thanh toán
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                                    <div className="text-[11px] text-gray-500">Tự động gắn quỹ chi nhánh</div>
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
                                    <div className="text-sm">🏦 Chuyển khoản</div>
                                    <div className="text-[11px] text-gray-500">Tài khoản ngân hàng A-G</div>
                                </div>
                            </label>

                            <label
                                className={`border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition ${
                                    data.payment_method === 'card_swipe'
                                        ? 'border-purple-500 bg-purple-50 text-purple-950 font-medium ring-2 ring-purple-500/20'
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="card_swipe"
                                    checked={data.payment_method === 'card_swipe'}
                                    onChange={(e) => setData('payment_method', e.target.value)}
                                    className="text-purple-600 focus:ring-purple-500"
                                />
                                <div>
                                    <div className="text-sm">💳 Quẹt thẻ (Cổng F)</div>
                                    <div className="text-[11px] text-gray-500">Trạng thái Chờ tiền về</div>
                                </div>
                            </label>

                            <label
                                className={`border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition ${
                                    data.payment_method === 'unpaid'
                                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-medium ring-2 ring-amber-500/20'
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="unpaid"
                                    checked={data.payment_method === 'unpaid'}
                                    onChange={(e) => setData('payment_method', e.target.value)}
                                    className="text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                    <div className="text-sm">⏳ Chưa thanh toán</div>
                                    <div className="text-[11px] text-gray-500">Đơn hàng công nợ / chưa thu tiền</div>
                                </div>
                            </label>
                        </div>

                        {data.payment_method === 'bank_transfer' && (
                            <div className="bg-blue-50/60 rounded-lg p-3.5 border border-blue-200">
                                <label className="block text-xs font-medium text-blue-900 mb-1">
                                    Chọn tài khoản ngân hàng nhận tiền (A-G) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.payment_account_id || ''}
                                    onChange={(e) => setData('payment_account_id', Number(e.target.value))}
                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm"
                                >
                                    {bank_accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.letter_code}. {acc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {data.payment_method === 'card_swipe' && (
                            <div className="bg-purple-50/60 rounded-lg p-3.5 border border-purple-200">
                                <label className="block text-xs font-medium text-purple-900 mb-1">
                                    Ngày khách quẹt thẻ (mặc định hôm nay)
                                </label>
                                <input
                                    type="date"
                                    value={data.card_swipe_date}
                                    onChange={(e) => setData('card_swipe_date', e.target.value)}
                                    className="w-full md:w-1/2 rounded-md border-gray-300 text-sm shadow-sm"
                                />
                                <p className="text-xs text-purple-700 mt-1">
                                    📌 Tiền chưa vào tài khoản ngân hàng ngay. Quản lý sẽ đối soát và cập nhật tiền thực về sau.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4">
                        <Link
                            href={route('admin.cashflow.orders.index')}
                            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                        >
                            Hủy bỏ bản nháp
                        </Link>

                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md transition disabled:opacity-50"
                        >
                            {processing ? 'Đang lưu đơn hàng...' : '💾 Xong, Lưu Đơn Hàng'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
