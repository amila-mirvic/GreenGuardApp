import { combineReducers } from 'redux'
import { auth } from '../../core/onboarding/redux/auth'
import { friends } from '../../core/socialgraph/friendships/redux'
import { feed } from '../../core/socialgraph/feed/redux'
import { userReports } from '../../core/user-reporting/redux'
import { notifications } from '../../core/notifications/redux'
const LOG_OUT = 'LOG_OUT'

// combine reducers to build the state
const appReducer = combineReducers({
  auth,
  feed,
  friends,
  notifications,
  userReports,
})

const rootReducer = (state, action) => {
  if (action.type === LOG_OUT) {
    state = undefined
  }

  return appReducer(state, action)
}

export default rootReducer
