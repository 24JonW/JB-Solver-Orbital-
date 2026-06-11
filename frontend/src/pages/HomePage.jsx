import { useNavigate } from 'react-router-dom';
import '../App.css';

import JBSolverLogo from '../assets/JBSolverLogo.png'; 
import picture from '../assets/picture.png'; 
import {useState, useEffect} from 'react'; 
import axios from 'axios'; 

import { GiHouse } from "react-icons/gi";
import { FaUserCircle } from "react-icons/fa";
import { FaUsersGear } from "react-icons/fa6";
import { ImStatsDots } from "react-icons/im";

function HomePage() {
  const navigate = useNavigate();
  const [email, setEmail]= useState(''); 
  const [userId, setUserId]= useState(null); 
  const [username, setUsername] = useState(''); 

  const API_BASE_URL= 'http://localhost:5001/api/accounts'; 

  useEffect(()=> {
    const storedUserId= localStorage.getItem('userId'); 
    if (!storedUserId) {
      navigate('/'); 
      return; 
    }
    axios.get(`${API_BASE_URL}/${storedUserId}`)
      .then((res)=> {
        const data= res.data; 
        setEmail(data.email);
        setUserId(data.user_id);
        setUsername(data.username);
      })
      .catch((err)=> {
        console.error('Error fetching user profile with Axios:', err);
      })

  })


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
              <GiHouse size={55} color={'#edb601'}/>
            </button>
            <span className="hover-tooltip">Home Page</span>
          </div>
          <div className="button-wrapper">
            <button
              className="expenditureTracker"
              onClick={() => navigate("/tracker")}
            >
              <ImStatsDots size={55} color={'#edb601'}/>
            </button>
            <span className="hover-tooltip">Expenditure Tracker</span>
          </div>

          <div className="button-wrapper">
            <button
              className="communityGroupButton"
              onClick={() => navigate("/groups")}
            >
              <FaUsersGear size={55} color={'#edb601'}/>
            </button>
            <span className="hover-tooltip">Community Groups</span>
          </div>

          <div className="button-wrapper">
            <button
              className="userProfileButton"
              onClick={() => navigate("/profile")}
            >
              <FaUserCircle size={55} color={'#edb601'}/>
            </button>
            <span className="hover-tooltip">User Profile</span>
          </div>
        </div>
      </div>
      

      <div className='home-body'>
        <div className='profile-card'>
          <div className='profile-header'>
              <img src={picture} className='profilePicture-img' />
              <div className='profile-main-info'>
                  <h2>Username: {username}</h2>
                  {/* <p>Community Member</p> */}
              </div>
          </div>
          <div className='profile-details'>
              <p><strong>Email:</strong> {email}</p>
              <p><strong>ID:</strong> {userId}</p>
          </div>
          <button className='edit-profile-btn' onClick= {()=> {
            navigate("/profile");
          }}>
              Edit Profile
              
              
          </button>
          
        </div>
        <div className='profile-card' style={{ gridArea: 'box2'}}>
          <h2>Tasks to do</h2>
          
        </div>

        <div className='profile-card' style={{ gridArea: 'box3'}}>
          <h2>Outstanding Payments</h2>
          
        </div>

        
      </div>
      <div className='footer'>
        <button className='btn-logout' onClick={() => {
          localStorage.removeItem('userId')
          navigate('/')
        }}>
            Log Out
        </button>
      </div>




    </div>

    );
}
export default HomePage; 