import { useNavigate } from 'react-router-dom';
import JBSolverLogo from '../assets/JBSolverLogo.png';
import communityGroup from '../assets/communityGroup.png';
import expenseTracker from '../assets/expenditureTracker96.png'; 
import userProfile from '../assets/user96.png';
import home from '../assets/home.png';
import '../App.css'; 


function CommunityGroups() {
    const navigate = useNavigate();

  return (
    <div className="homepage-container">
      <div className="topSectionBar">
        <img src={JBSolverLogo} className="logo-img" />

        <div className="right-buttons-4">
          <div className="button-wrapper">
            <button
              className="homepageButton"
              onClick={() => navigate("/home")}
            >
              <img src={home} className="expense-img" />
            </button>
            <span className="hover-tooltip">Home Page</span>
          </div>
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

      <div className='home-body'>

        <h1>
          Community Groups
        </h1>

        
      </div>
      <div className='footer'>
        <button className='btn-logout' onClick={() => navigate('/')}>
            Log Out
        </button>
      </div>




    </div>

    );
}

export default CommunityGroups;