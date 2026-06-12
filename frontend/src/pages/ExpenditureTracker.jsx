
import { useNavigate } from 'react-router-dom';
import JBSolverLogo from '../assets/JBSolverLogo.png';

import '../App.css'; 
import { GiHouse } from "react-icons/gi";
import { FaUserCircle } from "react-icons/fa";
import { FaUsersGear } from "react-icons/fa6";
import { ImStatsDots } from "react-icons/im";


function ExpenditureTracker() {
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
              <GiHouse size={45} color={'#edb601'}/>
            </button>
            <span className="hover-tooltip">Home Page</span>
          </div>
          <div className="button-wrapper">
            <button
              className="expenditureTracker"
              onClick={() => navigate("/tracker")}
            >
              <ImStatsDots size={45} color={'#edb601'}/>
            </button>
            <span className="hover-tooltip">Expenditure Tracker</span>
          </div>

          <div className="button-wrapper">
            <button
              className="communityGroupButton"
              onClick={() => navigate("/groups")}
            >
              <FaUsersGear size={45} color={'#edb601'}/>
            </button>
            <span className="hover-tooltip">Community Groups</span>
          </div>

          <div className="button-wrapper">
            <button
              className="userProfileButton"
              onClick={() => navigate("/profile")}
            >
              <FaUserCircle size={45} color={'#edb601'}/>
            </button>
            <span className="hover-tooltip">User Profile</span>
          </div>
        </div>
      </div>

      <div className='home-body'>

        <h1>
          Expenditure Tracker
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

export default ExpenditureTracker;