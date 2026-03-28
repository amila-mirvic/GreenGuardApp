import { useRef, useState } from 'react'
import { searchUsers as searchUsersAPI } from '../firebaseSocialGraphClient'

export const useSearchUsers = userID => {
  const [users, setUsers] = useState([])
  const pagination = useRef({ page: 0, size: 100 })

  const search = async keyword => {
    try {
      const fetchedUsers = await searchUsersAPI(
        userID,
        keyword ?? '',
        pagination.current.page,
        pagination.current.size,
      )

      setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : [])
    } catch (error) {
      console.log('search users error:', error)
      setUsers([])
    }
  }

  const removeUserAt = index => {
    const newUsers = [...users]
    newUsers.splice(index, 1)
    setUsers(newUsers)
  }

  return {
    users,
    search,
    removeUserAt,
  }
}