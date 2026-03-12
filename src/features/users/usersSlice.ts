import { createSlice } from '@reduxjs/toolkit'

interface User {
  id: string
  name: string
}

const initialState: User[] = [
  { id: '0', name: 'Tianna Jenkins' },
  { id: '1', name: 'Kevin Grant' },
  { id: '2', name: 'Madison Price' }
]

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  selectors: {
    selectAllUsers: (usersState) => usersState,
    selectUserById: (usersState, userId: string | null) => {
      return usersState.find(user => user.id === userId)
    }
  }
})

export default usersSlice.reducer

export const { selectAllUsers, selectUserById } = usersSlice.selectors