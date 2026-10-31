import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import RichTextEditor from '@/Components/RichTextEditor';

interface PromotionProgram {
    id?: string;
    name: string;
    usage_count: number;
}

interface MembershipTypeItem {
    id: number;
    name: string;
    description?: string | null;
    price: number | string;
    validity_duration: number;
    validity_unit: 'day' | 'month' | 'year';
    is_active: boolean;
    promotion_programs?: PromotionProgram[] | null;
}

interface FormProps extends PageProps {
    type?: MembershipTypeItem | null;
}

export default function Form({ auth, type }: FormProps) {
    const isEdit = Boolean(type);

    const { data, setData, post, put, processing, errors } = useForm({
        name: type?.name || '',
        description: type?.description || '',
        price: type?.price !== undefined ? String(type.price) : '0',
        validity_duration: type?.validity_duration || 6,
        validity_unit: type?.validity_unit || 'month',
        is_active: type ? Boolean(type.is_active) : true,
        promotion_programs: (type?.promotion_programs && type.promotion_programs.length > 0)
            ? type.promotion_programs
            : [
                  { id: 'prog_1', name: '', usage_count: 0 },
              ],
    });

    const addProgramRow = () => {
        setData('promotion_programs', [
            ...data.promotion_programs,
            { id: `prog_${Date.now()}`, name: '', usage_count: 0 },
        ]);
    };

    const updateProgramRow = (index: number, field: 'name' | 'usage_count', value: string | number) => {
        const updated = [...data.promotion_programs];
        updated[index] = {
            ...updated[index],
            [field]: value,
        };
        setData('promotion_programs', updated);
    };

    const removeProgramRow = (index: number) => {
        if (data.promotion_programs.length <= 1) {
            setData('promotion_programs', [{ id: `prog_${Date.now()}`, name: '', usage_count: 0 }]);
            return;
        }
        const updated = data.promotion_programs.filter((_, i) => i !== index);
        setData('promotion_programs', updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && type) {
            put(route('admin.membership.types.update', type.id));
        } else {
            post(route('admin.membership.types.store'));
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                            {isEdit ? `Chỉnh sửa gói: ${type?.name}` : 'Tạo gói hội viên mới'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Thiết lập quyền lợi, mức phí và chương trình ưu đãi
                        </p>
                    </div>
                    <Link
                        href={route('admin.membership.types.index')}
                        className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-medium text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-50 shadow-sm"
                    >
                        ← Quay lại danh sách
                    </Link>
                </div>
            }
        >
            <Head title={isEdit ? 'Chỉnh sửa gói hội viên' : 'Tạo gói hội viên'} />

            <div className="py-6 max-w-4xl mx-auto sm:px-6 lg:px-8">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    {/* General Info */}
                    <div className="border-b border-gray-100 pb-5">
                        <h3 className="text-base font-bold text-gray-900 mb-1">Thông tin chung</h3>
                        <p className="text-xs text-gray-500">Tên gói, mô tả và phí đăng ký hội viên</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Tên gói hội viên <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="VD: TÙY DUYÊN, DUYÊN KHỞI, AN TRÚ..."
                                className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                                required
                            />
                            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <RichTextEditor
                                label="Mô tả chi tiết quyền lợi (Soạn thảo văn bản phong phú)"
                                value={data.description}
                                onChange={(content) => setData('description', content)}
                                placeholder="Soạn thảo thông tin chi tiết, định dạng in đậm, danh sách hoặc trích dẫn..."
                                error={errors.description}
                                minHeight="130px"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Mức phí (VNĐ) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={data.price}
                                    onChange={(e) => setData('price', e.target.value)}
                                    placeholder="0 nếu miễn phí"
                                    className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                                    required
                                />
                                {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Thời lượng hiệu lực <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={data.validity_duration}
                                    onChange={(e) => setData('validity_duration', Number(e.target.value))}
                                    placeholder="VD: 6, 12..."
                                    className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                                    required
                                />
                                {errors.validity_duration && (
                                    <p className="text-xs text-red-600 mt-1">{errors.validity_duration}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Đơn vị thời gian <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.validity_unit}
                                    onChange={(e) => setData('validity_unit', e.target.value as any)}
                                    className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                                >
                                    <option value="month">Tháng</option>
                                    <option value="day">Ngày</option>
                                    <option value="year">Năm</option>
                                </select>
                                {errors.validity_unit && (
                                    <p className="text-xs text-red-600 mt-1">{errors.validity_unit}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                Cho phép phát hành và hiển thị cho khách hàng
                            </label>
                        </div>
                    </div>

                    {/* Promotion Programs Configuration */}
                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">
                                    Chương trình ưu đãi & Quyền lợi
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Cấu hình từng quyền lợi. Nhập số lượt để theo dõi và trừ lượt khi quét QR check-in (nhập 0 cho ưu đãi không giới hạn / áp dụng chung).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addProgramRow}
                                className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-semibold text-xs hover:bg-amber-100 transition"
                            >
                                ➕ Thêm quyền lợi
                            </button>
                        </div>

                        <div className="space-y-3 mt-4">
                            {data.promotion_programs.map((row, index) => (
                                <div
                                    key={row.id || index}
                                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3"
                                >
                                    <div className="flex-1 w-full">
                                        <input
                                            type="text"
                                            value={row.name}
                                            onChange={(e) => updateProgramRow(index, 'name', e.target.value)}
                                            placeholder="Tên quyền lợi (VD: 4 lượt tham quan cá nhân, Ưu đãi mua hàng 5%...)"
                                            className="w-full rounded-md border-gray-300 text-sm focus:border-amber-500 focus:ring-amber-500"
                                            required
                                        />
                                    </div>
                                    <div className="w-full sm:w-48 flex items-center gap-2">
                                        <label className="text-xs text-gray-500 whitespace-nowrap">Số lượt:</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={row.usage_count}
                                            onChange={(e) => updateProgramRow(index, 'usage_count', Number(e.target.value))}
                                            placeholder="0 = chung"
                                            className="w-full rounded-md border-gray-300 text-sm focus:border-amber-500 focus:ring-amber-500"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeProgramRow(index)}
                                        className="text-red-500 hover:text-red-700 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                                    >
                                        Xoá
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <Link
                            href={route('admin.membership.types.index')}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Huỷ
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2 bg-amber-600 text-white rounded-md text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition shadow-sm"
                        >
                            {processing ? 'Đang lưu...' : (isEdit ? 'Cập nhật gói' : 'Tạo gói hội viên')}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

