import { useNavigate } from 'react-router-dom';
import '../App.css';

import JBSolverLogo from '../JBSolverLogo.png'; 
import communityGroup from '../communityGroup.png';
import expenseTracker from '../expenditureTracker96.png';
import userProfile from '../user96.png';
import picture from '../picture.png'; 

function HomePage() {
    const navigate = useNavigate();

  return (
    <div className="homepage-container">
      <div className="topSectionBar">
        <img src={JBSolverLogo} className="logo-img" />

        <div className="right-buttons-3">
          <div className="button-wrapper">
            <button
              className="expenditureTracker"
              onClick={() => navigate("/tracker")}
            >
              <img src={expenseTracker} className="expense-img" />
            </button>
            <span className="hover-tooltip">Expenditure Tracker</span>
          </div>

          <div className="button-wrapper">
            <button
              className="communityGroupButton"
              onClick={() => navigate("/groups")}
            >
              <img src={communityGroup} className="group-img" />
            </button>
            <span className="hover-tooltip">Community Groups</span>
          </div>

          <div className="button-wrapper">
            <button
              className="userProfileButton"
              onClick={() => navigate("/profile")}
            >
              <img src={userProfile} className="userProfile-img" />
            </button>
            <span className="hover-tooltip">User Profile</span>
          </div>
        </div>
      </div>

      <div className='profile-card'>
        <div className='profile-header'>
            <img src={picture} className='profilePicture-img' />
            <div className='profile-main-info'>
                <h2>Logged In User</h2>
                <p>Community Member</p>
            </div>
        </div>
        <div className='profile-details'>
            <p><strong>Email:</strong> user@email.com</p>
            <p><strong>ID:</strong> 123</p>
        </div>
        <button className='edit-profile-btn'>
            Edit Profile
        </button>
        <button className='btn-logout' onClick={() => navigate('/')}>
            Log Out
        </button>
      </div>
    </div>
    );
}
export default HomePage; 