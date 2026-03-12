import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit"

export interface Post {
  id: string
  title: string
  content: string
  user: string
}

type PostUpdate = Pick<Post, 'id' | 'title' | 'content'>

const initialState: Post[] = [
  {
    id: nanoid(),
    title: "Post 1",
    content: "Content for post 1",
    user: '0'
  },
  {
    id: nanoid(),
    title: "Post 2",
    content: "Content for post 2",
    user: '1'
  },
  {
    id: nanoid(),
    title: "Post 3",
    content: "Content for post 3",
    user: '2'
  },
]

const postSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    postAdded: {
      reducer(state, action: PayloadAction<Post>) {
        state.push(action.payload)
      },
      // before passing to the reducer, the `prepare` callback generates a unique ID for the new post
      prepare(title: string, content: string, userId: string) {
        return {
          payload: { id: nanoid(), title, content, user: userId },
        }
      },
    },
    postUpdated(state, action: PayloadAction<PostUpdate>) {
      const { id, title, content } = action.payload
      const existingPost = state.find(post => post.id === id)
      if (existingPost) {
        existingPost.title = title
        existingPost.content = content
      }
    },
  },
  selectors: {
    // Note that these selectors are given just the `PostsState`
    // as an argument, not the entire `RootState`
    selectAllPosts: postsState => postsState,
    selectPostById: (postsState, postId: string) => {
      return postsState.find(post => post.id === postId)
    }
  }
})

export const { postAdded, postUpdated } = postSlice.actions
export const { selectAllPosts, selectPostById } = postSlice.selectors;
export default postSlice.reducer


