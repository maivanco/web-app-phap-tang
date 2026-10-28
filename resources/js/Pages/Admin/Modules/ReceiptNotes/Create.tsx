import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';

interface Branch {
    id: number;
    code: string;
    name: string;
}

interface CreateProps extends PageProps {
    branches: Branch[];
    suggestedCode: string;
    today: string;
}

export default function Create({ auth, branches, suggestedCode, today }: CreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        note_code: suggestedCode,
        received_date: today,
        appointment_date: today,
        customer_name: '',
        customer_phone: '',
        service_types: ['thay_day'] as string[],
        other_service_description: '',
        estimated_price: 50000,
        estimated_pickup_time: '17:00 chiều nay',
        has_photos_saved: true,
        inspected_at_counter: false,
        final_amount: 50000,
        status: 'chua_giao' as 'chua_giao' | 'da_giao' | 'da_huy',
        delivered_at: '',
        proxy_receiver_info: '',
        receiver_signature: '',
        delivery_staff_name: auth?.user?.name || '',
        branch_id: branches.length > 0 ? branches[0].id : '',
        notes: '',
    });

    const toggleService = (type: string) => {
        if (data.service_types.includes(type)) {
            setData('service_types', data.service_types.filter((t) => t !== type));
        } else {
            setData('service_types', [...data.service_types, type]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.receipt-notes.store'));
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Tạo phiếu giao nhận mới</h2>}
        >
            <Head title="Tạo phiếu giao nhận MGEMS" />

            <div className="py-8">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Title Header */}
                        <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">MGEMS Jewelry & Craft</span>
                                    <h1 className="text-xl font-black mt-1 tracking-wide">
                                        PHIẾU GIAO NHẬN VÒNG THẮT / SỬA
                                    </h1>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-slate-400 block">Mã phiếu đề xuất</span>
                                    <span className="text-base font-mono font-bold text-amber-400">{data.note_code}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 space-y-8">
                            {/* Section 1: Thông tin đơn & Khách hàng */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center space-x-2">
                                    <span>👤</span>
                                    <span>1. Thông tin chung & Khách hàng</span>
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Mã đơn / Mã phiếu <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.note_code}
                                            onChange={(e) => setData('note_code', e.target.value)}
                                            className="w-full text-sm font-mono rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                            required
                                        />
                                        {errors.note_code && <p className="text-xs text-rose-500 mt-1">{errors.note_code}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Ngày nhận <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={data.received_date}
                                            onChange={(e) => setData('received_date', e.target.value)}
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                            required
                                        />
                                        {errors.received_date && <p className="text-xs text-rose-500 mt-1">{errors.received_date}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Ngày hẹn trả
                                        </label>
                                        <input
                                            type="date"
                                            value={data.appointment_date}
                                            onChange={(e) => setData('appointment_date', e.target.value)}
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Tên khách hàng <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.customer_name}
                                            onChange={(e) => setData('customer_name', e.target.value)}
                                            placeholder="Họ tên khách hàng..."
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                            required
                                        />
                                        {errors.customer_name && <p className="text-xs text-rose-500 mt-1">{errors.customer_name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Số điện thoại
                                        </label>
                                        <input
                                            type="text"
                                            value={data.customer_phone}
                                            onChange={(e) => setData('customer_phone', e.target.value)}
                                            placeholder="Ví dụ: 0912345678"
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Chi nhánh tiếp nhận
                                        </label>
                                        <select
                                            value={data.branch_id}
                                            onChange={(e) => setData('branch_id', e.target.value)}
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                        >
                                            <option value="">-- Chọn chi nhánh --</option>
                                            {branches.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Yêu cầu dịch vụ */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center space-x-2">
                                    <span>🛠️</span>
                                    <span>2. Yêu cầu dịch vụ</span>
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Loại dịch vụ (Chọn các yêu cầu phù hợp):
                                        </label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {[
                                                { id: 'thay_day', label: 'Thay dây' },
                                                { id: 'that_lai', label: 'Thắt lại' },
                                                { id: 'chinh_size', label: 'Chỉnh size' },
                                                { id: 'khac', label: 'Khác' },
                                            ].map((svc) => (
                                                <label
                                                    key={svc.id}
                                                    className={`flex items-center p-3 rounded-xl border cursor-pointer transition ${
                                                        data.service_types.includes(svc.id)
                                                            ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-semibold'
                                                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={data.service_types.includes(svc.id)}
                                                        onChange={() => toggleService(svc.id)}
                                                        className="rounded text-amber-600 focus:ring-amber-500 mr-2.5 h-4 w-4"
                                                    />
                                                    <span className="text-sm">{svc.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {data.service_types.includes('khac') && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Mô tả yêu cầu dịch vụ khác
                                            </label>
                                            <input
                                                type="text"
                                                value={data.other_service_description}
                                                onChange={(e) => setData('other_service_description', e.target.value)}
                                                placeholder="Mô tả cụ thể yêu cầu của khách..."
                                                className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Giá dự kiến (VNĐ)
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={data.estimated_price}
                                                onChange={(e) => setData('estimated_price', parseFloat(e.target.value) || 0)}
                                                className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Thời gian nhận lại dự kiến
                                            </label>
                                            <input
                                                type="text"
                                                value={data.estimated_pickup_time}
                                                onChange={(e) => setData('estimated_pickup_time', e.target.value)}
                                                placeholder="Ví dụ: 15:00 ngày mai, Chiều nay..."
                                                className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Ảnh tình trạng vòng trên chatbot
                                            </label>
                                            <div className="flex items-center space-x-4 mt-2">
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="has_photos_saved"
                                                        checked={data.has_photos_saved === true}
                                                        onChange={() => setData('has_photos_saved', true)}
                                                        className="text-amber-600 focus:ring-amber-500"
                                                    />
                                                    <span className="ml-2 text-sm text-slate-700 font-medium">Có</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="has_photos_saved"
                                                        checked={data.has_photos_saved === false}
                                                        onChange={() => setData('has_photos_saved', false)}
                                                        className="text-amber-600 focus:ring-amber-500"
                                                    />
                                                    <span className="ml-2 text-sm text-slate-700">Chưa</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Giao trả thành phẩm */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center space-x-2">
                                    <span>📦</span>
                                    <span>3. Giao trả thành phẩm & Bàn giao</span>
                                </h3>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Trạng thái giao nhận
                                            </label>
                                            <select
                                                value={data.status}
                                                onChange={(e) => {
                                                    const s = e.target.value as any;
                                                    setData('status', s);
                                                    if (s === 'da_giao' && !data.delivered_at) {
                                                        setData('delivered_at', new Date().toISOString().slice(0, 16));
                                                    }
                                                }}
                                                className="w-full text-sm font-medium rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                            >
                                                <option value="chua_giao">⏳ Chưa giao</option>
                                                <option value="da_giao">✅ Đã giao</option>
                                                <option value="da_huy">❌ Đã hủy</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Số tiền cần thanh toán (VNĐ)
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={data.final_amount}
                                                onChange={(e) => setData('final_amount', parseFloat(e.target.value) || 0)}
                                                className="w-full text-sm font-semibold rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500 text-emerald-700"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Khách đã kiểm tra tại quầy
                                            </label>
                                            <label className="flex items-center cursor-pointer mt-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={data.inspected_at_counter}
                                                    onChange={(e) => setData('inspected_at_counter', e.target.checked)}
                                                    className="rounded text-emerald-600 focus:ring-emerald-500 mr-2 h-4 w-4"
                                                />
                                                <span className="text-sm font-medium text-slate-700">Đã kiểm tra tại quầy</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Ngày / Giờ giao thực tế
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={data.delivered_at}
                                                onChange={(e) => setData('delivered_at', e.target.value)}
                                                className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Nhân viên giao vòng
                                            </label>
                                            <input
                                                type="text"
                                                value={data.delivery_staff_name}
                                                onChange={(e) => setData('delivery_staff_name', e.target.value)}
                                                placeholder="Tên nhân viên phụ trách giao..."
                                                className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Khách / Người nhận ký tên
                                            </label>
                                            <input
                                                type="text"
                                                value={data.receiver_signature}
                                                onChange={(e) => setData('receiver_signature', e.target.value)}
                                                placeholder="Họ tên người ký nhận..."
                                                className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Thông tin / Cách xác minh người nhận thay (nếu không phải chính chủ)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.proxy_receiver_info}
                                            onChange={(e) => setData('proxy_receiver_info', e.target.value)}
                                            placeholder="Ví dụ: Bạn thân, qua tin nhắn Zalo, có đưa tin nhắn xác nhận..."
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Ghi chú */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Ghi chú bổ sung
                                </label>
                                <textarea
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={2}
                                    placeholder="Ghi chú thêm về yêu cầu đặc biệt, lưu ý bảo quản..."
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                />
                            </div>

                            {/* Info Banner */}
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center space-x-2">
                                <span className="text-base">ℹ️</span>
                                <span>Phiếu sau khi lưu sẽ tự động đồng bộ vào Google Sheets (sheet: <strong>Phieu_Giao_Nhan</strong>) theo thời gian thực.</span>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
                            <Link
                                href={route('admin.receipt-notes.index')}
                                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition"
                            >
                                ✕ Hủy bỏ
                            </Link>

                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50"
                            >
                                {processing ? 'Đang lưu...' : '💾 Lưu phiếu & Đồng bộ Google Sheets'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
