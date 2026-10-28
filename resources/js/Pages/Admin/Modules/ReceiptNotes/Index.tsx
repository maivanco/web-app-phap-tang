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
}

interface IndexProps extends PageProps {
    receiptNotes: {
        data: ReceiptNote[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
        total: number;
    };
    summary: {
        total_notes: number;
        pending_count: number;
        delivered_count: number;
        total_estimated: number;
        total_collected: number;
    };
    filters: {
        search?: string;
        status?: string;
        branch_id?: string;
        start_date?: string;
        end_date?: string;
    };
    branches: Branch[];
}

export default function Index({ auth, receiptNotes, summary, filters, branches }: IndexProps) {
    const { flash } = usePage<PageProps>().props as any;

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    // Quick Delivery Modal
    const [deliveringNote, setDeliveringNote] = useState<ReceiptNote | null>(null);
    const [deliveryStaff, setDeliveryStaff] = useState(auth?.user?.name || '');
    const [finalAmount, setFinalAmount] = useState<number>(0);
    const [receiverSignature, setReceiverSignature] = useState('');
    const [proxyInfo, setProxyInfo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFilter = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        router.get(
            route('admin.receipt-notes.index'),
            {
                search: search || undefined,
                status: status || undefined,
                branch_id: branchId || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setStatus('');
        setBranchId('');
        setStartDate('');
        setEndDate('');
        router.get(route('admin.receipt-notes.index'), {}, { replace: true });
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (status) params.append('status', status);
        if (branchId) params.append('branch_id', branchId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        window.open(route('admin.receipt-notes.export') + '?' + params.toString(), '_blank');
    };

    const openDeliverModal = (note: ReceiptNote) => {
        setDeliveringNote(note);
        setFinalAmount(note.final_amount > 0 ? note.final_amount : note.estimated_price);
        setDeliveryStaff(note.delivery_staff_name || auth?.user?.name || '');
        setReceiverSignature(note.receiver_signature || note.customer_name);
        setProxyInfo(note.proxy_receiver_info || '');
    };

    const submitDeliver = (e: React.FormEvent) => {
        e.preventDefault();
        if (!deliveringNote) return;

        setIsSubmitting(true);
        router.post(
            route('admin.receipt-notes.deliver', deliveringNote.id),
            {
                final_amount: finalAmount,
                delivery_staff_name: deliveryStaff,
                receiver_signature: receiverSignature,
                proxy_receiver_info: proxyInfo,
            },
            {
                onSuccess: () => {
                    setDeliveringNote(null);
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            }
        );
    };

    const handleDelete = (note: ReceiptNote) => {
        if (confirm(`Bạn có chắc chắn muốn xóa phiếu ${note.note_code}?`)) {
            router.delete(route('admin.receipt-notes.destroy', note.id));
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('vi-VN');
        } catch {
            return dateStr;
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Phiếu giao nhận vòng thắt/sửa MGEMS</h2>}
        >
            <Head title="Phiếu giao nhận MGEMS" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded shadow-sm flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-xl">✅</span>
                                <span className="font-medium">{flash.success}</span>
                            </div>
                        </div>
                    )}

                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng số phiếu</p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.total_notes}</h3>
                                </div>
                                <span className="p-2.5 bg-blue-50 text-blue-600 rounded-lg text-lg">📝</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Dữ liệu từ hệ thống & Telegram Bot</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50/20">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Chưa giao (Đang xử lý)</p>
                                    <h3 className="text-2xl font-bold text-amber-900 mt-1">{summary.pending_count}</h3>
                                </div>
                                <span className="p-2.5 bg-amber-100 text-amber-700 rounded-lg text-lg">⏳</span>
                            </div>
                            <p className="text-xs text-amber-600 mt-2">Cần thắt/sửa & bàn giao cho khách</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200 bg-emerald-50/20">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Đã bàn giao</p>
                                    <h3 className="text-2xl font-bold text-emerald-900 mt-1">{summary.delivered_count}</h3>
                                </div>
                                <span className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg text-lg">✅</span>
                            </div>
                            <p className="text-xs text-emerald-600 mt-2">Khách đã kiểm tra & nhận vòng</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tiền đã thanh toán</p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(summary.total_collected)}</h3>
                                </div>
                                <span className="p-2.5 bg-purple-50 text-purple-600 rounded-lg text-lg">💰</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Dự kiến: {formatCurrency(summary.total_estimated)}</p>
                        </div>
                    </div>

                    {/* Filter & Action Bar */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <form onSubmit={handleFilter} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Tìm kiếm</label>
                                    <input
                                        type="text"
                                        placeholder="Tìm theo mã phiếu, tên, SĐT khách..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Trạng thái</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                    >
                                        <option value="">Tất cả trạng thái</option>
                                        <option value="chua_giao">⏳ Chưa giao</option>
                                        <option value="da_giao">✅ Đã giao</option>
                                        <option value="da_huy">❌ Đã hủy</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Chi nhánh</label>
                                    <select
                                        value={branchId}
                                        onChange={(e) => setBranchId(e.target.value)}
                                        className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                    >
                                        <option value="">Tất cả chi nhánh</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Từ ngày</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Đến ngày</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-2">
                                <div className="flex space-x-2">
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg shadow-sm transition"
                                    >
                                        🔍 Lọc dữ liệu
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition"
                                    >
                                        Đặt lại
                                    </button>
                                </div>

                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={handleExport}
                                        className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
                                    >
                                        📥 Xuất Excel
                                    </button>
                                    <Link
                                        href={route('admin.receipt-notes.create')}
                                        className="inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow-sm transition"
                                    >
                                        ➕ Tạo phiếu mới
                                    </Link>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Receipt Notes Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-700 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3.5">Mã phiếu</th>
                                        <th className="px-4 py-3.5">Ngày nhận / Hẹn trả</th>
                                        <th className="px-4 py-3.5">Khách hàng</th>
                                        <th className="px-4 py-3.5">Yêu cầu dịch vụ</th>
                                        <th className="px-4 py-3.5 text-right">Giá dự kiến</th>
                                        <th className="px-4 py-3.5 text-right">Thanh toán</th>
                                        <th className="px-4 py-3.5 text-center">Trạng thái</th>
                                        <th className="px-4 py-3.5 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {receiptNotes.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                                                Không có phiếu giao nhận nào phù hợp với bộ lọc.
                                            </td>
                                        </tr>
                                    ) : (
                                        receiptNotes.data.map((note) => (
                                            <tr key={note.id} className="hover:bg-slate-50/80 transition">
                                                <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                                                    <Link
                                                        href={route('admin.receipt-notes.show', note.id)}
                                                        className="text-amber-600 hover:text-amber-700 hover:underline flex items-center space-x-1"
                                                    >
                                                        <span>{note.note_code}</span>
                                                    </Link>
                                                    <div className="text-xs text-slate-400 font-normal mt-0.5">
                                                        {note.branch?.name || 'Chi nhánh'}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <div className="text-slate-800 font-medium">Nhận: {formatDate(note.received_date)}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        Hẹn: {note.appointment_date ? formatDate(note.appointment_date) : (note.estimated_pickup_time || 'Chưa hẹn')}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3.5">
                                                    <div className="font-medium text-slate-900">{note.customer_name}</div>
                                                    {note.customer_phone ? (
                                                        <a
                                                            href={`tel:${note.customer_phone}`}
                                                            className="text-xs text-blue-600 hover:underline"
                                                        >
                                                            📞 {note.customer_phone}
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Không có SĐT</span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3.5 max-w-xs">
                                                    <div className="text-xs font-medium text-slate-800">
                                                        {note.service_labels || 'Chưa ghi nhận'}
                                                    </div>
                                                    {note.has_photos_saved && (
                                                        <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-1">
                                                            📸 Ảnh chatbot: Có
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3.5 text-right font-medium text-slate-700 whitespace-nowrap">
                                                    {formatCurrency(note.estimated_price)}
                                                </td>

                                                <td className="px-4 py-3.5 text-right font-semibold whitespace-nowrap">
                                                    {note.status === 'da_giao' ? (
                                                        <span className="text-emerald-700">{formatCurrency(note.final_amount)}</span>
                                                    ) : (
                                                        <span className="text-slate-400">Chưa thu</span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    {note.status === 'chua_giao' && (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                            ⏳ Chưa giao
                                                        </span>
                                                    )}
                                                    {note.status === 'da_giao' && (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            ✅ Đã giao
                                                        </span>
                                                    )}
                                                    {note.status === 'da_huy' && (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                            ❌ Đã hủy
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end space-x-1.5">
                                                        <Link
                                                            href={route('admin.receipt-notes.show', note.id)}
                                                            title="Xem & In phiếu"
                                                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                        >
                                                            🖨️
                                                        </Link>

                                                        {note.status === 'chua_giao' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openDeliverModal(note)}
                                                                title="Bàn giao nhanh"
                                                                className="px-2 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition"
                                                            >
                                                                Bàn giao
                                                            </button>
                                                        )}

                                                        <Link
                                                            href={route('admin.receipt-notes.edit', note.id)}
                                                            title="Chỉnh sửa"
                                                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                                                        >
                                                            ✏️
                                                        </Link>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(note)}
                                                            title="Xóa phiếu"
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {receiptNotes.links && receiptNotes.links.length > 3 && (
                            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="text-xs text-slate-500">
                                    Hiển thị trang {receiptNotes.current_page} / {receiptNotes.last_page} ({receiptNotes.total} phiếu)
                                </div>
                                <div className="flex space-x-1">
                                    {receiptNotes.links.map((link, idx) => (
                                        <Link
                                            key={idx}
                                            href={link.url || '#'}
                                            className={`px-3 py-1.5 text-xs rounded border transition ${
                                                link.active
                                                    ? 'bg-amber-500 border-amber-500 text-white font-medium'
                                                    : link.url
                                                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                    : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Delivery Modal */}
            <Modal show={deliveringNote !== null} onClose={() => setDeliveringNote(null)} maxWidth="md">
                <form onSubmit={submitDeliver} className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                        Bàn giao thành phẩm: {deliveringNote?.note_code}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Khách hàng: <span className="font-semibold text-slate-800">{deliveringNote?.customer_name}</span> - {deliveringNote?.customer_phone || 'Không có SĐT'}
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Số tiền cần thanh toán (VNĐ) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={finalAmount}
                                onChange={(e) => setFinalAmount(parseFloat(e.target.value) || 0)}
                                className="w-full text-sm rounded-lg border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                                required
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                                Giá dự kiến lúc nhận: {deliveringNote ? formatCurrency(deliveringNote.estimated_price) : 0}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Nhân viên giao vòng
                            </label>
                            <input
                                type="text"
                                value={deliveryStaff}
                                onChange={(e) => setDeliveryStaff(e.target.value)}
                                placeholder="Tên nhân viên phụ trách giao"
                                className="w-full text-sm rounded-lg border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Tên người nhận / Khách ký nhận
                            </label>
                            <input
                                type="text"
                                value={receiverSignature}
                                onChange={(e) => setReceiverSignature(e.target.value)}
                                placeholder="Khách hàng hoặc người nhận thay"
                                className="w-full text-sm rounded-lg border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Thông tin xác minh người nhận thay (nếu có)
                            </label>
                            <textarea
                                value={proxyInfo}
                                onChange={(e) => setProxyInfo(e.target.value)}
                                rows={2}
                                placeholder="Quan hệ, số CCCD hoặc cách xác minh khi người khác nhận thay..."
                                className="w-full text-sm rounded-lg border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="p-3 bg-emerald-50 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
                            <span>✅</span>
                            <span>Hệ thống sẽ tự động cập nhật trạng thái "Đã giao", ghi nhận thời gian bàn giao và đồng bộ lên Google Sheets.</span>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => setDeliveringNote(null)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            Đóng
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50"
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Xác nhận bàn giao'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
