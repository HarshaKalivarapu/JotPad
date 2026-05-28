import { useRef, useEffect } from 'react'

function Page(props) {
    // This will hold a reference to the editor div so that we can read/write it's innerHTML as we want
    // We aren't connecting the div to the React state variable like we previously did with <textarea> for various reasons
    const editorRef = useRef(null)

    // Whenever the page changes, this useEffect runs to change the content. And it runs every time the ID changes
    //      Remember that now, the currentPage.content (aka, whatever goes into supabase) actualy contains th raw tags 
    //      as plaintext in the strings, so the HTML gets auto-parsed when we send it to the DOM
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

        // Order matters here:
        //   1. Try the bullet trigger first. If "- " just became a bullet,
        //      we're done — don't also try to apply formatting (which would
        //      re-process the same text we just transformed).
        //   2. Otherwise, apply bold/italic formatting per text node.
        const converted = applyBulletTrigger(editor)
        if (!converted) {
            applyFormattingRules(editor)
        }

        // Push the updated HTML up to React state. The auto-save useEffect
        // in App.jsx will debounce and save to Supabase.
        props.updatePage(editor.innerHTML)
    }

    function handleKeyDown(event) {
        const editor = editorRef.current
        if (!editor) return

        // Enter: list-aware behavior, or fall back to <br> insertion.
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            const li = findContainingListItem(getCursorNode(), editor)
            if (li) {
                handleEnterInList(editor, li)
            } else {
                applyLineBreak()
            }
            props.updatePage(editor.innerHTML)
            return
        }

        // Tab / Shift+Tab: nest or un-nest the current bullet.
        // Only intercept when actually inside a list — otherwise let Tab
        // do its normal "move focus" thing for accessibility.
        if (event.key === 'Tab') {
            const li = findContainingListItem(getCursorNode(), editor)
            if (!li) return

            event.preventDefault()
            if (event.shiftKey) {
                unindentListItem(editor, li)
            } else {
                indentListItem(editor, li)
            }
            props.updatePage(editor.innerHTML)
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
        </div>
    )
}


// ============================================================================
// Small utilities used in multiple places.
// ============================================================================

// Returns the DOM node the cursor currently sits in, or null if no selection.
// We use this to ask "are we inside a list item right now?"
function getCursorNode() {
    const sel = window.getSelection()
    if (!sel.rangeCount) return null
    return sel.getRangeAt(0).endContainer
}

// Walks up from `node` looking for an <li> ancestor *inside* `editor`.
// Returns the <li> element if found, otherwise null.
//
// Used by the Enter and Tab handlers to detect list context.
function findContainingListItem(node, editor) {
    let current = node
    while (current && current !== editor) {
        if (current.nodeName === 'LI') return current
        current = current.parentNode
    }
    return null
}

// Collects every text node inside `el` into a plain array.
//
// Why an array instead of using the TreeWalker directly? Because we're going
// to MODIFY the tree while iterating (replacing text nodes with formatted
// HTML fragments). A live walker would get confused; collecting first lets
// us iterate a stable snapshot.
function collectTextNodes(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const result = []
    let node
    while ((node = walker.nextNode())) {
        result.push(node)
    }
    return result
}

// Place the cursor at the very start of `node`.
// If `node` already has children, we step into the first text node;
// otherwise we collapse to (node, 0).
function placeCursorAtStartOf(node) {
    const range = document.createRange()
    if (node.firstChild && node.firstChild.nodeType === Node.TEXT_NODE) {
        range.setStart(node.firstChild, 0)
    } else {
        range.setStart(node, 0)
    }
    range.collapse(true)

    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
}

// Place the cursor right after `node`.
function placeCursorAfter(node) {
    const range = document.createRange()
    range.setStartAfter(node)
    range.collapse(true)

    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
}


function applyFormattingRules(editor) {
    // 1) Collect all text nodes up front (we'll mutate the tree as we go).
    const textNodes = collectTextNodes(editor)

    // 2) Bail early if no text node actually contains a pattern. This
    //    saves an unnecessary save/restore round-trip on every keystroke.
    let needsUpdate = false
    for (const tn of textNodes) {
        if (/\*([^*]+)\*/.test(tn.textContent)) {
            needsUpdate = true
            break
        }
    }
    if (!needsUpdate) return

    // 3) Save the cursor as a global character offset across the whole
    //    editor (this is the same calcCursorPosition as before — it doesn't care
    //    about <ul>/<li>/<em>/<b> nesting because it walks text nodes).
    const pos = calcCursorPosition(editor)

    // 4) Compute the adjusted cursor position using slice-and-strip on
    //    the editor's full visible text. Same trick as Page.jsx.
    const fullText = editor.textContent
    const beforeCursor = fullText.slice(0, pos)
    let visible = beforeCursor
    visible = visible.replace(/\*\*([^*]+)\*\*/g, '$1')
    visible = visible.replace(/\*([^*]+)\*/g, '$1')
    const adjusted = visible.length

    // 5) Apply the transformations to each text node individually.
    //    A text node containing "*bar*" will be replaced with the
    //    sequence (text, <em>, text) — but only WHERE that text node
    //    was. Its parent (which might be <li>) is untouched.
    for (const textNode of textNodes) {
        applyFormattingToTextNode(textNode)
    }

    // 6) Restore the cursor at the adjusted position. restoreCursor uses
    //    a TreeWalker, which visits all text nodes (including ones inside
    //    nested <li>) in document order. So the offset resolves correctly
    //    even with list structure.
    restoreCursor(editor, adjusted)
}

// Replaces ONE text node with the formatted HTML version of its content,
// if any pattern matches. Leaves it alone otherwise.
//
// Important: the surrounding parent (text node's siblings, the containing
// <li> or editor div, etc.) is not touched. We only swap out this single
// text node for a small fragment.
function applyFormattingToTextNode(textNode) {
    const t = textNode.textContent

    let html = t
    html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

    if (html === t) return // no patterns matched, nothing to do

    // Parse the new HTML into actual DOM nodes via a throwaway container.
    // Then move those children into place where the text node was, and
    // remove the original text node.
    const temp = document.createElement('span')
    temp.innerHTML = html

    const parent = textNode.parentNode
    while (temp.firstChild) {
        parent.insertBefore(temp.firstChild, textNode)
    }
    parent.removeChild(textNode)
}


// ============================================================================
// Bullet trigger: "- " at the start of a top-level line → <ul><li>.
//
// We only fire when:
//   - The cursor just landed at offset 2 of a text node (so the user just
//     typed the space in "- ").
//   - That text node starts with "- ".
//   - It's at the start of a top-level "line" — meaning its parent is the
//     editor div (not already inside a <li>), and the previous sibling is
//     either nothing or a <br>.
//
// Inside an existing <li>, "- " just stays as literal text. (You wouldn't
// type "- " to make a bullet when you're already in one; you'd press
// Enter, which creates a new bullet automatically.)
// ============================================================================
function applyBulletTrigger(editor) {
    const sel = window.getSelection()
    if (!sel.rangeCount) return false

    const range = sel.getRangeAt(0)
    const node = range.endContainer

    // Only trigger from text nodes — element nodes don't carry typed chars.
    if (node.nodeType !== Node.TEXT_NODE) return false

    // The cursor must be right after the space, i.e., at offset 2 of "- ".
    // If they typed more (e.g., "- xyz"), offset is 5 and we don't re-trigger.
    if (range.endOffset !== 2) return false
    if (node.textContent.substring(0, 2) !== '- ') return false

    // Must be a top-level line (not already inside something like an <li>).
    if (node.parentNode !== editor) return false

    // The previous sibling must be the start of a line. Either there's
    // nothing before (this is the editor's first child) or it's a <br>.
    const prev = node.previousSibling
    if (prev !== null && prev.nodeName !== 'BR') return false

    // The line might consist of multiple nodes — text plus inline formatting
    // like <em> or <b> — up until the next <br>. We collect them all so the
    // whole line moves into the <li> together, preserving any formatting.
    const lineNodes = [node]
    let next = node.nextSibling
    while (next && next.nodeName !== 'BR') {
        lineNodes.push(next)
        next = next.nextSibling
    }

    // Strip the leading "- " from the first text node.
    node.textContent = node.textContent.substring(2)

    // Build a fresh <li> and move each line node into it.
    // appendChild MOVES a node (it doesn't copy), so this is a structural
    // re-parenting, not a duplication.
    const li = document.createElement('li')
    for (const n of lineNodes) {
        li.appendChild(n)
    }

    // Wrap the <li> in a <ul> and insert into the editor where the line was.
    const ul = document.createElement('ul')
    ul.appendChild(li)

    if (prev) {
        // There was a <br> before the line; insert <ul> right after it.
        prev.parentNode.insertBefore(ul, prev.nextSibling)
    } else {
        // The line was the editor's first child; <ul> becomes the new first child.
        editor.insertBefore(ul, editor.firstChild)
    }

    // Cursor moves to the start of the bullet's content.
    placeCursorAtStartOf(li)

    return true
}

// ============================================================================
// Enter inside an <li>:
//   - Empty bullet at top level → exit the list (cursor goes outside the <ul>)
//   - Empty bullet nested      → un-nest one level
//   - Non-empty bullet         → create a new empty sibling <li> below
// ============================================================================
function handleEnterInList(editor, li) {
    const ul = li.parentNode
    const isEmpty = li.textContent.trim() === ''

    if (!isEmpty) {
        // Common case: just add another bullet after this one.
        // The new <li> starts empty; the cursor goes inside it and the
        // browser will create a text node as the user types.
        const newLi = document.createElement('li')
        ul.insertBefore(newLi, li.nextSibling)
        placeCursorAtStartOf(newLi)
        return
    }

    // Empty bullet — the user wants to exit. Two possibilities:
    //   - Nested list: pop out one level (Shift+Tab equivalent).
    //   - Top-level list: exit the list entirely.
    const isNested = ul.parentNode && ul.parentNode.nodeName === 'LI'

    if (isNested) {
        unindentListItem(editor, li)
        return
    }

    // Top-level empty bullet — exit the list.
    //
    // We need to handle three sub-cases based on where the empty <li> sits:
    //   - Only item in the <ul>:   remove the <ul>, leave a <br> in its place.
    //   - First/middle item:        split the <ul> into "before" and "after"
    //                               parts, with a <br> between them.
    //   - Last item:                trim it off the end, leave a <br> after.
    //
    // The split logic handles all three cases uniformly: collect items before
    // and after the empty one, rebuild as 0/1/2 <ul>s with a <br> between.
    const itemsBefore = []
    const itemsAfter = []
    let seenLi = false
    for (const child of Array.from(ul.children)) {
        if (child === li) {
            seenLi = true
            continue
        }
        if (seenLi) itemsAfter.push(child)
        else itemsBefore.push(child)
    }

    const ulParent = ul.parentNode
    const ulNext = ul.nextSibling
    ulParent.removeChild(ul)

    if (itemsBefore.length > 0) {
        const beforeUl = document.createElement('ul')
        for (const item of itemsBefore) beforeUl.appendChild(item)
        ulParent.insertBefore(beforeUl, ulNext)
    }

    const br = document.createElement('br')
    ulParent.insertBefore(br, ulNext)

    if (itemsAfter.length > 0) {
        const afterUl = document.createElement('ul')
        for (const item of itemsAfter) afterUl.appendChild(item)
        ulParent.insertBefore(afterUl, ulNext)
    }

    placeCursorAfter(br)
}

// ============================================================================
// Tab inside an <li>: make this item a sub-item of the previous one.
//
//   Before:
//     <ul>
//       <li>apples</li>
//       <li>peaches</li>   ← cursor in here, hit Tab
//     </ul>
//
//   After:
//     <ul>
//       <li>apples
//         <ul>
//           <li>peaches</li>   ← cursor still here
//         </ul>
//       </li>
//     </ul>
//
// If there's no previous <li>, we can't indent (you can't be a sub-item of
// nothing). In that case we silently do nothing.
// ============================================================================
function indentListItem(editor, li) {
    const prevLi = li.previousElementSibling
    if (!prevLi || prevLi.nodeName !== 'LI') return

    // Save cursor — we're about to move <li> across the tree, which can
    // disrupt where the cursor's anchor lives.
    const pos = calcCursorPosition(editor)

    // Find or create a nested <ul> at the end of the previous <li>.
    // If the previous <li> already has a sub-list, we add to it; otherwise
    // we create a fresh nested <ul>.
    let nestedUl = null
    if (prevLi.lastElementChild && prevLi.lastElementChild.nodeName === 'UL') {
        nestedUl = prevLi.lastElementChild
    } else {
        nestedUl = document.createElement('ul')
        prevLi.appendChild(nestedUl)
    }

    // Move our <li> into the nested <ul>. appendChild moves, not copies.
    nestedUl.appendChild(li)

    // Restore cursor. The text-node order in document-order hasn't changed
    // (just the nesting depth), so the same character offset still points
    // to the same place.
    restoreCursor(editor, pos)
}

// ============================================================================
// Shift+Tab inside an <li>: pull it out one level of nesting.
//
//   Before:
//     <ul>
//       <li>apples
//         <ul>
//           <li>peaches</li>   ← cursor here, Shift+Tab
//         </ul>
//       </li>
//     </ul>
//
//   After:
//     <ul>
//       <li>apples</li>
//       <li>peaches</li>   ← cursor still here
//     </ul>
//
// If we're already at top level (the <ul>'s parent is the editor itself),
// we have nowhere to go and silently do nothing.
// ============================================================================
function unindentListItem(editor, li) {
    const parentUl = li.parentNode
    const grandparent = parentUl.parentNode

    if (grandparent.nodeName !== 'LI') {
        // Already at top level. Nothing to un-nest into.
        return
    }

    const pos = calcCursorPosition(editor)

    // Move the <li> to be the immediate sibling AFTER the grandparent <li>.
    // (Putting it before would be valid too; this matches typical "exit the
    // sub-list" feel.)
    grandparent.parentNode.insertBefore(li, grandparent.nextSibling)

    // If the nested <ul> is now empty (the <li> we moved was its only child),
    // remove the empty <ul> so we don't leave a dangling structure.
    if (parentUl.children.length === 0) {
        parentUl.parentNode.removeChild(parentUl)
    }

    restoreCursor(editor, pos)
}


function applyLineBreak() {
    const sel = window.getSelection()
    if (!sel.rangeCount) return
    
    const range = sel.getRangeAt(0)
    // We are first wiping any highlighted section first
    range.deleteContents()

    // There's a cool command where we can insert a node in a range (that's why we deleted the 
    //      contents to get the cursor to be in one spot (aka, start == end), so that we can add a break there)
    //      So we will add a break node here
    const br = document.createElement('br')
    range.insertNode(br)

    range.setStartAfter(br)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
}



function calcCursorPosition(el) {
    // We get the Selection object of where the cursor is
    // Note: A selection object is one layer above a Range. A Selection object can contain zero, one, or (rarely) multiple Ranges
    const sel = window.getSelection()
    // rangeCount tells you how many ranges are in that selection object. If zero, it means nothing is selected
    if (!sel.rangeCount) return null

    // From the selection object, we get the range of the cursor right now
    // Note: a Range object contains two (node, offset) pairs
    //      range.startContainer
    //      range.startOffset
    //      range.endContainer
    //      range.endOffset
    const range = sel.getRangeAt(0)
    if (!el.contains(range.endContainer)) return null

    // We want to now find the position of the cursor in terms of "# of chars from the start of the div"
    // So we make a copy of the range, select EVERYTHING in the given editor (aka, all the text nodes), 
    //      set the end to the end container and offset, and get the length of that string
    const pre = range.cloneRange()
    pre.selectNodeContents(el)
    pre.setEnd(range.endContainer, range.endOffset)
    return pre.toString().length
}


function restoreCursor(el, targetPos) {
    if (targetPos == null) return

    // We first need to only traverse the text nodes to get the target pos. We can use a TreeWalker to get that
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)

    // From there, we will iterate over every text node. As we go, we need to count how many characters we've passed/seen
    //      We keep doing this until we realize that if we pass the next node, we will go over the targetPos (indicating
    //      that the targetPos is within this text node)
    //      
    //      Once we find this node that we belong in, we need to create the new range for this position, and then put it
    //      onto the screen/window
    let seen = 0
    let node
    while ((node = walker.nextNode())) {
        const end = seen + node.length
        // so if end >= targetPos, that means the targetPos comes after seen (where we would be at the start of this node), 
        //      but before end (where we would be at the end of this node). So that means targetPos is in this node
        if (end >= targetPos) {
            const range = document.createRange()
            range.setStart(node, targetPos - seen)
            // .collpase(true) sets the endContainer and endOffset equal to the startContainer and startOffset, ensuring that start == end
            //      which means the cursor is on one spot (which is when it stays as a vertical line and blinks)
            range.collapse(true)

            const sel = window.getSelection()
            sel.removeAllRanges()
            sel.addRange(range)
            return
        }
        seen = end
    }
}

export default Page