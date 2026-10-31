import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface RichTextEditorProps {
    value?: string | null;
    onChange: (html: string) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    minHeight?: string;
}

export default function RichTextEditor({
    value = '',
    onChange,
    placeholder = 'Nhập nội dung mô tả chi tiết...',
    label,
    error,
    minHeight = '140px',
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3],
                },
            }),
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            // If empty paragraph, normalize to empty string
            if (html === '<p></p>') {
                onChange('');
            } else {
                onChange(html);
            }
        },
        editorProps: {
            attributes: {
                class: `prose prose-sm max-w-none focus:outline-none p-3 text-sm text-gray-800 leading-relaxed [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:my-1 [&_p]:my-1.5 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_hr]:my-3 [&_hr]:border-gray-200`,
                style: `min-height: ${minHeight};`,
            },
        },
    });

    // Synchronize content if value changes externally and editor is not focused
    useEffect(() => {
        if (editor && value !== undefined && value !== editor.getHTML()) {
            if (!editor.isFocused) {
                editor.commands.setContent(value || '', { emitUpdate: false });
            }
        }
    }, [value, editor]);

    if (!editor) {
        return null;
    }

    const toolbarBtnClass = (isActive: boolean) =>
        `p-1.5 rounded text-xs font-semibold transition ${
            isActive
                ? 'bg-amber-100 text-amber-800'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`;

    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {label}
                </label>
            )}

            <div
                className={`rounded-lg border bg-white overflow-hidden transition-all ${
                    error
                        ? 'border-red-400 focus-within:ring-1 focus-within:ring-red-400'
                        : 'border-gray-300 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500'
                }`}
            >
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-gray-50 border-b border-gray-200 text-gray-600">
                    {/* Headings */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={toolbarBtnClass(editor.isActive('heading', { level: 2 }))}
                        title="Tiêu đề H2"
                    >
                        H2
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={toolbarBtnClass(editor.isActive('heading', { level: 3 }))}
                        title="Tiêu đề H3"
                    >
                        H3
                    </button>

                    <div className="w-[1px] h-4 bg-gray-300 mx-1" />

                    {/* Basic Formatting */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={toolbarBtnClass(editor.isActive('bold'))}
                        title="In đậm (Ctrl+B)"
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={toolbarBtnClass(editor.isActive('italic'))}
                        title="In nghiêng (Ctrl+I)"
                    >
                        <em>I</em>
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={toolbarBtnClass(editor.isActive('strike'))}
                        title="Gạch ngang"
                    >
                        <s>S</s>
                    </button>

                    <div className="w-[1px] h-4 bg-gray-300 mx-1" />

                    {/* Lists */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={toolbarBtnClass(editor.isActive('bulletList'))}
                        title="Danh sách gạch đầu dòng"
                    >
                        • Danh sách
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={toolbarBtnClass(editor.isActive('orderedList'))}
                        title="Danh sách số thứ tự"
                    >
                        1. Số thứ tự
                    </button>

                    <div className="w-[1px] h-4 bg-gray-300 mx-1" />

                    {/* Quote & Divider */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={toolbarBtnClass(editor.isActive('blockquote'))}
                        title="Trích dẫn"
                    >
                        ❝ Trích dẫn
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        className={toolbarBtnClass(false)}
                        title="Đường phân cách ngang"
                    >
                        ― Phân cách
                    </button>

                    <div className="w-[1px] h-4 bg-gray-300 mx-1" />

                    {/* Undo / Redo */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        className={`${toolbarBtnClass(false)} disabled:opacity-30`}
                        title="Hoàn tác"
                    >
                        ↩
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        className={`${toolbarBtnClass(false)} disabled:opacity-30`}
                        title="Làm lại"
                    >
                        ↪
                    </button>
                </div>

                {/* Editor Surface */}
                <EditorContent editor={editor} />
            </div>

            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}
