import React from "react"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import { postAdded } from "./postsSlice"
import { selectAllUsers } from '../users/usersSlice'

// TS types for the input fields
// See: https://epicreact.dev/how-to-type-a-react-form-on-submit-handler/
interface AddPostFormFields extends HTMLFormControlsCollection {
  postTitle: HTMLInputElement
  postContent: HTMLTextAreaElement,
  postAuthor: HTMLSelectElement
}
interface AddPostFormElements extends HTMLFormElement {
  readonly elements: AddPostFormFields
}

export const AddPostForm = () => {
  const dispatch = useAppDispatch()
  const users = useAppSelector(selectAllUsers)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Prevent server submission
    e.preventDefault()

    const { elements } = e.currentTarget as AddPostFormElements
    const title = elements.postTitle.value
    const content = elements.postContent.value
    const userId = elements.postAuthor.value


    dispatch(postAdded(title, content, userId))

    // Reset the form after submission
    e.currentTarget.reset()
  }

  const usersOptions = users.map(user => (
    <option key={user.id} value={user.id}>
      {user.name}
    </option>
  ))

  return (
    <div className="add-post-form">
      <h2>Add a New Post</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="postTitle">Post Title:</label>
          <input type="text" id="postTitle" defaultValue="" required />
        </div>
        <div>
        <label htmlFor="postAuthor">Author:</label>
        <select id="postAuthor" name="postAuthor" required>
          <option value=""></option>
          {usersOptions}
        </select>
        </div>
        <div>
          <label htmlFor="postContent">Content:</label>
          <textarea
            id="postContent"
            name="postContent"
            defaultValue=""
            required
          />
        </div>
        <button>Save Post</button>
      </form>
    </div>
  )
}
