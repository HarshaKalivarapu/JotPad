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
import { useEffect, useRef, useCallback } from 'react'

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

// How long to wait after the last keystroke before syncing the document to
// React state / Supabase. This is invisible while typing (Tiptap draws every
// keystroke into its own DOM instantly) — it only controls how often we run
// the costly getHTML() + state update that used to fire on every keypress.
const SAVE_DELAY = 400

function Page(props) {
    // --- Debounced-save bookkeeping -----------------------------------------
    // These are refs (not state) because the editor is created once and its
    // onUpdate closure must always see the latest values without re-rendering.
    const saveTimer = useRef(null)     // pending debounce timer id
    const dirty = useRef(false)        // is there an un-synced edit?
    // The id of the page currently loaded in the editor. A pending flush is
    // applied to THIS id, so if the user switches pages before the timer fires,
    // the edit still lands on the page it was typed on — never the new one.
    const editedPageId = useRef(props.currentPage.id)
    const editorRef = useRef(null)                  // live editor, reached from timers/cleanups
    const updatePageRef = useRef(props.updatePage)  // latest App callback (avoids stale closure)

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

        // Fires on every document change (typing, formatting, list edits). We
        // deliberately DON'T serialize here — that was the per-keystroke cost.
        // Instead we mark the page dirty and (re)start the debounce timer;
        // flushPending() does the getHTML() + state push once typing settles.
        onUpdate: () => {
            dirty.current = true
            if (saveTimer.current) clearTimeout(saveTimer.current)
            saveTimer.current = setTimeout(flushPending, SAVE_DELAY)
        },
    })
    // Keep the refs pointing at the current editor / callback. Done in an
    // effect (not during render) so we never mutate a ref mid-render.
    useEffect(() => {
        editorRef.current = editor
        updatePageRef.current = props.updatePage
    })

    // Serialize the current document and push it up to App, which stores it in
    // React state and (debounced again there) saves to Supabase. Stable across
    // renders (it reads refs), so the debounce timer and the effect cleanup
    // below both call the same function; no-ops unless there's an un-synced edit.
    const flushPending = useCallback(() => {
        if (saveTimer.current) {
            clearTimeout(saveTimer.current)
            saveTimer.current = null
        }
        const ed = editorRef.current
        if (!dirty.current || !ed || ed.isDestroyed) return
        dirty.current = false
        updatePageRef.current(editedPageId.current, ed.getHTML())
    }, [])

    // When the user switches pages in the sidebar, currentPage.id changes and
    // we load the new page's content into the editor.
    //
    // Notes:
    //   - Dependency is [props.currentPage.id, editor], NOT content — so this
    //     does NOT run on every keystroke (which would reset the cursor). It
    //     runs when the editor first becomes available and when the page changes.
    //   - The cleanup runs BEFORE the next page loads (and on unmount), so we
    //     flush the OUTGOING page's pending edit first — captured against its
    //     own id via editedPageId — before setContent replaces the document.
    //   - setContent's { emitUpdate: false } means "don't fire onUpdate for
    //     this programmatic change," so we don't echo the freshly-loaded page
    //     straight back to Supabase as if the user had edited it.
    useEffect(() => {
        if (!editor) return
        editedPageId.current = props.currentPage.id
        if (editor.getHTML() !== props.currentPage.content) {
            editor.commands.setContent(props.currentPage.content, { emitUpdate: false })
        }
        return () => flushPending()
        // props.currentPage.content is intentionally omitted: re-running on
        // every content change would reset the cursor mid-typing.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.currentPage.id, editor, flushPending])

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
