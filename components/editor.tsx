'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Blockquote from '@tiptap/extension-blockquote'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, ImagePlus, Italic, Quote, Strikethrough } from 'lucide-react'

type EditorProps = { initialContent?: string; onChange: (content: string) => void }

export function Editor({ initialContent = '', onChange }: EditorProps) {
  const editor = useEditor({ extensions: [StarterKit, Image, Blockquote, Placeholder.configure({ placeholder: 'Begin with the scene you cannot stop thinking about...' })], content: initialContent, immediatelyRender: false, onUpdate: ({ editor: instance }) => onChange(instance.getHTML()) })
  if (!editor) return <div className="min-h-96 animate-pulse bg-stone-100" />
  return <div className="overflow-hidden border border-stone-200 bg-white"><div className="flex flex-wrap gap-1 border-b border-stone-100 p-2"><button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className="p-2" aria-label="Bold"><Bold className="h-4 w-4" /></button><button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className="p-2" aria-label="Italic"><Italic className="h-4 w-4" /></button><button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className="p-2" aria-label="Strikethrough"><Strikethrough className="h-4 w-4" /></button><button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className="p-2" aria-label="Blockquote"><Quote className="h-4 w-4" /></button><button type="button" onClick={() => { const url = window.prompt('Image URL'); if (url) editor.chain().focus().setImage({ src: url }).run() }} className="p-2" aria-label="Insert image"><ImagePlus className="h-4 w-4" /></button></div><EditorContent editor={editor} className="tani-editor min-h-96 p-5" /></div>
}