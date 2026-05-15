"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef } from "react";

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  /** 上傳圖片並回傳最終 URL。若未提供則不支援圖片貼上/拖曳/toolbar 按鈕 */
  uploadImage?: (file: File) => Promise<string>;
  placeholder?: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 後端限制 5MB

function filterImageFiles(files: FileList | File[] | null | undefined): File[] {
  if (!files) return [];
  const result: File[] = [];
  for (const f of Array.from(files)) {
    if (f.type.startsWith("image/")) result.push(f);
  }
  return result;
}

async function uploadAndSwap(
  editor: Editor,
  file: File,
  blobUrl: string,
  uploadImage: (file: File) => Promise<string>,
) {
  try {
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`檔案過大（${(file.size / 1024 / 1024).toFixed(1)}MB），上限 5MB`);
    }
    const realUrl = await uploadImage(file);
    // 找到 blob 節點位置，replace src attr
    let found = false;
    editor.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.type.name === "image" && node.attrs.src === blobUrl) {
        editor
          .chain()
          .setNodeSelection(pos)
          .updateAttributes("image", { src: realUrl })
          .run();
        found = true;
        return false;
      }
      return true;
    });
  } catch (err) {
    console.error("Image upload failed:", err);
    // 失敗：刪掉該 blob 節點
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.src === blobUrl) {
        const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
        editor.view.dispatch(tr);
        return false;
      }
      return true;
    });
    const msg = err instanceof Error ? err.message : "上傳失敗";
    alert(`圖片上傳失敗：${msg}`);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function insertImagesWithUpload(
  editor: Editor,
  files: File[],
  uploadImage: (file: File) => Promise<string>,
) {
  if (!files.length) return;
  // 1. 先把所有圖片用 blob URL 插進編輯器（立即預覽）
  const entries = files.map((file) => ({
    file,
    blobUrl: URL.createObjectURL(file),
  }));
  const nodes = entries.map(({ blobUrl }) => ({
    type: "image" as const,
    attrs: { src: blobUrl },
  }));
  editor.chain().focus().insertContent(nodes).run();

  // 2. 並行上傳，成功後替換 src、失敗刪除節點
  entries.forEach(({ file, blobUrl }) => {
    void uploadAndSwap(editor, file, blobUrl, uploadImage);
  });
}

export function TiptapEditor({
  content,
  onChange,
  uploadImage,
  placeholder = "開始撰寫你的文章...",
}: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // editorProps 在 useEditor 初始化時建立、晚於 return editor；用 ref 作為後期取值的間接層
  const editorRef = useRef<Editor | null>(null);
  const uploadRef = useRef(uploadImage);
  useEffect(() => {
    uploadRef.current = uploadImage;
  }, [uploadImage]);

  const editor = useEditor({
    immediatelyRender: false, // 避免 SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose-warm min-h-[400px] max-w-none outline-none px-4 py-3",
      },
      handlePaste: (_view, event) => {
        const upload = uploadRef.current;
        const ed = editorRef.current;
        if (!upload || !ed) return false;
        const files = filterImageFiles(event.clipboardData?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        insertImagesWithUpload(ed, files, upload);
        return true;
      },
      handleDrop: (_view, event) => {
        const upload = uploadRef.current;
        const ed = editorRef.current;
        if (!upload || !ed) return false;
        const dropEvent = event as DragEvent;
        const files = filterImageFiles(dropEvent.dataTransfer?.files);
        if (files.length === 0) return false;
        dropEvent.preventDefault();
        insertImagesWithUpload(ed, files, upload);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // 把 editor 存進 ref，讓 editorProps 裡的 paste/drop handler 拿得到
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("請輸入連結網址", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const handleImagePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editor || !uploadImage) return;
      const files = filterImageFiles(e.target.files);
      if (files.length > 0) insertImagesWithUpload(editor, files, uploadImage);
      // 清空 value，讓同一張圖可以再次選取
      e.target.value = "";
    },
    [editor, uploadImage],
  );

  if (!editor) {
    return (
      <div className="border border-border rounded-lg p-4 min-h-[400px] bg-surface">
        載入中...
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-surface overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-border p-2 flex flex-wrap gap-1 bg-background/50">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="粗體"
        >
          B
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="斜體"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="刪除線"
        >
          <s>S</s>
        </ToolbarButton>

        <div className="w-px bg-border mx-1" />

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editor.isActive("heading", { level: 1 })}
          title="標題 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          title="標題 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive("heading", { level: 3 })}
          title="標題 3"
        >
          H3
        </ToolbarButton>

        <div className="w-px bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="無序列表"
        >
          •
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="有序列表"
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="引用"
        >
          &ldquo;
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="程式碼區塊"
        >
          {"</>"}
        </ToolbarButton>

        <div className="w-px bg-border mx-1" />

        <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} title="連結">
          🔗
        </ToolbarButton>

        {uploadImage && (
          <>
            <ToolbarButton onClick={handleImagePick} title="插入圖片（也可貼上或拖曳）">
              🖼️
            </ToolbarButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </>
        )}

        <div className="w-px bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="復原"
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="重做"
        >
          ↪
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary text-white"
          : "hover:bg-surface text-text-muted hover:text-text"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

// Export for external use (e.g., adding images from media library)
export type { TiptapEditorProps };
