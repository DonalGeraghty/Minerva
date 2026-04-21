import { Navigate } from 'react-router-dom'

/** Legacy route: month summary now lives with the habit tracker. */
function HabitMonthSummary() {
  return <Navigate to="/habits" replace />
}

export default HabitMonthSummary
