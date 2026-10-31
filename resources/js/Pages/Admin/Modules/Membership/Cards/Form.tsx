import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';

interface PromotionProgram {
    id: string;
    name: string;
    usage_count: number;
}

interface MembershipTypeItem {
    id: number;
    name: string;
    price: number | string;
    validity_duration: number;
    validity_unit: 'day' | 'month' | 'year';
    description?: string | null;
    promotion_programs?: PromotionProgram[] | null;
}

interface CardFormProps extends PageProps {
    types: MembershipTypeItem[];
}

export default function Form({ auth, types }: CardFormProps) {
    const { data, setData, post, processing, errors } = useForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        customer_dob: '',
        membership_type_id: types.length > 0 ? String(types[0].id) : '',
        notes: '',
    });

    const selectedType = useMemo(() => {
        return types.find((t) => String(t.id) === String(data.membership_type_id));
    }, [types, data.membership_type_id]);

    const formatPrice = (price: number | string) => {
        const num = Number(price);
        if (num === 0) return 'Miễn phí';
        return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
    };

    const formatDuration = (type?: MembershipTypeItem) => {
        if (!type) return '';
        switch (type.validity_unit) {
            case 'day':
                return `${type.validity_duration} ngày`;
            case 'year':
                return `${type.validity_duration} năm`;
            default:
                return `${type.validity_duration} tháng`;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.membership.cards.store'));
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                            Cấp Thẻ Hội Viên Mới
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Tạo thẻ hội viên cho khách hàng, tự động cấp mã QR và gửi email kích hoạt
                        </p>
                    </div>
                    <Link
                        href={route('admin.membership.cards.index')}
                        className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-medium text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-50 shadow-sm"
                    >
                        ← Danh sách thẻ
                    </Link>
                </div>
            }
        >
            <Head title="Cấp Thẻ Hội Viên Mới" />

            <div className="py-6 max-w-4xl mx-auto sm:px-6 lg:px-8">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <div className="border-b border-gray-100 pb-4">
                        <h3 className="text-base font-bold text-gray-900">Thông tin hội viên</h3>
                        <p className="text-xs text-gray-500">
                            Điền đầy đủ thông tin để cấp thẻ điện tử và mã QR check-in
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Họ và tên khách hàng <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.customer_name}
                                onChange={(e) => setData('customer_name', e.target.value)}
                                placeholder="Nguyễn Văn A"
                                className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                                required
                            />
                            {errors.customer_name && (
                                <p className="text-xs text-red-600 mt-1">{errors.customer_name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Số điện thoại <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.customer_phone}
                                onChange={(e) => setData('customer_phone', e.target.value)}
                                placeholder="0901234567"
                                className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                                required
                            />
                            {errors.customer_phone && (
                                <p className="text-xs text-red-600 mt-1">{errors.customer_phone}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Email nhận thẻ & mã QR <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={data.customer_email}
                                onChange={(e) => setData('customer_email', e.target.value)}
                                placeholder="khachhang@example.com"
                                className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                                required
                            />
                            {errors.customer_email && (
                                <p className="text-xs text-red-600 mt-1">{errors.customer_email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Ngày sinh (không bắt buộc)
                            </label>
                            <input
                                type="date"
                                value={data.customer_dob}
                                onChange={(e) => setData('customer_dob', e.target.value)}
                                className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                                Dùng để gửi lời chúc và quà tặng tri ân dịp sinh nhật
                            </p>
                            {errors.customer_dob && (
                                <p className="text-xs text-red-600 mt-1">{errors.customer_dob}</p>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Chọn gói hội viên <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={data.membership_type_id}
                            onChange={(e) => setData('membership_type_id', e.target.value)}
                            className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                            required
                        >
                            <option value="">-- Chọn gói hội viên --</option>
                            {types.map((type) => (
                                <option key={type.id} value={type.id}>
                                    {type.name} — {formatPrice(type.price)} / {formatDuration(type)}
                                </option>
                            ))}
                        </select>
                        {errors.membership_type_id && (
                            <p className="text-xs text-red-600 mt-1">{errors.membership_type_id}</p>
                        )}

                        {/* Selected Tier Preview Card */}
                        {selectedType && (
                            <div className="mt-4 p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                                <div className="flex items-center justify-between">
                                    <div className="font-bold text-amber-900 text-base">
                                        Đặc quyền gói {selectedType.name}
                                    </div>
                                    <span className="text-sm font-extrabold text-amber-800">
                                        {formatPrice(selectedType.price)} ({formatDuration(selectedType)})
                                    </span>
                                </div>
                                {selectedType.description && (
                                    <div
                                        className="text-xs text-amber-800 mt-1.5 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_p]:my-0.5"
                                        dangerouslySetInnerHTML={{ __html: selectedType.description }}
                                    />
                                )}
                                <div className="mt-3 space-y-1.5">
                                    {selectedType.promotion_programs?.map((prog, idx) => (
                                        <div key={idx} className="text-xs text-amber-900 flex items-center justify-between">
                                            <span>• {prog.name}</span>
                                            <span className="font-bold text-amber-700">
                                                {prog.usage_count > 0 ? `${prog.usage_count} lượt` : 'Áp dụng chung'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Ghi chú nội bộ
                        </label>
                        <textarea
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={2}
                            placeholder="Ghi chú thêm về yêu cầu đặc biệt của hội viên này..."
                            className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                        />
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
                        <div className="text-xl">📧</div>
                        <div className="text-xs text-slate-600 leading-relaxed">
                            <strong>Thông báo tự động:</strong> Ngay sau khi bấm <em>Cấp Thẻ & Gửi Email</em>, hệ thống sẽ tự động tạo mã thẻ độc nhất, tạo ảnh mã QR bảo mật và gửi email thông báo chi tiết đặc quyền kèm mã QR đến email khách hàng.
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <Link
                            href={route('admin.membership.cards.index')}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Huỷ
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2 bg-amber-600 text-white rounded-md text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition shadow-sm"
                        >
                            {processing ? 'Đang cấp thẻ & gửi mail...' : 'Cấp Thẻ & Gửi Email'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

