<?php

namespace App\Modules\Membership\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Membership\Models\MembershipType;
use App\Support\FormBuilder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MembershipTypeController extends Controller
{
    /**
     * Get FormBuilder schema for membership type creation/editing.
     */
    protected function getFormSchema(): array
    {
        return FormBuilder::schema([
            'formId' => 'membership_type_form',
            'fields' => [
                [
                    'name' => 'name',
                    'label' => 'Tên gói hội viên',
                    'type' => 'text',
                    'placeholder' => 'Ví dụ: TÙY DUYÊN, DUYÊN KHỞI, AN TRÚ...',
                    'rules' => ['required', 'string', 'max:255'],
                ],
                [
                    'name' => 'description',
                    'label' => 'Mô tả chi tiết',
                    'type' => 'textarea',
                    'placeholder' => 'Mô tả quyền lợi tổng quan của gói hội viên',
                    'rules' => ['nullable', 'string', 'max:10000'],
                ],
                [
                    'name' => 'price',
                    'label' => 'Mức phí (VNĐ)',
                    'type' => 'number',
                    'placeholder' => '0 nếu miễn phí',
                    'rules' => ['required', 'numeric', 'min:0'],
                ],
                [
                    'name' => 'validity_duration',
                    'label' => 'Thời lượng hiệu lực',
                    'type' => 'number',
                    'placeholder' => 'Số lượng (VD: 6, 12...)',
                    'rules' => ['required', 'integer', 'min:1'],
                ],
                [
                    'name' => 'validity_unit',
                    'label' => 'Đơn vị thời gian',
                    'type' => 'select',
                    'options' => [
                        ['value' => 'month', 'label' => 'Tháng'],
                        ['value' => 'day', 'label' => 'Ngày'],
                        ['value' => 'year', 'label' => 'Năm'],
                    ],
                    'rules' => ['required', 'string', 'in:day,month,year'],
                ],
                [
                    'name' => 'is_active',
                    'label' => 'Đang phát hành',
                    'type' => 'checkbox',
                    'rules' => ['nullable', 'boolean'],
                ],
            ],
            'rows' => [
                ['columns' => [['field' => 'name', 'width' => 'w-full']]],
                ['columns' => [['field' => 'description', 'width' => 'w-full']]],
                ['columns' => [
                    ['field' => 'price', 'width' => 'w-1/3'],
                    ['field' => 'validity_duration', 'width' => 'w-1/3'],
                    ['field' => 'validity_unit', 'width' => 'w-1/3'],
                ]],
                ['columns' => [['field' => 'is_active', 'width' => 'w-full']]],
            ],
        ]);
    }

    /**
     * Display a listing of membership types.
     */
    public function index(): Response
    {
        $this->authorize('viewAny', MembershipType::class);

        $types = MembershipType::withCount('cards')
            ->orderBy('price', 'asc')
            ->latest('id')
            ->get();

        return Inertia::render('Admin/Modules/Membership/Types/Index', [
            'types' => $types,
        ]);
    }

    /**
     * Show the form for creating a new membership type.
     */
    public function create(): Response
    {
        $this->authorize('create', MembershipType::class);

        return Inertia::render('Admin/Modules/Membership/Types/Form', [
            'formSchema' => $this->getFormSchema(),
            'type' => null,
        ]);
    }

    /**
     * Store a newly created membership type in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', MembershipType::class);

        $schema = $this->getFormSchema();
        $rules = FormBuilder::rulesForValidation($schema);

        // Additional validation for promotion programs array
        $rules['promotion_programs'] = ['nullable', 'array'];
        $rules['promotion_programs.*.name'] = ['required', 'string', 'max:255'];
        $rules['promotion_programs.*.usage_count'] = ['required', 'integer', 'min:0'];

        $validated = $request->validate($rules);

        // Sanitize promotion programs
        $programs = [];
        if (! empty($validated['promotion_programs'])) {
            foreach ($validated['promotion_programs'] as $prog) {
                $name = trim((string) ($prog['name'] ?? ''));
                if ($name !== '') {
                    $programs[] = [
                        'id' => $prog['id'] ?? (string) Str::uuid(),
                        'name' => $name,
                        'usage_count' => max(0, (int) ($prog['usage_count'] ?? 0)),
                    ];
                }
            }
        }

        MembershipType::create([
            'created_by' => auth()->id(),
            'name' => $validated['name'],
            'code' => Str::slug($validated['name'], '_'),
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'validity_duration' => $validated['validity_duration'],
            'validity_unit' => $validated['validity_unit'],
            'promotion_programs' => $programs,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('admin.membership.types.index')
            ->with('success', 'Gói hội viên đã được tạo thành công.');
    }

    /**
     * Show the form for editing the specified membership type.
     */
    public function edit(MembershipType $type): Response
    {
        $this->authorize('update', $type);

        return Inertia::render('Admin/Modules/Membership/Types/Form', [
            'formSchema' => $this->getFormSchema(),
            'type' => $type,
        ]);
    }

    /**
     * Update the specified membership type in storage.
     */
    public function update(Request $request, MembershipType $type): RedirectResponse
    {
        $this->authorize('update', $type);

        $schema = $this->getFormSchema();
        $rules = FormBuilder::rulesForValidation($schema);

        $rules['promotion_programs'] = ['nullable', 'array'];
        $rules['promotion_programs.*.name'] = ['required', 'string', 'max:255'];
        $rules['promotion_programs.*.usage_count'] = ['required', 'integer', 'min:0'];

        $validated = $request->validate($rules);

        $programs = [];
        if (! empty($validated['promotion_programs'])) {
            foreach ($validated['promotion_programs'] as $prog) {
                $name = trim((string) ($prog['name'] ?? ''));
                if ($name !== '') {
                    $programs[] = [
                        'id' => $prog['id'] ?? (string) Str::uuid(),
                        'name' => $name,
                        'usage_count' => max(0, (int) ($prog['usage_count'] ?? 0)),
                    ];
                }
            }
        }

        $type->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'validity_duration' => $validated['validity_duration'],
            'validity_unit' => $validated['validity_unit'],
            'promotion_programs' => $programs,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('admin.membership.types.index')
            ->with('success', 'Cập nhật gói hội viên thành công.');
    }

    /**
     * Remove the specified membership type from storage.
     */
    public function destroy(MembershipType $type): RedirectResponse
    {
        $this->authorize('delete', $type);

        if ($type->cards()->count() > 0) {
            return redirect()->route('admin.membership.types.index')
                ->with('error', 'Không thể xoá gói hội viên vì đã có thẻ hội viên được phát hành.');
        }

        $type->delete();

        return redirect()->route('admin.membership.types.index')
            ->with('success', 'Đã xoá gói hội viên thành công.');
    }
}
