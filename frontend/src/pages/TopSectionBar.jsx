import { useNavigate } from 'react-router-dom';
import '../TopSectionBar.css';
import JBSolverLogo from '../assets/JBSolverLogo.png'; 

import { GiHouse } from "react-icons/gi";
import { FaUserCircle } from "react-icons/fa";
import { FaUsersGear } from "react-icons/fa6";
import { ImStatsDots } from "react-icons/im";


export function TopSectionBar(){
    const navigate = useNavigate();
    return (
              <div className="topSectionBar">
                <img src={JBSolverLogo} className="logo-img" />
        
                <div className="right-buttons-4">
                  {/* Navigation Button: Home */}
                  <div className="button-wrapper">
                    <button
                      className="homepageButton"
                      onClick={() => navigate("/home")}
                    >
                      <GiHouse size={45} color={'#edb601'}/>
                    </button>
                    <span className="hover-tooltip">Home Page</span>
                  </div>
                  {/* Navigation Button: Expenditure Tracker */}
                  <div className="button-wrapper">
                    <button
                      className="expenditureTracker"
                      onClick={() => navigate("/tracker")}
                    >
                      <ImStatsDots size={45} color={'#edb601'}/>
                    </button>
                    <span className="hover-tooltip">Expenditure Tracker</span>
                  </div>
                  {/* Navigation Button: Community Groups */}
                  <div className="button-wrapper">
                    <button
                      className="communityGroupButton"
                      onClick={() => navigate("/groups")}
                    >
                      <FaUsersGear size={45} color={'#edb601'}/>
                    </button>
                    <span className="hover-tooltip">Community Groups</span>
                  </div>
                  {/* Navigation Button: User Profile Settings */}
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
    );
}

export default TopSectionBar; 