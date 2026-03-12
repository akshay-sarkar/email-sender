import { configureStore } from "@reduxjs/toolkit"
import type { Action, ThunkAction } from "@reduxjs/toolkit"
import postReducer from "../features/posts/postsSlice"
import usersReducer from "../features/users/usersSlice"

export const makeStore = (preloadedState = {}) =>
  configureStore({
    reducer: {
      posts: postReducer,
      users: usersReducer,
    },
    preloadedState,
  })

export const store = makeStore()

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore["dispatch"]
export type RootState = ReturnType<AppStore["getState"]>
export type AppThunk = ThunkAction<void, RootState, unknown, Action>