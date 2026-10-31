import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { PageProps } from '@/types';

interface PromotionProgram {
    id: string;
    name: string;
    usage_count: number;
}

interface MembershipTypeItem {
    id: number;
    name: string;
    code?: string | null;
    description?: string | null;
    price: number | string;
    validity_duration: number;
    validity_unit: 'day' | 'month' | 'year';
    is_active: boolean;
    promotion_programs?: PromotionProgram[] | null;
    cards_count?: number;
    created_at: string;
}

interface TypesIndexProps extends PageProps {
    types: MembershipTypeItem[];
}

export default function Index({ auth, flash, types }: TypesIndexProps) {
    const handleDelete = (id: number, name: string) => {
        if (confirm(`Bạn có chắc chắn muốn xoá gói hội viên "${name}"?`)) {
            router.delete(route('admin.membership.types.destroy', id));
        }
    };

    const formatPrice = (price: number | string) => {
        const num = Number(price);
        if (num === 0) return 'Miễn phí';
        return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
    };

    const formatUnit = (unit: string, duration: number) => {
        const paddedDuration = duration < 10 ? `0${duration}` : `${duration}`;
        switch (unit) {
            case 'day':
                return `${duration} ngày`;
            case 'year':
                return `${duration} năm`;
            default:
                return `${paddedDuration} tháng`;
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                            Quản lý Gói Hội Viên
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Cấu hình các hạng mức hội viên, thời hạn, quyền lợi và ưu đãi
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={route('admin.membership.cards.index')}
                            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-medium text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-50 shadow-sm"
                        >
                            💳 Quản lý Thẻ
                        </Link>
                        <Link
                            href={route('admin.membership.types.create')}
                            className="inline-flex items-center px-4 py-2 bg-amber-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-amber-700 shadow-sm transition"
                        >
                            ➕ Thêm Gói Mới
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Gói Hội Viên" />

            <div className="py-6 max-w-7xl mx-auto sm:px-6 lg:px-8">
                {flash?.success && (
                    <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center justify-between">
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Tier Cards Grid matching image presentation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {types.map((type, idx) => {
                        // Dynamic color themes for tiers similar to the reference image
                        const headerThemes = [
                            'bg-gradient-to-r from-amber-700 to-amber-600 text-white',
                            'bg-gradient-to-r from-yellow-900 to-amber-800 text-white',
                            'bg-gradient-to-r from-stone-900 to-red-950 text-white',
                        ];
                        const headerClass = headerThemes[idx % headerThemes.length];

                        return (
                            <div
                                key={type.id}
                                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                            >
                                <div>
                                    {/* Card Header */}
                                    <div className={`p-6 ${headerClass}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-xs font-bold tracking-widest uppercase opacity-80">
                                                    HẠNG HỘI VIÊN
                                                </span>
                                                <h3 className="text-2xl font-black mt-1 tracking-tight">
                                                    {type.name}
                                                </h3>
                                            </div>
                                            {!type.is_active && (
                                                <span className="text-[10px] bg-red-500/80 px-2 py-0.5 rounded text-white font-medium uppercase">
                                                    Tạm ngưng
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-4 flex items-baseline gap-2">
                                            <span className="text-2xl font-extrabold">
                                                {formatPrice(type.price)}
                                            </span>
                                            <span className="text-sm opacity-90">
                                                / {formatUnit(type.validity_unit, type.validity_duration)}
                                            </span>
                                        </div>
                                        {type.description && (
                                            <div
                                                className="mt-2 text-xs opacity-90 line-clamp-3 prose prose-invert max-w-none text-white [&_p]:my-0.5 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
                                                dangerouslySetInnerHTML={{ __html: type.description }}
                                            />
                                        )}
                                    </div>

                                    {/* Benefits / Promotion programs list */}
                                    <div className="p-6">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
                                            Ưu đãi & Đặc quyền ({type.promotion_programs?.length || 0})
                                        </h4>
                                        <ul className="space-y-3">
                                            {(!type.promotion_programs || type.promotion_programs.length === 0) ? (
                                                <li className="text-sm text-gray-400 italic">
                                                    Chưa cấu hình chương trình ưu đãi
                                                </li>
                                            ) : (
                                                type.promotion_programs.map((prog, pIdx) => (
                                                    <li key={pIdx} className="text-sm flex items-start gap-2 text-gray-700">
                                                        <span className="text-amber-600 font-bold shrink-0">•</span>
                                                        <div className="flex-1">
                                                            <span>{prog.name}</span>
                                                            {prog.usage_count > 0 ? (
                                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                                                    {prog.usage_count} lượt
                                                                </span>
                                                            ) : (
                                                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600">
                                                                    Áp dụng chung
                                                                </span>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    </div>
                                </div>

                                {/* Footer actions */}
                                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                    <span>
                                        Đã cấp: <strong>{type.cards_count ?? 0}</strong> thẻ
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={route('admin.membership.types.edit', type.id)}
                                            className="px-3 py-1.5 bg-white border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-100 shadow-2xs"
                                        >
                                            Sửa
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(type.id, type.name)}
                                            className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded font-medium hover:bg-red-50 shadow-2xs"
                                        >
                                            Xoá
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {types.length === 0 && (
                    <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                        <div className="text-4xl mb-3">🏷️</div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có gói hội viên nào</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Hãy tạo gói hội viên đầu tiên để thiết lập quyền lợi và cấp thẻ cho khách hàng.
                        </p>
                        <Link
                            href={route('admin.membership.types.create')}
                            className="inline-flex items-center px-4 py-2 bg-amber-600 rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-amber-700"
                        >
                            ➕ Thêm Gói Mới
                        </Link>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

