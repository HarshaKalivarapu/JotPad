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

        applyFormattingRules(editor)

        // Once we're done, we push this new HTML up to the React state variable, which triggers the auto-save useEffect we have in App.jsx
        props.updatePage(editor.innerHTML)
    }

    function handleKeyDown(event) {
        // To implement the insert break thing whenever the user clicks "Enter", we need to intercept it;
        //      This is because different browsers respond to an Enter differently, so we need to specify it
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            applyLineBreak()
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
        </div>
    )
}


function applyFormattingRules(editor) {
    // 1) we are getting the text content in the editor div, not the innerHTML (because we don't want the tags)
    const text = editor.textContent
    let html = text
    // 2) we replace all instances of *...* and **...** with the tags
    //      Note: we do bold first because we don't want to replace the *...* within a **...** and make it italics instead of bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

    // 3) After fixing it, if it's the same as what we already have, it means nothing happened and we return
    if (html === editor.innerHTML) return

    // 4) If there is differences, we need to first find the current position of the cursor in terms of "# of chars from the start of the div"
    const pos = calcCursorPosition(editor)

    // 5) After that, we now want to make a copy of the text and remove all the asterisks and stuff to get the text that the user sees (and
    //      they won't see anyt asterisks on their screen)
    //          Note: we slice the text to only incluide until pos, because that's only where we need our cursor to be updated to (after we remove the asterisks)
    //      So we replaced all those instances with just the text that was between the asterisks
    //          Note: we do bold first because we don't want to accidentally treat the *...* in a **...** as an italics
    let visible = text.slice(0, pos)
    visible = visible.replace(/\*\*([^*]+)\*\*/g, '$1')
    visible = visible.replace(/\*([^*]+)\*/g, '$1')

    // 6) Now that "visible" contains the text that the user will literally see on their end (up until where they finished their typing), we just need to 
    //      put that length into a variable called adjusted; this variable represents where our cursor SHOULD be after the DOM gets updated with the formatted HTML
    const adjusted = visible.length

    // 7) We now got the new position of the cursor in terms of "# of chars from the start of the div". We can safely update the DOM to contain our formatted HTML
    // Note: We had to manually find the adjusted position because if we did it after this step, it destroys the object the cursor is currently pointing at, and resets it to the beginning
    //      So if the user added something to the middle of the page, then we wouldn't know where they added it, since the cursor would've been moved to the beginning
    editor.innerHTML = html

    // 8) Now since the cursor has been moved to the beginning of the page, we need to bring it back to where it should be (which we kept track of by calculating the "adjusted" var)
    //      We send it to restoreCursor to get it moved
    restoreCursor(editor, adjusted)
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