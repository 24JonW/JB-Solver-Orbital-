
import { BrowserRouter, Routes, Route} from 'react-router-dom';
// Import all the Page components that represent different views in the application
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage'; 
import ExpenditureTracker from './pages/ExpenditureTracker'; 
import CommunityGroups from './pages/CommunityGroups'; 
import UserProfile from './pages/UserProfile';

function App() {
  return(
    // <BrowserRouter> provides the routing context, enabling navigation features across the app
    <BrowserRouter> 
      <Routes>
        {/* Define a series of individual routes mapping URL paths to specific page components */}
        <Route path='/' element={<LoginPage/>}/>
        <Route path='/register' element={<RegisterPage/>}/>
        <Route path='/home' element={<HomePage/>}/>
        <Route path='/tracker' element={<ExpenditureTracker/>}/>
        <Route path='/groups' element={<CommunityGroups/>}/>
        <Route path='/profile' element={<UserProfile/>}/>
      </Routes>
    </BrowserRouter>
  )

}

export default App; 

