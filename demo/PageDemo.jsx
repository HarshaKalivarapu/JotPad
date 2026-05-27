// ============================================================================
// DEMO ONLY — this file is NOT imported by JotPad.
//
// It shows what `src/components/Page.jsx` would look like if rewritten to use
// a contentEditable div with two formatting behaviors:
//   - *word*  -> italic
//   - Enter   -> insert a clean <br> line break
//
// It lives in /demo/, which is outside /src/, so Vite never builds it.
// To experiment with it for real, copy this file into src/components/ and
// update App.jsx to import PageDemo instead of Page.
// To remove: delete the whole /demo/ folder.
// ============================================================================

import { useRef, useEffect } from 'react'

function PageDemo(props) {
    // We hold a `ref` to the editor div so we can read and write its
    // innerHTML imperatively. We deliberately do NOT bind the div's
    // contents to React state — see the long comment in the JSX for why.
    const editorRef = useRef(null)

    // Sync the editor's HTML from props *only* when the active page
    // changes. The dependency array is [props.currentPage.id], NOT
    // [props.currentPage.content], so we never re-set innerHTML on every
    // keystroke — that would destroy the cursor.
    useEffect(() => {
        const editor = editorRef.current
        if (!editor) return
        if (editor.innerHTML !== props.currentPage.content) {
            editor.innerHTML = props.currentPage.content
        }
    }, [props.currentPage.id])

    function handleInput() {
        const editor = editorRef.current
        if (!editor) return

        // 1) Apply the italic input rule, with cursor save/restore.
        applyItalicRule(editor)

        // 2) Push the editor's new HTML up to React state, which triggers
        //    the auto-save useEffect in App.jsx. We send innerHTML (with
        //    any <em> tags) — not textContent — so formatting is saved.
        props.updatePage(editor.innerHTML)
    }

    function handleKeyDown(event) {
        // Without intercepting Enter, different browsers do different
        // things: Chrome may wrap lines in <div>, Firefox inserts <br>,
        // Safari does its own thing. We force a predictable <br>.
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            insertLineBreakAtCursor()
            props.updatePage(editorRef.current.innerHTML)
        }
    }

    return (
        <div className="page">
            <div
                ref={editorRef}
                className="text-space"
                contentEditable="true"
                suppressContentEditableWarning={true}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
            />
            {/*
                Why is the div empty in JSX instead of {props.currentPage.content}?

                1) JSX escapes text. If content was "hello <em>world</em>", JSX
                   would render the literal characters "<em>world</em>", not
                   actual italic text.

                2) The obvious workaround is dangerouslySetInnerHTML, but that
                   re-sets innerHTML on EVERY React render. Every keystroke
                   triggers a render (because we call props.updatePage, which
                   updates pages state in App.jsx). That would destroy the
                   cursor on every keystroke — the exact problem we're trying
                   to avoid.

                3) So instead we leave the JSX empty and use the useEffect above
                   to populate the div imperatively, only when the page ID
                   changes. The DOM is the source of truth for what's *shown*;
                   React state mirrors it via the onInput callback. This is
                   called the "uncontrolled" pattern for contentEditable.

                4) suppressContentEditableWarning silences a React warning that
                   warns you about exactly the footgun we just sidestepped.

                Security note: setting innerHTML from props.currentPage.content
                runs whatever HTML is in there. For a personal single-user app
                this is fine because only you put data in. For a multi-user app
                you'd want to sanitize before rendering.
            */}
        </div>
    )
}

// ============================================================================
// Italic rule: *word* -> <em>word</em>
// ============================================================================
// The regex /\*([^*]+)\*/g matches:
//   \*           a single literal *
//   ([^*]+)      one or more chars that are NOT *
//   \*           a single literal *
// Because the middle can't contain *, this naturally won't match ** (bold).
// ============================================================================
//
function applyItalicRule(editor) {
    //1) We first get the content on the editor div, and apply the formatting rules
    const text = editor.textContent
    const html = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')

    //2) if the modified content (now looks like html after formatting) is 
    // same as the current inner html, it means nothing changed so return
    if (html === editor.innerHTML) return

    //3) if the html is different, we first find the position of the cursor 
    // right now (the number of characters deep from the start of the div)
    const pos = saveCursor(editor)

    // 4) then we adjust this manually to match with the formatted html (becuase the 
    // formatted version contains tags, not the actual * characters, and tags don't count 
    // in the overall length/characters)
    // Each completed *...* loses 2 chars (the two asterisks). Adjust the
    // cursor position by 2 for every match that finishes before the cursor.
    let adjusted = pos
    const re = /\*([^*]+)\*/g
    let m
    while ((m = re.exec(text)) !== null) {
        if (m.index + m[0].length <= pos) adjusted -= 2
    }

    // 5) After all this, we then update the DOM to use this formatted HTML. 
    // This kills the current object that the current cursor range is on, so the 
    // cursor loses it's position and resets to the beginning of the editor div. 
    // This is why we recorded where it was BEFORE we updated the DOM
    editor.innerHTML = html

    // 6) we use this adjusted cursor position and send it to restoreCursor, to 
    // now calculate the range of the cursor and show it on the screen. Because under the hood, 
    // the cursor is represented by it's range (described in the comments for restoreCursor()), 
    // not the number of chars it is from the start of the div
    restoreCursor(editor, adjusted)
}

// ============================================================================
// Insert a line break at the current cursor position.
// ============================================================================
function insertLineBreakAtCursor() {
    const sel = window.getSelection()
    if (!sel.rangeCount) return

    const range = sel.getRangeAt(0)
    range.deleteContents() // wipe any highlighted selection first

    const br = document.createElement('br')
    range.insertNode(br)

    // Move the cursor to immediately after the <br> we just inserted.
    range.setStartAfter(br)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
}

// ============================================================================
// Cursor save/restore — same logic as in contentEditable-demo.html.
// ============================================================================
// The point of this method is to tell where the cursor currently is; 
// in other words, how many characters deep is it from the start of the editor?
function saveCursor(el) {
    const sel = window.getSelection()
    if (!sel.rangeCount) return null

    const range = sel.getRangeAt(0)
    if (!el.contains(range.endContainer)) return null

    const pre = range.cloneRange()
    pre.selectNodeContents(el)
    pre.setEnd(range.endContainer, range.endOffset)
    return pre.toString().length
}

// This takes the current position of the cursor and puts it where pos says it should be
// pos - where the cursor should be (the number of characters away from the start of the editor)
// So it basically gets the target position for the cursor, and is essentially trying to 
// make the new range needed for the cursor to appear where the pos asks it to be. 
// Because a cursor is represented by a range(node, offset), where node is the node within the DOM it's on, 
// and the offset is how far from the start of that node it is
function restoreCursor(el, pos) {
    if (pos == null) return
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let seen = 0
    let node
    while ((node = walker.nextNode())) {
        const end = seen + node.length
        if (end >= pos) {
            const range = document.createRange()
            range.setStart(node, pos - seen)
            range.collapse(true)

            const sel = window.getSelection()
            sel.removeAllRanges()
            sel.addRange(range)
            return
        }
        seen = end
    }
}

export default PageDemo
