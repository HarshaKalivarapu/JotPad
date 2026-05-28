// ============================================================================
// DEMO ONLY — this file is NOT imported by JotPad.
//
// This is the SAME editor you built by hand (bold, italic, bullet lists with
// nesting), but built on Tiptap instead of raw contentEditable. Compare it to
// your Page.jsx (~550 lines): this is a tiny fraction of the size, because
// Tiptap's StarterKit ships all of these features already built — including
// fixes for the two bugs you found (premature ** conversion, and lingering
// empty <em> tags after deletion).
//
// Requires (already installed):
//   npm install @tiptap/react @tiptap/starter-kit @tiptap/pm
//
// To experiment: copy this file into src/components/ and import it from
// App.jsx instead of Page.
// To FULLY remove: delete the /demo/ folder AND run
//   npm uninstall @tiptap/react @tiptap/starter-kit @tiptap/pm
// (Unlike the hand-rolled demo, this one added real dependencies.)
// ============================================================================

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

function PageDemo(props) {
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
        //
        // Every one of those is something you wrote by hand. Here it's just
        // "include StarterKit."
        extensions: [StarterKit],

        // Initial document, loaded from Supabase via props. Tiptap parses this
        // HTML string into its own internal document model.
        content: props.currentPage.content,

        // Fires whenever the document changes (typing, formatting, list edits).
        // We push the HTML up to React state — same contract as your
        // hand-rolled props.updatePage. App.jsx's debounced useEffect saves it.
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
    //   - Tiptap handles all cursor/document rebuilding internally. There is no
    //     saveCursor / restoreCursor here — that entire problem disappears.
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
                wrapper. Your .text-space styles apply to the wrapper; if you
                want the font/margins on the editable area itself, target
                ".text-space .ProseMirror" in index.css.
            */}
            <EditorContent editor={editor} className="text-space" />
        </div>
    )
}

export default PageDemo
