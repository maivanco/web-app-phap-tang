import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';

interface Branch {
    id: number;
    code: string;
    name: string;
    address?: string;
}

interface ReceiptNote {
    id: number;
    note_code: string;
    received_date: string;
    appointment_date: string | null;
    customer_name: string;
    customer_phone: string | null;
    service_types: string[] | null;
    service_labels: string;
    other_service_description: string | null;
    estimated_price: number;
    estimated_pickup_time: string | null;
    has_photos_saved: boolean;
    inspected_at_counter: boolean;
    final_amount: number;
    status: 'chua_giao' | 'da_giao' | 'da_huy';
    status_label: string;
    delivered_at: string | null;
    proxy_receiver_info: string | null;
    receiver_signature: string | null;
    delivery_staff_name: string | null;
    branch?: Branch;
    creator?: { id: number; name: string };
    notes?: string | null;
    created_at: string;
}

interface ShowProps extends PageProps {
    receiptNote: ReceiptNote;
}

export default function Show({ auth, receiptNote }: ShowProps) {
    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '.......................';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('vi-VN');
        } catch {
            return dateStr;
        }
    };

    const formatCurrency = (val?: number) => {
        if (val === undefined || val === null || val === 0) return '.......................';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    const serviceTypes = receiptNote.service_types || [];
    const isThayDay = serviceTypes.includes('thay_day');
    const isThatLai = serviceTypes.includes('that_lai');
    const isChinhSize = serviceTypes.includes('chinh_size');
    const isKhac = serviceTypes.includes('khac');

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Chi tiết phiếu {receiptNote.note_code}</h2>}
        >
            <Head title={`Phiếu ${receiptNote.note_code}`} />

            <div className="py-8">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-4">
                    {/* Top Action Bar (hidden when printing) */}
                    <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <Link
                            href={route('admin.receipt-notes.index')}
                            className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition"
                        >
                            <span>⬅️ Quay lại danh sách</span>
                        </Link>

                        <div className="flex space-x-3">
                            <Link
                                href={route('admin.receipt-notes.edit', receiptNote.id)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                            >
                                ✏️ Chỉnh sửa
                            </Link>
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center space-x-2"
                            >
                                <span>🖨️ In phiếu ngay</span>
                            </button>
                        </div>
                    </div>

                    {/* PHYSICAL VOUCHER SHEET (Exact replica from attached image) */}
                    <div
                        id="printable-voucher"
                        className="bg-white p-8 md:p-12 rounded-xl shadow-md border-2 border-slate-900 text-slate-900 font-sans print:p-0 print:border-2 print:border-black print:shadow-none print:w-full print:m-0"
                    >
                        {/* Title Header */}
                        <div className="text-center pb-6">
                            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-slate-900">
                                PHIẾU GIAO NHẬN VÒNG THẮT/SỬA MGEMS
                            </h1>
                            {receiptNote.branch && (
                                <p className="text-xs text-slate-600 mt-1 uppercase tracking-widest font-semibold">
                                    Chi nhánh: {receiptNote.branch.name} {receiptNote.branch.address ? `- ${receiptNote.branch.address}` : ''}
                                </p>
                            )}
                        </div>

                        {/* Top 3-cell Table Header */}
                        <div className="border border-slate-900 grid grid-cols-3 divide-x divide-slate-900 mb-2">
                            <div className="p-2.5">
                                <span className="block text-xs font-bold uppercase text-slate-700">Mã đơn</span>
                                <div className="text-base font-black font-mono mt-1 text-slate-900">
                                    {receiptNote.note_code}
                                </div>
                            </div>

                            <div className="p-2.5">
                                <span className="block text-xs font-bold uppercase text-slate-700">Ngày nhận</span>
                                <div className="text-sm font-semibold mt-1">
                                    {formatDate(receiptNote.received_date)}
                                </div>
                            </div>

                            <div className="p-2.5">
                                <span className="block text-xs font-bold uppercase text-slate-700">Ngày hẹn trả</span>
                                <div className="text-sm font-semibold mt-1">
                                    {receiptNote.appointment_date ? formatDate(receiptNote.appointment_date) : (receiptNote.estimated_pickup_time || '.......................')}
                                </div>
                            </div>
                        </div>

                        {/* Customer 2-cell Table */}
                        <div className="border border-slate-900 grid grid-cols-3 divide-x divide-slate-900 mb-6">
                            <div className="col-span-2 p-2.5">
                                <span className="block text-xs font-bold uppercase text-slate-700">Tên khách</span>
                                <div className="text-base font-bold mt-1 text-slate-900">
                                    {receiptNote.customer_name}
                                </div>
                            </div>

                            <div className="p-2.5">
                                <span className="block text-xs font-bold uppercase text-slate-700">Số điện thoại</span>
                                <div className="text-sm font-semibold font-mono mt-1">
                                    {receiptNote.customer_phone || '.......................'}
                                </div>
                            </div>
                        </div>

                        {/* Yêu cầu dịch vụ Section */}
                        <div className="mb-6 space-y-3.5">
                            <h2 className="text-base font-black uppercase tracking-wide text-slate-900">
                                Yêu cầu dịch vụ
                            </h2>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                                <label className="flex items-center space-x-2">
                                    <span className="w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-xs font-black">
                                        {isThayDay ? '✓' : ''}
                                    </span>
                                    <span className="font-medium">Thay dây</span>
                                </label>

                                <label className="flex items-center space-x-2">
                                    <span className="w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-xs font-black">
                                        {isThatLai ? '✓' : ''}
                                    </span>
                                    <span className="font-medium">Thắt lại</span>
                                </label>

                                <label className="flex items-center space-x-2">
                                    <span className="w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-xs font-black">
                                        {isChinhSize ? '✓' : ''}
                                    </span>
                                    <span className="font-medium">Chỉnh size</span>
                                </label>

                                <label className="flex items-center space-x-2">
                                    <span className="w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-xs font-black">
                                        {isKhac ? '✓' : ''}
                                    </span>
                                    <span className="font-medium">
                                        Khác:{' '}
                                        <span className="font-normal underline underline-offset-4 decoration-dotted">
                                            {receiptNote.other_service_description || '...................................................'}
                                        </span>
                                    </span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-1">
                                <div>
                                    <span className="font-bold">Giá dự kiến: </span>
                                    <span className="font-mono font-semibold underline underline-offset-4">
                                        {receiptNote.estimated_price > 0 ? formatCurrency(receiptNote.estimated_price) : '0 đ (Miễn phí)'}
                                    </span>
                                </div>

                                <div>
                                    <span className="font-bold">Thời gian nhận lại dự kiến: </span>
                                    <span className="font-semibold underline underline-offset-4">
                                        {receiptNote.estimated_pickup_time || '...................................'}
                                    </span>
                                </div>
                            </div>

                            <div className="text-sm pt-1 flex items-center space-x-6">
                                <span className="font-bold">Ảnh tình trạng vòng đã lưu trên chatbot:</span>
                                <div className="flex items-center space-x-4">
                                    <span className="flex items-center space-x-1.5">
                                        <span className="w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-xs font-black">
                                            {receiptNote.has_photos_saved ? '✓' : ''}
                                        </span>
                                        <span>Có</span>
                                    </span>

                                    <span className="flex items-center space-x-1.5">
                                        <span className="w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-xs font-black">
                                            {!receiptNote.has_photos_saved ? '✓' : ''}
                                        </span>
                                        <span>Chưa</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Divider Line */}
                        <div className="border-t-2 border-slate-900 my-6"></div>

                        {/* Giao trả thành phẩm Section */}
                        <div className="space-y-4">
                            <h2 className="text-base font-black uppercase tracking-wide text-slate-900">
                                Giao trả thành phẩm
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center space-x-2">
                                    <span className="font-bold">Khách đã kiểm tra vòng tại quầy:</span>
                                    <span className="flex items-center space-x-1.5">
                                        <span className="w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-xs font-black">
                                            {receiptNote.inspected_at_counter ? '✓' : ''}
                                        </span>
                                        <span>Có</span>
                                    </span>
                                </div>

                                <div>
                                    <span className="font-bold">Số tiền cần thanh toán: </span>
                                    <span className="font-mono font-bold underline underline-offset-4">
                                        {receiptNote.final_amount > 0 ? formatCurrency(receiptNote.final_amount) : '...................................'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-bold">Ngày / giờ giao: </span>
                                    <span className="font-semibold underline underline-offset-4">
                                        {receiptNote.delivered_at ? new Date(receiptNote.delivered_at).toLocaleString('vi-VN') : '...................................'}
                                    </span>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <span className="font-bold">Trạng thái:</span>
                                    <span className="flex items-center space-x-1.5">
                                        <span className="w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-xs font-black">
                                            {receiptNote.status === 'da_giao' ? '✓' : ''}
                                        </span>
                                        <span>Đã giao</span>
                                    </span>

                                    <span className="flex items-center space-x-1.5">
                                        <span className="w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-xs font-black">
                                            {receiptNote.status === 'chua_giao' ? '✓' : ''}
                                        </span>
                                        <span>Chưa giao</span>
                                    </span>
                                </div>
                            </div>

                            <div className="text-sm">
                                <span className="font-bold">Thông tin / cách xác minh người nhận thay: </span>
                                <span className="underline underline-offset-4 decoration-dotted">
                                    {receiptNote.proxy_receiver_info || '................................................................................................................................................'}
                                </span>
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-2 gap-8 pt-8 pb-4 text-center">
                                <div>
                                    <p className="font-bold text-sm">Khách / người nhận ký:</p>
                                    <div className="h-20 flex items-end justify-center">
                                        {receiptNote.receiver_signature ? (
                                            <span className="font-serif italic font-semibold text-slate-800">
                                                {receiptNote.receiver_signature}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">(Ký và ghi rõ họ tên)</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <p className="font-bold text-sm">Nhân viên giao:</p>
                                    <div className="h-20 flex items-end justify-center">
                                        {receiptNote.delivery_staff_name ? (
                                            <span className="font-semibold text-slate-800">
                                                {receiptNote.delivery_staff_name}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">(Ký và ghi rõ họ tên)</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {receiptNote.notes && (
                                <div className="pt-2 text-xs text-slate-500 border-t border-slate-200">
                                    <span className="font-bold">Ghi chú: </span>
                                    <span>{receiptNote.notes}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
