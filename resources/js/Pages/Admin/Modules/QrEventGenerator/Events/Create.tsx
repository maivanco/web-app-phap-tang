import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

export default function Create({ auth }: PageProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        location: '',
        event_date: '',
        status: 'active',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.qr_events.store'));
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-2xl text-slate-800 leading-tight flex items-center gap-2">
                            <span>➕</span> Tạo Sự Kiện Mới
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Khởi tạo sự kiện để phát hành mã QR vé cho từng khách hàng
                        </p>
                    </div>

                    <Link
                        href={route('admin.qr_events.index')}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
                    >
                        ← Quay lại danh sách
                    </Link>
                </div>
            }
        >
            <Head title="Tạo Sự Kiện Mới" />

            <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Event Name */}
                        <div>
                            <InputLabel htmlFor="name" value="Tên sự kiện *" />
                            <TextInput
                                id="name"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Ví dụ: Tri ân khách hàng VIP Tháng 10..."
                                required
                            />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        {/* Date and Location */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <InputLabel htmlFor="event_date" value="Thời gian tổ chức" />
                                <input
                                    id="event_date"
                                    type="datetime-local"
                                    className="mt-1 block w-full border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                    value={data.event_date}
                                    onChange={(e) => setData('event_date', e.target.value)}
                                />
                                <InputError message={errors.event_date} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel htmlFor="location" value="Địa điểm tổ chức" />
                                <TextInput
                                    id="location"
                                    type="text"
                                    className="mt-1 block w-full"
                                    value={data.location}
                                    onChange={(e) => setData('location', e.target.value)}
                                    placeholder="Ví dụ: Showroom 123 Nguyễn Trãi..."
                                />
                                <InputError message={errors.location} className="mt-2" />
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <InputLabel htmlFor="status" value="Trạng thái sự kiện *" />
                            <select
                                id="status"
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value as any)}
                                className="mt-1 block w-full border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5"
                            >
                                <option value="active">Đang diễn ra (Cho phép tạo vé & check-in)</option>
                                <option value="draft">Bản nháp</option>
                                <option value="completed">Đã kết thúc</option>
                                <option value="cancelled">Đã hủy</option>
                            </select>
                            <InputError message={errors.status} className="mt-2" />
                        </div>

                        {/* Description */}
                        <div>
                            <InputLabel htmlFor="description" value="Mô tả / Ghi chú sự kiện" />
                            <textarea
                                id="description"
                                rows={4}
                                className="mt-1 block w-full border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Thông tin chi tiết về chương trình, ưu đãi, quy định check-in..."
                            />
                            <InputError message={errors.description} className="mt-2" />
                        </div>

                        {/* Form Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                            <Link
                                href={route('admin.qr_events.index')}
                                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
                            >
                                Hủy bỏ
                            </Link>

                            <PrimaryButton disabled={processing} className="px-6 py-2.5 rounded-xl">
                                {processing ? 'Đang tạo...' : 'Tạo Sự Kiện'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
