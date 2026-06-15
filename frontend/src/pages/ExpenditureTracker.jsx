
import { useNavigate } from 'react-router-dom';
import JBSolverLogo from '../assets/JBSolverLogo.png';

import '../App.css'; 
import '../ExTracker.css'; 
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



    
      <div className='home-body-ex'>
        <div className='card' style={{gridArea: 'box-1'}}>
            Budget this month
        </div>

        <div className='card' style={{gridArea: 'box-2'}} >
            Expenditure this month
        </div>

        <div className='card' style={{gridArea: 'box-3'}}>
            Comparison with prev month
        </div>
        <div className='card' style={{gridArea: 'box-4'}}> 

        </div>
        
        <div className='card' style={{gridArea: 'box-5'}}>
            Line graph this month
        </div>
        <div className='card' style={{gridArea: 'box-6'}}>
            Pie Chart this month across different categories
        </div>
        <div className='card' style={{gridArea: 'box-7'}}>
            Transaction History track transactions over the years and months
        </div>

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