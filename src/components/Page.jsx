function Page(props) {
    //This will hold a reference to the editor div so that we can read/write it's innerHTML as we want
    //We aren't connecting the div to the React state variable like we previously did with <textarea> for various reasons
    const editorRef = useRe(null)
    return (
        <div className="page">
            <div
                ref={editorRef} 
            />
        </div>
    )
}

export default Page