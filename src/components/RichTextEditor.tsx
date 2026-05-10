'use client'

import { Extension, InputRule } from '@tiptap/core'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import React, { useEffect, useState } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  showToolbar?: boolean
  onToggleToolbar?: (show: boolean) => void
}

// Custom input rule for [] -> checklist
const TaskListInputRule = new InputRule({
  find: /^\[\]\s$/,
  handler: ({ state, range, chain }) => {
    chain()
      .deleteRange(range)
      .toggleTaskList()
      .run()
  },
})

export default function RichTextEditor({ content, onChange, placeholder = 'Write something...', showToolbar = false, onToggleToolbar }: RichTextEditorProps) {

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'rounded-lg bg-black p-4 font-mono text-sm',
          },
        },
      }),
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Extension.create({
        name: 'customShortcuts',
        addInputRules() {
          return [TaskListInputRule]
        },
      }),
    ],
    immediatelyRender: false,
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm focus:outline-none max-w-none min-h-[60px] text-white/90 leading-relaxed text-sm',
      },
    },
  })

  // Update content if it changes externally (e.g. initial load)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Only update if it's actually different to avoid cursor jumps
      // But be careful with empty strings/paragraphs
      const currentHTML = editor.getHTML()
      if (content === '' && (currentHTML === '<p></p>' || currentHTML === '')) return
      
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  if (!editor) return null

  const ToolbarButton = ({ onClick, active, icon, title }: { onClick: () => void, active?: boolean, icon: string, title: string }) => (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      className={`p-1 rounded-md transition-all ${
        active 
          ? 'bg-primary text-black shadow-[0_0_8px_rgba(143,245,255,0.4)]' 
          : 'text-neutral-500 hover:text-white hover:bg-white/5'
      }`}
      title={title}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
    </button>
  )

  return (
    <div className="flex flex-col w-full">
      {/* Toolbar */}
      <div className={`flex flex-wrap items-center gap-1 mb-1 p-0.5 bg-black/40 border border-white/10 rounded-lg transition-all duration-300 ${showToolbar ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden mb-0 border-transparent'}`}>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          active={editor.isActive('bold')} 
          icon="format_bold" 
          title="Bold"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          active={editor.isActive('italic')} 
          icon="format_italic" 
          title="Italic"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleUnderline().run()} 
          active={editor.isActive('underline')} 
          icon="format_underlined" 
          title="Underline"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleStrike().run()} 
          active={editor.isActive('strike')} 
          icon="strikethrough_s" 
          title="Strikethrough"
        />
        
        <div className="w-px h-4 bg-white/10 mx-1" />
        
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          active={editor.isActive('bulletList')} 
          icon="format_list_bulleted" 
          title="Bullet List"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()} 
          active={editor.isActive('orderedList')} 
          icon="format_list_numbered" 
          title="Numbered List"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleTaskList().run()} 
          active={editor.isActive('taskList')} 
          icon="checklist" 
          title="Task List"
        />

        <div className="w-px h-4 bg-white/10 mx-1" />

        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBlockquote().run()} 
          active={editor.isActive('blockquote')} 
          icon="format_quote" 
          title="Quote"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleCodeBlock().run()} 
          active={editor.isActive('codeBlock')} 
          icon="code" 
          title="Code Block"
        />
        
        <div className="w-px h-4 bg-white/10 mx-1" />
        
        <ToolbarButton 
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} 
          icon="format_clear" 
          title="Clear Formatting"
        />
      </div>

      <div className="relative group">
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>

      <style jsx global>{`
        .tiptap-editor .ProseMirror {
          min-height: 100px;
          padding: 8px 0;
        }
        .tiptap-editor .ProseMirror p {
          margin-bottom: 0.75rem;
        }
        .tiptap-editor .ProseMirror p:last-child {
          margin-bottom: 0;
        }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(255, 255, 255, 0.2);
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        .tiptap-editor ul, .tiptap-editor ol {
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }
        .tiptap-editor ul {
          list-style-type: disc;
        }
        .tiptap-editor ol {
          list-style-type: decimal;
        }
        .tiptap-editor ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        .tiptap-editor ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }
        .tiptap-editor ul[data-type="taskList"] li label {
          flex: 0 0 auto;
          user-select: none;
          margin-top: 0.25rem;
        }
        .tiptap-editor ul[data-type="taskList"] li input[type="checkbox"] {
          cursor: pointer;
          accent-color: #8ff5ff;
          width: 14px;
          height: 14px;
        }
        .tiptap-editor ul[data-type="taskList"] li div {
          flex: 1 1 auto;
        }
        .tiptap-editor ul[data-checked="true"] > div {
          text-decoration: line-through;
          opacity: 0.5;
        }
        .tiptap-editor blockquote {
          border-left: 3px solid #8ff5ff;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: rgba(143, 245, 255, 0.8);
          background: rgba(143, 245, 255, 0.05);
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          border-radius: 0 4px 4px 0;
        }
        .tiptap-editor pre {
          background: #000;
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          margin: 1rem 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .tiptap-editor code {
          color: #8ff5ff;
          background: rgba(143, 245, 255, 0.1);
          padding: 0.2rem 0.4rem;
          border-radius: 0.3rem;
          font-size: 0.9em;
        }
        .tiptap-editor pre code {
          color: inherit;
          padding: 0;
          background: none;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  )
}
