import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { PageProps, User } from '@/types';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';

interface UserItem extends User {
    role: 'admin' | 'manager' | 'seller';
    telegram_user_id: number | null;
    created_at: string;
}

interface UsersIndexProps extends PageProps {
    users: {
        data: UserItem[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
        total: number;
    };
    stats: {
        total: number;
        admins: number;
        managers: number;
        sellers: number;
        telegram_linked: number;
    };
    filters: {
        search?: string;
        role?: string;
    };
}

export default function UsersIndex({ auth, users, stats, filters }: UsersIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || '');

    // Modal state for Create / Edit
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);

    // Modal state for Delete confirmation
    const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form handling
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        role: 'seller' as 'admin' | 'manager' | 'seller',
        telegram_user_id: '',
        password: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.cashflow.users.index'),
            {
                search: search || undefined,
                role: roleFilter || undefined,
            },
            { preserveState: true }
        );
    };

    const handleResetFilters = () => {
        setSearch('');
        setRoleFilter('');
        router.get(route('admin.cashflow.users.index'), {}, { preserveState: true });
    };

    const openCreateModal = () => {
        setEditingUser(null);
        clearErrors();
        reset();
        setData({
            name: '',
            email: '',
            role: 'seller',
            telegram_user_id: '',
            password: '',
        });
        setIsFormModalOpen(true);
    };

    const openEditModal = (user: UserItem) => {
        setEditingUser(user);
        clearErrors();
        setData({
            name: user.name,
            email: user.email,
            role: user.role,
            telegram_user_id: user.telegram_user_id ? String(user.telegram_user_id) : '',
            password: '',
        });
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            put(route('admin.cashflow.users.update', editingUser.id), {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    reset();
                },
            });
        } else {
            post(route('admin.cashflow.users.store'), {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleConfirmDelete = () => {
        if (!deletingUser) return;
        setIsDeleting(true);
        router.delete(route('admin.cashflow.users.destroy', deletingUser.id), {
            onSuccess: () => {
                setDeletingUser(null);
                setIsDeleting(false);
            },
            onError: () => setIsDeleting(false),
        });
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                        ⚡ Quản trị viên (Admin)
                    </span>
                );
            case 'manager':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        🛡️ Quản lý (Manager)
                    </span>
                );
            case 'seller':
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        🛍️ Tư vấn viên (Seller)
                    </span>
                );
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="font-bold text-2xl text-slate-800 leading-tight flex items-center gap-2">
                            👥 Quản Lý Người Dùng & Phân Quyền
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Quản lý tài khoản đăng nhập web, phân quyền vai trò và liên kết bot Telegram.
                        </p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition duration-150 ease-in-out cursor-pointer"
                    >
                        <span>➕</span>
                        <span>Thêm Người Dùng Mới</span>
                    </button>
                </div>
            }
        >
            <Head title="Quản Lý Người Dùng" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng người dùng</div>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs">
                        <div className="text-xs font-medium text-purple-600 uppercase tracking-wider">Quản trị viên</div>
                        <div className="text-2xl font-bold text-purple-900 mt-1">{stats.admins}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs">
                        <div className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Quản lý</div>
                        <div className="text-2xl font-bold text-indigo-900 mt-1">{stats.managers}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs">
                        <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Tư vấn viên</div>
                        <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.sellers}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-xs col-span-2 sm:col-span-1">
                        <div className="text-xs font-medium text-sky-600 uppercase tracking-wider">Telegram Bot</div>
                        <div className="text-2xl font-bold text-sky-900 mt-1">{stats.telegram_linked}</div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Tìm theo tên, email, hoặc Telegram ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full text-sm border-slate-300 rounded-lg pl-3 pr-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="w-full text-sm border-slate-300 rounded-lg py-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Tất cả vai trò</option>
                                <option value="admin">Quản trị viên (Admin)</option>
                                <option value="manager">Quản lý (Manager)</option>
                                <option value="seller">Tư vấn viên (Seller)</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition"
                            >
                                Lọc
                            </button>
                            {(search || roleFilter) && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition"
                                >
                                    Đặt lại
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                                <tr>
                                    <th scope="col" className="px-6 py-3.5 font-semibold">Người dùng</th>
                                    <th scope="col" className="px-6 py-3.5 font-semibold">Vai trò</th>
                                    <th scope="col" className="px-6 py-3.5 font-semibold">Telegram Bot</th>
                                    <th scope="col" className="px-6 py-3.5 font-semibold">Ngày tạo</th>
                                    <th scope="col" className="px-6 py-3.5 font-semibold text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {users.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            Không tìm thấy người dùng nào phù hợp với bộ lọc.
                                        </td>
                                    </tr>
                                ) : (
                                    users.data.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/75 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                                                            {user.name}
                                                            {user.id === auth.user.id && (
                                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                                    Bạn
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-slate-500 text-xs">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getRoleBadge(user.role)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.telegram_user_id ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-sky-50 text-sky-700 border border-sky-200">
                                                        <span>✈️</span>
                                                        <span>{user.telegram_user_id}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">
                                                        Chưa kết nối
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                                                {new Date(user.created_at).toLocaleDateString('vi-VN')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                                                    >
                                                        Sửa
                                                    </button>
                                                    {user.id !== auth.user.id && (
                                                        <button
                                                            onClick={() => setDeletingUser(user)}
                                                            className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition"
                                                        >
                                                            Xóa
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {users.links && users.links.length > 3 && (
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                                Hiển thị trang {users.current_page} / {users.last_page} (Tổng {users.total} người dùng)
                            </div>
                            <div className="flex gap-1">
                                {users.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        disabled={!link.url || link.active}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 text-xs rounded-md ${
                                            link.active
                                                ? 'bg-indigo-600 text-white font-medium'
                                                : link.url
                                                ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                : 'text-slate-300 cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create / Edit User Modal */}
            <Modal show={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} maxWidth="md">
                <form onSubmit={handleFormSubmit} className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">
                        {editingUser ? `Chỉnh Sửa Người Dùng: ${editingUser.name}` : 'Thêm Người Dùng Mới'}
                    </h3>

                    <div className="mt-4 space-y-4">
                        {/* Name */}
                        <div>
                            <InputLabel htmlFor="name" value="Họ và tên *" />
                            <TextInput
                                id="name"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                placeholder="Ví dụ: Nguyễn Văn An"
                            />
                            <InputError message={errors.name} className="mt-1" />
                        </div>

                        {/* Email */}
                        <div>
                            <InputLabel htmlFor="email" value="Email đăng nhập *" />
                            <TextInput
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                placeholder="user@phaptang.local"
                            />
                            <InputError message={errors.email} className="mt-1" />
                        </div>

                        {/* Role */}
                        <div>
                            <InputLabel htmlFor="role" value="Vai trò hệ thống *" />
                            <select
                                id="role"
                                value={data.role}
                                onChange={(e) => setData('role', e.target.value as any)}
                                className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-xs text-sm"
                            >
                                <option value="seller">🛍️ Tư vấn viên (Seller) - Nhập đơn & xem chi nhánh</option>
                                <option value="manager">🛡️ Quản lý (Manager) - Quản lý thu chi, duyệt sổ quỹ</option>
                                <option value="admin">⚡ Quản trị viên (Admin) - Toàn quyền cấu hình hệ thống</option>
                            </select>
                            <InputError message={errors.role} className="mt-1" />
                        </div>

                        {/* Telegram User ID */}
                        <div>
                            <div className="flex items-center justify-between">
                                <InputLabel htmlFor="telegram_user_id" value="Telegram User ID (Không bắt buộc)" />
                                <span className="text-[11px] text-sky-600 font-medium">Bot: @mike100_bot</span>
                            </div>
                            <TextInput
                                id="telegram_user_id"
                                type="text"
                                className="mt-1 block w-full font-mono text-sm"
                                value={data.telegram_user_id}
                                onChange={(e) => setData('telegram_user_id', e.target.value)}
                                placeholder="Ví dụ: 7377920297"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Điền số ID để hệ thống tự động cấp quyền truy cập Bot Telegram tương ứng với vai trò đã chọn.
                            </p>
                            <InputError message={errors.telegram_user_id} className="mt-1" />
                        </div>

                        {/* Password */}
                        <div>
                            <InputLabel
                                htmlFor="password"
                                value={editingUser ? 'Mật khẩu mới (Để trống nếu giữ nguyên)' : 'Mật khẩu đăng nhập *'}
                            />
                            <TextInput
                                id="password"
                                type="password"
                                className="mt-1 block w-full"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                required={!editingUser}
                                placeholder={editingUser ? '••••••••' : 'Tối thiểu 6 ký tự'}
                            />
                            <InputError message={errors.password} className="mt-1" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                        <SecondaryButton type="button" onClick={() => setIsFormModalOpen(false)}>
                            Hủy
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>
                            {processing ? 'Đang lưu...' : editingUser ? 'Cập nhật' : 'Thêm mới'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={!!deletingUser} onClose={() => setDeletingUser(null)} maxWidth="sm">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-800">
                        Xác nhận xóa người dùng?
                    </h3>
                    <p className="text-sm text-slate-600 mt-2">
                        Bạn có chắc chắn muốn xóa tài khoản <strong>{deletingUser?.name}</strong> ({deletingUser?.email}) không? Hành động này sẽ thu hồi quyền đăng nhập web và quyền truy cập bot Telegram liên kết.
                    </p>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setDeletingUser(null)}>
                            Hủy
                        </SecondaryButton>
                        <DangerButton onClick={handleConfirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
