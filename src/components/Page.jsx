// ============================================================================
// Page — the note editor, built on Tiptap.
//
// This replaced the original hand-rolled contentEditable editor (archived at
// demo/OldPage.jsx). Tiptap's StarterKit provides bold, italic, bullet lists
// with nesting, and Enter/Tab/Shift+Tab list behavior out of the box —
// including correct handling of the two edge cases the hand-rolled version
// struggled with (premature ** conversion, and lingering empty <em> tags).
//
// Depends on: @tiptap/react, @tiptap/starter-kit, @tiptap/pm
// ============================================================================

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Extension } from '@tiptap/core'
import { useEffect } from 'react'

// Tab indents a normal line (inserts a tab character). Inside a list we
// return false so StarterKit's Tab (nest the list item) runs instead.
const TabIndent = Extension.create({
  name: 'tabIndent',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive('listItem')) return false
        return this.editor.commands.insertContent('\t')
      },
    }
  },
})

function Page(props) {
    // useEditor creates and manages a Tiptap editor instance. It returns null
    // on the very first render and the real editor once it's ready, so any
    // code that touches `editor` must guard against null.
    const editor = useEditor({
        // StarterKit is a bundle of the common extensions: paragraph, bold,
        // italic, strike, code, headings, bulletList, orderedList, listItem,
        // blockquote, horizontalRule, history (undo/redo), and more.
        //
        // The markdown-style "input rules" come built in:
        //   **text**  or  __text__   → bold
        //   *text*    or  _text_     → italic   (correctly NOT triggered by ** )
        //   "- " / "* " / "+ "       → bullet list
        // And inside a list:
        //   Enter      → new bullet (empty bullet exits the list)
        //   Tab        → nest as sub-bullet
        //   Shift+Tab  → un-nest one level
        extensions: [StarterKit, TabIndent],

        // Initial document, loaded from Supabase via props. Tiptap parses this
        // HTML string into its own internal document model.
        content: props.currentPage.content,

        // Fires whenever the document changes (typing, formatting, list edits).
        // We push the HTML up to React state. App.jsx's debounced useEffect
        // saves it to Supabase.
        onUpdate: ({ editor }) => {
            props.updatePage(editor.getHTML())
        },
    })

    // When the user switches pages in the sidebar, currentPage.id changes and
    // we need to load the new page's content into the editor.
    //
    // Notes:
    //   - Dependency is [props.currentPage.id, editor], NOT content — so this
    //     does NOT run on every keystroke (which would reset the cursor). It
    //     runs when the editor first becomes available and when the page changes.
    //   - setContent's { emitUpdate: false } means "don't fire onUpdate for
    //     this programmatic change," so we don't echo the freshly-loaded page
    //     straight back to Supabase as if the user had edited it.
    //   - Tiptap handles all cursor/document rebuilding internally.
    useEffect(() => {
        if (!editor) return
        if (editor.getHTML() !== props.currentPage.content) {
            editor.commands.setContent(props.currentPage.content, { emitUpdate: false })
        }
    }, [props.currentPage.id, editor])

    return (
        <div className="page">
            {/*
                EditorContent renders the actual editable area. Tiptap injects a
                contentEditable <div class="tiptap ProseMirror"> inside this
                wrapper. The .text-space styles apply to the wrapper; the
                editable area itself is targeted via ".text-space .ProseMirror"
                in index.css.
            */}
            <EditorContent editor={editor} className="text-space" />
        </div>
    )
}

export default Page
